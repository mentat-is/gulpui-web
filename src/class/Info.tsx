import { ElasticListIndex, OperationsList, type Info as Information } from '@/dto';
import { Api } from '@/dto/api.dto';
import { Bucket, QueryMaxMin } from '@/dto/QueryMaxMin.dto';
import { RawOperation, λOperation } from "@/dto/Operation.dto";
import { λContext } from "@/dto/Context.dto";
import { QueryOperations } from '@/dto/QueryOperations.dto';
import { λEvent, λEventFormForCreateRequest, λRawEventMinimized } from '@/dto/ChunkEvent.dto';
import { λPlugin } from '@/dto/Plugin.dto';
import React from 'react';
import { λIndex } from '@/dto/Index.dto';
import { GulpQueryFilter, GulpQueryFilterArray } from '@/dto/GulpGueryFilter.class';
import { ResponseBase, ResponseError } from '@/dto/ResponseBase.dto';
import { λFile } from '@/dto/File.dto';
import { RawNote, λNote } from '@/dto/Note.dto';
import { toast } from 'sonner';
import { RawLink, λLink } from '@/dto/Link.dto';
import { generateUUID, stringToHexColor } from '@/ui/utils';
import { MappingFileListRequest } from '@/dto/MappingFileList.dto';
import { IngestMapping } from '@/dto/Ingest.dto';
import { UUID } from 'crypto';

interface InfoProps {
  app: Information,
  setInfo: React.Dispatch<React.SetStateAction<Information>>, 
  api: Api
  timeline: React.RefObject<HTMLDivElement>;
}

export class Info implements InfoProps {
  app: Information;
  setInfo: React.Dispatch<React.SetStateAction<Information>>;
  api: Api;
  timeline: React.RefObject<HTMLDivElement>;

  constructor({
    app,
    setInfo, 
    api,
    timeline
  }: InfoProps) {
    this.app = app;
    this.setInfo = setInfo;
    this.api = api;
    this.timeline = timeline
  }
  
  get ws_link(): string | null {
    return this.app.general.server + '/ws';
  }
  
  // Methods to set different parts of the application state related to ElasticSearch mappings and data transfer
  setUpstream = (num: number) => this.setInfoByKey(this.app.transfered.up + num, 'transfered', 'up');
  setDownstream = (num: number) => this.setInfoByKey(this.app.transfered.down + num, 'transfered', 'down');



  // 🔥 INDEXES
  index_reload = () => this.api<ElasticListIndex>('/elastic_list_index').then(response => this.setInfoByKey(response.isSuccess() ? response.data : [], 'target', 'indexes'));
  index_select = (index: λIndex) => this.setInfoByKey(Index.select(this.app, index), 'target', 'indexes');

  // 🔥 OPERATIONS
  operations_reload = () => this.api<OperationsList>('/operation_list', { method: 'POST' }).then(response => response.isSuccess() && this.setInfoByKey(Operation.reload(response.data, this.app), 'target', 'operations'));
  operations_select = (operation: λOperation) => this.setInfoByKey(Operation.select(this.app, operation), 'target', 'operations');
  
  operations_set = (operations: λOperation[]) => this.setInfoByKey(Operation.reload(operations, this.app), 'target', 'operations');
  /* ПОСТАВИТЬ НОВЫЕ ОПЕРАЦИИ С ОХ ПОЛНЫМ ОБНУЛЕНИЕМ, И ПОВТОРНЫМ СЕЛЕКТОМ ПРЕДЫДУЩЕ-ВЫБРАННОГО */
  
  // 🔥 CONTEXTS
  // Получить выбранные контексты
  contexts_select = (contexts: λContext[]) => this.setInfoByKey(Context.select(this.app, contexts), 'target', 'contexts');

  contexts_set = (contexts: λContext[]) => this.setInfoByKey(contexts, 'target', 'contexts');

  // 🔥 PLUGINS
  plugins_set = (plugins: λPlugin[]) => this.setInfoByKey(plugins, 'target', 'plugins');

  // 🔥 PLUGINS
  files_select = (files: λFile[]) => this.setInfoByKey(File.select(this.app, files), 'target', 'files');
  files_unselect = (files: Arrayed<λFile>) => this.setInfoByKey(File.unselect(this.app, files), 'target', 'files');
  files_set = (files: λFile[]) => this.setInfoByKey(files, 'target', 'files');
  files_set_color = (file: λFile, color: string) => this.setInfoByKey(File.replace({ ...file, color }, this.app), 'target', 'files');
  files_replace = (file: λFile) => this.setInfoByKey(File.replace(file, this.app), 'target', 'files');
  file_find_by_filename_and_context = (filename: λFile['name'], context: λContext['name']) => File.findByNameAndContextName(this.app, filename, context);

