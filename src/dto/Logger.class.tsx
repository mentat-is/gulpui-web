import { History, LogLevel } from '@impactium/console';

export class Logger {
  protected static messages: History[] = [];

  static log(message: any, context?: string) {
    Logger.store('log', message, context);
  }

  static error(message: any, context?: string) {
    Logger.store('error', message, context);
  }

  static warn(message: any, context?: string) {
    Logger.store('warn', message, context);
  }

  static debug(message: any, context?: string) {
    Logger.store('debug', message, context);
  }

  static verbose(message: any, context?: string) {
    Logger.store('verbose', message, context);
  }

  
  static fatal(message: any, context?: string) {
    Logger.store('fatal', message, context);
  }

  public static store(level: LogLevel, message: string, context?: string, trace?: string) {
    Logger.messages.push({ level, message: Logger.format(level, message, context, trace) });
  }

  public static history = () => Logger.messages;

  public static clear = () => Logger.messages = [];

  public static push = (message: string) => Logger.messages.push({ level: 'fatal', message });

  private static preformat: Record<LogLevel, keyof typeof λLogger> = {
    log: 'green',
    warn: 'yellow',
    error: 'red',
    debug: 'magenta',
    verbose: 'cyan',
    fatal: 'white'
  }

  private static format(level: LogLevel, message: any, context?: string, trace?: string) {
    const timestamp = new Date().toISOString();
    const pid = `${typeof process !== 'undefined' ? ` ${process.pid}` : ''}`;
    const contextInfo = context ? `[${context}] ` : '';
    const traceInfo = trace ? ` ${trace}` : '';

    return (λLogger[Logger.preformat[level]] as (text?: string | null) => string)(`[Gulp]${pid} - ${λLogger.white(timestamp)} ${level.toUpperCase().padStart(7, ' ')} ${λLogger.yellow(contextInfo)}${message}${traceInfo}`);
  }
}


export class λLogger {
  public static red = (text?: string | null) => `\x1b[31m${text}\x1b[0m`;
  public static green = (text?: string | null) => `\x1b[32m${text}\x1b[0m`;
  public static yellow = (text?: string | null) => `\x1b[33m${text}\x1b[0m`;
  public static blue = (text?: string | null) => `\x1b[34m${text}\x1b[0m`;
  public static magenta = (text?: string | null) => `\x1b[35m${text}\x1b[0m`;  
  public static cyan = (text?: string | null) => `\x1b[36m${text}\x1b[0m`;
  public static white = (text?: string | null) => `\x1b[37m${text}\x1b[0m`;

  public static bold = (text: string | null) => `\x1b[1m${text}\x1b[0m`;
  public static bold_red = (text?: string | null) => `\x1b[31m\x1b[1m${text}\x1b[0m`;
}