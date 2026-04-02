const { ConnectionState } = require('../shared/protocol');

/**
 * Manages TCP connections on the server side
 */
class ConnectionManager {
  constructor(maxConnections, logger) {
    this.connections = new Map();
    this.maxConnections = maxConnections;
    this.logger = logger;
  }

  /**
   * Add a new connection
   */
  addConnection(connectionId, socket) {
    if (this.connections.size >= this.maxConnections) {
      this.logger.warn('Max connections reached', { 
        current: this.connections.size, 
        max: this.maxConnections 
      });
      throw new Error('Maximum connections reached');
    }

    this.connections.set(connectionId, {
      socket,
      state: ConnectionState.PENDING,
      createdAt: Date.now()
    });

    this.logger.debug('Connection added', { connectionId });
  }

  /**
   * Get a connection by ID
   */
  getConnection(connectionId) {
    const info = this.connections.get(connectionId);
    return info?.socket;
  }

  /**
   * Update connection state
   */
  updateState(connectionId, state) {
    const info = this.connections.get(connectionId);
    if (info) {
      info.state = state;
      this.logger.debug('Connection state updated', { connectionId, state });
    }
  }

  /**
   * Get connection state
   */
  getState(connectionId) {
    return this.connections.get(connectionId)?.state;
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId) {
    const info = this.connections.get(connectionId);
    if (info) {
      try {
        if (!info.socket.destroyed) {
          info.socket.destroy();
        }
      } catch (error) {
        this.logger.error('Error destroying socket', { connectionId, error });
      }
      this.connections.delete(connectionId);
      this.logger.debug('Connection removed', { connectionId });
    }
  }

  /**
   * Get number of active connections
   */
  getActiveConnections() {
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
    this.logger.info('Closing all connections', { count: this.connections.size });
    
    for (const [connectionId, info] of this.connections.entries()) {
      try {
        if (!info.socket.destroyed) {
          info.socket.destroy();
        }
      } catch (error) {
        this.logger.error('Error closing connection', { connectionId, error });
      }
    }
    
    this.connections.clear();
  }

  /**
   * Clean up stale connections (older than timeout)
   */
  cleanupStale(timeoutMs) {
    const now = Date.now();
    const staleConnections = [];

    for (const [connectionId, info] of this.connections.entries()) {
      if (now - info.createdAt > timeoutMs && info.state === ConnectionState.PENDING) {
        staleConnections.push(connectionId);
      }
    }

    if (staleConnections.length > 0) {
      this.logger.info('Cleaning up stale connections', { count: staleConnections.length });
      staleConnections.forEach(id => this.removeConnection(id));
    }
  }
}

module.exports = ConnectionManager;

// Made with Bob
