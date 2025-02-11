import { type λApp } from '@/dto';
import { λOperation, λContext, λFile, OperationTree, ΞSettings, λLink, λNote, Default, ΞNote, GulpObject, ΞLink, λGroup } from '@/dto/Dataset';
import { λDoc, λEvent, λExtendedEvent, ΞDoc, ΞEvent, ΞxtendedEvent } from '@/dto/ChunkEvent.dto';
import React from 'react';
import { λIndex } from '@/dto/Index.dto';
import { Gradients } from '@/ui/utils';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { UUID } from 'crypto';
import { λGlyph } from '@/dto/Dataset';
import { Logger } from '@/dto/Logger.class';
import { Engine } from './Engine.dto';
import { Session } from '@/dto/App.dto';
import { SetState } from './API';
import { λMapping } from '@/dto/MappingFileList.dto';
import { Glyph } from '@/ui/Glyph';
import { Icon } from '@impactium/icons';
import { sha1 } from 'js-sha1';
import { MaybeArray } from '@impactium/types';
import { Permissions } from '@/banners/Permissions.banner';
import { toast } from 'sonner';

export namespace GulpDataset {
  export namespace GetAvailableLoginApi {
    export type Response = Method[]

    export interface Method {
      name: string,
      login: Struct,
      logout: Struct
    }

    export interface Struct {
      method: string,
      url: string,
      params: Param[]
    }

    export interface Param {
      name: string,
      type: 'str',
      location: 'body',
      description: string,
      required?: boolean
      default_value?: null
    }
  }
  export namespace QueryOperations {
    interface Operation {
      name: string;
      id: string;
      contexts: Context[];
    }

    interface Context {
      name: string;
      id: string;
      doc_count: number;
      plugins: Plugin[]
    }

    interface Plugin {
      name: string;
      sources: Source[];
    }

    interface Source {
      name: string;
      id: λFile['id'];
      doc_count: number;
      'max_event.code': number;
      'min_event.code': number;
      'min_gulp.timestamp': number; // nsec
      'max_gulp.timestamp': number; // nsec
    }

    export type Summary = Operation[];
  }

  export namespace PluginList {
    export type Summary = Object[]

    export type Type = 'ingestion' | 'enrichment' | 'external';

    export namespace SigmaSupport {
      export type Type = 'backends' | 'pipelines' | 'output_formats'

      export interface Object {
        name: string;
        description: string;
      }

      export type List = Object[];

      export type Summary = Record<SigmaSupport.Type, SigmaSupport.List>[];
    }

    export namespace CustomParameters {
      export type Type = 'int' | 'str' | 'bool' | 'dict' | 'list';

      export interface Object {
        name: string,
        type: Type,
        default_value: any,
        desc: string,
        required: boolean,
        invalid?: boolean
      }
      
      export type List = Object[];
    }

    export type DependsOn = 'eml';

    export interface Object {
      display_name: string;
      type: Type[];
      desc: string;
      path: string;
      data: {};
      filename: string;
      sigma_support: SigmaSupport.Summary;
      custom_parameters: CustomParameters.List;
      depends_on: DependsOn[];
      tags: string[];
      version: string;
    }
  }

  export interface SigmaFile {
    name: string;
    content: string;
  }
}

interface RefetchOptions {
  ids?: Arrayed<λFile['id']>;
  hidden?: boolean;
  range?: MinMax;
}

interface InfoProps {
  app: λApp,
  setInfo: React.Dispatch<React.SetStateAction<λApp>>, 
  timeline: React.RefObject<HTMLDivElement>;
}

export namespace Internal {
  export enum LocalStorageItemsList {
    TIMELINE_RENDER_ENGINE = 'settings.__engine',
    TIMELINE_RENDER_COLOR = 'settings.__color',
    TIMELINE_FOCUS_FIELD = 'settings.__field',
    GENERAL_SERVER_VALUE = '__server',
    GENERAL_TOKEN_VALUE = '__token',
  }

  export namespace Sync {
    export interface Options {
      contexts?: boolean;
      files?: boolean;
    }
  }

  export class Settings {
    static default: ΞSettings = {
      engine: 'default',
      color: 'thermal',
      field: 'weight',
      offset: 0
    }

    public static get engine(): Engine.List {
      const engine = localStorage.getItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_ENGINE) as Engine.List;

      if (engine) {
        return engine
      }

      Internal.Settings.engine = Internal.Settings.default.engine;

      return Internal.Settings.engine;
    }
 
    public static set engine(engine: Engine.List) {
      localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_ENGINE, engine);
    }

    public static get color(): Gradients {
      const color = localStorage.getItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR) as Gradients;

      if (color) {
        return color;
      }

      Internal.Settings.color = Internal.Settings.default.color;

      return Internal.Settings.color;
    }

    public static set color(color: Gradients) {
      localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR, color);
    }

    public static get field(): keyof λEvent {
      const field = localStorage.getItem(Internal.LocalStorageItemsList.TIMELINE_FOCUS_FIELD) as keyof λEvent;

      if (field) {
        return field
      }

      Internal.Settings.field = Internal.Settings.default.field;

      return Internal.Settings.field;
    }
    
    public static set field(field: keyof λEvent) {
      localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_FOCUS_FIELD, field);
    }

    public static all(): ΞSettings {
      return {
        engine: Settings.engine,
        color: Settings.color,
        field: Settings.field,
        offset: 0
      }
    }

    public static get server(): string {
      const engine = localStorage.getItem(Internal.LocalStorageItemsList.GENERAL_SERVER_VALUE);

      if (engine) {
        return engine;
      }

      Internal.Settings.server = 'http://localhost:8080';

      return Internal.Settings.server;
    }
 
    public static set server(server: string) {
      localStorage.setItem(Internal.LocalStorageItemsList.GENERAL_SERVER_VALUE, server);
    }

    public static get token(): string {
      const token = localStorage.getItem(Internal.LocalStorageItemsList.GENERAL_TOKEN_VALUE);

      if (token) {
        return token;
      }

      Internal.Settings.token = '-';

      return Internal.Settings.token;
    }
 
    public static set token(token: string) {
      localStorage.setItem(Internal.LocalStorageItemsList.GENERAL_TOKEN_VALUE, token);
    }
  }

  export class IconExtractor {
    public static activate = <T extends Pick<GulpObject<μ.Operation>, 'glyph_id'>>(defaultValue: Icon.Name): (obj: T) => Icon.Name => {
      return (obj: T) => {
        if (obj.glyph_id) {
          return Glyph.List.get(obj.glyph_id) ?? defaultValue
        }
    
        return defaultValue;
      }
    }
  }

  export class Transformator {
    public static toTimestamp = (timestamp: string | number | Date): number => 
      Number(this.toNanos(timestamp)) / 1_000_000;

    public static toNanos = (timestamp: string | number | Date): bigint => {
      if (timestamp instanceof Date) {
        return BigInt(Math.floor(timestamp.getTime() * 1_000_000));
      }
      if (typeof timestamp === "number") {
        return BigInt(Math.floor(timestamp * 1_000_000));
      }
      const parsed = Date.parse(timestamp);
      if (isNaN(parsed)) {
        Logger.error(`Invalid transformation to NANOS from ${timestamp}`, Transformator.name);
        return 0n;
      }
      return BigInt(parsed) * 1_000_000n;
    };

    public static toISO = (timestamp: string | number | Date): string => {
      if (timestamp instanceof Date)
        return timestamp.toISOString();
      if (typeof timestamp === "number")
        return new Date(timestamp).toISOString();
      const parsed = Date.parse(timestamp);
      if (isNaN(parsed)) {
        Logger.error(`Invalid transformation to ISO from ${timestamp}`, Transformator.name);
        return new Date().toISOString();
      }
      return new Date(parsed).toISOString();
    };

    public static toAsync = <T extends any>(value: T): Promise<T> => {
      return new Promise(resolve => resolve(value));
    }
  }
}

