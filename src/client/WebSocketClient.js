const WebSocket = require('ws');
const { serializeMessage, deserializeMessage, validateMessage } = require('../shared/protocol');
const { sleep } = require('../shared/utils');

/**
 * WebSocket Client for gateway communication
 */
class WebSocketClient {
  constructor(url, reconnect, reconnectInterval, maxReconnectAttempts, logger) {
    this.ws = null;
    this.url = url;
    this.reconnect = reconnect;
    this.reconnectInterval = reconnectInterval;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectAttempts = 0;
    this.logger = logger;
    this.isConnecting = false;
    this.shouldReconnect = true;
    this.onMessageCallback = null;
    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;
  }

  /**
   * Connect to the gateway server
   */
  async connect() {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;

    try {
      await this.doConnect();
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      
      if (this.reconnect && this.shouldReconnect) {
        await this.handleReconnect();
      } else {
        throw error;
      }
    }
  }

  /**
   * Disconnect from the gateway server
   */
  disconnect() {
    this.shouldReconnect = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.logger.info('Disconnected from gateway server');
  }

  /**
   * Send message to server
   */
  sendMessage(message) {
    if (!this.isConnected()) {
      this.logger.warn('Cannot send message, not connected');
      return;
    }

    try {
      const data = serializeMessage(message);
      this.ws.send(data);
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
   * Set callback for connected event
   */
  onConnected(callback) {
    this.onConnectedCallback = callback;
  }

  /**
   * Set callback for disconnected event
   */
  onDisconnected(callback) {
    this.onDisconnectedCallback = callback;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Perform the actual connection
   */
  doConnect() {
    return new Promise((resolve, reject) => {
      this.logger.info('Connecting to gateway server', { url: this.url });

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.logger.info('Connected to gateway server');
        
        if (this.onConnectedCallback) {
          this.onConnectedCallback();
        }
        
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        this.logger.info('Connection closed');
        this.ws = null;
        
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }
        
        if (this.reconnect && this.shouldReconnect) {
          this.handleReconnect().catch(error => {
            this.logger.error('Reconnection failed', { error });
          });
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error', { error: error.message });
        reject(error);
      });

      // Handle ping from server
      this.ws.on('ping', () => {
        this.logger.debug('Received ping from server');
        // WebSocket automatically sends pong response
      });

      // Handle pong responses
      this.ws.on('pong', () => {
        this.logger.debug('Received pong from server');
      });
    });
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached', { 
        attempts: this.reconnectAttempts 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    this.logger.info('Reconnecting...', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    await sleep(delay);

    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Reconnection attempt failed', { error });
    }
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

module.exports = WebSocketClient;

// Made with Bob
