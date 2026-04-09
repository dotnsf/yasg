const net = require('net');
const tls = require('tls');

/**
 * TCP Connector for connecting to target services
 */
class TcpConnector {
  constructor(timeout, logger) {
    this.timeout = timeout;
    this.logger = logger;
  }

  /**
   * Connect to target host:port (with optional TLS support)
   */
  connect(target) {
    return new Promise((resolve, reject) => {
      const useTls = target.tls === true;
      const protocol = useTls ? 'TLS' : 'TCP';
      
      this.logger.info(`Connecting to target service via ${protocol}`, {
        host: target.host,
        port: target.port,
        tls: useTls
      });

      let socket;

      if (useTls) {
        // TLS/SSL connection
        const tlsOptions = {
          host: target.host,
          port: target.port,
          rejectUnauthorized: target.rejectUnauthorized !== false,
          // Allow custom TLS options if provided
          ...(target.tlsOptions || {})
        };

        socket = tls.connect(tlsOptions, () => {
          this.logger.info('TLS connection established', {
            host: target.host,
            port: target.port,
            authorized: socket.authorized,
            cipher: socket.getCipher()
          });
          
          // Clear timeout after successful connection
          socket.setTimeout(0);
          
          // Set socket options for long-lived connections
          socket.setKeepAlive(true, 10000);
          socket.setNoDelay(true);
          
          resolve(socket);
        });

        // Handle TLS-specific errors
        socket.on('secureConnect', () => {
          if (!socket.authorized && target.rejectUnauthorized !== false) {
            const error = new Error(`TLS certificate validation failed: ${socket.authorizationError}`);
            this.logger.error('TLS authorization failed', {
              host: target.host,
              port: target.port,
              error: socket.authorizationError
            });
            socket.destroy();
            reject(error);
          }
        });
      } else {
        // Regular TCP connection
        socket = new net.Socket();
        
        socket.connect(target.port, target.host, () => {
          this.logger.info('TCP connection established', {
            host: target.host,
            port: target.port
          });
          
          // Clear timeout after successful connection
          socket.setTimeout(0);
          
          // Set socket options for long-lived connections
          socket.setKeepAlive(true, 10000);
          socket.setNoDelay(true);
          
          resolve(socket);
        });
      }

      // Set timeout
      socket.setTimeout(this.timeout);

      // Handle timeout
      socket.on('timeout', () => {
        this.logger.error('Connection timeout', {
          host: target.host,
          port: target.port,
          protocol
        });
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error('Connection error', {
          host: target.host,
          port: target.port,
          protocol,
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