export interface λUser {
  token: string;
  id: μ.User;
  time_expire: number;
};

export type λDetailedUser = GulpObject<μ.User, {
  pwd_hash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
  permission: Permissions.Role[];
  time_last_login: number;
  user_data: Record<string, any>;
  type: 'user';
  name: string;
  groups: λGroup[]; 
}>; 

class User {
  instanse!: User;
  storage!: λUser;
  constructor(general: λUser) {
    if (this.instanse) {
      this.instanse.storage = general;
      return this.instanse;
    }

    this.storage = general;
    this.instanse = this;
    return;
  }

  isAuthorized = () => Boolean(
    this.storage.id.length > 0 &&
    this.storage.time_expire > Date.now()
  )
}

export class Info implements InfoProps {
  app: λApp;
  setInfo: React.Dispatch<React.SetStateAction<λApp>>;
  timeline: React.RefObject<HTMLDivElement>;
  User: User

  constructor({
    app,
    setInfo, 
    timeline
  }: InfoProps) {
    this.app = app;
    this.User = new User(app.general);
    this.setInfo = setInfo;
    this.timeline = timeline;
  }

  setTimelineFilteringoptions = (file: λFile | λFile['id'], options: FilterOptions) => this.setInfoByKey({
    ...this.app.timeline.filtering_options,
    [Parser.useUUID(file)]:
    options
  }, 'timeline', 'filtering_options');

  refetch = async ({
    ids: _ids = File.selected(this.app).filter(f => !this.app.target.ingest.includes(sha1(f.name))).map(f => f.id),
    hidden,
    range
  }: RefetchOptions = {}) => {
    const files: λFile[] = Parser.array(_ids)
      .map(id => File.id(this.app, id));
    
    const operation = Operation.selected(this.app);
    const contexts = Context.selected(this.app);

    if (!operation || !contexts.length) {
      return;
    }

    // Reset events/docs for files
    files.forEach(this.events_reset_in_file);

    await this.notes_reload();

    await this.links_reload();

    if (!hidden) {
      this.deload(files.map(f => f.id));
    }
    
    files.forEach(file => {
      this.query_file(file, range);
    });
  }

  enrichment = (plugin: string, file: λFile, range: MinMax, custom_parameters: Record<string, any>) => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    // if (!events.length) {
    //   Logger.error('Expected at least one event', 'Info.enrichment');
    //   return;
    // }

    const хуйня = Filter.base(file, range);

    // @ts-ignore
    delete хуйня.int_filter;

