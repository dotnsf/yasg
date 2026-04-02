/**
 * Log levels
 */
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Simple console logger implementation
 */
class ConsoleLogger {
  constructor(level = 'info') {
    this.level = this.parseLevel(level);
  }

  parseLevel(level) {
    switch (level.toLowerCase()) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    return `[${timestamp}] [${level}] ${message}${argsStr}`;
  }

  error(message, ...args) {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message, ...args) {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  info(message, ...args) {
    if (this.level >= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message, ...args) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxAttempts, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        i++;
      } else {
        result[key] = 'true';
      }
    }
  }
  
  return result;
}

module.exports = {
  ConsoleLogger,
  formatBytes,
  sleep,
  retryWithBackoff,
  parseArgs
};

// Made with Bob
