import { Login, type λApp } from '@/dto';
import { λOperation, λContext, λFile, OperationTree, ΞSettings } from '@/dto/Operation.dto';
import { λEvent, ΞEvent } from '@/dto/ChunkEvent.dto';
import React from 'react';
import { λIndex } from '@/dto/Index.dto';
import { RawNote, λNote } from '@/dto/Note.dto';
import { toast } from 'sonner';
import { RawLink, λLink } from '@/dto/Link.dto';
import { Gradients, λColor } from '@/ui/utils';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { UUID } from 'crypto';
import { CustomGlyphs, GlyphMap } from '@/dto/Glyph.dto';
import { λGlyph } from '@/dto/λGlyph.dto';
import { Logger } from '@/dto/Logger.class';
import { Engine } from './Engine.dto';
import { Session } from '@/dto/App.dto';
import { Color } from '@impactium/types';
import { SetState } from './API';

export namespace GulpDataset {
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
      id: string;
      doc_count: number;
      'max_event.code': number;
      'min_event.code': number;
      'min_gulp.timestamp': number; // nsec
      'max_gulp.timestamp': number; // nsec
    }

    export type Summary = Operation[];
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
    TIMELINE_FOCUS_FIELD = 'settings.__field'
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

      if (!engine) {
        localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_ENGINE, Settings.default.engine);
      }

      return engine || Settings.default.engine;
    }
 
    public static set engine(engine: Engine.List) {
      localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_ENGINE, engine);
    }

    public static get color(): Gradients {
      const color = localStorage.getItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR) as Gradients;

      if (!color) {
        localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR, Settings.default.color);
      }

      return color || Settings.default.color;
    }

    public static set color(color: Gradients) {
      localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR, color);
    }

    public static get field(): keyof λEvent {
      const field = localStorage.getItem(Internal.LocalStorageItemsList.TIMELINE_FOCUS_FIELD) as keyof λEvent;

      if (!field) {
        localStorage.setItem(Internal.LocalStorageItemsList.TIMELINE_FOCUS_FIELD, Settings.default.field);
      }

      return field || Settings.default.field;
    }

    public static all(): ΞSettings {
      return {
        engine: Settings.engine,
        color: Settings.color,
        field: Settings.field,
        offset: 0
      }
    }
  }
}

class User {
  instanse!: User;
  storage!: λApp['general'];
  constructor(general: λApp['general']) {
    if (this.instanse) {
      this.instanse.storage = general;
      return this.instanse;
    }

    this.storage = general;
    this.instanse = this;
    return;
  }

  isAuthorized = () => {
    return (
      this.storage.id.length > 0 && 
      this.storage.password.length && 
      this.storage.time_expire > Date.now() 
    );
  }
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

  refetch = async ({ ids = [], hidden, range }: RefetchOptions = {}) => {
    ids = Parser.array(ids);

    const index = Index.selected(this.app);
    const operation = Operation.selected(this.app);
    const contexts = Context.selected(this.app);

    if (!index || !operation || !contexts.length) {
      return;
    }

    if (!operation || !contexts.length) {
      console.log(operation),
      console.log(contexts);
    };

    ids.length
      ? ids.forEach(id => this.events_reset_in_file(File.id(this.app, id)))
      : this.events_reset();

    const files: λFile[] = (ids.length
      ? ids.reduce<λFile[]>((files, id) => {
        const file = File.id(this.app, id);

        if (file) files.push(file);
        else {
          Logger.error(`File with id ${id} not found in application data`, `${Info.name}.${this.refetch.name}`);
          toast('File not found in application data', {
            description: `ERR_FILE_NOT_FOUND_AT_APPLICATION_DATA`
          });
        }

        return files;
      }, [])
      : File.selected(this.app))

    // await this.notes_reload();

    // await this.links_reload();

    await this.glyphs_reload();

    if (!hidden) {
      this.deload(files.map(s => s.id));
    }
    
    await Promise.all(files.map(async file => {
      return await api('/query_raw', {
        method: 'POST',
        query: {
          ws_id: this.app.general.ws_id,
          req_id: file.id,
          index: index.name
        },
        body: JSON.stringify(Filter.body(this.app, file, range))
      });
    }));
  }

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
  