    return api<void>('/enrich_documents', {
      method: 'POST',
      query: {
        plugin,
        index,
        ws_id: this.app.general.ws_id
      },
      body: {
        flt: хуйня,
        q: {
          query: {
            query_string: {
              query: `gulp.timestamp:>=${(BigInt(range.min) * 1_000_000n).toString()} AND gulp.timestamp:<=${(BigInt(range.max) * 1_000_000n).toString()}`
            }
          }
        },
        external_parameters: {
          plugin_params: {
            custom_parameters
          }
        }
      }
    });
  }

  enrich_single_id = (plugin: string, event: λEvent, custom_parameters: Record<string, any>): Promise<Record<string, string>> | undefined => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    return api('/enrich_single_id', {
      method: 'POST',
      query: {
        plugin,
        index: index,
        ws_id: this.app.general.ws_id,
        doc_id: event.id
      },
      body: { custom_parameters },
      toast: 'Enrichment Error'
    });
  }

  query_file = async (file: λFile, range?: MinMax) => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    const operation = Operation.selected(this.app);
    if (!operation) {
      return;
    }

    const path = Filter.exist(this.app, file) ? '/query_raw' : '/query_gulp';

    return await api(path, {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
        req_id: file.id,
        index
      },
      body: Filter.body(this.app, file, range)
    });
  };

  cancel = async (r: μ.File) => {
    Logger.log(`Request canselation has been requested for file ${File.id(this.app, r).name}`, Info.name);

    return await api('/stats_cancel_request', {
      method: 'PUT',
      query: { r }
    });
  }

  filters_cache = (file: λFile | μ.File) => {
    Logger.log(`Caching has been requested for file ${File.id(this.app, file).name}`, Info.name);

    const id = Parser.useUUID(file) as μ.File;
    this.setInfoByKey({
      data: this.app.timeline.cache.data.set(id, this.app.target.events.get(id) || []),
      filters: { ...this.app.timeline.cache.filters, [id]: this.app.target.filters[id] }
    }, 'timeline', 'cache');

    this.render();
  }

  filters_undo = (file: λFile | μ.File) => {
    const id = Parser.useUUID(file) as μ.File;

    this.setInfoByKey({
      ...this.app.target.filters,
      [id]: this.app.timeline.cache.filters[id]
    }, 'target', 'filters');

    this.app.target.events.delete(id);
    this.app.target.events.set(id, this.app.timeline.cache.data.get(id) || []);

    this.setInfoByKey(this.app.target.events, 'target', 'events');
    this.filters_delete_cache(file);
    this.render();
  }

  filters_delete_cache = (file: λFile | μ.File) => {
    const id = Parser.useUUID(file) as μ.File;

    this.app.timeline.cache.data.delete(id);

    this.setInfoByKey({
      data: this.app.timeline.cache.data,
      filters: { ...this.app.timeline.cache.filters, [id]: undefined }
    }, 'timeline', 'cache');
  }

  setLoaded = (files: μ.File[]) => {
    this.setInfoByKey(files, 'timeline', 'loaded');

    if (this.app.timeline.loaded.length === this.app.target.files.length) {
      this.notes_reload();
      this.links_reload();
    }
  };

  deload = (id: Arrayed<μ.File>) => this.setLoaded([...this.app.timeline.loaded.filter(_uuid => !id.includes(_uuid))]);

  render = () => {
    Logger.log(`Render requested`, Info.name);
    this.setTimelineScale(this.app.timeline.scale + 0.000000001);
  };

  mapping_file_list = async (): Promise<λMapping.Plugin[]> => {
    const shit = await api<λMapping.Raw[]>('/mapping_file_list', Mapping.parse);

    const parsed_shit = Mapping.parse(shit);

    const another_parsed_shit = await this.plugin_list().then(p => p.filter(p => p.type.includes('ingestion')));

    another_parsed_shit.forEach(shit => {
      const found_shit = parsed_shit.find(ps => ps.name === shit.filename);
      if (found_shit) {
        return;
      } else {
        parsed_shit.push({
          name: shit.filename,
          methods: []
        })
      }
    })

    const sorted_parsed_shit = parsed_shit.sort((a, b) => a.name.localeCompare(b.name));

    this.setInfoByKey(sorted_parsed_shit, 'target', 'mappings');

    return sorted_parsed_shit;
  }

  // 🔥 INDEXES
  index_reload = () => api<λIndex[]>('/opensearch_list_index', (data = []) => {
    this.app.target.indexes = data;
    const indexes = Index.select(this.app, data[0]);
    this.setInfoByKey(indexes, 'target', 'indexes');
    if (indexes.length && Index.selected(this.app)) {
      this.sync();
    }
  });
  
  index_select = (index: λIndex) => this.setInfoByKey(Index.select(this.app, index), 'target', 'indexes');

  operations_select = (operation: λOperation) => {
    this.setInfoByKey(Operation.select(this.app, operation), 'target', 'operations')
    this.contexts_unselect(this.app.target.contexts);
  };
  
  operations_set = (operations: λOperation[]) => this.setInfoByKey(Operation.reload(operations, this.app), 'target', 'operations');

  deleteOperation = (operation: λOperation, setLoading: SetState<boolean>) => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    api('/operation_delete', {
      method: 'DELETE',
      query: {
        operation_id: operation.id,
        index
      },
      setLoading
    }, this.sync);
  };

  /* ПОСТАВИТЬ НОВЫЕ ОПЕРАЦИИ С ОХ ПОЛНЫМ ОБНУЛЕНИЕМ, И ПОВТОРНЫМ СЕЛЕКТОМ ПРЕДЫДУЩЕ-ВЫБРАННОГО */
  
  // 🔥 CONTEXTS
  // Получить выбранные контексты
  contexts_select = (contexts: λContext[]) => {
    const files = contexts.map(context => Context.files(this.app, context)).flat();

    const c = Context.select(this.app, contexts)

    this.setInfoByKey(c, 'target', 'contexts');
    setTimeout(() => {
      this.files_select(files);
    }, 0);
  };
  contexts_unselect = (contexts: λContext[]) => {
    const files = contexts.map(context => Context.files(this.app, context)).flat();

    const c = Context.unselect(this.app, contexts)

    this.setInfoByKey(c, 'target', 'contexts');
    setTimeout(() => {
      this.files_unselect(files);
    }, 0);
  };

  contexts_set = (contexts: λContext[]) => this.setInfoByKey(contexts, 'target', 'contexts');
  contexts_checkout = () => {
    const contexts: λContext[] = this.app.target.contexts.map(c => {
      const files = Context.files(this.app, c);

      if (files.every(file => !file.selected)) {
        c.selected = false
      } else {
        // Хендлим пустые контексты
        c.selected = files.some(file => file.selected)
      }

      return c;
    })
    this.setInfoByKey(contexts, 'target', 'contexts');
  }

  // 🔥 PLUGINS
  plugins_set = (files: λFile[]) => this.setInfoByKey(files, 'target', 'files');

  // 🔥 FILES
  selectAll = (filter: string) => {
    const operation = Operation.selected(this.app);

    if (!operation) {
      return;
    }

    const contexts = Context.select(this.app, Operation.contexts(this.app));

    const files = File.select(this.app, Context.selected(contexts).map(c => Context.files(this.app, c)).flat().filter(f => f.name.toLowerCase().includes(filter)));

    this.setInfo(i => ({
      ...i,
      target: {
        ...i.target,
        contexts,
        files,
      }
    }))
  }
  files_select = (files: λFile[]) => {
    this.setInfoByKey(File.select(this.app, files), 'target', 'files');
    setTimeout(() => {
      this.contexts_checkout();
    }, 0);
  }
  files_unselect = (files: λFile[]) => {
    if (this.app.timeline.target && Parser.array(files).map(file => file.id).includes(this.app.timeline.target.file_id)) {
      this.setTimelineTarget(null);
    }
    this.setInfoByKey(File.unselect(this.app, files), 'target', 'files');
    setTimeout(() => {
      this.contexts_checkout();
    }, 0);
  };
  files_set = (files: λFile[]) => {
    this.setInfoByKey(files, 'target', 'files');
    setTimeout(() => {
      this.contexts_checkout();
    }, 0);
  };

  file_set_render_engine = (ids: λFile['id'][], engine: Engine.List) => this.setInfoByKey(this.app.target.files.map(file => ({ ...file, settings: { ...file.settings, engine: ids.includes(file.id) ? engine : file.settings.engine }})), 'target', 'files');

  file_set_settings = (ids: λFile['id'][], settings: λFile['settings']) => this.setInfoByKey(this.app.target.files.map(file => ({ ...file, settings: { ...file.settings, ...settings }})), 'target', 'files');

  files_set_color = (file: λFile, color: Gradients) => this.setInfoByKey(File.replace({ ...file, color }, this.app), 'target', 'files');

  events_add = (newEvents: λEvent[]) => {
    const { events, frames } = Event.add(this.app, newEvents);

    Object.entries(frames).map(([id, frame]) => {
      const file = this.app.target.files.find(file => file.id === id);
      if (file && file.nanotimestamp.min === 0n) {
        file.timestamp.min = Math.min(file.timestamp.min, frame.min);
        file.timestamp.max = Math.max(file.timestamp.max, frame.max, file.timestamp.min + 1);
      } else {
        Logger.error(`File ${id} has not been found in application data`);
      }
    });

    this.app.target.events = events;

    this.setInfo(this.app);

    return;
  };
  events_reset_in_file = (files: Arrayed<λFile>) => this.setInfoByKey(Event.delete(this.app, files), 'target', 'events');

  setDialogSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'dialogSize');
  }

  setFooterSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'footerSize');
  }

  notes_reload = () => api<ΞNote[]>('/note_list', {
    method: 'POST',
    body: {
      source_ids: File.selected(this.app).map(f => f.id),
    }
  }, notes => this.setInfoByKey(Note.normalize(notes), 'target', 'notes'));

  note_delete = (note: λNote) => api('/note_delete', {
    method: 'DELETE',
    query: {
      object_id: note.id,
      ws_id: this.app.general.ws_id
    }
  }, this.notes_reload);

  links_reload = async () => {
    return api<ΞLink[]>('/link_list', {
      method: 'POST',
      body: {
        source_ids: File.selected(this.app).map(f => f.id), 
      }
    }, async raw => {
      const links: λLink[] = [];

      await Promise.all(raw.map(async link => {
        const events = await Promise.all(link.doc_ids.map(this.query_single_id));

        const docs: λDoc[] = [];

        events.forEach(event => {
          if (event) {
            const doc = Event.toDoc(event.normalized);

            docs.push(doc);
          }
        });

        links.push(Link.normalize(link, docs));
      }));

      this.setInfoByKey(links, 'target', 'links');
    });
  }

  link_delete = (link: λLink) => api('/link_delete', {
    method: 'DELETE',
    query: {
      object_id: link.id,
      ws_id: this.app.general.ws_id
    }
  }, this.links_reload);

  links_connect = async (link: λLink, event: λEvent) => {
    const links = await api<λLink>('/link_update', {
      method: 'PATCH',
      query: {
        object_id: link.id,
        ws_id: this.app.general.ws_id
      },
      body: {
        doc_ids: [
          ...link.doc_ids,
          event.id
        ]
      }
    });

    await this.links_reload();

    return links;
  }

  glyphs_reload = async () => {
    Glyph.List.clear();

    const glyphs = await api<λGlyph[]>('/glyph_list', {
      method: 'POST'
    });

    if (!glyphs) {
      return;
    }

    const queue: (() => Promise<void>)[] = [];

    Glyph.Raw.forEach(name => {
      queue.push(async () => {
        const exist = glyphs.find(g => g.name === name);
  
        if (exist) {
          Glyph.List.set(exist.id, exist.name);
          return;
        }
  
        const formData = new FormData();
        formData.append('img', new Blob([''], { type: 'image/png' }));
  
        await api<λGlyph>('/glyph_create', {
          method: 'POST',
          deassign: true,
          query: { name },
          body: formData,
        }, glyph => {
          Glyph.List.set(glyph.id, glyph.name);
        });
      });
    });
  
    const runQueue = async () => {
      const tasks = queue.splice(0, 10).map(task => task());
      await Promise.all(tasks);
      if (queue.length > 0) {
        await runQueue();
      }
    };
  
    await runQueue();

    Logger.log(`Glyphs has been syncronized with gulp-backend`, Info.name)
    this.setInfoByKey(true, 'general', 'glyphs_syncronized');
  }

  start_ingesting = (req_id: string) => {
    if (!this.app.target.ingest.includes(req_id)) {
      Logger.log(`Ingestion started for ${req_id} at ${new Date(Date.now()).toISOString()}`);
      this.app.target.ingest.push(req_id);
      this.setInfo(this.app);
    }
    
  }
  end_ingesting = (req_id: string) => {
    Logger.log(`Ingestion done for ${req_id} at ${new Date(Date.now()).toISOString()}`);
    this.app.target.ingest.filter(id => req_id !== id);
    const file = File.selected(this.app).find(f => sha1(f.name) === req_id);
    if (file) {
      this.refetch({ ids: [file.id] });
    }
    
    this.setInfo(this.app);
  }

  sync = async () => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    const operations: λOperation[] = [];
    const contexts: λContext[] = [];
    const files: λFile[] = [];

    const details = await api<GulpDataset.QueryOperations.Summary>('/query_operations', {
      query: { index }
    })
      .then(raw => raw
        .map(o => o.contexts
          .map(c => c.plugins
            .map(p => p.sources)))
        .flat(3))
      .then(sources => sources.map(source => {
        return {
          id: source.id,
          name: source.name,
          total: source.doc_count,
          code: {
            min: source['min_event.code'],
            max: source['max_event.code']
          },
          timestamp: {
            min: source['min_gulp.timestamp'] / 1_000_000,
            max: Math.max((source['max_gulp.timestamp'] / 1_000_000), (source['min_gulp.timestamp'] / 1_000_000) + 1),
          },
          nanotimestamp: {
            min: BigInt(source['min_gulp.timestamp']),
            max: BigInt(source['max_gulp.timestamp']),
          }
        }
      }));

    const rawOperations = await api<OperationTree[]>('/operation_list', {
      method: 'POST',
      query: { index }
    });

    rawOperations.forEach((rawOperation: OperationTree) => {
      const exist = Operation.id(this.app, rawOperation.id);

      const operation: λOperation = {
        ...rawOperation,
        selected: exist?.selected ?? false,
        contexts: rawOperation.contexts.map(rawContext => {
          const context: λContext = {
            ...rawContext,
            selected: Context.id(this.app, rawContext.id)?.selected ?? true,
            files: rawContext.sources.map(rawFile => {
              const file: λFile = {
                ...rawFile,
                // @ts-ignore
                color: Internal.Settings.color,
                // @ts-ignore
                settings: Internal.Settings.all(),
                ...({
                  total: 0,
                  code: MinMaxBase,
                  timestamp: MinMaxBase,
                  nanotimestamp: {
                    min: BigInt(0),
                    max: BigInt(0),
                  }
                }),
                ...File.id(this.app, rawFile.id),
                ...details.find(f => f.id === rawFile.id),
                selected: File.id(this.app, rawFile.id)?.selected ?? true
              };
              files.push(file)
              return file.id;
            })
          };
          contexts.push(context);
          return context.id;
        })
      };
      operations.push(operation);
    });

    if (operations.length === 1) {
      operations[0].selected = true;
    }

    Logger.log(`${operations.length} operations has been added to application data`, this.sync.name);
    Logger.log(operations.map(c => c.id));
    Logger.log(`${contexts.length} contexts has been added to application data`, this.sync.name);
    Logger.log(contexts.map(c => c.id));
    Logger.log(`${files.length} files has been added to application data`, this.sync.name);
    Logger.log(files.map(f => f.id));

    this.app.target.operations = operations;
    this.app.target.contexts = contexts;
    this.app.target.files = files;
    this.setInfo(this.app);
  }

  query_single_id = (id: λEvent['id']) => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }
  
    return api<ΞxtendedEvent>('/query_single_id', {
      method: 'POST',
      query: {
        doc_id: id,
        index
      }
    }).then(raw => {
      if (!raw) {
        return;
      }

      return {
        normalized: Event.normalizeFromDetailed(raw),
        raw
      }
    });
  }

  // ⚠️ UNTOUCHABLE
  plugin_list = async (): Promise<GulpDataset.PluginList.Summary> => {
    const plugins = this.app.target.plugins;
    if (plugins.length) {
      return Internal.Transformator.toAsync(plugins);
    }

    Logger.warn('No plugins found in application data', 'plugin_list');
    Logger.log('Fetching plugins...', 'plugin_list');

    const list = await api<GulpDataset.PluginList.Summary>('/plugin_list').then(list => list.sort((a, b) => a.filename.localeCompare(b.filename)));

  this.setInfoByKey(list, 'target', 'plugins');

    Logger.log(`Fetched and sorted ${list.length} plugins. Names:`, 'plugin_list');
    Logger.log(list.map(l => l.filename), 'plugin_list');

    return list;
  }

  setTimelineFrame = (frame: MinMax) => this.setInfoByKey(frame, 'timeline', 'frame');
  
  login = (obj: λUser) => {
    Internal.Settings.token = obj.token;
    
    this.setInfo(info => ({
      ...info,
      general: {
        ...info.general,
        ...obj
      }
    }));
  }
  
  // Methods to manipulate a timeline
  setTimelineScale = (scale: number) => this.setInfoByKey(Math.max(0.01, Math.min(9999999, scale)), 'timeline', 'scale');

  setTimelineTarget = (event?: λEvent | null | 1 | -1): λEvent => {
    const { target } = this.app.timeline;

    if (typeof event === 'number' && target) {
      const events = File.events(this.app, target.file_id);
      const index = events.findIndex(event => event.id === target.id) + event;
      event = events[index];
    }

    if (typeof event !== 'undefined') {
      this.setInfoByKey(event, 'timeline', 'target');
    }

    return event as λEvent;
  }

  setTimelineFilter = (filter: string) => this.setInfoByKey(filter, 'timeline', 'filter');
  
  increasedTimelineScale = (current: number = this.app.timeline.scale) => current + (current / 8);
  
  decreasedTimelineScale = () => this.app.timeline.scale - this.app.timeline.scale / 8;

  query_external = async (plugin: string, uri: string, params: Record<string, any>) => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    return api('/query_raw', {
      method: 'POST',
      query: {
        index: index,
        ws_id: this.app.general.ws_id,
      },
      body: {
        q: {
          query: {
            query_string: {
              query: '*'
            }
          }
        },
        q_options: {
          plugin,
          uri,
          external_parameters: {
            custom_parameters: params
          }
        }
      }
    });
  };

  filters_add = (id: UUID, filters: λFilter[]): void => this.setInfoByKey(({ ...this.app.target.filters, [id]: filters}), 'target', 'filters');

  filters_remove = (file: λFile | λFile['id']) => this.setInfoByKey(({ ...this.app.target.filters, [Parser.useUUID(file)]: []}), 'target', 'filters');

  filters_change = (file: λFile | μ.File, filter: λFilter | λFilter['id'], obj: Partial<λFilter>) => {
    const file_uuid = Parser.useUUID(file) as μ.File;
    const filter_uuid = Parser.useUUID(filter) as μ.Filter;

    const file_filters = this.app.target.filters[file_uuid];

    Object.assign(file_filters.find(filter => filter.id === filter_uuid) || {}, obj);

    this.setInfoByKey(this.app.target.filters, 'target', 'filters');
  }

  useReverseScroll = (bool: boolean) => {
    localStorage.setItem('settings.__isScrollReversed', String(bool));
    this.setInfoByKey(bool, 'timeline', 'isScrollReversed')
  }

  files_reorder_upper = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex(file => file.id === id);

    if (index === 0) return;

    const file = files[index];
    files[index] = files[index - 1]
    files[index -  1] = file;

    this.setInfoByKey(files, 'target', 'files');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }

  files_reorder_lower = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex(file => file.id === id);

    if (index === files.length - 1) return;

    const file = files[index];
    files[index] = files[index + 1]
    files[index + 1] = file;

    this.setInfoByKey(files, 'target', 'files');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }

  query_sigma = (body: Record<string, any>) => {
    const index = Index.selected(this.app);
    if (!index) {
      return;
    }

    return api('/query_sigma', {
      method: 'POST',
      query: {
        index,
        ws_id: this.app.general.ws_id
      },
      body,
      toast: 'Sigma rule has been successfully applied'
    });
  }

  sigma = {
    set: async (files: Arrayed<λFile>, plugin: string, sigma: GulpDataset.SigmaFile, notes: boolean) => {
      files = Parser.array(files);

      const newSigma: typeof this.app.target.sigma = this.app.target.sigma;

      files.forEach(file => newSigma[file.id] = sigma);

      this.setInfoByKey(newSigma, 'target', 'sigma');

      this.events_reset_in_file(files);

      return Promise.all(files.map(file => {
        return this.query_sigma({
          sigmas: [sigma.content],
          q_options: {
            sigma_parameters: {
              plugin
            },
            note_parameters: {
              create_notes: notes,
            }
          },
          flt: {
            source_ids: [
              file.id
            ]
          }
        });
      }));
    },
    remove: (file: λFile | λFile['id']) => {
      const id = Parser.useUUID(file) as λFile['id'];

      delete this.app.target.sigma[id];
      this.setInfoByKey(this.app.target.sigma, 'target', 'sigma');
      this.refetch({ ids: typeof file === 'string' ? file : file.id });
      this.deload(id);
    }
  }

  files_repin = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex(file => file.id === id);

    files[index].pinned = !files[index].pinned;

    this.setInfoByKey(files, 'target', 'files');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }   
  
  get width(): number {
    return this.app.timeline.scale * (document.getElementById('canvas')?.clientWidth || 1);
  }

  getCurrentSessionOptions = (): Session => {
    return ({
      render: [],
      scroll: {
        x: 0,
        y: 0
      }
    });
  };

  setCurrentSessionOptions = (session: Session) => {
    this.setInfoByKey('', 'general', 'sessions');
  }

  getSessions = (): Promise<λApp['general']['sessions']> => {
    return {} as Promise<λApp['general']['sessions']>;
  }
  
  // Private method to update a specific key in the application state
  private setInfoByKey = <K extends keyof λApp, S extends keyof λApp[K]>(value: any, section: K, key: S) => {
    this.setInfo(_info => {
      this.app = {
        ..._info,
        [section]: {
          ..._info[section],
          [key]: value,
        },
      };

      return this.app
    });
  };
}

