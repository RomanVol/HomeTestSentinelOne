/**
 * Provides lightweight timestamped logging for tests and infrastructure code.
 */
export class StepLogger {
  private readonly prefix: string;

  /**
   * Creates a logger instance for a specific project or component scope.
   */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * Logs an informational message with a stable prefix and timestamp.
   */
  info(message: string, details?: Record<string, unknown>): void {
    this.write('INFO', message, details);
  }

  /**
   * Logs a warning message with a stable prefix and timestamp.
   */
  warn(message: string, details?: Record<string, unknown>): void {
    this.write('WARN', message, details);
  }

  /**
   * Logs an error message with a stable prefix and timestamp.
   */
  error(message: string, details?: Record<string, unknown>): void {
    this.write('ERROR', message, details);
  }

  /**
   * Serializes and prints a single log line to the terminal.
   */
  private write(level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const suffix = details ? ` ${JSON.stringify(details)}` : '';
    console.log(`[${timestamp}] [${this.prefix}] [${level}] ${message}${suffix}`);
  }
}

