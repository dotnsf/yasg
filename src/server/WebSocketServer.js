const { WebSocketServer: WSServer, WebSocket } = require('ws');
const { serializeMessage, deserializeMessage, validateMessage } = require('../shared/protocol');

/**
 * WebSocket Server for gateway communication
 */
class WebSocketServer {
  constructor(port, path, logger, keyword = '') {
    this.wss = null;
    this.client = null;
    this.port = port;
    this.path = path;
    this.logger = logger;
    this.keyword = keyword;
    this.onMessageCallback = null;
    this.onClientConnectedCallback = null;
    this.onClientDisconnectedCallback = null;
    this.pingInterval = null;
  }

  /**
   * Start the WebSocket server
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({
          port: this.port,
          path: this.path
        });

        this.wss.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
          this.logger.error('WebSocket server error', { error: error.message });
          reject(error);
        });

        this.wss.on('listening', () => {
          this.logger.info('WebSocket server started', { 
            port: this.port, 
            path: this.path 
          });
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop() {
    return new Promise((resolve) => {
      // Stop ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (this.client) {
        this.client.close();
        this.client = null;
      }

      if (this.wss) {
        this.wss.close(() => {
          this.logger.info('WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Send message to client
   */
  sendMessage(message) {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot send message, client not connected');
      return;
    }

    try {
      const data = serializeMessage(message);
      this.client.send(data);
      this.logger.debug('Message sent', { type: message.type, connectionId: message.connectionId });
    } catch (error) {
      this.logger.error('Error sending message', { error });
    }
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for client connected
   */
  onClientConnected(callback) {
    this.onClientConnectedCallback = callback;
  }

  /**
   * Set callback for client disconnected
   */
  onClientDisconnected(callback) {
    this.onClientDisconnectedCallback = callback;
  }

  /**
   * Check if client is connected
   */
  isClientConnected() {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    // Check keyword authentication if configured
    if (this.keyword) {
      const url = new URL(req.url, `ws://${req.headers.host}`);
      const clientKeyword = url.searchParams.get('keyword');
      
      if (!clientKeyword) {
        this.logger.warn('Client connection rejected: keyword not provided');
        ws.close(1008, 'keyword not matched.');
        return;
      }
      
      if (clientKeyword !== this.keyword) {
        this.logger.warn('Client connection rejected: keyword not matched');
        ws.close(1008, 'keyword not matched.');
        return;
      }
      
      this.logger.info('Client keyword authenticated successfully');
    }

    // Only allow one client connection
    if (this.client) {
      this.logger.warn('Client already connected, rejecting new connection');
      ws.close(1008, 'Only one client allowed');
      return;
    }

    this.logger.info('Gateway client connected');
    this.client = ws;

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(data);
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.logger.info('Gateway client disconnected');
      this.client = null;
      
      // Stop ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      if (this.onClientDisconnectedCallback) {
        this.onClientDisconnectedCallback();
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      this.logger.error('WebSocket client error', { error: error.message });
    });

    // Handle pong responses
    ws.on('pong', () => {
      this.logger.debug('Received pong from client');
    });

    // Start ping interval (30 seconds)
    this.startPingInterval();

    // Notify connection
    if (this.onClientConnectedCallback) {
      this.onClientConnectedCallback();
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    // Clear existing interval if any
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.client && this.client.readyState === WebSocket.OPEN) {
        this.logger.debug('Sending ping to client');
        this.client.ping();
      }
    }, 30000);
  }

  /**
   * Handle incoming message
   */
  handleMessage(data) {
    try {
      const messageStr = data.toString('utf8');
      const message = deserializeMessage(messageStr);

      if (!validateMessage(message)) {
        this.logger.warn('Invalid message received', { data: messageStr });
        return;
      }

      this.logger.debug('Message received', { 
        type: message.type, 
        connectionId: message.connectionId 
      });

      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    } catch (error) {
      this.logger.error('Error handling message', { error });
    }
  }
}

module.exports = WebSocketServer;

// Made with Bob
