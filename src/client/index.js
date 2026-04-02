const { MessageType } = require('../shared/protocol');
const { ConsoleLogger } = require('../shared/utils');
const { 
  createConnectSuccess, 
  createConnectError, 
  createDisconnect,
  createDisconnectAck
} = require('../shared/protocol');
const WebSocketClient = require('./WebSocketClient');
const TcpConnector = require('./TcpConnector');
const ConnectionPool = require('./ConnectionPool');
const DataForwarder = require('./DataForwarder');

/**
 * Gateway Client - Main entry point
 */
class GatewayClient {
  constructor(config) {
    this.config = config;
    this.logger = new ConsoleLogger(config.logging.level);
    
    // Initialize components
    this.wsClient = new WebSocketClient(
      config.server.url,
      config.server.reconnect,
      config.server.reconnectInterval,
      config.server.maxReconnectAttempts,
      this.logger
    );
    
    this.tcpConnector = new TcpConnector(
      config.connection.timeout,
      this.logger
    );
    
    this.connectionPool = new ConnectionPool(
      config.connection.poolSize,
      this.logger
    );
    
    this.dataForwarder = new DataForwarder(
      this.wsClient,
      this.logger
    );
    
    this.cleanupInterval = null;
  }

  /**
   * Start the gateway client
   */
  async start() {
    this.logger.info('Starting Gateway Client...');

    try {
      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();
      
      // Connect to gateway server
      await this.wsClient.connect();
      
      // Start cleanup interval
      this.startCleanupInterval();
      
      this.logger.info('Gateway Client started successfully');
      this.logger.info(`Connected to: ${this.config.server.url}`);
      this.logger.info(`Target service: ${this.config.target.host}:${this.config.target.port}`);
    } catch (error) {
      this.logger.error('Failed to start Gateway Client', { error });
      throw error;
    }
  }

  /**
   * Stop the gateway client
   */
  async stop() {
    this.logger.info('Stopping Gateway Client...');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all connections
    this.connectionPool.closeAll();

    // Disconnect from server
    this.wsClient.disconnect();

    this.logger.info('Gateway Client stopped');
  }

  /**
   * Set up WebSocket event handlers
   */
  setupWebSocketHandlers() {
    // Handle connected
    this.wsClient.onConnected(() => {
      this.logger.info('Connected to gateway server');
    });

    // Handle disconnected
    this.wsClient.onDisconnected(() => {
      this.logger.warn('Disconnected from gateway server, closing all connections');
      this.connectionPool.closeAll();
    });

    // Handle incoming messages
    this.wsClient.onMessage((message) => {
      this.handleWebSocketMessage(message);
    });
  }

  /**
   * Handle WebSocket message
   */
  handleWebSocketMessage(message) {
    const { type, connectionId } = message;

    switch (type) {
      case MessageType.CONNECT_REQUEST:
        this.handleConnectRequest(connectionId, message.target);
        break;

      case MessageType.DATA:
        this.handleData(message);
        break;

      case MessageType.DISCONNECT:
        this.handleDisconnect(connectionId);
        break;

      case MessageType.PING:
        // Respond with PONG (handled by WebSocket layer)
        break;

      default:
        this.logger.warn('Unknown message type', { type, connectionId });
    }
  }

  /**
   * Handle CONNECT_REQUEST message
   */
  async handleConnectRequest(connectionId, target) {
    this.logger.info('Connection request received', { connectionId });

    // Use configured target if not specified in message
    const targetConfig = target || this.config.target;

    try {
      // Connect to target service
      const socket = await this.tcpConnector.connect(targetConfig);
      
      // Add to connection pool
      this.connectionPool.addConnection(connectionId, socket);
      
      // Set up data forwarding
      this.dataForwarder.forwardTcpToWebSocket(socket, connectionId);
      
      // Handle socket close
      socket.on('close', () => {
        this.logger.info('Target socket closed', { connectionId });
        
        // Send disconnect message
        const disconnectMsg = createDisconnect(connectionId);
        this.wsClient.sendMessage(disconnectMsg);
        
        // Remove from pool
        this.connectionPool.removeConnection(connectionId);
      });
      
      // Send success message
      const successMsg = createConnectSuccess(connectionId);
      this.wsClient.sendMessage(successMsg);
      
      this.logger.info('Connection established', { connectionId });
    } catch (error) {
      this.logger.error('Failed to connect to target', { connectionId, error });
      
      // Send error message
      const errorMsg = createConnectError(
        connectionId, 
        error.message || 'Connection failed'
      );
      this.wsClient.sendMessage(errorMsg);
    }
  }

  /**
   * Handle DATA message
   */
  handleData(message) {
    const socket = this.connectionPool.getConnection(message.connectionId);
    if (socket) {
      this.dataForwarder.forwardWebSocketToTcp(message, socket);
    } else {
      this.logger.warn('Connection not found for data message', { 
        connectionId: message.connectionId 
      });
    }
  }

  /**
   * Handle DISCONNECT message
   */
  handleDisconnect(connectionId) {
    this.logger.info('Disconnect request received', { connectionId });
    
    // Remove connection
    this.connectionPool.removeConnection(connectionId);
    
    // Send acknowledgment
    const ackMsg = createDisconnectAck(connectionId);
    this.wsClient.sendMessage(ackMsg);
  }

  /**
   * Start cleanup interval for stale connections
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.connectionPool.cleanupStale(this.config.connection.timeout);
    }, 30000); // Run every 30 seconds
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      connected: this.wsClient.isConnected(),
      activeConnections: this.connectionPool.getPoolSize()
    };
  }
}

/**
 * Default configuration
 */
const defaultConfig = {
  server: {
    url: 'ws://localhost:8081/gateway',
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  },
  target: {
    host: 'localhost',
    port: 3306
  },
  connection: {
    timeout: 30000,
    poolSize: 10
  },
  logging: {
    level: 'info'
  }
};

/**
 * Main entry point
 */
async function main() {
  const client = new GatewayClient(defaultConfig);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await client.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await client.stop();
    process.exit(0);
  });

  try {
    await client.start();
  } catch (error) {
    console.error('Failed to start client:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

module.exports = GatewayClient;

// Made with Bob
