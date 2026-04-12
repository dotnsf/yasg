const fs = require('fs');
const path = require('path');
const { MessageType, ConnectionState } = require('../shared/protocol');
const { ConsoleLogger, parseArgs } = require('../shared/utils');
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
      this.logger,
      config.security.keyword
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
    
    // Track connections waiting for CONNECT_SUCCESS
    this.pendingConnections = new Set();
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
      // Configure TCP socket for long-lived connections
      socket.setKeepAlive(true, 10000); // Enable keep-alive with 10 second initial delay
      socket.setTimeout(0); // Disable timeout (no automatic timeout)
      socket.setNoDelay(true); // Disable Nagle's algorithm for lower latency

      // Add connection to manager
      this.connectionManager.addConnection(connectionId, socket);
      this.connectionManager.updateState(connectionId, ConnectionState.CONNECTING);

      // Mark connection as pending (waiting for CONNECT_SUCCESS)
      this.pendingConnections.add(connectionId);

      // Pause data forwarding until CONNECT_SUCCESS is received
      this.dataForwarder.pause(connectionId);

      // Set up data forwarding (will be paused until CONNECT_SUCCESS)
      this.dataForwarder.forwardTcpToWebSocket(socket, connectionId);

      // Send connect request to client (without target info - client will use its own config)
      const message = createConnectRequest(connectionId, undefined);
      this.wsServer.sendMessage(message);

      this.logger.info('TCP connection established, waiting for client', {
        connectionId
      });

      // Handle TCP socket close
      socket.on('close', () => {
        this.logger.info('TCP socket closed', { connectionId });
        
        // Clean up pending state
        this.pendingConnections.delete(connectionId);
        
        // Send disconnect message
        const disconnectMsg = createDisconnect(connectionId);
        this.wsServer.sendMessage(disconnectMsg);
        
        // Remove connection
        this.connectionManager.removeConnection(connectionId);
      });

      // Handle TCP socket errors
      socket.on('error', (error) => {
        this.logger.error('TCP socket error', { connectionId, error: error.message });
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
    
    // Resume data forwarding now that client is ready
    if (this.pendingConnections.has(connectionId)) {
      this.pendingConnections.delete(connectionId);
      this.dataForwarder.resume(connectionId);
      this.logger.debug('Data forwarding resumed', { connectionId });
    }
  }

  /**
   * Handle CONNECT_ERROR message
   */
  handleConnectError(connectionId, error) {
    this.logger.error('Client connection failed', { connectionId, error });
    this.connectionManager.updateState(connectionId, ConnectionState.FAILED);
    
    // Clean up pending state
    this.pendingConnections.delete(connectionId);
    
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
    
    // Clean up pending state
    this.pendingConnections.delete(connectionId);
    
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
    timeout: 600000, // 10 minutes for long-lived connections like SSH
    maxConnections: 100
  },
  security: {
    keyword: '' // Optional authentication keyword
  },
  logging: {
    level: 'info'
  }
};

/**
 * Load configuration from file
 */
function loadConfig(configPath) {
  try {
    const absolutePath = path.resolve(configPath);
    const configData = fs.readFileSync(absolutePath, 'utf8');
    const config = JSON.parse(configData);
    console.log(`Configuration loaded from: ${absolutePath}`);
    return config;
  } catch (error) {
    console.error(`Failed to load configuration from ${configPath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Load configuration from environment variables
 * Environment variables take precedence over config file
 */
function loadConfigFromEnv() {
  const envConfig = {};

  // TCP configuration
  if (process.env.YASG_TCP_HOST) {
    envConfig.tcp = envConfig.tcp || {};
    envConfig.tcp.host = process.env.YASG_TCP_HOST;
  }
  if (process.env.YASG_TCP_PORT) {
    envConfig.tcp = envConfig.tcp || {};
    envConfig.tcp.port = parseInt(process.env.YASG_TCP_PORT, 10);
  }

  // WebSocket configuration
  if (process.env.YASG_WS_PORT) {
    envConfig.websocket = envConfig.websocket || {};
    envConfig.websocket.port = parseInt(process.env.YASG_WS_PORT, 10);
  }
  if (process.env.YASG_WS_PATH) {
    envConfig.websocket = envConfig.websocket || {};
    envConfig.websocket.path = process.env.YASG_WS_PATH;
  }

  // Connection configuration
  if (process.env.YASG_CONN_TIMEOUT) {
    envConfig.connection = envConfig.connection || {};
    envConfig.connection.timeout = parseInt(process.env.YASG_CONN_TIMEOUT, 10);
  }
  if (process.env.YASG_CONN_MAX) {
    envConfig.connection = envConfig.connection || {};
    envConfig.connection.maxConnections = parseInt(process.env.YASG_CONN_MAX, 10);
  }

  // Security configuration
  if (process.env.YASG_SECURITY_KEYWORD) {
    envConfig.security = envConfig.security || {};
    envConfig.security.keyword = process.env.YASG_SECURITY_KEYWORD;
  }

  // Logging configuration
  if (process.env.YASG_LOG_LEVEL) {
    envConfig.logging = envConfig.logging || {};
    envConfig.logging.level = process.env.YASG_LOG_LEVEL;
  }

  return envConfig;
}

/**
 * Merge configurations with priority: env > file > default
 */
function mergeConfigs(defaultConfig, fileConfig, envConfig) {
  return {
    tcp: {
      ...defaultConfig.tcp,
      ...(fileConfig.tcp || {}),
      ...(envConfig.tcp || {})
    },
    websocket: {
      ...defaultConfig.websocket,
      ...(fileConfig.websocket || {}),
      ...(envConfig.websocket || {})
    },
    connection: {
      ...defaultConfig.connection,
      ...(fileConfig.connection || {}),
      ...(envConfig.connection || {})
    },
    security: {
      ...defaultConfig.security,
      ...(fileConfig.security || {}),
      ...(envConfig.security || {})
    },
    logging: {
      ...defaultConfig.logging,
      ...(fileConfig.logging || {}),
      ...(envConfig.logging || {})
    }
  };
}

/**
 * Main entry point
 */
async function main() {
  // Parse command line arguments
  const args = parseArgs(process.argv.slice(2));
  
  // Load configuration with priority: env > file > default
  let fileConfig = {};
  if (args.config) {
    fileConfig = loadConfig(args.config);
  }
  
  // Load environment variables
  const envConfig = loadConfigFromEnv();

  // デバッグ出力を追加
  console.log('Environment variables detected:');
  console.log('  YASG_TCP_PORT:', process.env.YASG_TCP_PORT);
  console.log('  YASG_WS_PORT:', process.env.YASG_WS_PORT);
  console.log('  YASG_LOG_LEVEL:', process.env.YASG_LOG_LEVEL);
  console.log('Parsed envConfig:', JSON.stringify(envConfig, null, 2));
  
  // Merge configurations (env takes precedence over file, file over default)
  const config = mergeConfigs(defaultConfig, fileConfig, envConfig);
  
  // Log configuration sources
  console.log('Configuration loaded from:');
  console.log('  - Default values');
  if (args.config) {
    console.log(`  - Config file: ${args.config}`);
  }
  if (Object.keys(envConfig).length > 0) {
    console.log('  - Environment variables (highest priority)');
  }

  const server = new GatewayServer(config);

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
