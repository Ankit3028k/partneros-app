type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  prefix?: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private prefix: string;
  private static level: LogLevel = 'info';

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  constructor(opts?: { prefix?: string }) {
    this.prefix = opts?.prefix ?? '';
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(Logger.level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      prefix: this.prefix,
      data,
    };

    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const msg = `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(msg, data ?? '');
        break;
      case 'info':
        console.info(msg, data ?? '');
        break;
      case 'warn':
        console.warn(msg, data ?? '');
        break;
      case 'error':
        console.error(msg, data ?? '');
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }
}

export function createLogger(opts?: { prefix?: string }): Logger {
  return new Logger(opts);
}
