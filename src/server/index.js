const { MessageType, ConnectionState } = require('../shared/protocol');
const { ConsoleLogger } = require('../shared/utils');
const { 
  createConnectRequest, 
  createDisconnect 
} = require('../shared/protocol');
const TcpListener = require('./TcpListener');
const WebSocketServer = require('./WebSocketServer');
const ConnectionManager = require('./ConnectionManager');
const DataForwarder = require('./DataForwarder');

/**
 * Gateway Server - Main entry point
 */
class GatewayServer {
  constructor(config) {
    this.config = config;
    this.logger = new ConsoleLogger(config.logging.level);
    
    // Initialize components
    this.tcpListener = new TcpListener(
      config.tcp.host,
      config.tcp.port,
      this.logger
    );
    
    this.wsServer = new WebSocketServer(
      config.websocket.port,
      config.websocket.path,
      this.logger
    );
    
    this.connectionManager = new ConnectionManager(
      config.connection.maxConnections,
      this.logger
    );
    
    this.dataForwarder = new DataForwarder(
      this.wsServer,
      this.logger
    );
    
    this.cleanupInterval = null;
  }

  /**
   * Start the gateway server
   */
  async start() {
    this.logger.info('Starting Gateway Server...');

    try {
      // Start WebSocket server
      await this.wsServer.start();
      
      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();
      
      // Start TCP listener
      await this.tcpListener.start();
      
      // Set up TCP event handlers
      this.setupTcpHandlers();
      
      // Start cleanup interval
      this.startCleanupInterval();
      
      this.logger.info('Gateway Server started successfully');
      this.logger.info(`TCP Listener: ${this.config.tcp.host}:${this.config.tcp.port}`);
      this.logger.info(`WebSocket Server: ws://localhost:${this.config.websocket.port}${this.config.websocket.path}`);
    } catch (error) {
      this.logger.error('Failed to start Gateway Server', { error });
      throw error;
    }
  }

  /**
   * Stop the gateway server
   */
  async stop() {
    this.logger.info('Stopping Gateway Server...');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all connections
    this.connectionManager.closeAll();

    // Stop components
    await this.tcpListener.stop();
    await this.wsServer.stop();

    this.logger.info('Gateway Server stopped');
  }

  /**
   * Set up WebSocket event handlers
   */
  setupWebSocketHandlers() {
    // Handle client connected
    this.wsServer.onClientConnected(() => {
      this.logger.info('Gateway client connected');
    });

    // Handle client disconnected
    this.wsServer.onClientDisconnected(() => {
      this.logger.warn('Gateway client disconnected, closing all connections');
      this.connectionManager.closeAll();
    });

    // Handle incoming messages
    this.wsServer.onMessage((message) => {
      this.handleWebSocketMessage(message);
    });
  }

  /**
   * Set up TCP event handlers
   */
  setupTcpHandlers() {
    this.tcpListener.onConnection((socket, connectionId) => {
      this.handleTcpConnection(socket, connectionId);
    });
  }

  /**
   * Handle new TCP connection
   */
  handleTcpConnection(socket, connectionId) {
    // Check if WebSocket client is connected
    if (!this.wsServer.isClientConnected()) {
      this.logger.warn('No gateway client connected, rejecting TCP connection', { 
        connectionId 
      });
      socket.destroy();
      return;
    }

    try {
      // Add connection to manager
      this.connectionManager.addConnection(connectionId, socket);
      this.connectionManager.updateState(connectionId, ConnectionState.CONNECTING);

      // Set up data forwarding
      this.dataForwarder.forwardTcpToWebSocket(socket, connectionId);

      // Send connect request to client
      const message = createConnectRequest(connectionId, this.config.target || {
        host: 'localhost',
        port: 3306
      });
      this.wsServer.sendMessage(message);

      this.logger.info('TCP connection established, waiting for client', { 
        connectionId 
      });

      // Handle TCP socket close
      socket.on('close', () => {
        this.logger.info('TCP socket closed', { connectionId });
        
        // Send disconnect message
        const disconnectMsg = createDisconnect(connectionId);
        this.wsServer.sendMessage(disconnectMsg);
        
        // Remove connection
        this.connectionManager.removeConnection(connectionId);
      });

    } catch (error) {
      this.logger.error('Error handling TCP connection', { connectionId, error });
      socket.destroy();
    }
  }

  /**
   * Handle WebSocket message
   */
  handleWebSocketMessage(message) {
    const { type, connectionId } = message;

    switch (type) {
      case MessageType.CONNECT_SUCCESS:
        this.handleConnectSuccess(connectionId);
        break;

      case MessageType.CONNECT_ERROR:
        this.handleConnectError(connectionId, message.error);
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
   * Handle CONNECT_SUCCESS message
   */
  handleConnectSuccess(connectionId) {
    this.logger.info('Client connected successfully', { connectionId });
    this.connectionManager.updateState(connectionId, ConnectionState.CONNECTED);
  }

  /**
   * Handle CONNECT_ERROR message
   */
  handleConnectError(connectionId, error) {
    this.logger.error('Client connection failed', { connectionId, error });
    this.connectionManager.updateState(connectionId, ConnectionState.FAILED);
    this.connectionManager.removeConnection(connectionId);
  }

  /**
   * Handle DATA message
   */
  handleData(message) {
    const socket = this.connectionManager.getConnection(message.connectionId);
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
    this.logger.info('Client requested disconnect', { connectionId });
    this.connectionManager.removeConnection(connectionId);
  }

  /**
   * Start cleanup interval for stale connections
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.connectionManager.cleanupStale(this.config.connection.timeout);
    }, 30000); // Run every 30 seconds
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      activeConnections: this.connectionManager.getActiveConnections(),
      tcpListening: this.tcpListener.isListening(),
      wsClientConnected: this.wsServer.isClientConnected()
    };
  }
}

/**
 * Default configuration
 */
const defaultConfig = {
  tcp: {
    host: '0.0.0.0',
    port: 8080
  },
  websocket: {
    port: 8081,
    path: '/gateway'
  },
  connection: {
    timeout: 30000,
    maxConnections: 100
  },
  logging: {
    level: 'info'
  }
};

/**
 * Main entry point
 */
async function main() {
  const server = new GatewayServer(defaultConfig);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

module.exports = GatewayServer;

// Made with Bob
