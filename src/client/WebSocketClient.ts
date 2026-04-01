import WebSocket from 'ws';
import { Logger, WebSocketMessage } from '../shared/types';
import { serializeMessage, deserializeMessage, validateMessage } from '../shared/protocol';
import { sleep } from '../shared/utils';

/**
 * WebSocket Client for gateway communication
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private logger: Logger;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private onMessageCallback?: (message: WebSocketMessage) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;

  constructor(
    url: string,
    reconnect: boolean,
    reconnectInterval: number,
    maxReconnectAttempts: number,
    logger: Logger
  ) {
    this.url = url;
    this.reconnect = reconnect;
    this.reconnectInterval = reconnectInterval;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.logger = logger;
  }

  /**
   * Connect to the gateway server
   */
  async connect(): Promise<void> {
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
  disconnect(): void {
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
  sendMessage(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      this.logger.warn('Cannot send message, not connected');
      return;
    }

    try {
      const data = serializeMessage(message);
      this.ws!.send(data);
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
   * Set callback for connected event
   */
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  /**
   * Set callback for disconnected event
   */
  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Perform the actual connection
   */
  private doConnect(): Promise<void> {
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

      this.ws.on('message', (data: Buffer) => {
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

      this.ws.on('error', (error: Error) => {
        this.logger.error('WebSocket error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(): Promise<void> {
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