export class Index {
  public static selected = (use: λApp | λIndex[]): λIndex['name'] | undefined => Logger.assert(Parser.use(use, 'indexes').find(i => i.selected)?.name, 'No index selected', 'Index.selected');

  public static find = (app: λApp, index: λIndex) => app.target.indexes.find(i => i.name === index.name);

  public static select = (app: λApp, index: λIndex): λIndex[] => app.target.indexes.map(i => i.name === index.name ? Index._select(i) : Index._unselect(i));

  private static _select = (i: λIndex): λIndex => ({ ...i, selected: true });

  private static _unselect = (i: λIndex): λIndex => ({ ...i, selected: false });
}


export class Operation {
  public static icon = Internal.IconExtractor.activate<λOperation>(Default.Icon.OPERATION);

  public static reload = (newOperations: λOperation[], app: λApp) => Operation.select(newOperations, Operation.selected(app));

  public static selected = (app: λApp): λOperation | undefined => Logger.assert(app.target.operations.find(o => o.selected), 'No operation selected', 'Operation.selected');

  public static id = (use: λApp, id: λOperation['id']): λOperation => Parser.use(use, 'operations').find(o => o.id === id)!;

  public static findByName = (app: λApp, name: λOperation['name']): λOperation | undefined => app.target.operations.find(o => o.name === name);

