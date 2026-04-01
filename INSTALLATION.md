# YASG Installation Guide

Complete guide to installing and setting up YASG (Yet Another Secure Gateway).

## System Requirements

### Minimum Requirements
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher (comes with Node.js)
- **RAM:** 512 MB minimum
- **Disk Space:** 100 MB for installation

### Recommended Requirements
- **Node.js:** v20.0.0 or higher
- **RAM:** 1 GB or more
- **Network:** Stable internet connection
- **OS:** Linux, macOS, or Windows

## Installation Steps

### 1. Install Node.js

#### On Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### On macOS
```bash
brew install node
```

#### On Windows
Download and install from [nodejs.org](https://nodejs.org/)

### 2. Verify Installation
```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v9.0.0 or higher
```

### 3. Clone or Download YASG

```bash
# If using git
git clone <repository-url>
cd yasg

# Or download and extract the ZIP file
```

### 4. Install Dependencies

```bash
cd yasg
npm install
```

This will install:
- `ws` - WebSocket library
- `@types/node` - Node.js type definitions
- `@types/ws` - WebSocket type definitions
- TypeScript and other dev dependencies

### 5. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 6. Verify Installation

```bash
# Check if build was successful
ls dist/server/index.js
ls dist/client/index.js
```

## Configuration

### Server Configuration

1. Copy the example configuration:
```bash
cp config/server-config.example.json config/server-config.json
```

2. Edit `config/server-config.json`:
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

1. Copy the example configuration:
```bash
cp config/client-config.example.json config/client-config.json
```

2. Edit `config/client-config.json`:
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

## Firewall Configuration

### Server-Side (Cloud)

Open the following ports:

```bash
# TCP port for client connections
sudo ufw allow 8080/tcp

# WebSocket port for gateway client
sudo ufw allow 8081/tcp

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
```

### Client-Side (On-Premise)

Ensure outbound connections are allowed:
- Port 8081 (WebSocket to gateway server)

Most firewalls allow outbound connections by default.

## Running as a Service

### Using PM2 (Recommended)

1. Install PM2:
```bash
npm install -g pm2
```

2. Start server:
```bash
pm2 start dist/server/index.js --name yasg-server
```

3. Start client:
```bash
pm2 start dist/client/index.js --name yasg-client
```

4. Save PM2 configuration:
```bash
pm2 save
```

5. Enable PM2 startup:
```bash
pm2 startup
# Follow the instructions shown
```

6. Manage services:
```bash
pm2 list              # List all services
pm2 logs yasg-server  # View server logs
pm2 logs yasg-client  # View client logs
pm2 restart yasg-server
pm2 stop yasg-server
pm2 delete yasg-server
```

### Using systemd (Linux)

1. Create server service file `/etc/systemd/system/yasg-server.service`:
```ini
[Unit]
Description=YASG Gateway Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/yasg
ExecStart=/usr/bin/node /path/to/yasg/dist/server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Create client service file `/etc/systemd/system/yasg-client.service`:
```ini
[Unit]
Description=YASG Gateway Client
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/yasg
ExecStart=/usr/bin/node /path/to/yasg/dist/client/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable yasg-server
sudo systemctl start yasg-server
sudo systemctl enable yasg-client
sudo systemctl start yasg-client
```

4. Manage services:
```bash
sudo systemctl status yasg-server
sudo systemctl restart yasg-server
sudo systemctl stop yasg-server
sudo journalctl -u yasg-server -f  # View logs
```

## Docker Installation (Optional)

### Server Dockerfile

Create `Dockerfile.server`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080 8081

CMD ["node", "dist/server/index.js"]
```

Build and run:
```bash
docker build -f Dockerfile.server -t yasg-server .
docker run -d -p 8080:8080 -p 8081:8081 --name yasg-server yasg-server
```

### Client Dockerfile

Create `Dockerfile.client`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/client/index.js"]
```

Build and run:
```bash
docker build -f Dockerfile.client -t yasg-client .
docker run -d --name yasg-client yasg-client
```

## Verification

### Test Server

```bash
# Check if server is listening
netstat -an | grep 8080
netstat -an | grep 8081

# Or using ss
ss -tuln | grep 8080
ss -tuln | grep 8081
```

### Test Client Connection

```bash
# Check client logs
pm2 logs yasg-client

# Should see:
# "Connected to gateway server"
```

### Test End-to-End

```bash
# Example: Test with netcat
nc your-gateway-server.com 8080
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8080
# Or
netstat -tulpn | grep 8080

# Kill the process
kill -9 <PID>
```

### Permission Denied

```bash
# Use ports > 1024 or run with sudo
# Or use setcap (Linux)
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors

```bash
# Install type definitions
npm install --save-dev @types/node @types/ws

# Clean and rebuild
npm run clean
npm run build
```

## Updating

```bash
# Pull latest changes
git pull

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Restart services
pm2 restart yasg-server
pm2 restart yasg-client
```

## Uninstallation

```bash
# Stop services
pm2 stop yasg-server yasg-client
pm2 delete yasg-server yasg-client

# Or with systemd
sudo systemctl stop yasg-server yasg-client
sudo systemctl disable yasg-server yasg-client
sudo rm /etc/systemd/system/yasg-*.service

# Remove files
cd ..
rm -rf yasg
```

## Next Steps

- Read [QUICKSTART.md](QUICKSTART.md) for basic usage
- Review [USAGE_GUIDE.md](USAGE_GUIDE.md) for detailed instructions
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design

## Support

If you encounter issues:
1. Check the logs for error messages
2. Review the troubleshooting section
3. Consult the documentation
4. Report bugs with detailed information

---

**Installation Complete! 🎉**