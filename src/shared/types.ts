/**
 * WebSocket message types for the gateway protocol
 */
export enum MessageType {
  CONNECT_REQUEST = 'CONNECT_REQUEST',
  CONNECT_SUCCESS = 'CONNECT_SUCCESS',
  CONNECT_ERROR = 'CONNECT_ERROR',
  DATA = 'DATA',
  DISCONNECT = 'DISCONNECT',
  DISCONNECT_ACK = 'DISCONNECT_ACK',
  PING = 'PING',
  PONG = 'PONG'
}

/**
 * Target service configuration
 */
export interface TargetConfig {
  host: string;
  port: number;
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: MessageType;
  connectionId: string;
  data?: string; // Base64-encoded binary data
  target?: TargetConfig;
  error?: string;
  timestamp: number;
}

/**
 * Connection state
 */
export enum ConnectionState {
  PENDING = 'PENDING',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  CLOSED = 'CLOSED',
  FAILED = 'FAILED'
}

/**
 * Server configuration
 */
export interface ServerConfig {
  tcp: {
    host: string;
    port: number;
  };
  websocket: {
    port: number;
    path: string;
  };
  connection: {
    timeout: number;
    maxConnections: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Client configuration
 */
export interface ClientConfig {
  server: {
    url: string;
    reconnect: boolean;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  target: {
    host: string;
    port: number;
  };
  connection: {
    timeout: number;
    poolSize: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Logger interface
 */
export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// Made with Bob