  public static select = (use: λApp | λOperation[], operation: λOperation | undefined): λOperation[] => Parser.use(use, 'operations').map(o => o.id === operation?.id ? Operation._select(o) : Operation._unselect(o));
  
  public static contexts = (app: λApp): λContext[] => app.target.contexts.filter(c => c.operation_id === Operation.selected(app)?.id);

  private static _select = (o: λOperation): λOperation => ({ ...o, selected: true });

  private static _unselect = (o: λOperation): λOperation => ({ ...o, selected: false });
}

export class Context {
  public static icon = Internal.IconExtractor.activate<λContext>(Default.Icon.CONTEXT);

  public static reload = (newContexts: λContext[], app: λApp): λContext[] => Context.select(newContexts, Context.selected(app));

  public static frame = (app: λApp): MinMax => File.selected(app).map(f => f.timestamp).reduce((acc, cur) => {
    acc.min = Math.min(cur.min, acc.min || cur.min);
    acc.max = Math.max(cur.max, acc.max);

    return acc;
  }, { min: 0, max: 0 });

  public static selected = (use: λApp | λContext[]): λContext[] => Parser.use(use, 'contexts').filter(c => c.selected && ('target' in use ? Operation.selected(use)?.id === c.operation_id : true));

  public static findByName = (app: λApp, name: λContext['name']) => Context.selected(app).find(c => c.name === name);