  // 🔥 EVENTS 
  events_selected = () => Event.selected(this.app);
  events_add = (events: λEvent | λEvent[]) => this.setInfoByKey(Event.add(this.app, events), 'target', 'events');
  events_reset_in_file = (filename: string) => this.setInfoByKey(Event.delete(this.app, filename), 'target', 'events');
  events_reset = () => this.setInfoByKey(new Map(), 'target', 'events');

  notes_set = (notes: RawNote[]) => this.setInfoByKey(Note.parse(this.app, notes), 'target', 'notes');

  notes_reload = () => this.api<ResponseBase<RawNote[]>>('/note_list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ index: [Index.selected(this.app)?.name] })
  }).then(res => res.isSuccess() ? this.notes_set(res.data) : toast('Error fetching notes', {
    description: (res as unknown as ResponseError).data.exception.name
  }));

  notes_delete = (note: λNote) => this.api<ResponseBase<boolean>>('/note_delete', {
    method: 'DELETE',
    data: {
      note_id: note.id,
      ws_id: this.app.general.ws_id
    }
  }).then(async (res) => {
    if (res.isSuccess()) {
      await this.notes_reload();
      toast('Note deleated successfully');
    } else {
      toast((res as unknown as ResponseError).data.exception.name);
    }
  });

  links_reload = () => this.api<ResponseBase<RawLink[]>>('/link_list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ index: [Index.selected(this.app)?.name] })
  }).then(res => res.isSuccess() ? this.links_set(res.data) : toast('Error fetching links', {
    description: (res as unknown as ResponseError).data.exception.name
  }));

  links_set = (links: RawLink[]) => this.setInfoByKey(Link.parse(this.app, links), 'target', 'links');

  links_delete = (link: λLink) => this.api<ResponseBase>('/link_delete', {
    method: 'DELETE',
    data: {
      link_id: link.id,
      ws_id: this.app.general.ws_id
    }
  }).then(res => {
    if (res.isSuccess())
      this.links_reload();
    else
      toast('Error deleting link', {
        description: (res as unknown as ResponseError).data.exception.name
      });
  });

  bucket_increase_fetched = (fetched: number) => this.setInfoByKey({...this.app.target.bucket, fetched: this.app.target.bucket.fetched + fetched}, 'target', 'bucket');
  
  query_operations = async () => {
    const rawOperations = await this.api<QueryOperations>('/query_operations').then(res => res.isSuccess() ? res.data : []);

    if (!rawOperations.length) return;

    const operations: λOperation[] = [];
    const contexts: λContext[] = [];
    const plugins: λPlugin[] = [];
    const files: λFile[] = [];

    rawOperations.forEach(({ id, name, contexts: rawContexts }: RawOperation) => {
      const exist = Operation.findByNameAndId(this.app, { id, name });
      if (!exist) return;
      
      const operation: λOperation = {
        id,
        name,
        description: exist.description,
        glyph_id: exist.glyph_id,
        workflow_id: exist.workflow_id,
        selected: exist.selected,
        contexts: rawContexts.map(rawContext => {
          const c_uuid = generateUUID();
          const context: λContext = {
            operation: { name, id },
            name: rawContext.name,
            doc_count: rawContext.doc_count,
            uuid: c_uuid,
            plugins: rawContext.plugins.map(rawPlugin => {
              const p_uuid = generateUUID();
              const plugin: λPlugin = {
                name: rawPlugin.name,
                context: rawContext.name,
                uuid: p_uuid,
                _uuid: c_uuid,
                files: rawPlugin.src_file.map(rawFile => {
                  const f_uuid = generateUUID();
                  const file: λFile = {
                    name: rawFile.name,
                    doc_count: rawFile.doc_count,
                    event: {
                      min: rawFile['min_event.code'],
                      max: rawFile['max_event.code']
                    },
                    timestamp: {
                      min: rawFile['min_@timestamp'],
                      max: rawFile['max_@timestamp']
                    },
                    events: [],
                    plugin: rawPlugin.name,
                    _uuid: p_uuid,
                    offset: 0,
                    color: stringToHexColor(rawFile.name),
                    engine: 'default',
                    uuid: f_uuid
                  }
                  files.push(file)
                  return rawFile.name
                })
              };
              plugins.push(plugin)
              return rawPlugin.name
            })
          };
          contexts.push(context);
          return context.name
        })
      };
      operations.push(operation);
    });
    
    this.setInfo(app => ({
      ...app,
      ...{
        target: {
          ...app.target,
          operations,
          contexts,
          plugins,
          files
        }
      }
    }));
  };
  
  // Timestamp - 24 hours
  setBucketOneDay = () => this.setBucket({
    ...this.app.target.bucket!,
    selected: {
      max: this.app.target.bucket!.timestamp.max,
      min: this.app.target.bucket!.timestamp.max - 24 * 60 * 60 * 1000
    }
  });
  // Timestamp - 7 days
  setBucketOneWeek = () => this.setBucket({
    ...this.app.target.bucket!,
    selected: {
      max: this.app.target.bucket!.timestamp.max,
      min: this.app.target.bucket!.timestamp.max - 7 * 24 * 60 * 60 * 1000
    }
  });
  // Timestamp - 30 days
  setBucketOneMonth = () => this.setBucket({
    ...this.app.target.bucket!,
    selected: {
      max: this.app.target.bucket!.timestamp.max,
      min: this.app.target.bucket!.timestamp.max - 30 * 24 * 60 * 60 * 1000
    }
  });
  // Timestamp - Full range
  setBucketFullRange = () => this.setBucket({
    ...this.app.target.bucket!,
    selected: {
      max: this.app.target.bucket!.timestamp.max,
      min: this.app.target.bucket!.timestamp.min + 1
    }
  });
  // Timestamp - Full range
  setBucketCustomRange = (min: number, max: number) => this.setBucket({
    ...this.app.target.bucket!,
    selected: {
      max: max,
      min: min
    }
  });
  private setBucket = (bucket: Bucket) => this.setInfoByKey(bucket, 'target', 'bucket');
  
  // Methods to set general information (server, username, password, token)
  setServer = (server: string) => this.setInfoByKey(server, 'general', 'server');
  setUsername = (username: string) => this.setInfoByKey(username, 'general', 'username');
  setPassword = (password: string) => this.setInfoByKey(password, 'general', 'password');
  setToken = (token: string) => this.setInfoByKey(token, 'general', 'token');
  setExpire = (expires: number) => this.setInfoByKey(expires, 'general', 'expires');
  setUserId = (id: number) => this.setInfoByKey(id, 'general', 'user_id');
  
  // Methods to manipulate a timeline
  setTimelineScale = (scale: number) => this.setInfoByKey(scale, 'timeline', 'scale');
  
  increaseTimelineScale = (current?: number) => {
    const _scale = current || this.app.timeline.scale;
    const scale = _scale + (_scale / 10);
    this.setTimelineScale(scale);
    return scale;
  };
  
  decreaseTimelineScale = (limit?: number) => {
    const scale = Math.max(limit || 1, Number(this.app.timeline.scale - (this.app.timeline.scale / 10)));
    if (scale === limit) return limit;
    this.setTimelineScale(scale);
    return scale;
  };

  finalizeFiltering = async (filename: string) => {
    this.events_reset_in_file(filename);
    await this.api<ResponseBase<void>>('/query_raw', {
      method: 'POST',
      data: { ws_id: this.app.general.ws_id },
      headers: { 'Content-Type': 'application/json' },
      body: GulpQueryFilter.body(this.app.target.filters[filename])
    });
  };

  fetchBucket = () => this.api<QueryMaxMin>('/query_max_min', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      operation_id: [Operation.selected(this.app)?.id]
    })
  }).then(response => {
    if (response.isSuccess()) {
      if (!response.data.buckets?.length) return;

      this.setBucket({
        total: response.data.buckets[0]['*'].doc_count,
        fetched: this.app.target.bucket?.fetched || 0,
        event_code: {
          max: response.data.buckets[0]['*']['max_event.code'],
          min: response.data.buckets[0]['*']['min_event.code']
        },
        timestamp: {
          max: response.data.buckets[0]['*']['max_@timestamp'],
          min: response.data.buckets[0]['*']['min_@timestamp']
        },
        selected: {
          max: response.data.buckets[0]['*']['max_@timestamp'],
          min: response.data.buckets[0]['*']['min_@timestamp']
        }
      });
    }
  });

  filters_add = (name: string, filters: GulpQueryFilterArray): void => this.setInfoByKey(({ ...this.app.target.filters, [name]: filters}), 'target', 'filters');

  mapping_file_list = () => this.api<MappingFileListRequest>('/mapping_file_list').then(res => res.isSuccess() && this.setInfoByKey(this.mapping_file_list_parse(res.data), 'general', 'ingest'));

  mapping_file_list_parse = (raw: MappingFileListRequest['data']) => 
    raw.reduce((acc, { metadata: { plugin }, filename, mapping_ids }) => {
      const [pluginName] = plugin;
      const cluster = acc.find(c => c.plugin === pluginName) || acc[acc.push({ plugin: pluginName, types: [] }) - 1];
      cluster.types.push({ filename, ids: mapping_ids });
      return acc;
    }, [] as IngestMapping);  
  
  get width(): number {
    return this.app.timeline.scale * (this.timeline.current?.clientWidth || 0);
  }
  
  // Private method to update a specific key in the application state
  private setInfoByKey = <K extends keyof Information, S extends keyof Information[K]>(value: any, section: K, key: S, self: boolean = true) => {
    this.setInfo((_info: Information) => {
      const info = {
        ..._info,
        [section]: {
          ..._info[section],
          [key]: value,
        },
      }
      if (self) {
        this.app = info;
      }
      return info
    });
  };
}

