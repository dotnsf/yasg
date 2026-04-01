import * as net from 'net';
import { Logger } from '../shared/types';

/**
 * Connection information
 */
interface PooledConnection {
  socket: net.Socket;
  createdAt: number;
}

/**
 * Manages TCP connections to target services
 */
export class ConnectionPool {
  private connections: Map<string, PooledConnection>;
  private poolSize: number;
  private logger: Logger;

  constructor(poolSize: number, logger: Logger) {
    this.connections = new Map();
    this.poolSize = poolSize;
    this.logger = logger;
  }

  /**
   * Add a connection to the pool
   */
  addConnection(connectionId: string, socket: net.Socket): void {
    if (this.connections.size >= this.poolSize) {
      this.logger.warn('Connection pool full', { 
        current: this.connections.size, 
        max: this.poolSize 
      });
      throw new Error('Connection pool full');
    }

    this.connections.set(connectionId, {
      socket,
      createdAt: Date.now()
    });

    this.logger.debug('Connection added to pool', { 
      connectionId, 
      poolSize: this.connections.size 
    });
  }

  /**
   * Get a connection from the pool
   */
  getConnection(connectionId: string): net.Socket | undefined {
    const conn = this.connections.get(connectionId);
    return conn?.socket;
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      try {
        if (!conn.socket.destroyed) {
          conn.socket.destroy();
        }
      } catch (error) {
        this.logger.error('Error destroying socket', { connectionId, error });
      }
      
      this.connections.delete(connectionId);
      this.logger.debug('Connection removed from pool', { 
        connectionId, 
        poolSize: this.connections.size 
      });
    }
  }

  /**
   * Check if connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Get current pool size
   */
  getPoolSize(): number {
    return this.connections.size;
  }

  /**
   * Get all connection IDs
   */
  getAllConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.logger.info('Closing all connections in pool', { 
      count: this.connections.size 
    });

    for (const [connectionId, conn] of this.connections.entries()) {
      try {
        if (!conn.socket.destroyed) {
          conn.socket.destroy();
        }
      } catch (error) {
        this.logger.error('Error closing connection', { connectionId, error });
      }
    }

    this.connections.clear();
  }

  /**
   * Clean up stale connections
   */
  cleanupStale(timeoutMs: number): void {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [connectionId, conn] of this.connections.entries()) {
      if (now - conn.createdAt > timeoutMs) {
        staleConnections.push(connectionId);
      }
    }

    if (staleConnections.length > 0) {
      this.logger.info('Cleaning up stale connections', { 
        count: staleConnections.length 
      });
      staleConnections.forEach(id => this.removeConnection(id));
    }
  }
}

// Made with Bob