  // Methods to set different parts of the application state related to ElasticSearch mappings and data transfer
  setUpstream = (num: number) => this.setInfoByKey(this.app.transfered.up + num, 'transfered', 'up');
  setDownstream = (num: number) => this.setInfoByKey(this.app.transfered.down + num, 'transfered', 'down');

  setLoaded = (files: μ.File[]) => {
    this.setInfoByKey(files, 'timeline', 'loaded');

    if (this.app.timeline.loaded.length === this.app.target.files.length) {
      this.notes_reload();
      this.links_reload();
    }
  };

  deload = (uuids: Arrayed<μ.File>) => this.setLoaded([...this.app.timeline.loaded.filter(_uuid => !uuids.includes(_uuid))]);

  render = () => {
    Logger.log(`Render requested`, Info.name);
    this.setTimelineScale(this.app.timeline.scale + 0.000000001);
  };

  // 🔥 INDEXES
  index_reload = () => api<λIndex[]>('/opensearch_list_index', (data) => {
    this.app.target.indexes = data || [];
    this.setInfoByKey(data
      ? data.length === 1 ? Index.select(this.app, data[0]) : data
      : [],
    'target', 'indexes');
  });
  
  index_select = (index: λIndex) => this.setInfoByKey(Index.select(this.app, index), 'target', 'indexes');

