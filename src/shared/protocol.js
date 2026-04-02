/**
 * WebSocket message types for the gateway protocol
 */
const MessageType = {
  CONNECT_REQUEST: 'CONNECT_REQUEST',
  CONNECT_SUCCESS: 'CONNECT_SUCCESS',
  CONNECT_ERROR: 'CONNECT_ERROR',
  DATA: 'DATA',
  DISCONNECT: 'DISCONNECT',
  DISCONNECT_ACK: 'DISCONNECT_ACK',
  PING: 'PING',
  PONG: 'PONG'
};

/**
 * Connection state
 */
const ConnectionState = {
  PENDING: 'PENDING',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTING: 'DISCONNECTING',
  CLOSED: 'CLOSED',
  FAILED: 'FAILED'
};

/**
 * Generate a unique connection ID
 */
function generateConnectionId() {
  return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Encode binary data to Base64 string
 */
function encodeData(buffer) {
  return buffer.toString('base64');
}

/**
 * Decode Base64 string to binary data
 */
function decodeData(data) {
  return Buffer.from(data, 'base64');
}

/**
 * Create a CONNECT_REQUEST message
 */
function createConnectRequest(connectionId, target) {
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
function createConnectSuccess(connectionId) {
  return {
    type: MessageType.CONNECT_SUCCESS,
    connectionId,
    timestamp: Date.now()
  };
}

/**
 * Create a CONNECT_ERROR message
 */
function createConnectError(connectionId, error) {
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
function createDataMessage(connectionId, data) {
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
function createDisconnect(connectionId) {
  return {
    type: MessageType.DISCONNECT,
    connectionId,
    timestamp: Date.now()
  };
}

/**
 * Create a DISCONNECT_ACK message
 */
function createDisconnectAck(connectionId) {
  return {
    type: MessageType.DISCONNECT_ACK,
    connectionId,
    timestamp: Date.now()
  };
}

/**
 * Create a PING message
 */
function createPing() {
  return {
    type: MessageType.PING,
    connectionId: 'ping',
    timestamp: Date.now()
  };
}

/**
 * Create a PONG message
 */
function createPong() {
  return {
    type: MessageType.PONG,
    connectionId: 'pong',
    timestamp: Date.now()
  };
}

/**
 * Serialize a WebSocket message to JSON string
 */
function serializeMessage(message) {
  return JSON.stringify(message);
}

/**
 * Deserialize a JSON string to WebSocket message
 */
function deserializeMessage(data) {
  return JSON.parse(data);
}

/**
 * Validate a WebSocket message
 */
function validateMessage(message) {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    Object.values(MessageType).includes(message.type) &&
    typeof message.connectionId === 'string' &&
    typeof message.timestamp === 'number'
  );
}

module.exports = {
  MessageType,
  ConnectionState,
  generateConnectionId,
  encodeData,
  decodeData,
  createConnectRequest,
  createConnectSuccess,
  createConnectError,
  createDataMessage,
  createDisconnect,
  createDisconnectAck,
  createPing,
  createPong,
  serializeMessage,
  deserializeMessage,
  validateMessage
};

// Made with Bob