export class Index {
  public static reload() {}

  public static selected = (use: Information | λIndex[]): λIndex | undefined => Parser.use(use, 'indexes').find(i => i.selected);

  public static find = (app: Information, index: λIndex) => app.target.indexes.find(i => i.name === index.name);

  public static select = (app: Information, index: λIndex): λIndex[] => app.target.indexes.map(i => i.name === index.name ? Index._select(i) : Index._unselect(i));

  private static _select = (i: λIndex): λIndex => ({ ...i, selected: true });

  private static _unselect = (i: λIndex): λIndex => ({ ...i, selected: false });
}


export class Operation {
  public static reload = (newOperations: λOperation[], app: Information) => Operation.select(newOperations, Operation.selected(app));

  public static selected = (app: Information): λOperation | undefined => app.target.operations.find(o => o.selected);

  public static findById = (use: Information | λOperation[], id: λOperation['id']): λOperation | undefined => Parser.use(use, 'operations').find(o => o.id === id);

  public static findByName = (app: Information, name: λOperation['name']): λOperation | undefined => app.target.operations.find(o => o.name === name);

  public static findByNameAndId = (app: Information, { id, name }: Pick<λOperation, 'id' | 'name'>): λOperation | undefined => app.target.operations.find(o => o.name === name && o.id === id);

