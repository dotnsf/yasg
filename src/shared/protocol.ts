import { WebSocketMessage, MessageType, TargetConfig } from './types';

/**
 * Generate a unique connection ID
 */
export function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Encode binary data to Base64 string
 */
export function encodeData(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Decode Base64 string to binary data
 */
export function decodeData(data: string): Buffer {
  return Buffer.from(data, 'base64');
}

/**
 * Create a CONNECT_REQUEST message
 */
export function createConnectRequest(
  connectionId: string,
  target: TargetConfig
): WebSocketMessage {
  return {
    type: MessageType.CONNECT_REQUEST,
    connectionId,
    target,
    timestamp: Date.now()
  };
}

/**
 * Create a CONNECT_SUCCESS message
 */
export function createConnectSuccess(connectionId: string): WebSocketMessage {
  return {
    type: MessageType.CONNECT_SUCCESS,
    connectionId,
    timestamp: Date.now()
  };
}

/**
 * Create a CONNECT_ERROR message
 */
export function createConnectError(
  connectionId: string,
  error: string
): WebSocketMessage {
  return {
    type: MessageType.CONNECT_ERROR,
    connectionId,
    error,
    timestamp: Date.now()
  };
}

/**
 * Create a DATA message
 */
export function createDataMessage(
  connectionId: string,
  data: Buffer
): WebSocketMessage {
  return {
    type: MessageType.DATA,
    connectionId,
    data: encodeData(data),
    timestamp: Date.now()
  };
}

/**
 * Create a DISCONNECT message
 */
export function createDisconnect(connectionId: string): WebSocketMessage {
  return {
    type: MessageType.DISCONNECT,
    connectionId,
    timestamp: Date.now()
  };
}

/**
 * Create a DISCONNECT_ACK message
 */
export function createDisconnectAck(connectionId: string): WebSocketMessage {
  return {
    type: MessageType.DISCONNECT_ACK,
    connectionId,
    timestamp: Date.now()
  };
}

/**
 * Create a PING message
 */
export function createPing(): WebSocketMessage {
  return {
    type: MessageType.PING,
    connectionId: 'ping',
    timestamp: Date.now()
  };
}

/**
 * Create a PONG message
 */
export function createPong(): WebSocketMessage {
  return {
    type: MessageType.PONG,
    connectionId: 'pong',
    timestamp: Date.now()
  };
}

/**
 * Serialize a WebSocket message to JSON string
 */
export function serializeMessage(message: WebSocketMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialize a JSON string to WebSocket message
 */
export function deserializeMessage(data: string): WebSocketMessage {
  return JSON.parse(data) as WebSocketMessage;
}

/**
 * Validate a WebSocket message
 */
export function validateMessage(message: any): message is WebSocketMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    Object.values(MessageType).includes(message.type as MessageType) &&
    typeof message.connectionId === 'string' &&
    typeof message.timestamp === 'number'
  );
}

// Made with Bob
