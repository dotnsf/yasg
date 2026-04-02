/**
 * Manages TCP connections to target services
 */
class ConnectionPool {
  constructor(poolSize, logger) {
    this.connections = new Map();
    this.poolSize = poolSize;
    this.logger = logger;
  }

  /**
   * Add a connection to the pool
   */
  addConnection(connectionId, socket) {
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
  getConnection(connectionId) {
    const conn = this.connections.get(connectionId);
    return conn?.socket;
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(connectionId) {
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
  hasConnection(connectionId) {
    return this.connections.has(connectionId);
  }

  /**
   * Get current pool size
   */
  getPoolSize() {
    return this.connections.size;
  }

  /**
   * Get all connection IDs
   */
  getAllConnectionIds() {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections
   */
  closeAll() {
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
  cleanupStale(timeoutMs) {
    const now = Date.now();
    const staleConnections = [];

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

module.exports = ConnectionPool;

// Made with Bob