  public static select = (use: Information | λOperation[], operation: λOperation | undefined): λOperation[] => Parser.use(use, 'operations').map(o => o.name === operation?.name ? Operation._select(o) : Operation._unselect(o));
  
  public static contexts = (app: Information): λContext[] => app.target.contexts.filter(c => c.operation.name === Operation.selected(app)?.name);

  private static _select = (o: λOperation): λOperation => ({ ...o, selected: true });

  private static _unselect = (o: λOperation): λOperation => ({ ...o, selected: false });
}

export class Context {
  public static reload = (newContexts: λContext[], app: Information): λContext[] => Context.select(newContexts, Context.selected(app));

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (use: Information | λContext[]): λContext[] => Parser.use(use, 'contexts').filter(c => c.selected && ('target' in use ? Operation.selected(use)?.name === c.operation.name : true));

  public static find = (use: Information | λContext[], context: λContext | λContext['uuid']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.name === Parser.useUUID(context));

  public static findByPugin = (use: Information | λContext[], plugin: λPlugin | λPlugin['name']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.plugins.some(p => p === Parser.useName(plugin)));

  public static select = (use: Information | λContext[], selected: Arrayed<λContext | λContext['uuid']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.name === Parser.useUUID(s)) ? Context._select(c) : c);
  
  public static unselect = (use: Information | λContext[], unselected: Arrayed<λContext | λContext['uuid']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(unselected).find(s => c.name === Parser.useUUID(s)) ? Context._unselect(c) : c);

  public static check = (use: Information | λContext[], selected: Arrayed<λContext | UUID>, check?: boolean): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.uuid === Parser.useUUID(s)) ? (check ? (Context._select(Context.uuid(use, c))) : Context._unselect(Context.uuid(use, c))) : c);
  
  public static uuid = (use: Information | λContext[], context: λContext | UUID) => Parser.use(use, 'contexts').find(c => c.uuid === Parser.useUUID(context))!;
  
  public static plugins = (app: Information, context: λContext | string | UUID): λPlugin[] => app.target.plugins.filter(p => p._uuid === Parser.useUUID(context) || p.context === Parser.useName(context));

  private static _select = (c: λContext): λContext => ({ ...c, selected: true });

  private static _unselect = (c: λContext): λContext => ({ ...c, selected: false });
}

