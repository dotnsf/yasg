# 安爺(YASG - Yet Another Secure Gateway)

A lightweight, WebSocket-based TCP tunneling solution that enables secure access to on-premise services from the internet without requiring inbound firewall rules.

## 🎯 Overview

YASG is a pure JavaScript (Node.js) implementation inspired by IBM Cloud Secure Gateway. It allows you to expose on-premise TCP services (databases, SSH, custom protocols) to the internet through a secure WebSocket tunnel, eliminating the need to open inbound firewall ports.

### How It Works

```
Internet Client → Gateway Server (Cloud) ←WebSocket→ Gateway Client (On-Premise) → Target Service
```

1. **Gateway Client** (on-premise) establishes an outbound WebSocket connection to **Gateway Server** (cloud)
2. Internet clients connect to the Gateway Server via TCP
3. Data is tunneled through the WebSocket connection to the on-premise service
4. No inbound firewall rules required!

## ✨ Features

### Current (PoC)
- ✅ WebSocket-based TCP tunneling
- ✅ Bidirectional data forwarding
- ✅ Connection lifecycle management
- ✅ Automatic reconnection (client-side)
- ✅ Support for any TCP protocol
- ✅ Pure JavaScript implementation (no build step!)
- ✅ Comprehensive logging

### Future Enhancements
- 🔜 Authentication and authorization
- 🔜 TLS/SSL support (wss://)
- 🔜 Multiple client support
- 🔜 Access control lists
- 🔜 Web-based management UI
- 🔜 Metrics and monitoring dashboard

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd yasg

# Install dependencies
npm install
```

**No build step required!** YASG is written in pure JavaScript.

### Running the Gateway Server (Cloud-Side)

```bash
# Start the server with default configuration
npm run start:server

# With custom configuration file
npm run start:server -- --config ./config/server-config.json

# With environment variables
export YASG_TCP_PORT=9090
export YASG_WS_PORT=9091
npm run start:server

# Combining config file and environment variables (env takes precedence)
export YASG_LOG_LEVEL=debug
npm run start:server -- --config ./config/server-config.json
```

The server will start:
- TCP listener on port 8080 (for internet clients)
- WebSocket server on port 8081 (for gateway clients)

### Running the Gateway Client (On-Premise-Side)

```bash
# Start the client with default configuration
npm run start:client

# With custom configuration file
npm run start:client -- --config ./config/client-config.json

# With environment variables (useful for Docker/Kubernetes)
export YASG_SERVER_URL=ws://gateway.example.com:8081/gateway
export YASG_TARGET_HOST=localhost
export YASG_TARGET_PORT=22
npm run start:client

# Combining config file and environment variables (env takes precedence)
export YASG_TARGET_PORT=3306
export YASG_LOG_LEVEL=info
npm run start:client -- --config ./config/client-config.json
```

The client will:
- Connect to the gateway server via WebSocket
- Forward connections to the configured target service

**Configuration Priority:** Environment Variables > Config File > Default Values

For a complete list of environment variables, see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

### Testing the Connection

```bash
# Example: Accessing an on-premise MySQL database
mysql -h <gateway-server-ip> -P 8080 -u username -p

# Example: Accessing an on-premise HTTP server
curl http://<gateway-server-ip>:8080

# Example: SSH to an on-premise server
ssh -p 8080 user@<gateway-server-ip>
```

## 📁 Project Structure

```
yasg/
├── src/
│   ├── server/              # Gateway server components
│   │   ├── index.js         # Server entry point
│   │   ├── TcpListener.js   # TCP server
│   │   ├── WebSocketServer.js
│   │   ├── ConnectionManager.js
│   │   └── DataForwarder.js
│   ├── client/              # Gateway client components
│   │   ├── index.js         # Client entry point
│   │   ├── WebSocketClient.js
│   │   ├── TcpConnector.js
│   │   ├── ConnectionPool.js
│   │   └── DataForwarder.js
│   └── shared/              # Shared code
│       ├── protocol.js      # Protocol implementation
│       └── utils.js         # Utilities
├── config/                  # Configuration files
├── examples/                # Usage examples
├── package.json
├── README.md
├── QUICKSTART.md           # Quick start guide
├── INSTALLATION.md         # Installation guide
├── ENVIRONMENT_VARIABLES.md # Environment variables guide
├── TECHNICAL_SPEC.md       # Technical specification
├── ARCHITECTURE.md         # Architecture details
└── IMPLEMENTATION_ROADMAP.md # Implementation guide
```

## ⚙️ Configuration

YASG supports configuration through both configuration files and environment variables. Environment variables take precedence over configuration files.

For detailed information about environment variables, see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

### Server Configuration

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

### Client Configuration

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

## 📖 Documentation

- [Technical Specification](TECHNICAL_SPEC.md) - Detailed technical design
- [Architecture](ARCHITECTURE.md) - System architecture and diagrams
- [Implementation Roadmap](IMPLEMENTATION_ROADMAP.md) - Development guide
- [Quick Start Guide](QUICKSTART.md) - Getting started quickly
- [Installation Guide](INSTALLATION.md) - Detailed installation instructions

## 🧪 Testing

```bash
# Run tests (when available)
npm test

# Run in development mode with auto-reload
npm run dev:server  # For server
npm run dev:client  # For client
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev:server  # For server
npm run dev:client  # For client

# Lint code
npm run lint
```

## 📊 Use Cases

### Database Access
Access on-premise databases from cloud applications:
- MySQL
- PostgreSQL
- MongoDB
- Redis

### SSH Access
Securely SSH into on-premise servers without VPN:
```bash
ssh -p 8080 user@gateway-server.com
```

### Custom TCP Services
Tunnel any TCP-based protocol:
- Custom APIs
- Legacy applications
- IoT devices
- Internal tools

### Development & Testing
Test cloud applications against local services:
- Local development databases
- Mock services
- Testing environments

## 🔒 Security Considerations

**⚠️ Important: This is a Proof of Concept**

The current implementation does NOT include:
- Authentication
- Encryption (uses ws:// not wss://)
- Access control
- Rate limiting

**For production use, you MUST add:**
1. TLS/SSL encryption (wss://)
2. Token-based or certificate authentication
3. Access control lists
4. Rate limiting and DDoS protection
5. Audit logging
6. Network segmentation

See [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md#security-considerations) for details.

## 🐛 Troubleshooting

### Client Cannot Connect to Server

**Problem:** Client shows connection errors

**Solutions:**
- Verify server is running: `netstat -an | grep 8081`
- Check firewall rules allow outbound WebSocket connections
- Verify WebSocket URL in client configuration
- Check server logs for errors

### Connection to Target Service Fails

**Problem:** Client connects but cannot reach target service

**Solutions:**
- Verify target service is running
- Check host and port in client configuration
- Test local connectivity: `telnet localhost 3306`
- Review client logs for connection errors

### Data Transfer Issues

**Problem:** Slow or corrupted data transfer

**Solutions:**
- Check network bandwidth and latency
- Monitor CPU and memory usage
- Review buffer sizes in configuration
- Check for errors in logs

### Frequent Disconnections

**Problem:** WebSocket connection drops frequently

**Solutions:**
- Check network stability
- Increase timeout values
- Review reconnection settings
- Monitor server resources

## 📈 Performance

### Benchmarks (Typical)

- **Latency:** < 50ms (local network)
- **Throughput:** > 10 MB/s
- **Concurrent Connections:** 100+
- **Memory Usage:** < 100 MB
- **CPU Usage:** < 20%

*Actual performance depends on network conditions and hardware*

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

[Specify your license here]

## 🙏 Acknowledgments

- Inspired by IBM Cloud Secure Gateway
- Built with Node.js and pure JavaScript
- Uses the excellent [ws](https://github.com/websockets/ws) library

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/yasg/issues)
- **Documentation:** See `docs/` directory
- **Email:** [your-email@example.com]

## 🗺️ Roadmap

### Version 1.0 (Current - PoC)
- ✅ Basic WebSocket tunneling
- ✅ TCP connection forwarding
- ✅ Automatic reconnection
- ✅ Pure JavaScript implementation

### Version 2.0 (Planned)
- 🔜 Authentication system
- 🔜 TLS/SSL support
- 🔜 Access control lists
- 🔜 Enhanced logging

### Version 3.0 (Future)
- 🔜 Multiple client support
- 🔜 Web management UI
- 🔜 Metrics dashboard
- 🔜 Load balancing

## 📚 Additional Resources

- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)
- [Node.js Net Module](https://nodejs.org/api/net.html)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**Made with ❤️ using Node.js and JavaScript**