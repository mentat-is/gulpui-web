import { Console } from '@impactium/console';
import { MinMax } from './QueryMaxMin.dto';

export class Logger {
  protected static messages: Console.History[] = [];

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

  public static store(level: Console.LogLevel, message: string, context?: string, trace?: string) {
    Logger.messages.push({ level, message: Logger.format(level, message, context, trace) });
  }

  public static history = () => Logger.messages;

  public static clear = () => Logger.messages = [];

  public static push = (message: string) => Logger.messages.push({ level: 'fatal', message });

  private static preformat: Record<Console.LogLevel, keyof typeof λLogger> = {
    log: 'green',
    warn: 'yellow',
    error: 'red',
    debug: 'magenta',
    verbose: 'cyan',
    fatal: 'white'
  }

  private static format(level: Console.LogLevel, message: any, context?: string, trace?: string) {
    const timestamp = new Date().toISOString();
    const pid = `${typeof process !== 'undefined' ? ` ${process.pid}` : ''}`;
    const contextInfo = context ? `[${context}] ` : '';
    const traceInfo = trace ? ` ${trace}` : '';

    return (λLogger[Logger.preformat[level]] as (text?: string | null) => string)(`[Gulp]${pid} - ${λLogger.white(timestamp)} ${level.toUpperCase().padStart(7, ' ')} ${λLogger.yellow(contextInfo)}${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}${traceInfo}`);
  }
}

export class LoggerHandler {
  public static bucketSelection = (selected: MinMax, timestamp: MinMax) => {
    if (selected.min >= selected.max) {
      Logger.error(`Dates: "selected.min" value > then "selected.max" value.
Values: ${JSON.stringify({ selected }, null, 2)}`, LoggerHandler.name);
    }

    if (selected.min < timestamp.min) {
      Logger.warn(`Dates: "selected.min" value is < then "timestamp.min"
Values: ${JSON.stringify({ selected, timestamp }, null, 2)}`, LoggerHandler.name);
    } else if (selected.max > timestamp.max) {
      Logger.warn(`Dates: "selected.max" value is > then "timestamp.max"
Values: ${JSON.stringify({ selected, timestamp }, null, 2)}`, LoggerHandler.name);
    }

    Logger.log(`Has been selected date from ${new Date(selected.min).toDateString()} to ${new Date(selected.max).toDateString()}`, LoggerHandler.name);
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