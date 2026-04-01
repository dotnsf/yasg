import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Logger, WebSocketMessage } from '../shared/types';
import { serializeMessage, deserializeMessage, validateMessage } from '../shared/protocol';

/**
 * WebSocket Server for gateway communication
 */
export class WebSocketServer {
  private wss: WSServer | null = null;
  private client: WebSocket | null = null;
  private port: number;
  private path: string;
  private logger: Logger;
  private onMessageCallback?: (message: WebSocketMessage) => void;
  private onClientConnectedCallback?: () => void;
  private onClientDisconnectedCallback?: () => void;

  constructor(port: number, path: string, logger: Logger) {
    this.port = port;
    this.path = path;
    this.logger = logger;
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({
          port: this.port,
          path: this.path
        });

        this.wss.on('connection', (ws: WebSocket) => {
          this.handleConnection(ws);
        });

        this.wss.on('error', (error: Error) => {
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
  stop(): Promise<void> {
    return new Promise((resolve) => {
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
  sendMessage(message: WebSocketMessage): void {
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
  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for client connected
   */
  onClientConnected(callback: () => void): void {
    this.onClientConnectedCallback = callback;
  }

  /**
   * Set callback for client disconnected
   */
  onClientDisconnected(callback: () => void): void {
    this.onClientDisconnectedCallback = callback;
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    // Only allow one client connection
    if (this.client) {
      this.logger.warn('Client already connected, rejecting new connection');
      ws.close(1008, 'Only one client allowed');
      return;
    }

    this.logger.info('Gateway client connected');
    this.client = ws;

    // Set up message handler
    ws.on('message', (data: Buffer) => {
      this.handleMessage(data);
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.logger.info('Gateway client disconnected');
      this.client = null;
      if (this.onClientDisconnectedCallback) {
        this.onClientDisconnectedCallback();
      }
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      this.logger.error('WebSocket client error', { error: error.message });
    });

    // Notify connection
    if (this.onClientConnectedCallback) {
      this.onClientConnectedCallback();
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: Buffer): void {
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

// Made with Bob
