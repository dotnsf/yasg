# YASG Quick Start Guide

Get up and running with YASG in 5 minutes!

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- A target service to tunnel (e.g., MySQL, SSH, HTTP server)

## Installation

```bash
cd yasg
npm install
```

That's it! No build step required - YASG is written in pure JavaScript.

## Running the Gateway Server (Cloud-Side)

The gateway server should run on a machine accessible from the internet (e.g., cloud VPS).

```bash
# Start with default configuration
npm run start:server
```

The server will start:
- **TCP Listener:** `0.0.0.0:8080` (for internet clients)
- **WebSocket Server:** `0.0.0.0:8081` (for gateway clients)

### Custom Configuration

Create `config/server-config.json`:

```json
{
  "tcp": {
    "host": "0.0.0.0",
    "port": 8080
  },
  "websocket": {
    "port": 8081,
    "path": "/gateway"
  },
  "connection": {
    "timeout": 30000,
    "maxConnections": 100
  },
  "logging": {
    "level": "info"
  }
}
```

## Running the Gateway Client (On-Premise-Side)

The gateway client should run on your on-premise network where the target service is accessible.

```bash
# Start with default configuration (targets localhost:3306)
npm run start:client
```

### Custom Configuration

Create `config/client-config.json`:

```json
{
  "server": {
    "url": "ws://your-gateway-server.com:8081/gateway",
    "reconnect": true,
    "reconnectInterval": 5000,
    "maxReconnectAttempts": 10
  },
  "target": {
    "host": "localhost",
    "port": 3306
  },
  "connection": {
    "timeout": 30000,
    "poolSize": 10
  },
  "logging": {
    "level": "info"
  }
}
```

## Testing the Connection

### Example 1: MySQL Database

**On-Premise:** MySQL running on `localhost:3306`

**Client Configuration:**
```json
{
  "target": {
    "host": "localhost",
    "port": 3306
  }
}
```

**Connect from anywhere:**
```bash
mysql -h your-gateway-server.com -P 8080 -u username -p
```

### Example 2: SSH Server

**On-Premise:** SSH server on `localhost:22`

**Client Configuration:**
```json
{
  "target": {
    "host": "localhost",
    "port": 22
  }
}
```

**Connect from anywhere:**
```bash
ssh -p 8080 user@your-gateway-server.com
```

### Example 3: HTTP Server

**On-Premise:** Web server on `localhost:3000`

**Client Configuration:**
```json
{
  "target": {
    "host": "localhost",
    "port": 3000
  }
}
```

**Access from anywhere:**
```bash
curl http://your-gateway-server.com:8080
```

## Development Mode

For development with auto-reload:

```bash
# Terminal 1: Run server in dev mode
npm run dev:server

# Terminal 2: Run client in dev mode
npm run dev:client
```

## Troubleshooting

### Client Cannot Connect

**Problem:** `Error: connect ECONNREFUSED`

**Solution:**
- Verify server is running
- Check firewall allows outbound connections on port 8081
- Verify WebSocket URL in client config

### Connection to Target Fails

**Problem:** `Error: connect ECONNREFUSED` (from client)

**Solution:**
- Verify target service is running
- Check host and port in client config
- Test local connectivity: `telnet localhost 3306`

### Module Not Found

**Problem:** `Cannot find module 'ws'`

**Solution:**
```bash
npm install
```

## Next Steps

- Read the [Usage Guide](USAGE_GUIDE.md) for detailed information
- Review [Architecture](ARCHITECTURE.md) to understand the system
- Check [Technical Specification](TECHNICAL_SPEC.md) for implementation details

## Security Warning

⚠️ **This is a Proof of Concept**

The current implementation does NOT include:
- Authentication
- Encryption (uses ws:// not wss://)
- Access control
- Rate limiting

**DO NOT use in production without adding security features!**

## Support

- **Issues:** Report bugs and request features
- **Documentation:** See the `docs/` directory
- **Examples:** Check the `examples/` directory

---

**Happy Tunneling! 🚀**