import { UUID } from "crypto";
import { Source } from "./Source";
import { App } from "./App";
import { Arrayed } from "@/class/Info";
import { Parser } from "./addon/Parser";
import { Note } from "./Note";
import { Operation } from "./Operation";
import { Context } from "./Context";
import { Internal } from "./addon/Internal";
import { toast } from "sonner";
import { Icon } from "@impactium/icons";
import { Logger } from "@/dto/Logger.class";

export namespace Doc {
  export const name = 'Doc'
  const _ = Symbol(Doc.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    _id: Doc.Id
    '@timestamp': string;
    'timestamp': number;
    'gulp.operation_id': Operation.Id;
    'gulp.context_id': Context.Id;
    'gulp.source_id': Source.Id;
    'gulp.timestamp': bigint;
    'gulp.event_code': number;
    [key: `${string}.${string}`]: any,
    [key: `${string}.${string}.${string}`]: any
  }

  export type Minified = Pick<Doc.Type,
    | '_id'
    | '@timestamp'
    | 'gulp.timestamp'
    | 'gulp.source_id'
    | 'gulp.context_id'
    | 'gulp.operation_id'
  >

  interface Flag {
    KEY: string;
    getList: () => Set<Doc.Id>;
    getDocs: (app: App.Type) => Doc.Type[];
    isLimitReached: (ids?: Set<Doc.Id>) => boolean;
    toggle: (id: Doc.Id) => boolean;
    reset: () => void;
    isFlagged: (id: Doc.Id) => boolean;
  }

  export class Entity {
    public static toDoc = (event: Doc.Type) => ({
      '_id': event._id,
      '@timestamp': event['@timestamp'],
      'gulp.context_id': event['gulp.context_id'],
      'gulp.operation_id': event['gulp.operation_id'],
      'gulp.source_id': event['gulp.source_id'],
      'gulp.timestamp': event['gulp.timestamp'],
    })

    public static delete = (app: App.Type, files: Arrayed<Source.Type>) => {
      files = Parser.array(files)

      files.forEach((file) => {
        app.target.events.delete(file.id)
        app.target.events.set(file.id, [])
      })

      return app.target.events
    }

    public static range = (events: Doc.Type[]) => ({
      max: new Date(events[0]['@timestamp']).valueOf(),
      min: new Date(events[events.length - 1]['@timestamp']).valueOf()
    })

    public static id = (app: App.Type, event: Doc.Type['_id']): Doc.Type =>
      Array.from(app.target.events.values())
        .flat()
        .find((e) => e._id === event) as Doc.Type

    public static get = (app: App.Type, id: Source.Id): Doc.Type[] =>
      app.target.events.get(id) ||
      (app.target.events.set(id, []).get(id) as Doc.Type[])

    public static sort = (events: Doc.Type[]) => events.sort((a, b) => b.timestamp - a.timestamp);

    public static selected = (app: App.Type): Doc.Type[] =>
      Source.Entity.selected(app)
        .map((s) => Doc.Entity.get(app, s.id))
        .flat()

    public static add = (app: App.Type, events: Doc.Type[]) => {
      events.forEach((e) => Doc.Entity.get(app, e['gulp.source_id']).push(e))

      return app.target.events
    }

    public static timestamp = (event: Doc.Type) => Internal.Transformator.toTimestamp(event['@timestamp']);

    public static ids = (app: App.Type, ids: Doc.Type['_id'][]) =>
      Array.from(app.target.events.values())
        .flat()
        .filter((e) => ids.includes(e._id))

    public static notes = (app: App.Type, event: Doc.Type) => Note.Entity.findByFile(app, event['gulp.source_id']).filter((n) => n.doc._id === event._id);

    public static links = (app: App.Type, event: Doc.Type) =>
      app.target.links.filter((l) => l.doc_ids.some(doc => doc === event._id))

    public static normalize = (docs: Doc.Type[]) => docs.map((e: Doc.Type) => ({
      ...e,
      ['gulp.timestamp']: BigInt(e['gulp.timestamp']),
      timestamp: Internal.Transformator.toTimestamp(e['gulp.timestamp'], 'round')
    })) as Doc.Type[];

    public static flag: Flag = {
      KEY: 'flagged-events',

      /**
       * Method to get all flagged events from local storage
       * @returns Set of Doc.Id
       */
      getList: (): Set<Doc.Id> => {
        const ids: Set<Doc.Id> = new Set();

        const raw = localStorage.getItem(Doc.Entity.flag.KEY);
        if (!raw) {
          return ids;
        }

        try {
          JSON.parse(raw).forEach((id: unknown) => {
            if (typeof id === 'string') {
              return ids.add(id as Doc.Id);
            }
            Logger.error(`LocalStorage entity ${Doc.Entity.flag.KEY} has shit inside`, 'Doc.flag.getList');
          });
        } catch (_) { }

        return ids;
      },

      /**
       * Method to get all flagged events from local storage
       * @returns Array of Doc.Type
       */
      getDocs: (app: App.Type): Doc.Type[] => {
        const ids = Doc.Entity.flag.getList();

        if (!ids.size) return [];

        const result: Doc.Type[] = [];

        for (const events of app.target.events.values()) {
          for (const event of events) {
            if (ids.has(event._id)) {
              result.push(event);
            }
          }
        }

        return result;
      },

      isLimitReached: (ids = Doc.Entity.flag.getList()) => ids.size >= 10,

      /**
       * 
       * @param id Doc.Id
       * @returns New document flagged state;
       */
      toggle: (id: Doc.Id) => {
        if (typeof id !== 'string') {
          return false;
        }

        console.log(id);

        const ids = Doc.Entity.flag.getList();

        console.log(ids);

        const isFlagged = ids.has(id);

        if (!isFlagged && Doc.Entity.flag.isLimitReached(ids)) {
          toast.error('Limit reached', {
            description: 'Max 10 events can be flagged',
            richColors: true,
            icon: <Icon name='X' />
          });
          return isFlagged;
        }

        ids[ids.has(id) ? 'delete' : 'add'](id);
        toast.info(`Event has been successfully ${isFlagged ? 'unflagged' : 'flagged'}`);

        console.log(ids);

        localStorage.setItem(Doc.Entity.flag.KEY, JSON.stringify([...ids.values()]))
        return !isFlagged;
      },

      /**
       * Resets flagged events
       * @returns Nothing
       */
      reset: () => localStorage.setItem(Doc.Entity.flag.KEY, JSON.stringify([])),

      /**
       * 
       * @param id Doc.Id
       * @returns Checks if document is flagged
       */
      isFlagged: (id: Doc.Id) => {
        if (typeof id !== 'string') {
          return false;
        }

        const ids = Doc.Entity.flag.getList();
        return ids.has(id);
      }
    }
  }
}
