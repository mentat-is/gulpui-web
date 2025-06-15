// @ts-ignore
import { Console } from '@impactium/console'
import { MinMax } from '@/class/Info'
import { λEvent } from './ChunkEvent.dto'
import { Arrayed, Parser } from '@/class/Info'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { λFile } from './Dataset'
import { toast } from 'sonner'
import { Icon } from '@impactium/icons'

interface Options {
  toast?: boolean
  icon?: Icon.Name
}

export class Logger {
  protected static messages: Console.History[] = []

  static log(message: any, context?: Arrayed<string>, options?: Options) {
    Logger.store('log', message, context)
    if (options?.toast) {
      toast(message, {
        icon: options.icon ? <Icon name={options.icon} /> : undefined
      })
    }
  }

  static error(message: any, context?: Arrayed<string>, options?: Options) {
    Logger.store('error', message, context)
    if (options?.toast) {
      toast.error(message, {
        richColors: true,
        icon: options.icon ? <Icon name={options.icon} /> : undefined
      })
    }
  }

  static warn(message: any, context?: Arrayed<string>) {
    Logger.store('warn', message, context)
  }

  static debug(message: any, context?: Arrayed<string>) {
    Logger.store('debug', message, context)
  }

  static verbose(message: any, context?: Arrayed<string>) {
    Logger.store('verbose', message, context)
  }

  static fatal(message: any, context?: Arrayed<string>) {
    Logger.store('fatal', message, context)
  }

  public static store(
    level: Console.LogLevel,
    message: string,
    context?: Arrayed<string>,
    trace?: string,
  ) {
    Logger.messages.push({
      level,
      message: Logger.format(level, message, context, trace),
    })
  }

  public static history = () => Logger.messages

  public static clear = () => (Logger.messages = [])

  public static push = (message: string) =>
    Logger.messages.push({ level: 'fatal', message })

  public static assert = <T extends any>(
    condition: T,
    message: string,
    context?: string,
  ): T => {
    if (!condition) {
      Logger.error(message, context)
    }
    return condition
  }

  private static preformat: Record<Console.LogLevel, keyof typeof λLogger> = {
    log: 'green',
    warn: 'yellow',
    error: 'red',
    debug: 'magenta',
    verbose: 'cyan',
    fatal: 'white',
  }

  private static format(
    level: Console.LogLevel,
    message: any,
    context?: Arrayed<string>,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString()
    const pid = `${typeof process !== 'undefined' ? ` ${process.pid}` : ''}`
    const contextInfo = context ? `[${Parser.array(context).join('.')}] ` : ''
    const traceInfo = trace ? ` ${trace}` : ''

    const log = (
      λLogger[Logger.preformat[level]] as (text?: string | null) => string
    )(
      `[Gulp]${pid} - ${λLogger.white(timestamp)} ${level.toUpperCase().padStart(7, ' ')} ${λLogger.yellow(contextInfo)}${typeof message === 'object' ? JSON.stringify(message, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2) : message}${traceInfo}`,
    )

    console.log(log);

    return log
  }
}

export class LoggerHandler {
  public static canvasClick = (
    file: λFile,
    events: λEvent[],
    position: number,
  ) => {
    const loggerContext = [LoggerHandler.name, this.name]

    Logger.log(
      `Canvas has been clicked and file ${file.name}-${file.id} was trigerred. Position: ${position}`,
      loggerContext,
    )

    if (!events.length) {
      return Logger.log(
        `No events on click position. Skipping...`,
        loggerContext,
      )
    }

    if (events.length === 1) {
      return Logger.log(
        `One event on click position. Opening ${DisplayEventDialog.name} with ${events[0]._id}`,
        loggerContext,
      )
    }

    Logger.log(
      `Events amount on click position: ${events.length}. Opening ${DisplayGroupDialog.name} with events ${JSON.stringify(
        events.map((e) => e._id),
        null,
        2,
      )}`,
      loggerContext,
    )
  }
}

export class λLogger {
  public static red = (text?: string | null) => `\x1b[31m${text}\x1b[0m`
  public static green = (text?: string | null) => `\x1b[32m${text}\x1b[0m`
  public static yellow = (text?: string | null) => `\x1b[33m${text}\x1b[0m`
  public static blue = (text?: string | null) => `\x1b[34m${text}\x1b[0m`
  public static magenta = (text?: string | null) => `\x1b[35m${text}\x1b[0m`
  public static cyan = (text?: string | null) => `\x1b[36m${text}\x1b[0m`
  public static white = (text?: string | null) => `\x1b[37m${text}\x1b[0m`

  public static bold = (text: string | null) => `\x1b[1m${text}\x1b[0m`
  public static bold_red = (text?: string | null) =>
    `\x1b[31m\x1b[1m${text}\x1b[0m`
}