export class Plugin {
  public static reload = (newPlugins: λPlugin[], app: Information): λPlugin[] => Plugin.select(newPlugins, Plugin.selected(app));

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (use: Information | λPlugin[]): λPlugin[] => Parser.use(use, 'plugins').filter(p => p.selected && ('target' in use ? Context.selected(use).some(c => c.name === p.context) : true));

  public static find = (use: Information | λPlugin[], plugin: λPlugin | λPlugin['uuid']): λPlugin | undefined => Parser.use(use, 'plugins').find(c => c.name === Parser.useUUID(plugin));

  public static select = (use: Information | λPlugin[], selected: Arrayed<λPlugin | λPlugin['uuid']>): λPlugin[] => Parser.use(use, 'plugins').map(p => Parser.array(selected).find(s => p.name === Parser.useUUID(s)) ? Plugin._select(p) : p);

  public static unselect = (use: Information | λPlugin[], unselected: Arrayed<λPlugin | λPlugin['uuid']>): λPlugin[] => Parser.use(use, 'plugins').map(p => Parser.array(unselected).find(s => p.name === Parser.useUUID(s)) ? Plugin._unselect(p) : p);

  public static uuid = (use: Information | λPlugin[], uuid: UUID) => Parser.use(use, 'plugins').find(p => p.uuid === uuid)!;

  public static context = (use: Information, plugin: λPlugin) => Context.uuid(use, plugin._uuid);

  public static check = (use: Information | λPlugin[], selected: Arrayed<λPlugin | λPlugin['uuid']>, check: boolean): λPlugin[] => Parser.use(use, 'plugins').map(p => Parser.array(selected).find(s => p.uuid === Parser.useUUID(s) && check) ? Plugin._select(p) : Plugin._unselect(p));

  public static files = (app: Information, plugin: λPlugin): λFile[] => app.target.files.filter(f => f._uuid === plugin.uuid);

  private static _select = (p: λPlugin): λPlugin => ({ ...p, selected: true });

  private static _unselect = (p: λPlugin): λPlugin => ({ ...p, selected: false });
}

export class File {
  public static replace = (file: λFile, use: Information | λFile[]): λFile[] => Parser.use(use, 'files').map(f => file.uuid === f.uuid ? file : f);

  public static reload = (files: Arrayed<λFile>, app: Information): λFile[] => File.select(Parser.array(files), File.selected(app));

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (app: Information): λFile[] => app.target.files.filter(f => f.selected && Plugin.selected(app).some(p => p.uuid === f._uuid));

  public static find = (use: Information | λFile[], file: λFile | UUID): λFile | undefined => Parser.use(use, 'files').find(f => f._uuid === Parser.useUUID(file));
  
  public static select = (use: Information | λFile[], selected: Arrayed<λFile | string>): λFile[] => Parser.use(use, 'files').map(f => Parser.array(selected).find(s => f.uuid === Parser.useUUID(s)) ? File._select(f) : f);
 
  public static plugin = (app: Information, file: λFile) => Plugin.uuid(app, file._uuid);

  public static context = (app: Information, file: λFile) => Context.uuid(app, Plugin.uuid(app, file._uuid)._uuid);

  public static findByNameAndContextName = (app: Information, filename: λFile['name'], context: λContext['name']) => app.target.files.find(f => f.name === filename && Context.plugins(app, context).some(p => p.uuid === f._uuid))!;

  public static uuid = (use: Information | λFile[], file: λFile | UUID) => Parser.use(use, 'files').find(f => f.uuid === Parser.useUUID(file))!;

  public static unselect = (use: Information | λFile[], unselected: Arrayed<λFile | string>): λFile[] => Parser.use(use, 'files').map(f => Parser.array(unselected).find(s => f.uuid === Parser.useUUID(s)) ? File._unselect(f) : f);

  public static check = (use: Information | λFile[], selected: Arrayed<λFile | string>, check: boolean): λFile[] => Parser.use(use, 'files').map(f => Parser.array(selected).find(s => f.uuid === Parser.useUUID(s) && check) ? File._select(f) : File._unselect(f));

  public static events = (app: Information, file: λFile | UUID): λEvent[] => Event.get(app, Parser.useUUID(file));
  