  public static findByFile = (use: λApp | λContext[], file: λFile | λFile['id']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.files.some(p => p === Parser.useUUID(file)));

  public static select = (use: λApp | λContext[], selected: Arrayed<λContext | λContext['id']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.id === Parser.useUUID(s)) ? Context._select(c) : c);
  
  public static unselect = (use: λApp | λContext[], unselected: Arrayed<λContext | λContext['id']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(unselected).find(s => c.id === Parser.useUUID(s)) ? Context._unselect(c) : c);

  public static check = (use: λApp | λContext[], selected: Arrayed<λContext | UUID>, check?: boolean): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.id === Parser.useUUID(s)) ? (check ? (Context._select(Context.id(use, c))) : Context._unselect(Context.id(use, c))) : c);
  
  public static id = (use: λApp | λContext[], context: λContext | λContext['id']) => Parser.use(use, 'contexts').find(c => c.id === Parser.useUUID(context))!;
  
  public static files = (app: λApp, context: λContext | λContext['id']): λFile[] => app.target.files.filter(p => p.context_id === Parser.useUUID(context));

  private static _select = (c: λContext): λContext => ({ ...c, selected: true });

  private static _unselect = (c: λContext): λContext => ({ ...c, selected: false });
}

export class File {
  public static icon = Internal.IconExtractor.activate<λFile>(Default.Icon.FILE);

  public static replace = (newFiles: Arrayed<λFile>, use: λApp | λFile[]): λFile[] => Parser.use(use, 'files').map(file => Parser.array(newFiles).find(s => s.id === file.id) || file);

  public static single = <K extends keyof λFile>(files: λFile[], field: K): λFile[K] | undefined => Parser.array(files)[0]?.[field];

  public static reload = (app: λApp, files: λFile): λFile[] => File.select(app, File.selected(app));

  public static wellFormatedName = (file: λFile) => file.name.split('/').pop();

  public static pluginName = (file: λFile) => file.name.split('/').reverse()[1];

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (app: λApp): λFile[] => File.pins(app.target.files.filter(s => s.selected)).filter(s => s.name.toLowerCase().includes(app.timeline.filter.toLowerCase()) || File.id(app, s.id)?.context_id.includes(app.timeline.filter.toLowerCase()));
  
  public static select = (app: λApp, selected: λFile[]): λFile[] => app.target.files.map(f => selected.find(s => s.id === f.id) ? File._select(f) : f);

  public static pins = (use: λApp | λFile[]) => Parser.use(use, 'files').sort((a, b) => a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1);

  public static context = (app: λApp, file: λFile) => Context.id(app, file.context_id);

  public static id = (use: λApp | λFile[], file: λFile | μ.File) => typeof file === 'string' ? Parser.use(use, 'files').find(s => s.id === Parser.useUUID(file))! : file;

  public static unselect = (app: λApp, unselected: λFile[]): λFile[] => app.target.files.map(f => unselected.find(u => u.id === f.id) ? File._unselect(f) : f);

  public static check = (use: λApp | λFile[], selected: Arrayed<λFile | string>, check: boolean): λFile[] => Parser.use(use, 'files').map(s => Parser.array(selected).find(f => s.id === Parser.useUUID(f) && check) ? File._select(s) : File._unselect(s));

  public static events = (app: λApp, file: λFile | μ.File): λEvent[] => Event.get(app, Parser.useUUID(file) as μ.File);
  
  public static notes = (app: λApp, files: Arrayed<λFile>): λNote[] => Parser.array(files).map(s => Note.findByFile(app, s)).flat();

  public static index = (app: λApp, file: λFile | μ.File) => File.selected(app).findIndex(s => s.id === Parser.useUUID(file));

  public static getHeight = (app: λApp, file: λFile | μ.File, scrollY: number) => 48 * this.index(app, file) - scrollY + 24;

  private static _select = (p: λFile): λFile => ({ ...p, selected: true });

  private static _unselect = (p: λFile): λFile => ({ ...p, selected: false });
}

export enum FilterType {
  GREATER_OR_EQUAL = '>=',
  EQUAL = '==',
  LESS_OR_EQUAL = '<=',
  NOT_EQUAL = '!=',
  LESS_THAN = '<',
  GREATER_THAN = '>'
}

export type FilterOptions = Record<string, Acceptable>;

export type λFilter = {
  id: μ.Filter;
  key: string;
  type: FilterType;
  value: any;
  isOr?: boolean
}

export class Filter {
  public static find = (app: λApp, file: λFile) => app.target.filters[file.id] || [];

