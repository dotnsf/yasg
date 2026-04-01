import * as net from 'net';
import { Logger, TargetConfig } from '../shared/types';

/**
 * TCP Connector for connecting to target services
 */
export class TcpConnector {
  private logger: Logger;
  private timeout: number;

  constructor(timeout: number, logger: Logger) {
    this.timeout = timeout;
    this.logger = logger;
  }

  /**
   * Connect to target host:port
   */
  connect(target: TargetConfig): Promise<net.Socket> {
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
        
        // Set socket options
        socket.setKeepAlive(true, 60000);
        socket.setNoDelay(true);
        
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
      socket.on('error', (error: Error) => {
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
  disconnect(socket: net.Socket): void {
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
  onData(socket: net.Socket, callback: (data: Buffer) => void): void {
    socket.on('data', callback);
  }

  /**
   * Set up error event handler
   */
  onError(socket: net.Socket, callback: (error: Error) => void): void {
    socket.on('error', callback);
  }

  /**
   * Set up close event handler
   */
  onClose(socket: net.Socket, callback: () => void): void {
    socket.on('close', callback);
  }

  /**
   * Set up end event handler
   */
  onEnd(socket: net.Socket, callback: () => void): void {
    socket.on('end', callback);
  }
}

// Made with Bob