  public static notes = (app: Information, files: Arrayed<λFile>): λNote[] => Parser.array(files).map(f => Note.findByFile(app, f)).flat();

  private static _select = (p: λFile): λFile => ({ ...p, selected: true });

  private static _unselect = (p: λFile): λFile => ({ ...p, selected: false });
}

export class Event {
  public static delete = (app: Information, filename: string) => {
    app.target.events.delete(filename);
    app.target.events.set(filename, []);
    return app.target.events;
  }

  public static get = (app: Information, uuid: UUID): λEvent[] => app.target.events.get(uuid) || app.target.events.set(uuid, []).get(uuid)!;

  public static selected = (app: Information): λEvent[] => File.selected(app).map(f => Event.get(app, f.uuid)).flat();

  public static add = (app: Information, events: λEvent | λEvent[]) => {
    Parser.array(events).map(e => Event.get(app, e._uuid).push(e));
    return app.target.events;
  }

  public static parse = (app: Information, events: Arrayed<λRawEventMinimized>): λNote['events'] => Parser.array(events).map(e => ({
    _id: e.id,
    operation_id: e.operation_id,
    timestamp: e['@timestamp'],
    file: e.src_file,
    context: e.context,
    _uuid: File.findByNameAndContextName(app, e.src_file, e.context).uuid,
  }));

  public static findByIdAndUUID = (app: Information, eventId: string | string[], uuid: UUID) => Event.get(app, uuid).filter(e => Parser.array(eventId).includes(e._id));

  public static formatToCreateRequest = (events: Arrayed<λEvent>): λEventFormForCreateRequest[] => Parser.array(events).map(e => ({
    id: e._id,
    timestamp: e.timestamp,
    operation_id: e.operation_id,
    context: e.context,
    src_file: e.file
  }))
}

export class Note {
  public static parse = (app: Information, notes: RawNote[]): λNote[] => notes.map(n => {
    const note: λNote = {
      ...n,
      file: n.src_file,
      events: Event.parse(app, n.events),
      _uuid: File.findByNameAndContextName(app, n.src_file, n.context).uuid
    }
    return note;
  });

  public static findByFile = (use: Information | λNote[], file: λFile | string) => Parser.use(use, 'notes').filter(n => n.file === Parser.useName(file));
  
  public static findByEvent = (use: Information | λNote[], event: λEvent | string) => Parser.use(use, 'notes').filter(n => n.events.some(e => e._id === Parser.useId(event)));

  public static timestamp = (note: λNote): number => {
    let sum = 0
    note.events.forEach(e => sum += e.timestamp);
    return (sum / note.events.length) || (note.time_end ? (note.time_start + note.time_end) / 2 : note.time_start);
  }
}

export class Link {
  public static parse = (app: Information, links: RawLink[]): λLink[] => links.map(l => ({
    ...l,
    file: l.src_file,
    events: Event.parse(app, l.events)
  }));

  // public static findByFile = (use: Information | λLink[], file: λFile | string): λLink[] => Parser.use(use, 'links').filter(l => l. === Parser.useName(file));
  
  // public static findByEvent = (use: Information | λLink[], event: λEvent | string): λLink[] => Parser.use(use, 'links').filter(l => l.events.some(e => e._id === Parser.useId(event)));

  // public static timestamp = (note: λNote): number => {
  //   let sum = 0
  //   note.events.forEach(e => sum += e.timestamp);
  //   return (sum / note.events.length) || (note.time_end ? (note.time_start + note.time_end) / 2 : note.time_start);
  // }
}

export class Parser {
  public static use = <K extends keyof Information['target']>(x: Information | Information['target'][K], expects: K): Information['target'][K] => Array.isArray(x) ? x as Information['target'][K] : (x as Information)['target'][expects];

  public static useName = (unknown: λOperation | λContext | λPlugin | λFile | string): string => typeof unknown === 'string' ? unknown : unknown.name;

  public static useId = (unknown: λEvent | string): string => typeof unknown === 'string' ? unknown : unknown._id;

  public static useUUID = (unknown: λContext | λPlugin | λFile | string): UUID => typeof unknown === 'string' ? unknown as UUID : unknown.uuid;

  public static useBoth = (unknown: λContext | λPlugin | λFile | string): UUID => typeof unknown === 'string' ? unknown as UUID : (unknown.uuid || unknown.name);

  public static array = <K extends unknown>(unknown: Arrayed<K>): K[] => Array.isArray(unknown) ? unknown : [unknown];
}

export type Arrayed<K> = K | K[];