  public static findMany = (app: λApp, files: λFile[]) => {
    const filters: λFilter[][] = [];

    files.forEach(file => {
      const filter = Filter.find(app, file);
      if (filter) {
        filters.push(filter)
      }
    });

    return filters;
  }

  public static base = (file: λFile, range?: MinMax) => ({
    operation_ids: [
      file.operation_id
    ],
    context_ids: [
      file.context_id
    ],
    int_filter: [
      file.nanotimestamp.min > (BigInt(range?.min ?? 0) * 1000000n)
        ? file.nanotimestamp.min.toString()
        : (BigInt(range?.min ?? 0) * 1000000n).toString(),
      file.nanotimestamp.max < (BigInt(range?.max ?? 0) * 1000000n)
        ? file.nanotimestamp.max.toString()
        : (BigInt(range?.max ?? 0) * 1000000n).toString(),
    ],
    source_ids: [
      file.id
    ]
  })

  public static events = (file: λFile, events: λEvent['id'][]) => {
    const body: Record<string, any> = {
      q_options: {
        sort: {
          '@timestamp': 'desc'
        }
      }
    };

    body.flt = Filter.base(file);

    body.q = {
      query: {
        query_string: {
          query: events.map(id => `_id: ${id}`).join(' OR ')
        }
      }
    }

    return body;
  }

  /** 
   * @returns Стринговое поле фильтра
   */
  static query = (app: λApp, file: λFile) => {
    const filters = Filter.find(app, file);
    
    return filters.map((filter, index) => {
      const isLast = filters.length - 1 === index;

      let queryStringPart: string;

      const isParsable = Number.isNaN(Number(filter.value));

      const value = isParsable ? filter.value : `'${filter.value}'`

      switch (filter.type) {
        case FilterType.EQUAL:
          queryStringPart = `${filter.key}:${value}`;
          break;
        case FilterType.NOT_EQUAL:
          queryStringPart = `NOT ${filter.key}:${value}`;
          break;
        default:
          queryStringPart = `${filter.key}:${filter.type}${value}`;
          break;
      }

      return queryStringPart + this.operand(filter, isLast);
    }).join('');
  }

  public static operand = (filter: λFilter, ignore: boolean) => ignore ? '' : filter.isOr ? ' OR ' : ' AND ';

  public static exist = (app: λApp, file: λFile) => Filter.find(app, file).length > 0;
  
  static body = (app: λApp, file: λFile, range?: MinMax) => {
    const body: Record<string, any> = {
      q_options: {
        sort: {
          '@timestamp': 'desc'
        }
      }
    };

    body.flt = Filter.base(file, range);

    if (Filter.exist(app, file)) {
      body.q = body.q || {};
      body.q.query = {}
      body.q.query.query_string = {}
      body.q.query.query_string.query = Filter.query(app, file);
    }

    return body;
  };
}

export class Event {
  public static delete = (app: λApp, files: Arrayed<λFile>) => {
    files = Parser.array(files);

    files.forEach(file => {
      app.target.events.delete(file.id);
      app.target.events.set(file.id, []);
    })
    
    return app.target.events;
  }

  public static id = (app: λApp, event: λEvent['id']): λEvent => Array.from(app.target.events.values()).flat().find(e => e.id === event)!;

  public static get = (app: λApp, id: μ.File): λEvent[] => app.target.events.get(id) || app.target.events.set(id, []).get(id)!;

  public static selected = (app: λApp): λEvent[] => File.selected(app).map(s => Event.get(app, s.id)).flat();

  public static add = (app: λApp, events: λEvent[]) => {
    events.map(e => Event.get(app, e.file_id).push(e));

    Logger.log(`${events.length} events has been processed`);

    return {
      frames: Event.frames(events),
      events: app.target.events
    };
  }

  public static frames = (events: λEvent[]) => {
    const frames: Record<λFile['id'], MinMax> = {};

    events.forEach(e => {
      frames[e.file_id] = frames[e.file_id] || MinMaxBase;

      const timestamp = Internal.Transformator.toTimestamp(e.timestamp);

      frames[e.file_id].min = frames[e.file_id].min === 0 ? timestamp : Math.min(frames[e.file_id].min, timestamp);
      frames[e.file_id].max = Math.max(frames[e.file_id].max, timestamp);
    });

    return frames;
  }

  public static toDoc = ({ id, file_id, context_id, nanotimestamp, operation_id, timestamp }: λEvent): λDoc => ({
    id,
    file_id,
    context_id,
    nanotimestamp,
    operation_id,
    timestamp
  })

  public static normalize = (raw: ΞDoc[]): λDoc[] => raw.map(r => ({
    id: r._id,
    timestamp: Internal.Transformator.toTimestamp(r['@timestamp']),
    nanotimestamp: Internal.Transformator.toNanos(r['@timestamp']),
    file_id: r['gulp.source_id'],
    context_id: r['gulp.context_id'],
    operation_id: r['gulp.operation_id']
  }));

  public static normalizeFromDetailed = (raw: ΞxtendedEvent): λExtendedEvent => {
    return {
      id: raw._id,
      operation_id: raw['gulp.operation_id'],
      context_id: raw['gulp.context_id'],
      file_id: raw['gulp.source_id'],
      timestamp: Internal.Transformator.toTimestamp(raw['@timestamp']),
      nanotimestamp: Internal.Transformator.toNanos(raw['@timestamp']),
      code: raw['event.code'],
      weight: raw['gulp.event_code'],
      duration: raw['event.duration'],
      log: {
        file: {
          path: raw['log.file.path']
        }
      },
      agent: {
        type: raw['agent.type']
      },
      event: {
        original: raw['event.original'],
        sequence: raw['event.sequence']
      },
      gulp: {
        unmapped: {
          Provider_Guid: raw['gulp.unmapped.Provider_Guid'],
          Version: raw['gulp.unmapped.Version'],
          Level: raw['gulp.unmapped.Level'],
          Task: raw['gulp.unmapped.Task'],
          Opcode: raw['gulp.unmapped.Opcode'],
          Keywords: raw['gulp.unmapped.Keywords'],
          TimeCreated_SystemTime: raw['gulp.unmapped.TimeCreated_SystemTime'],
          Execution_ProcessID: raw['gulp.unmapped.Execution_ProcessID'],
          Execution_ThreadID: raw['gulp.unmapped.Execution_ThreadID'],
          Security_UserID: raw['gulp.unmapped.Security_UserID'],
          updateTitle: raw['gulp.unmapped.updateTitle'],
          updateGuid: raw['gulp.unmapped.updateGuid'],
          updateRevisionNumber: raw['gulp.unmapped.updateRevisionNumber'],
          serviceGuid: raw['gulp.unmapped.serviceGuid'],
        }
      },
      winlog: {
        'record_id': raw['winlog.record_id'],
        'channel': raw['winlog.channel'],
        'computer_name': raw['winlog.computer_name'],
      }
    } satisfies λExtendedEvent;
  }

