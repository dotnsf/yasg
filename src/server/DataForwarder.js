const { MessageType } = require('../shared/protocol');
const { createDataMessage, decodeData } = require('../shared/protocol');

/**
 * Handles bidirectional data forwarding between TCP and WebSocket
 */
class DataForwarder {
  constructor(wsServer, logger) {
    this.wsServer = wsServer;
    this.logger = logger;
    this.pausedConnections = new Set();
    this.pendingDataBuffers = new Map();
  }

  /**
   * Forward data from TCP socket to WebSocket
   */
  forwardTcpToWebSocket(socket, connectionId) {
    socket.on('data', (data) => {
      if (this.pausedConnections.has(connectionId)) {
        this.logger.debug('Connection paused, buffering data', { connectionId });
        // バッファに保存（破棄しない）
        const buffer = this.pendingDataBuffers.get(connectionId);
        if (buffer) {
          buffer.push(data);
          this.logger.debug('Data buffered', {
            connectionId,
            bytes: data.length,
            bufferSize: buffer.length
          });
        }
        return;
      }

      try {
        const message = createDataMessage(connectionId, data);
        this.wsServer.sendMessage(message);
        
        this.logger.debug('Data forwarded TCP->WS', {
          connectionId,
          bytes: data.length
        });
      } catch (error) {
        this.logger.error('Error forwarding TCP->WS', { connectionId, error });
      }
    });

    socket.on('end', () => {
      this.logger.debug('TCP socket ended', { connectionId });
    });

    socket.on('error', (error) => {
      this.logger.error('TCP socket error', { connectionId, error: error.message });
    });
  }

  /**
   * Forward data from WebSocket to TCP socket
   */
  forwardWebSocketToTcp(message, socket) {
    if (message.type !== MessageType.DATA || !message.data) {
      return;
    }

    try {
      const data = decodeData(message.data);
      
      // Check if socket is writable
      if (!socket.writable) {
        this.logger.warn('Socket not writable', { connectionId: message.connectionId });
        return;
      }

      // Write data with backpressure handling
      const canContinue = socket.write(data);
      
      if (!canContinue) {
        this.logger.debug('Backpressure detected, pausing', { 
          connectionId: message.connectionId 
        });
        this.pausedConnections.add(message.connectionId);
        
        socket.once('drain', () => {
          this.logger.debug('Drain event, resuming', { 
            connectionId: message.connectionId 
          });
          this.pausedConnections.delete(message.connectionId);
        });
      }

      this.logger.debug('Data forwarded WS->TCP', { 
        connectionId: message.connectionId, 
        bytes: data.length 
      });
    } catch (error) {
      this.logger.error('Error forwarding WS->TCP', { 
        connectionId: message.connectionId, 
        error 
      });
    }
  }

  /**
   * Pause forwarding for a connection
   */
  pause(connectionId) {
    this.pausedConnections.add(connectionId);
    this.pendingDataBuffers.set(connectionId, []);
    this.logger.debug('Connection paused', { connectionId });
  }

  /**
   * Resume forwarding for a connection
   */
  resume(connectionId) {
    this.pausedConnections.delete(connectionId);
    
    // バッファ内のデータを送信
    const buffered = this.pendingDataBuffers.get(connectionId);
    if (buffered && buffered.length > 0) {
      this.logger.debug('Sending buffered data', {
        connectionId,
        bufferCount: buffered.length
      });
      
      for (const data of buffered) {
        try {
          const message = createDataMessage(connectionId, data);
          this.wsServer.sendMessage(message);
          this.logger.debug('Buffered data sent', {
            connectionId,
            bytes: data.length
          });
        } catch (error) {
          this.logger.error('Error sending buffered data', { connectionId, error });
        }
      }
    }
    
    this.pendingDataBuffers.delete(connectionId);
    this.logger.debug('Connection resumed', { connectionId });
  }

  /**
   * Check if connection is paused
   */
  isPaused(connectionId) {
    return this.pausedConnections.has(connectionId);
  }

  /**
   * Clear all paused connections
   */
  clearPaused() {
    this.pausedConnections.clear();
    this.pendingDataBuffers.clear();
  }
}

module.exports = DataForwarder;

// Made with Bob
