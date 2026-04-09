# Environment Variables

YASG supports configuration through environment variables. Environment variables take precedence over configuration files, allowing for flexible deployment in containerized environments.

## Configuration Priority

The configuration is loaded in the following order (highest priority first):

1. **Environment Variables** (highest priority)
2. **Configuration File** (specified with `--config`)
3. **Default Values** (lowest priority)

## Server Environment Variables

### TCP Configuration
- `YASG_TCP_HOST` - TCP listener host address (default: `0.0.0.0`)
- `YASG_TCP_PORT` - TCP listener port (default: `8080`)

### WebSocket Configuration
- `YASG_WS_PORT` - WebSocket server port (default: `8081`)
- `YASG_WS_PATH` - WebSocket server path (default: `/gateway`)

### Connection Configuration
- `YASG_CONN_TIMEOUT` - Connection timeout in milliseconds (default: `600000` = 10 minutes)
- `YASG_CONN_MAX` - Maximum number of concurrent connections (default: `100`)

### Security Configuration
- `YASG_SECURITY_KEYWORD` - Authentication keyword for client connections (default: empty = no authentication)

### Logging Configuration
- `YASG_LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)

## Client Environment Variables

### Server Configuration
- `YASG_SERVER_URL` - Gateway server WebSocket URL (default: `ws://localhost:8081/gateway`)
- `YASG_SERVER_RECONNECT` - Enable automatic reconnection: `true` or `false` (default: `true`)
- `YASG_SERVER_RECONNECT_INTERVAL` - Reconnection interval in milliseconds (default: `5000`)
- `YASG_SERVER_MAX_RECONNECT_ATTEMPTS` - Maximum reconnection attempts (default: `10`)

### Target Configuration
- `YASG_TARGET_HOST` - Target service host (default: `localhost`)
- `YASG_TARGET_PORT` - Target service port (default: `3306`)

### Connection Configuration
- `YASG_CONN_TIMEOUT` - Connection timeout in milliseconds (default: `600000` = 10 minutes)
- `YASG_CONN_POOL_SIZE` - Connection pool size (default: `10`)

### Security Configuration
- `YASG_SECURITY_KEYWORD` - Authentication keyword for server connection (default: empty = no authentication)

### Logging Configuration
- `YASG_LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)

## Usage Examples

### Server with Environment Variables

```bash
# Linux/macOS
export YASG_TCP_PORT=9090
export YASG_WS_PORT=9091
export YASG_SECURITY_KEYWORD=my-secret-key
export YASG_LOG_LEVEL=debug
npm run start:server

# Windows PowerShell
$env:YASG_TCP_PORT=9090
$env:YASG_WS_PORT=9091
$env:YASG_SECURITY_KEYWORD="my-secret-key"
$env:YASG_LOG_LEVEL="debug"
npm run start:server

# Windows Command Prompt
set YASG_TCP_PORT=9090
set YASG_WS_PORT=9091
set YASG_SECURITY_KEYWORD=my-secret-key
set YASG_LOG_LEVEL=debug
npm run start:server
```

### Client with Environment Variables

```bash
# Linux/macOS
export YASG_SERVER_URL=ws://gateway.example.com:8081/gateway
export YASG_TARGET_HOST=localhost
export YASG_TARGET_PORT=22
export YASG_SECURITY_KEYWORD=my-secret-key
export YASG_LOG_LEVEL=info
npm run start:client

# Windows PowerShell
$env:YASG_SERVER_URL="ws://gateway.example.com:8081/gateway"
$env:YASG_TARGET_HOST="localhost"
$env:YASG_TARGET_PORT=22
$env:YASG_SECURITY_KEYWORD="my-secret-key"
$env:YASG_LOG_LEVEL="info"
npm run start:client
```

### Combining Config File and Environment Variables

Environment variables override config file settings:

```bash
# Use config file for most settings
export YASG_TARGET_PORT=22
export YASG_LOG_LEVEL=debug
node src/client/index.js --config config/client-config.json

# The above will use:
# - Port 22 from environment variable (overrides config file)
# - Debug log level from environment variable (overrides config file)
# - All other settings from config file
```

### Docker Example

```dockerfile
# Dockerfile for server
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production

ENV YASG_TCP_HOST=0.0.0.0
ENV YASG_TCP_PORT=8080
ENV YASG_WS_PORT=8081
ENV YASG_LOG_LEVEL=info

CMD ["node", "src/server/index.js"]
```

```dockerfile
# Dockerfile for client
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production