  public static formatForServer = (event: λEvent) => {
    return [{
      "@timestamp": event.nanotimestamp,
      "_id": event.id,
      "gulp.context_id": event.context_id,
      "gulp.operation_id": event.operation_id,
      "gulp.source_id": event.file_id,
      "gulp.timestamp": event.timestamp
    }];
  }

  public static parse = (rawEvents: ΞEvent[]): λEvent[] => {
    const events: λEvent[] = rawEvents.map(rawEvent => {
      const event: λEvent = {
        id: rawEvent._id,
        operation_id: rawEvent['gulp.operation_id'],
        context_id: rawEvent['gulp.context_id'],
        file_id: rawEvent['gulp.source_id'],
        timestamp: Internal.Transformator.toTimestamp(rawEvent['@timestamp']),
        nanotimestamp: Internal.Transformator.toNanos(rawEvent['@timestamp']),
        code: rawEvent['event.code'],
        weight: rawEvent['gulp.event_code'],
        duration: rawEvent['event.duration']
      }

      return event;
    });

    return events;
  }

  public static ids = (app: λApp, ids: λEvent['id'][]) => Array.from(app.target.events.values()).flat().filter(e => ids.includes(e.id));

  public static notes = (app: λApp, event: λEvent) => app.target.notes.filter(n => n.docs.some(doc => doc.id === event.id));
}

export class Note {
  public static icon = Internal.IconExtractor.activate<λNote>(Default.Icon.NOTE);
  
  public static normalize = (notes: ΞNote[]) => notes.map(n => ({
    ...n,
    description: n.text,
    docs: Event.normalize(n.docs)
  } satisfies λNote));

  public static id = (app: λApp, id: λNote['id']) => app.target.notes.find(n => n.id === id)!;

  public static events = (app: λApp, note: λNote): λEvent[] => Event.ids(app, note.docs.map(d => d.id));

  public static findByFile = (app: λApp, file: λFile) => app.target.notes.filter(n => n.source_id === file.id);

  public static timestamp = (app: λApp, note: λNote): number => {
    let sum = 0
    const events = Note.events(app, note);
    events.forEach(e => sum += e.timestamp);
    return sum / events.length || 1;
  }
}

export class Link {
  public static icon = Internal.IconExtractor.activate<λLink>(Default.Icon.LINK);

  public static selected = (app: λApp) => app.target.links.filter(link => link.doc_ids.every(id => File.id(app, Event.id(app, id).file_id).selected))

  public static normalize = (link: ΞLink, docs: λDoc[]): λLink => ({
    ...link,
    docs
  } satisfies λLink);

  public static timestamp = (app: λApp, link: λLink): number => {
    const events = link.docs;

    let sum = 0

    events.forEach(e => sum += e.timestamp);
    return (sum / events.length || 1);
  }
}

export class Mapping {
  public static parse(raw: λMapping.Raw[]): λMapping.Plugin[] {
    const plugins: λMapping.Plugin[] = [];

    raw.forEach(r => {
      const isPluginExist = plugins.find(p => p.name === r.metadata.plugin[0]);

      if (!isPluginExist) {
        plugins.push({
          name: r.metadata.plugin[0],
          methods: []
        })
      }

      const shit = plugins.find(p => p.name === r.metadata.plugin[0])!;

      shit.methods.push({
        name: r.filename,
        mappings: r.mapping_ids
      });
    })

    return plugins;
  }

  public static plugins = (app: λApp): λMapping.Plugin['name'][] => app.target.mappings.map(p => p.name);

  public static methods = (app: λApp, plugin: λMapping.Plugin['name']): λMapping.Method['name'][] => app.target.mappings.find(p => p.name === plugin)?.methods.map(m => m.name) || [];

  public static mappings = (app: λApp, plugin: λMapping.Plugin['name'], method: λMapping.Method['name']): λMapping.Mapping[] => app.target.mappings.find(p => p.name === plugin)?.methods.find(m => m.name === method)?.mappings || [];
}

export class Parser {
  public static use = <K extends keyof λApp['target']>(x: λApp | λApp['target'][K], expects: K): λApp['target'][K] => Array.isArray(x) ? x as λApp['target'][K] : (x as λApp)['target'][expects];

  public static useName = (unknown: λOperation | λContext | λFile | λFile | string): string => typeof unknown === 'string' ? unknown : unknown.name;

  public static useId = (unknown: λEvent | string): string => typeof unknown === 'string' ? unknown : unknown.id;

  public static useUUID = <T extends λContext | λFile | λFile | λFile | λFilter>(unknown: T | string): μ.Context | μ.File | μ.Filter | μ.Operation | μ.File | μ.File | μ.Window => {
    if (typeof unknown === 'string') {
      return unknown as T['id'];
    } else {
      return (unknown as T)?.id;
    }
  };
  

  public static array = <K extends unknown>(unknown: Arrayed<K>): K[] => Array.isArray(unknown) ? unknown : [unknown];

  public static isSingle = (arr: Array<any>) => arr.length === 1;
}

export type Arrayed<K> = K | K[];

export type UUIDED<K extends λContext | λFile | λFile | λFilter> = K | K['id'];

export namespace μ {
  const Filter = Symbol('Filter');
  export type Filter = UUID & {
    readonly [Filter]: unique symbol;
  };

  const Operation = Symbol('Operation');
  export type Operation = UUID & {
    readonly [Operation]: unique symbol;
  };

  const Context = Symbol('Context');
  export type Context = UUID & {
    readonly [Context]: unique symbol;
  };

  const File = Symbol('File');
  export type File = UUID & {
    readonly [File]: unique symbol;
  };

  const Event = Symbol('Event');
  export type Event = UUID & {
    readonly [Event]: unique symbol;
  };

  const Note = Symbol('Note');
  export type Note = UUID & {
    readonly [Note]: unique symbol;
  };

  const Link = Symbol('Link');
  export type Link = UUID & {
    readonly [Link]: unique symbol;
  };

  const Glyph = Symbol('Glyph');
  export type Glyph = UUID & {
    readonly [Glyph]: unique symbol;
  };

  const User = Symbol('User');
  export type User = UUID & {
    readonly [User]: unique symbol;
  };

  const Window = Symbol('Window');
  export type Window = UUID & {
    readonly [Window]: unique symbol;
  };
}

export const Pattern = {
  Server: new RegExp(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})?(:\d+)?(\/[^\s]*)?/),
  Username: /^[\s\S]{3,48}$/,
  Password: /^[\s\S]{3,48}$/
}

export interface MinMax<T extends number | bigint = number> {
  min: T;
  max: T
}

export const MinMaxBase = {
  min: 0,
  max: 0
}