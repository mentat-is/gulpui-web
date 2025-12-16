import { UUID } from "crypto";
import { Source } from "./Source";
import { App } from "./App";
import { Arrayed } from "@/class/Info";
import { Parser } from "./addon/Parser";
import { Note } from "./Note";
import { Operation } from "./Operation";
import { Context } from "./Context";
import { Internal } from "./addon/Internal";

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

    public static flagged = (app: App.Type): Doc.Type[] => {
      const raw = localStorage.getItem('flagged-events');
      if (!raw) {
        return [];
      }

      const ids: Set<Doc.Id> = new Set();
      try {
        JSON.parse(raw).forEach(ids.add);
      } catch (_) { }

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
    }
  }
}