  operations_select = (operation: λOperation) => this.setInfoByKey(Operation.select(this.app, operation), 'target', 'operations');
  
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
        index: index.name
      },
      setLoading
    }, this.operation_list);
  };

  /* ПОСТАВИТЬ НОВЫЕ ОПЕРАЦИИ С ОХ ПОЛНЫМ ОБНУЛЕНИЕМ, И ПОВТОРНЫМ СЕЛЕКТОМ ПРЕДЫДУЩЕ-ВЫБРАННОГО */
  
  // 🔥 CONTEXTS
  // Получить выбранные контексты
  contexts_select = (contexts: λContext[]) => this.setInfoByKey(Context.select(this.app, contexts), 'target', 'contexts');

  contexts_set = (contexts: λContext[]) => this.setInfoByKey(contexts, 'target', 'contexts');

  // 🔥 PLUGINS
  plugins_set = (files: λFile[]) => this.setInfoByKey(files, 'target', 'files');

  // 🔥 FILES
  selectAll = (filter: string) => {
    console.log(Context.select(this.app, this.app.target.contexts));
    this.setInfo(i => ({
      ...i,
      target: {
        ...i.target,
        contexts: Context.select(i, i.target.contexts),
        files: File.select(i, i.target.files.filter(file => file.name.toLowerCase().includes(filter))),
      }
    }))
  }
  files_select = (files: λFile[]) => this.setInfoByKey(File.select(this.app, files), 'target', 'files');
  files_unselect = (files: Arrayed<λFile>) => {
    if (this.app.timeline.target && Parser.array(files).map(file => file.id).includes(this.app.timeline.target.file_id)) {
      this.setTimelineTarget(null);
    }
    this.setInfoByKey(File.unselect(this.app, files), 'target', 'files')
  };
  files_set = (files: λFile[]) => this.setInfoByKey(files, 'target', 'files');
  // @ts-ignore
  files_set_color = (file: λFile, color: Gradients) => this.setInfoByKey(File.replace({ ...file, color }, this.app), 'target', 'files');
  files_replace = (files: Arrayed<λFile>) => this.setInfoByKey(File.replace(files, this.app), 'target', 'files');

  // 🔥 EVENTS 
  events_selected = () => Event.selected(this.app);
  events_add = (events: λEvent[]) => this.setInfoByKey(Event.add(this.app, events), 'target', 'events');
  events_reset_in_file = (files: Arrayed<λFile>) => {
    this.setInfoByKey(Event.delete(this.app, files), 'target', 'events')
  };
  events_reset = () => this.setInfoByKey(new Map(), 'target', 'events');

  setDialogSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'dialogSize');
  }

  notes_set = (notes: λNote[]) => this.setInfoByKey(notes, 'target', 'notes');

  notes_reload = async () => {
    const src_file: λFile['name'][] = []
    const context: λContext['name'][] = []
    const operation_ids: λOperation['id'][] = []
    
    File.selected(this.app).forEach(file => {
      src_file.push(file.name);

      const { name, operation_id } = Context.findByFile(this.app, file) || {};

      if (!name || !operation_id) return;

      if (!context.includes(name))
        context.push(name);

      if (!operation_id.includes(operation_id))
        operation_ids.push(operation_id);
    });

    api<RawNote[]>('/note_list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        index: [Index.selected(this.app)?.name],
        src_file, 
        context,
        operation_id: operation_ids
      })
    }, (data) => this.notes_set(Note.parse(this.app, data)));
  }

  notes_delete = (note: λNote) => api<boolean>('/note_delete', {
    query: {
      note_id: note.id,
      ws_id: this.app.general.ws_id
    }
  })

  // fileKey = (file: λFile, key: keyof λEvent) => this.setInfoByKey(File.replace({ ...file, key }, this.app), 'target', 'files');

  links_reload = async () => {
    const src_file: λFile['name'][] = []
    const context: λContext['name'][] = []
    const operation_ids: λOperation['id'][] = []
    
    File.selected(this.app).forEach(file => {
      src_file.push(file.name);

      const { name, operation_id } = Context.findByFile(this.app, file) || {};

      if (!name || !operation_id) return;

      if (!context.includes(name))
        context.push(name);

      if (!operation_id.includes(operation_id))
        operation_ids.push(operation_id);
    });
    
    api<RawLink[]>('/link_list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        index: [Index.selected(this.app)?.name],
        src_file,
        context,
        operation_id: operation_ids
      })
    }, this.links_set);
  }

  links_set = (links: RawLink[]) => this.setInfoByKey(Link.parse(this.app, links), 'target', 'links');

  links_delete = (link: λLink) => api('/link_delete', {
    method: 'DELETE',
    query: {
      link_id: link.id,
      ws_id: this.app.general.ws_id
    }
  }, this.links_reload);

  glyphs_reload = async () => {
    const parse = (glyphs: λGlyph[]) => {
      // Все иконки внутри приложения
      const values = Object.entries(GlyphMap);

      values.forEach(async ([id, value]) => {
        // Проверяем, есть ли такая иконка на бекенде
        // @ts-ignore
        const exist = glyphs.find(g => g.id === id);

        if (exist) return;

        const formData = new FormData();
        formData.append('glyph', new Blob([''], { type: 'image/png' }));

        // Если нет, то создаём
        await api<unknown>('/glyph_create', {
          method: 'POST',
          query: {
            name: value.toString(),
          },
          body: formData
        });

        Logger.log(`Glyph ${value} was copied to gulp-backend`, Info.name)
      });

      if (glyphs.length > values.length) {
        glyphs.forEach(glyph => {
          if (!values.map(v => v.toString()).includes(glyph.name)) {
            CustomGlyphs[glyph.id] = glyph.img;
          }
        });
      }

      Logger.log(`Glyphs has been syncronized with gulp-backend`, Info.name)
      this.setInfoByKey(glyphs, 'target', 'glyphs');
    }

    await api<λGlyph[]>('/glyph_list', {
      method: 'POST',
    }, parse);
  }

  operation_list = async () => {
    const index = Index.selected(this.app)?.name;

    if (!index) {
      return;
    }

    const operations: λOperation[] = [];
    const contexts: λContext[] = [];
    const files: λFile[] = [];

    const rawOperations =  await api<OperationTree[]>('/operation_list', {
      method: 'POST',
      query: { index }
    });

    if (!rawOperations) {
      return;
    }

    rawOperations.forEach((rawOperation: OperationTree) => {
      const exist = Operation.findById(this.app, rawOperation.id);
      
      const operation: λOperation = {
        ...rawOperation,
        selected: exist?.selected,
        contexts: rawOperation.contexts.map(rawContext => {
          const context: λContext = {
            ...rawContext,
            selected: Context.find(this.app, rawContext.id)?.selected,
            files: rawContext.sources.map(rawFile => {
              const file: λFile = {
                ...rawFile,
                settings: Internal.Settings.all(),
                code: {
                  min: 0,
                  max: 0
                },
                timestamp: {
                  min: 0,
                  max: 0
                },
                nanotimestamp: {
                  min: 0,
                  max: 0
                },
                total: 0
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

    this.setInfo(app => ({
      ...app,
      ...{
        target: {
          ...app.target,
          operations,
          contexts,
          files
        }
      }
    }));

    return { operations, contexts, files };
  }

  query_operations = async () => {
    const index = Index.selected(this.app);

    if (!index) {
      return;
    }

    const response = await api<GulpDataset.QueryOperations.Summary>('/query_operations', {
      query: {
        index: index.name
      }
    });

    const flatten = response.map(o => o.contexts.map(c => c.plugins.map(p => p.sources))).flat(3);

    const newFiles = this.app.target.files.map(f => {
      const match = flatten.find(m => m.id === f.id);

      if (!match) {
        return f;
      }

      return ({
        ...f,
        code: {
          min: match['min_event.code'],
          max: match['max_event.code'],
        },
        timestamp: {
          min: Number(match['min_gulp.timestamp'].toString().substring(0, 13)),
          max: Number(match['max_gulp.timestamp'].toString().substring(0, 13)),
        },
        nanotimestamp: {
          min: match['min_gulp.timestamp'],
          max: match['max_gulp.timestamp']
        },
        total: match.doc_count
      }) satisfies λFile;
    })

    this.files_replace(newFiles);
  }

  setTimelineFrame = (frame: MinMax) => this.setInfoByKey(frame, 'timeline', 'frame');
  
  login = (obj: Login) => {
    localStorage.setItem('__token', obj.token);
    
    this.setInfo(info => ({
      ...info,
      general: {
        ...info.general,
        ...obj
      }
    }));
  }
  
  // Methods to manipulate a timeline
  setTimelineScale = (scale: number) => this.setInfoByKey(scale, 'timeline', 'scale');
  setTimelineTarget = (event?: λEvent | null | 1 | -1) => {
    if (typeof event === 'number' && this.app.timeline.target) {
      const events = File.events(this.app, this.app.timeline.target.file_id);
      const index = events.findIndex(event => event.file_id === this.app.timeline.target!.file_id) + event;
      event = events[index];
    }

    if (!event)
      return Logger.warn(`Executed ${this.setTimelineTarget.name} with event: ${typeof event}`, Info.name);

    this.setInfoByKey(event, 'timeline', 'target');
  }

  setTimelineFilter = (filter: string) => this.setInfoByKey(filter, 'timeline', 'filter');
  
  increasedTimelineScale = (current: number = this.app.timeline.scale) => current + (current / 8);
  
  decreasedTimelineScale = () => this.app.timeline.scale - this.app.timeline.scale / 8;

  query_external = ({
    operation_id,
    server,
    username,
    password
  }: any) => api('/query_external', {
    method: 'POST',
    query: {
      operation_id,
      client_id: this.app.general.id,
      ws_id: this.app.general.ws_id,
      plugin: ''
    },
    body: JSON.stringify({
      plugin_params: {
        extra: {
          index: 0,
          url: server,
          username,
          password, 
        }
      }
    })
  });

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

  sigma = {
    set: async (files: Arrayed<λFile>, sigma: { name: string, content: string }) => {
      files = Parser.array(files);

      const newSigma: typeof this.app.target.sigma = {}

      files.forEach(file => {
        newSigma[file.id] = {
          name: sigma.name,
          content: sigma.content
        }
      })

      this.setInfoByKey({
        ...this.app.target.sigma,
        ...newSigma
      }, 'target', 'sigma');

      this.events_reset_in_file(files);

      files.forEach(file => {
        api('/query_sigma', {
          method: 'POST',
          query: {
            ws_id: this.app.general.ws_id,
            req_id: file.id
          },
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            sigma: sigma.content,
            options: {
              '@timestamp': 'desc'
            }
          })
        });
      })

      this.deload(files.map(file => file.id));
    },
  
    remove: (file: λFile | λFile['id']) => {
      // eslint-disable-next-line
      const id = Parser.useUUID(file) as λFile['id'];

      // eslint-disable-next-line
      delete this.app.target.sigma[id];
      this.setInfoByKey(this.app.target.sigma, 'target', 'sigma');
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
    return this.app.timeline.scale * (this.timeline.current?.clientWidth || 1);
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
  private setInfoByKey = <K extends keyof λApp, S extends keyof λApp[K]>(value: any, section: K, key: S, self: boolean = true) => {
    this.setInfo((_info: λApp) => {
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
  public static selected = (use: λApp | λIndex[]): λIndex | undefined => Parser.use(use, 'indexes').find(i => i.selected);

  public static find = (app: λApp, index: λIndex) => app.target.indexes.find(i => i.name === index.name);

  public static select = (app: λApp, index: λIndex): λIndex[] => app.target.indexes.map(i => i.name === index.name ? Index._select(i) : Index._unselect(i));

  private static _select = (i: λIndex): λIndex => ({ ...i, selected: true });

  private static _unselect = (i: λIndex): λIndex => ({ ...i, selected: false });
}


export class Operation {
  public static reload = (newOperations: λOperation[], app: λApp) => Operation.select(newOperations, Operation.selected(app));

  public static selected = (app: λApp): λOperation | undefined => app.target.operations.find(o => o.selected);

  public static findById = (use: λApp | λOperation[], id: λOperation['id']): λOperation | undefined => Parser.use(use, 'operations').find(o => o.id === id);

  public static findByName = (app: λApp, name: λOperation['name']): λOperation | undefined => app.target.operations.find(o => o.name === name);

  public static select = (use: λApp | λOperation[], operation: λOperation | undefined): λOperation[] => Parser.use(use, 'operations').map(o => o.name === operation?.name ? Operation._select(o) : Operation._unselect(o));
  
  public static contexts = (app: λApp): λContext[] => app.target.contexts.filter(c => c.operation_id === Operation.selected(app)?.id);

  private static _select = (o: λOperation): λOperation => ({ ...o, selected: true });

  private static _unselect = (o: λOperation): λOperation => ({ ...o, selected: false });
}

export class Context {
  public static reload = (newContexts: λContext[], app: λApp): λContext[] => Context.select(newContexts, Context.selected(app));

  public static frame = (app: λApp): MinMax => app.target.files.map(f => f.timestamp).reduce((acc, cur) => {
    acc.min = Math.min(cur.min, acc.min || cur.min);
    acc.max = Math.max(cur.max, acc.max);

    return acc;
  }, { min: 0, max: 0 });

  public static selected = (use: λApp | λContext[]): λContext[] => Parser.use(use, 'contexts').filter(c => c.selected && ('target' in use ? Operation.selected(use)?.id === c.operation_id : true));

  public static find = (use: λApp | λContext[], context: λContext | λContext['id']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.id === Parser.useUUID(context));

  public static findByFile = (use: λApp | λContext[], file: λFile | λFile['id']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.files.some(p => p === Parser.useUUID(file)));

  public static select = (use: λApp | λContext[], selected: Arrayed<λContext | λContext['id']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.id === Parser.useUUID(s)) ? Context._select(c) : c);
  
  public static unselect = (use: λApp | λContext[], unselected: Arrayed<λContext | λContext['id']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(unselected).find(s => c.id === Parser.useUUID(s)) ? Context._unselect(c) : c);

  public static check = (use: λApp | λContext[], selected: Arrayed<λContext | UUID>, check?: boolean): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.id === Parser.useUUID(s)) ? (check ? (Context._select(Context.id(use, c))) : Context._unselect(Context.id(use, c))) : c);
  
  public static id = (use: λApp | λContext[], context: λContext | λContext['id']) => Parser.use(use, 'contexts').find(c => c.id === Parser.useUUID(context))!;
  
  public static files = (app: λApp, context: λContext | string | UUID): λFile[] => app.target.files.filter(p => p.context_id === Parser.useUUID(context));

  private static _select = (c: λContext): λContext => ({ ...c, selected: true });

  private static _unselect = (c: λContext): λContext => ({ ...c, selected: false });
}

export class File {
  public static replace = (newFiles: Arrayed<λFile>, use: λApp | λFile[]): λFile[] => Parser.use(use, 'files').map(file => Parser.array(newFiles).find(s => s.id === file.id) || file);

  public static single = <K extends keyof λFile>(files: λFile[], field: K): λFile[K] | undefined => Parser.array(files)[0]?.[field];

  public static reload = (files: Arrayed<λFile>, app: λApp): λFile[] => File.select(Parser.array(files), File.selected(app));

  public static wellFormatedName = (file: λFile) => file.name.split('/').pop();

  public static pluginName = (file: λFile) => file.name.split('/').reverse()[1];

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (app: λApp): λFile[] => File.pins(app.target.files.filter(s => s.selected)).filter(s => s.name.toLowerCase().includes(app.timeline.filter) || File.id(app, s.id)?.context_id.includes(app.timeline.filter));
  
  public static select = (use: λApp | λFile[], selected: Arrayed<λFile | string>): λFile[] => Parser.use(use, 'files').map(s => Parser.array(selected).find(f => s.id === Parser.useUUID(f)) ? File._select(s) : s);

  public static pins = (use: λApp | λFile[]) => Parser.use(use, 'files').sort((a, b) => a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1);

  public static context = (app: λApp, file: λFile) => Context.id(app, file.context_id);

  public static id = (use: λApp | λFile[], file: λFile | μ.File) => typeof file === 'string' ? Parser.use(use, 'files').find(s => s.id === Parser.useUUID(file))! : file;

  public static unselect = (use: λApp | λFile[], unselected: Arrayed<λFile | string>): λFile[] => Parser.use(use, 'files').map(s => Parser.array(unselected).find(f => s.id === Parser.useUUID(f)) ? File._unselect(s) : s);

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

  public static base = (app: λApp, file: λFile, range?: MinMax) => {
    const context = Context.findByFile(app, file);

    if (!context) {
      return {};
    }

    return {
      context_ids: [
        context.id
      ],
      date_range: [
        new Date(Math.max(file.timestamp.min, (range?.min || -Infinity))).toISOString(),
        new Date(Math.min(file.timestamp.max, (range?.max || Infinity))).toISOString()
      ],
      source_ids: [
        file.id
      ],
      operation_ids: [
        context.operation_id
      ], 
    }
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
  
  static body = (app: λApp, file: λFile, range?: MinMax) => {
    const body: Record<string, any> = {
      q: {
        query: {
          query_string: {
            query: '*'
          }
        }
      },
      q_options: {
        sort: {
          '@timestamp': 'desc'
        }
      }
    };

    body.flt = Filter.base(app, file, range);

    const query = Filter.query(app, file);

    if (query) {
      body.q.query = {}
      body.q.query.query_string = {}
      body.q.query.query_string.query = query
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

  public static get = (app: λApp, id: μ.File): λEvent[] => app.target.events.get(id) || app.target.events.set(id, []).get(id)!;

  public static selected = (app: λApp): λEvent[] => File.selected(app).map(s => Event.get(app, s.id)).flat();

  public static add = (app: λApp, events: λEvent[]) => {
    events.map(e => Event.get(app, e.file_id).push(e));
    events.sort((a, b) => a.timestamp - b.timestamp);
    return app.target.events;
  }

  public static parse = (rawEvents: ΞEvent[]): λEvent[] => {
    const events: λEvent[] = rawEvents.map(rawEvent => {
      const event: λEvent = {
        id: rawEvent._id,
        operation_id: rawEvent['gulp.operation_id'],
        context_id: rawEvent['gulp.context_id'],
        file_id: rawEvent['gulp.source_id'],
        timestamp: new Date(rawEvent['@timestamp']).valueOf(),
        nanotimestamp: rawEvent['@timestamp'],
        code: rawEvent['event.code'],
        weight: rawEvent['gulp.event_code'],
        duration: rawEvent['event.duration']
      }

      return event;
    });

    return events;
  }

  public static findByIdAndUUID = (app: λApp, eventId: string | string[], id: μ.File) => Event.get(app, id).filter(e => Parser.array(eventId).includes(e.id));

  public static findById = (app: λApp, eventId: string | string[]) => Array.from(app.target.events, ([k, v]) => v).flat().filter(e => Parser.array(eventId).includes(e.id));
}

export class Note {
  public static parse = (app: λApp, notes: RawNote[]): λNote[] => notes.map(n => {
    const note: λNote = {
      ...n,
      events: Event.parse(n.events),
      data: {
        ...n.data,
        color: λColor['name -> hex'](n.data.color) as Color
      }
    }
    return note;
  });

  public static findByFile = (use: λApp | λNote[], file: λFile | string) => Parser.use(use, 'notes').filter(n => n.file_id === Parser.useName(file));
  
  public static findByEvent = (use: λApp | λNote[], event: λEvent | string) => Parser.use(use, 'notes').filter(n => n.events.some(e => e.id === Parser.useId(event)));

  public static timestamp = (note: λNote): number => {
    let sum = 0
    note.events.forEach(e => sum += e.timestamp);
    return (sum / note.events.length) || (note.time_end ? (note.time_start + note.time_end) / 2 : note.time_start);
  }
}

export class Link {
  public static parse = (app: λApp, links: RawLink[]): λLink[] => links.map(l => {
    return {
      ...l,
      file_id: l.src_file,
      data: {
        ...l.data,
        color: λColor['name -> hex'](l.data.color)
      },
      events: Event.parse(l.notes),
      _uuid: File.id(app, l.src_file).id,
    }
  });

  public static findByFile = (use: λApp | λLink[], file: λFile | μ.File): λLink[] => Parser.use(use, 'links').filter(l => l.file_id === Parser.useUUID(file));
  
  // public static findByEvent = (use: Information | λLink[], event: λEvent | string): λLink[] => Parser.use(use, 'links').filter(l => l.events.some(e => e._id === Parser.useId(event)));

  public static timestamp = (link: λLink): number => {
    let sum = 0
    link.events.forEach(e => sum += e.timestamp);
    return (sum / link.events.length) || (link.time_end ? (link.time_start + link.time_end) / 2 : link.time_start);
  }
}

export class Parser {
  public static use = <K extends keyof λApp['target']>(x: λApp | λApp['target'][K], expects: K): λApp['target'][K] => Array.isArray(x) ? x as λApp['target'][K] : (x as λApp)['target'][expects];

  public static useName = (unknown: λOperation | λContext | λFile | λFile | string): string => typeof unknown === 'string' ? unknown : unknown.name;

  public static useId = (unknown: λEvent | string): string => typeof unknown === 'string' ? unknown : unknown.id;

  public static useUUID = <T extends λContext | λFile | λFile | λFile | λFilter>(unknown: T | string): μ.Context | μ.File | μ.Filter | μ.Operation | μ.File | μ.File | μ.Window => {
    if (typeof unknown === 'string') {
      return unknown as T['id'];
    } else {
      return (unknown as T).id;
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

export interface MinMax {
  min: number;
  max: number
}

export const MinMaxBase = {
  min: 0,
  max: 0
}