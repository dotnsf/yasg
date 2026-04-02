const net = require('net');

/**
 * TCP Listener for accepting incoming connections
 */
class TcpListener {
  constructor(host, port, logger) {
    this.server = null;
    this.host = host;
    this.port = port;
    this.logger = logger;
    this.onConnectionCallback = null;
  }

  /**
   * Start the TCP listener
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (error) => {
        this.logger.error('TCP server error', { error: error.message });
        reject(error);
      });

      this.server.listen(this.port, this.host, () => {
        this.logger.info('TCP listener started', { 
          host: this.host, 
          port: this.port 
        });
        resolve();
      });
    });
  }

  /**
   * Stop the TCP listener
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('TCP listener stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Set callback for new connections
   */
  onConnection(callback) {
    this.onConnectionCallback = callback;
  }

  /**
   * Handle incoming TCP connection
   */
  handleConnection(socket) {
    const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    this.logger.info('New TCP connection', { remoteAddress });

    // Generate connection ID
    const connectionId = this.generateConnectionId();

    // Set socket options
    socket.setKeepAlive(true, 60000);
    socket.setNoDelay(true);

    // Handle socket errors
    socket.on('error', (error) => {
      this.logger.error('TCP socket error', { 
        connectionId, 
        remoteAddress, 
        error: error.message 
      });
    });

    // Notify callback
    if (this.onConnectionCallback) {
      this.onConnectionCallback(socket, connectionId);
    } else {
      this.logger.warn('No connection callback set, closing socket', { connectionId });
      socket.destroy();
    }
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId() {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server address
   */
  getAddress() {
    if (this.server && this.server.listening) {
      const address = this.server.address();
      if (address && typeof address !== 'string') {
        return {
          host: address.address,
          port: address.port
        };
      }
    }
    return null;
  }

  /**
   * Check if server is listening
   */
  isListening() {
    return this.server !== null && this.server.listening;
  }
}

module.exports = TcpListener;

// Made with Bob