ENV YASG_SERVER_URL=ws://gateway-server:8081/gateway
ENV YASG_TARGET_HOST=database
ENV YASG_TARGET_PORT=3306
ENV YASG_LOG_LEVEL=info

CMD ["node", "src/client/index.js"]
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  gateway-server:
    build:
      context: .
      dockerfile: Dockerfile.server
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      YASG_TCP_HOST: 0.0.0.0
      YASG_TCP_PORT: 8080
      YASG_WS_PORT: 8081
      YASG_LOG_LEVEL: info

  gateway-client:
    build:
      context: .
      dockerfile: Dockerfile.client
    environment:
      YASG_SERVER_URL: ws://gateway-server:8081/gateway
      YASG_TARGET_HOST: mysql
      YASG_TARGET_PORT: 3306
      YASG_LOG_LEVEL: info
    depends_on:
      - gateway-server
      - mysql

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: password
```

## Kubernetes Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: yasg-client-config
data:
  YASG_SERVER_URL: "ws://yasg-server:8081/gateway"
  YASG_TARGET_HOST: "database-service"
  YASG_TARGET_PORT: "3306"
  YASG_LOG_LEVEL: "info"
  YASG_CONN_TIMEOUT: "600000"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yasg-client
spec:
  replicas: 1
  selector:
    matchLabels:
      app: yasg-client
  template:
    metadata:
      labels:
        app: yasg-client
    spec:
      containers:
      - name: yasg-client
        image: yasg-client:latest
        envFrom:
        - configMapRef:
            name: yasg-client-config
```

## Security with Keyword Authentication

YASG supports optional keyword-based authentication to prevent unauthorized clients from connecting to your gateway server.

### How It Works

1. **Server Configuration**: Set a keyword on the server using `YASG_SECURITY_KEYWORD` or in the config file
2. **Client Configuration**: Set the same keyword on the client using `YASG_SECURITY_KEYWORD` or in the config file
3. **Authentication**: When the client connects, it sends the keyword as a query parameter
4. **Validation**: The server validates the keyword and rejects connections with mismatched or missing keywords

### Example with Keyword Authentication

```bash
# Server
export YASG_SECURITY_KEYWORD=my-super-secret-key-12345
npm run start:server

# Client
export YASG_SECURITY_KEYWORD=my-super-secret-key-12345
npm run start:client
```

### Behavior

- **No keyword set on server**: All client connections are accepted (backward compatible)
- **Keyword set on server, no keyword from client**: Connection rejected with "keyword not matched."
- **Keyword set on server, wrong keyword from client**: Connection rejected with "keyword not matched."
- **Keyword set on server, correct keyword from client**: Connection accepted

### Security Recommendations

1. **Use Strong Keywords**: Use long, random strings (e.g., generated with `openssl rand -hex 32`)
2. **Rotate Keywords Regularly**: Change keywords periodically for better security
3. **Use Environment Variables**: Never commit keywords to version control
4. **Consider TLS**: For production, use WSS (WebSocket Secure) with TLS encryption
5. **Combine with Firewall Rules**: Use keyword authentication in addition to network-level security

## Best Practices

1. **Use Config Files for Development**: Config files are easier to manage during development
2. **Use Environment Variables for Production**: Environment variables are more secure and flexible for production deployments
3. **Never Commit Secrets**: Don't commit sensitive values (especially keywords) in config files; use environment variables or secret management systems
4. **Document Your Variables**: Keep track of which environment variables your deployment uses
5. **Use Defaults Wisely**: Set sensible defaults that work for most use cases
6. **Enable Keyword Authentication**: Always use keyword authentication in production environments

## Troubleshooting

### Check Current Configuration

The application logs which configuration sources are being used at startup:

```
Configuration loaded from:
  - Default values
  - Config file: config/client-config.json
  - Environment variables (highest priority)
```

### Verify Environment Variables

```bash
# Linux/macOS
env | grep YASG_

# Windows PowerShell
Get-ChildItem Env: | Where-Object { $_.Name -like "YASG_*" }

# Windows Command Prompt
set | findstr YASG_
```

### Common Issues

1. **Port Already in Use**: Check if `YASG_TCP_PORT` or `YASG_WS_PORT` conflicts with other services
2. **Connection Refused**: Verify `YASG_SERVER_URL` is correct and the server is running
3. **Target Unreachable**: Ensure `YASG_TARGET_HOST` and `YASG_TARGET_PORT` are correct and accessible
4. **Type Errors**: Ensure numeric values (ports, timeouts) are valid integers
5. **Boolean Values**: Use `true` or `false` (lowercase) for boolean environment variables