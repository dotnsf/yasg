const net = require('net');

/**
 * TCP Connector for connecting to target services
 */
class TcpConnector {
  constructor(timeout, logger) {
    this.timeout = timeout;
    this.logger = logger;
  }

  /**
   * Connect to target host:port
   */
  connect(target) {
    return new Promise((resolve, reject) => {
      this.logger.info('Connecting to target service', { 
        host: target.host, 
        port: target.port 
      });

      const socket = new net.Socket();

      // Set timeout
      socket.setTimeout(this.timeout);

      // Connect to target
      socket.connect(target.port, target.host, () => {
        this.logger.info('Connected to target service', {
          host: target.host,
          port: target.port
        });
        
        // Clear timeout after successful connection
        socket.setTimeout(0);
        
        // Set socket options for long-lived connections
        socket.setKeepAlive(true, 10000); // Enable keep-alive with 10 second initial delay
        socket.setNoDelay(true); // Disable Nagle's algorithm for lower latency
        
        resolve(socket);
      });

      // Handle timeout
      socket.on('timeout', () => {
        this.logger.error('Connection timeout', { 
          host: target.host, 
          port: target.port 
        });
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error('Connection error', { 
          host: target.host, 
          port: target.port, 
          error: error.message 
        });
        reject(error);
      });
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(socket) {
    try {
      if (!socket.destroyed) {
        socket.destroy();
      }
    } catch (error) {
      this.logger.error('Error disconnecting socket', { error });
    }
  }

  /**
   * Set up data event handler
   */
  onData(socket, callback) {
    socket.on('data', callback);
  }

  /**
   * Set up error event handler
   */
  onError(socket, callback) {
    socket.on('error', callback);
  }

  /**
   * Set up close event handler
   */
  onClose(socket, callback) {
    socket.on('close', callback);
  }

  /**
   * Set up end event handler
   */
  onEnd(socket, callback) {
    socket.on('end', callback);
  }
}

module.exports = TcpConnector;

// Made with Bob
