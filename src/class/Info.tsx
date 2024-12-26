import { Login, type λApp } from '@/dto';
import { Bucket, MinMax, QueryMaxMin } from '@/dto/QueryMaxMin.dto';
import { λOperation, λContext, λSource, OperationTree } from '@/dto/Operation.dto';
import { λEvent, λEventFormForCreateRequest, λRawEventMinimized } from '@/dto/ChunkEvent.dto';
import React from 'react';
import { λIndex } from '@/dto/Index.dto';
import { RawNote, λNote } from '@/dto/Note.dto';
import { toast } from 'sonner';
import { RawLink, λLink } from '@/dto/Link.dto';
import { generateUUID, Gradients, λColor } from '@/ui/utils';
import { MappingFileListRequest, RawMapping } from '@/dto/MappingFileList.dto';
import { ApplicationError } from '@/context/Application.context';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { UUID } from 'crypto';
import { CustomGlyphs, GlyphMap } from '@/dto/Glyph.dto';
import { λGlyph } from '@/dto/λGlyph.dto';
import { differenceInMonths } from 'date-fns';
import { Logger, LoggerHandler } from '@/dto/Logger.class';
import { Engine, Hardcode } from './Engine.dto';
import { Session } from '@/dto/App.dto';
import { Color } from '@impactium/types';

interface RefetchOptions {
  ids?: Arrayed<λSource['id']>;
  hidden?: boolean;
  range?: MinMax;
}

interface InfoProps {
  app: λApp,
  setInfo: React.Dispatch<React.SetStateAction<λApp>>, 
  timeline: React.RefObject<HTMLDivElement>;
}

interface QueryExternalProps {
  operation_id: number;
  source: λSource['name'];
  server: string;
  username: string;
  password: string;
}

export class Info implements InfoProps {
  app: λApp;
  setInfo: React.Dispatch<React.SetStateAction<λApp>>;
  timeline: React.RefObject<HTMLDivElement>;

  constructor({
    app,
    setInfo, 
    timeline
  }: InfoProps) {
    this.app = app;
    this.setInfo = setInfo;
    this.timeline = timeline;
  }

  setTimelineFilteringoptions = (source: λSource | λSource['id'], options: FilterOptions) => this.setInfoByKey({
    ...this.app.timeline.filtering_options,
    [Parser.useUUID(source)]:
    options
  }, 'timeline', 'filtering_options');

  refetch = async ({ ids = [], hidden, range }: RefetchOptions = {}) => {
    ids = Parser.array(ids);

    const operation = Operation.selected(this.app);
    const contexts = Context.selected(this.app);

    if (!operation || !contexts.length) return;

    ids.length
      ? ids.forEach(id => this.events_reset_in_file(Source.id(this.app, id)))
      : this.events_reset();

    const sources: λSource[] = (ids.length
      ? ids.reduce<λSource[]>((sources, id) => {
        const source = Source.id(this.app, id);

        if (source) sources.push(source);
        else {
          Logger.error(`Source with id ${id} not found in application data`, `${Info.name}.${this.refetch.name}`);
          toast('Source not found in application data', {
            description: `See console for further details. UUID: ${id}`
          });
        }

        return sources;
      }, [])
      : Source.selected(this.app))

    await this.notes_reload();

    await this.links_reload();

    await this.glyphs_reload();

    if (!hidden) {
      this.deload(sources.map(s => s.id));
    }
    
    await Promise.all(sources.map(async source => {
      if (!this.app.target.bucket.selected && !range) return Logger.error(`${Info.name}.${this.refetch.name} for source ${source?.id}-${source?.id} has been executed, but was cancelled bacause range is ${typeof range} and ${typeof this.app.target.bucket.selected}`, Info.name);

      return await api('/query_raw', {
        method: 'POST',
        query: {
          ws_id: this.app.general.ws_id,
          req_id: source.id
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Filter.body(this.app, source, range),
          options: {
            search_after_loop: false,
            sort: {
              '@timestamp': 'desc'
            },
            notes_on_match: false,
            max_notes: 0,
            include_query_in_results: false
          }
        })
      });
    }));
  }

  cancel = async (r: μ.Source) => {
    Logger.log(`Request canselation has been requested for source ${Source.id(this.app, r).name}`, Info.name);

    return await api('/stats_cancel_request', {
      method: 'PUT',
      query: { r }
    });
  }

  filters_cache = (source: λSource | μ.Source) => {
    Logger.log(`Caching has been requested for source ${Source.id(this.app, source).name}`, Info.name);

    const id = Parser.useUUID(source) as μ.Source;
    this.setInfoByKey({
      data: this.app.timeline.cache.data.set(id, this.app.target.events.get(id) || []),
      filters: { ...this.app.timeline.cache.filters, [id]: this.app.target.filters[id] }
    }, 'timeline', 'cache');

    this.render();
  }

  filters_undo = (source: λSource | μ.Source) => {
    const id = Parser.useUUID(source) as μ.Source;

    this.setInfoByKey({
      ...this.app.target.filters,
      [id]: this.app.timeline.cache.filters[id]
    }, 'target', 'filters');

    this.app.target.events.delete(id);
    this.app.target.events.set(id, this.app.timeline.cache.data.get(id) || []);

    this.setInfoByKey(this.app.target.events, 'target', 'events');
    this.filters_delete_cache(source);
    this.render();
  }

  filters_delete_cache = (source: λSource | μ.Source) => {
    const id = Parser.useUUID(source) as μ.Source;

    this.app.timeline.cache.data.delete(id);

    this.setInfoByKey({
      data: this.app.timeline.cache.data,
      filters: { ...this.app.timeline.cache.filters, [id]: undefined }
    }, 'timeline', 'cache');
  }
  
  // Methods to set different parts of the application state related to ElasticSearch mappings and data transfer
  setUpstream = (num: number) => this.setInfoByKey(this.app.transfered.up + num, 'transfered', 'up');
  setDownstream = (num: number) => this.setInfoByKey(this.app.transfered.down + num, 'transfered', 'down');

  setLoaded = (sources: μ.Source[]) => {
    this.setInfoByKey(sources, 'timeline', 'loaded');

    if (this.app.timeline.loaded.length === this.app.target.sources.length) {
      this.notes_reload();
      this.links_reload();
    }
  };

  deload = (uuids: Arrayed<μ.Source>) => this.setLoaded([...this.app.timeline.loaded.filter(_uuid => !uuids.includes(_uuid))]);

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
  /* ПОСТАВИТЬ НОВЫЕ ОПЕРАЦИИ С ОХ ПОЛНЫМ ОБНУЛЕНИЕМ, И ПОВТОРНЫМ СЕЛЕКТОМ ПРЕДЫДУЩЕ-ВЫБРАННОГО */
  
  // 🔥 CONTEXTS
  // Получить выбранные контексты
  contexts_select = (contexts: λContext[]) => this.setInfoByKey(Context.select(this.app, contexts), 'target', 'contexts');

  contexts_set = (contexts: λContext[]) => this.setInfoByKey(contexts, 'target', 'contexts');

  // 🔥 PLUGINS
  plugins_set = (sources: λSource[]) => this.setInfoByKey(sources, 'target', 'sources');

  // 🔥 FILES
  files_select = (sources: λSource[]) => this.setInfoByKey(Source.select(this.app, sources), 'target', 'sources');
  files_unselect = (sources: Arrayed<λSource>) => {
    if (this.app.timeline.target && Parser.array(sources).map(source => source.id).includes(this.app.timeline.target.source_id)) {
      this.setTimelineTarget(null);
    }
    this.setInfoByKey(Source.unselect(this.app, sources), 'target', 'sources')
  };
  files_set = (sources: λSource[]) => this.setInfoByKey(sources, 'target', 'sources');
  // @ts-ignore
  files_set_color = (source: λSource, color: Gradients) => this.setInfoByKey(Source.replace({ ...source, color }, this.app), 'target', 'sources');
  files_replace = (sources: Arrayed<λSource>) => this.setInfoByKey(Source.replace(sources, this.app), 'target', 'sources');

  // 🔥 EVENTS 
  events_selected = () => Event.selected(this.app);
  events_add = (events: λEvent | λEvent[]) => this.setInfoByKey(Event.add(this.app, events), 'target', 'events');
  events_reset_in_file = (sources: Arrayed<λSource>) => {
    this.setInfoByKey(Event.delete(this.app, sources), 'target', 'events')
  };
  events_reset = () => this.setInfoByKey(new Map(), 'target', 'events');

  setDialogSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'dialogSize');
  }

  notes_set = (notes: λNote[]) => this.setInfoByKey(notes, 'target', 'notes');

  notes_reload = async () => {
    const src_file: λSource['name'][] = []
    const context: λContext['name'][] = []
    const operation_ids: λOperation['id'][] = []
    
    Source.selected(this.app).forEach(source => {
      src_file.push(source.name);

      const { name, operation_id } = Context.findBySource(this.app, source) || {};

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

  // fileKey = (source: λSource, key: keyof λEvent) => this.setInfoByKey(Source.replace({ ...source, key }, this.app), 'target', 'sources');

  links_reload = async () => {
    const src_file: λSource['name'][] = []
    const context: λContext['name'][] = []
    const operation_ids: λOperation['id'][] = []
    
    Source.selected(this.app).forEach(source => {
      src_file.push(source.name);

      const { name, operation_id } = Context.findBySource(this.app, source) || {};

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
        formData.append('glyph', new Blob([""], { type: 'image/png' }));

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
    const sources: λSource[] = [];

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
            sources: rawContext.sources.map(rawSource => {
              const source: λSource = {
                ...rawSource,
                settings: {
                  color: 'deep',
                  engine: 'default',
                  focusField: 'event.code',
                  offset: 0
                },
                detailed: {}
              };
              sources.push(source)
              return source.id;
            })
          };
          contexts.push(context);
          return context.id;
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
          sources
        }
      }
    }));

    return { operations, contexts, sources };
  }

  query_max_min = ({ ignore }: { ignore?: boolean}) => api<QueryMaxMin>('/query_max_min', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      operation_id: [Operation.selected(this.app)?.id]
    })
  }).then(data => {
    const fulfilled = Boolean(data.buckets.length);
    const base = data.buckets[0]?.['*'];

    if (!base) {
      return
    }

    const timestamp: MinMax = {
      max: base['max_@timestamp'],
      min: base['min_@timestamp'],
    }
    const selected = this.app.target.bucket.selected
      ? this.app.target.bucket.selected
      : differenceInMonths(timestamp.max, timestamp.min) > 6
        ? null
        : timestamp;

    const bucket: Bucket = {
      total: data.total,
      fetched: this.app.target.bucket.fetched || 0,
      event_code: {
        max: fulfilled ? base['max_event.code'] : 1,
        min: fulfilled ? base['min_event.code'] : 0
      },
      timestamp,
      selected
    };

    if (!ignore) {
      this.setBucket(bucket);
    }

    return bucket;
  });

  setBucketSelected = (range: MinMax) => {
    LoggerHandler.bucketSelection(range, this.app.target.bucket.timestamp);

    this.setBucket({
      ...this.app.target.bucket,
      selected: {
        min: Math.max(range.min, 1),
        max: range.max
      }
    });
    return range;
  };

  private setBucket = (bucket: Bucket) => this.setInfoByKey(bucket, 'target', 'bucket');
  
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
      const events = Source.events(this.app, this.app.timeline.target.source_id);
      const index = events.findIndex(event => event.source_id === this.app.timeline.target!.source_id) + event;
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
  }: QueryExternalProps) => api('/query_external', {
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

  filters_remove = (source: λSource | λSource['id']) => this.setInfoByKey(({ ...this.app.target.filters, [Parser.useUUID(source)]: []}), 'target', 'filters');

  filters_change = (source: λSource | μ.Source, filter: λFilter | λFilter['id'], obj: Partial<λFilter>) => {
    const file_uuid = Parser.useUUID(source) as μ.Source;
    const filter_uuid = Parser.useUUID(filter) as μ.Filter;

    const file_filters = this.app.target.filters[file_uuid];

    Object.assign(file_filters.find(filter => filter.id === filter_uuid) || {}, obj);

    this.setInfoByKey(this.app.target.filters, 'target', 'filters');
  }

  useReverseScroll = (bool: boolean) => {
    localStorage.setItem('settings.__isScrollReversed', String(bool));
    this.setInfoByKey(bool, 'timeline', 'isScrollReversed')
  }

  files_reorder_upper = (id: λSource['id']) => {
    const sources = this.app.target.sources
    const index = sources.findIndex(source => source.id === id);

    if (index === 0) return;

    const source = sources[index];
    sources[index] = sources[index - 1]
    sources[index -  1] = source;

    this.setInfoByKey(sources, 'target', 'sources');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }

  files_reorder_lower = (id: λSource['id']) => {
    const sources = this.app.target.sources
    const index = sources.findIndex(source => source.id === id);

    if (index === sources.length - 1) return;

    const source = sources[index];
    sources[index] = sources[index + 1]
    sources[index + 1] = source;

    this.setInfoByKey(sources, 'target', 'sources');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }

  sigma = {
    set: async (sources: Arrayed<λSource>, sigma: { name: string, content: string }) => {
      sources = Parser.array(sources);

      const newSigma: typeof this.app.target.sigma = {}

      sources.forEach(source => {
        newSigma[source.id] = {
          name: sigma.name,
          content: sigma.content
        }
      })

      this.setInfoByKey({
        ...this.app.target.sigma,
        ...newSigma
      }, 'target', 'sigma');

      this.events_reset_in_file(sources);

      sources.forEach(source => {
        api('/query_sigma', {
          method: 'POST',
          query: {
            ws_id: this.app.general.ws_id,
            req_id: source.id
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

      this.deload(sources.map(source => source.id));
    },
  
    remove: (source: λSource | λSource['id']) => {
      // eslint-disable-next-line
      const id = Parser.useUUID(source) as λSource['id'];

      // eslint-disable-next-line
      delete this.app.target.sigma[id];
      this.setInfoByKey(this.app.target.sigma, 'target', 'sigma');
      this.deload(id);
    }
  }

  files_repin = (id: λSource['id']) => {
    const sources = this.app.target.sources
    const index = sources.findIndex(source => source.id === id);

    sources[index].pinned = !sources[index].pinned;

    this.setInfoByKey(sources, 'target', 'sources');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }   
  
  get width(): number {
    return this.app.timeline.scale * (this.timeline.current?.clientWidth || 1);
  }

  setDefaultEngine = (engine: Engine.List) => {
    this.setInfoByKey({
      ...this.app.general.settings,
      engine
    }, 'general', 'settings');
  }

  setDefaultColor = (color: Gradients) => {
    this.setInfoByKey({
      ...this.app.general.settings,
      color
    }, 'general', 'settings');
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

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (use: λApp | λContext[]): λContext[] => Parser.use(use, 'contexts').filter(c => c.selected && ('target' in use ? Operation.selected(use)?.name === c.id : true));

  public static find = (use: λApp | λContext[], context: λContext | λContext['id']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.id === Parser.useUUID(context));

  public static findBySource = (use: λApp | λContext[], source: λSource | λSource['id']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.sources.some(p => p === Parser.useUUID(source)));

  public static select = (use: λApp | λContext[], selected: Arrayed<λContext | λContext['id']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.id === Parser.useUUID(s)) ? Context._select(c) : c);
  
  public static unselect = (use: λApp | λContext[], unselected: Arrayed<λContext | λContext['id']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(unselected).find(s => c.id === Parser.useUUID(s)) ? Context._unselect(c) : c);

  public static check = (use: λApp | λContext[], selected: Arrayed<λContext | UUID>, check?: boolean): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.id === Parser.useUUID(s)) ? (check ? (Context._select(Context.id(use, c))) : Context._unselect(Context.id(use, c))) : c);
  
  public static id = (use: λApp | λContext[], context: λContext | λContext['id']) => Parser.use(use, 'contexts').find(c => c.id === Parser.useUUID(context))!;
  
  public static sources = (app: λApp, context: λContext | string | UUID): λSource[] => app.target.sources.filter(p => p.context_id === Parser.useUUID(context));

  private static _select = (c: λContext): λContext => ({ ...c, selected: true });

  private static _unselect = (c: λContext): λContext => ({ ...c, selected: false });
}

export class Source {
  public static replace = (newFiles: Arrayed<λSource>, use: λApp | λSource[]): λSource[] => Parser.use(use, 'sources').map(source => Parser.array(newFiles).find(s => s.id === source.id) || source);

  public static single = <K extends keyof λSource>(sources: λSource[], field: K): λSource[K] | undefined => Parser.array(sources)[0]?.[field];

  public static reload = (sources: Arrayed<λSource>, app: λApp): λSource[] => Source.select(Parser.array(sources), Source.selected(app));

  public static wellFormatedName = (source: λSource) => source.name.split('/').pop();

  public static pluginName = (source: λSource) => source.name.split('/').reverse()[1];

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (app: λApp): λSource[] => Source.pins(app.target.sources.filter(s => s.selected && Source.selected(app).some(p => p.id === s.id))).filter(s => s.name.toLowerCase().includes(app.timeline.filter) || Source.id(app, s.id)?.context_id.includes(app.timeline.filter));
  
  public static select = (use: λApp | λSource[], selected: Arrayed<λSource | string>): λSource[] => Parser.use(use, 'sources').map(s => Parser.array(selected).find(f => s.id === Parser.useUUID(f)) ? Source._select(s) : s);

  public static pins = (use: λApp | λSource[]) => Parser.use(use, 'sources').sort((a, b) => a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1);

  public static context = (app: λApp, source: λSource) => Context.id(app, source.context_id);

  public static id = (use: λApp | λSource[], source: λSource | μ.Source) => typeof source === 'string' ? Parser.use(use, 'sources').find(s => s.id === Parser.useUUID(source))! : source;

  public static unselect = (use: λApp | λSource[], unselected: Arrayed<λSource | string>): λSource[] => Parser.use(use, 'sources').map(s => Parser.array(unselected).find(f => s.id === Parser.useUUID(f)) ? Source._unselect(s) : s);

  public static check = (use: λApp | λSource[], selected: Arrayed<λSource | string>, check: boolean): λSource[] => Parser.use(use, 'sources').map(s => Parser.array(selected).find(f => s.id === Parser.useUUID(f) && check) ? Source._select(s) : Source._unselect(s));

  public static events = (app: λApp, source: λSource | μ.Source): λEvent[] => Event.get(app, Parser.useUUID(source) as μ.Source);
  
  public static notes = (app: λApp, sources: Arrayed<λSource>): λNote[] => Parser.array(sources).map(s => Note.findByFile(app, s)).flat();

  public static index = (app: λApp, source: λSource | μ.Source) => Source.selected(app).findIndex(s => s.id === Parser.useUUID(source));

  public static getHeight = (app: λApp, source: λSource | μ.Source, scrollY: number) => 48 * this.index(app, source) - scrollY + 24;

  private static _select = (p: λSource): λSource => ({ ...p, selected: true });

  private static _unselect = (p: λSource): λSource => ({ ...p, selected: false });
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
  public static find = (app: λApp, source: λSource) => app.target.filters[source.id] || [];

  public static findMany = (app: λApp, sources: λSource[]) => {
    const filters: λFilter[][] = [];

    sources.forEach(source => {
      const filter = Filter.find(app, source);
      if (filter) {
        filters.push(filter)
      }
    });

    return filters;
  }

  public static base = (app: λApp, source: λSource, range?: MinMax) => {
    const context = Context.findBySource(app, source);

    if (!context) {
      throw new ApplicationError(`GulpQueryFilter.base() cannot allocate context for source ${source.name} with uuid_${source.id}`)
    }

    //eslint-disable-next-line
    // @ts-ignore
    return `(operation_id:${context.operation_id} AND (gulp.context: \"${context.name}\") AND gulp.source.source:"${source.name}" AND @timestamp:>=${Math.max(source.timestamp.min, (range?.min || -Infinity))} AND @timestamp:<=${Math.min(source.timestamp.max, (range?.max || Infinity))})`
  }

  public static parse(app: λApp, source: λSource, range?: MinMax) {
    const base = Filter.base(app, source, range);
    
    const query = Filter.query(app, source);

    return query ? `${base} AND ${query}` : base;
  }

  /** 
   * @returns Стринговое поле фильтра
   */
  static query = (app: λApp, source: λSource) => {
    const filters = Filter.find(app, source);
    
    return filters.map((filter, index) => {
      const isLast = filters.length - 1 === index;

      let queryStringPart: string;

      const isParsable = Number.isNaN(Number(filter.value));

      const value = isParsable ? filter.value : `"${filter.value}"`

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
  
  static body = (app: λApp, source: λSource, range?: MinMax) => ({
    query_raw: {
      bool: {
        must: [
          {
            query_string: {
              query: Filter.parse(app, source, range),
              analyze_wildcard: true
            }
          }
        ]
      }
    },
    options: {
      sort: {
        '@timestamp': "desc"
      }
    }
  });
}

export class Event {
  public static delete = (app: λApp, sources: Arrayed<λSource>) => {
    sources = Parser.array(sources);

    sources.forEach(source => {
      app.target.events.delete(source.id);
      app.target.events.set(source.id, []);
    })
    
    return app.target.events;
  }

  public static get = (app: λApp, id: μ.Source): λEvent[] => app.target.events.get(id) || app.target.events.set(id, []).get(id)!;

  public static selected = (app: λApp): λEvent[] => Source.selected(app).map(s => Event.get(app, s.id)).flat();

  public static add = (app: λApp, _events: λEvent | λEvent[]) => {
    const events = Parser.array(_events);
    events.map(e => Event.get(app, e.source_id).push(e));
    events.sort((a, b) => a.timestamp - b.timestamp);
    return app.target.events;
  }

  public static parse = (app: λApp, original: RawNote | RawLink): λEvent[] => Parser.array(original.events).reduce<λEvent[]>((result, e) => {
    e.context = e.context || original.context;
    e.src_file = e.src_file || original.src_file;
    e.operation_id = e.operation_id || original.operation_id;

    const source = Source.id(app, e.src_file);

    if (source) {
      result.push({
        id: e.id,
        operation_id: e.operation_id,
        timestamp: e['@timestamp'] as Hardcode.Timestamp,
        source_id: source.id,
        context: source.context_id,
        event: {
          duration: 1,
          code: '0'
        },
      })
    };
    
    return result
  }, []);

  public static findByIdAndUUID = (app: λApp, eventId: string | string[], id: μ.Source) => Event.get(app, id).filter(e => Parser.array(eventId).includes(e.id));

  public static findById = (app: λApp, eventId: string | string[]) => Array.from(app.target.events, ([k, v]) => v).flat().filter(e => Parser.array(eventId).includes(e.id));
}

export class Note {
  public static parse = (app: λApp, notes: RawNote[]): λNote[] => notes.map(n => {
    const note: λNote = {
      ...n,
      events: Event.parse(app, n),
      data: {
        ...n.data,
        color: λColor['name -> hex'](n.data.color) as Color
      }
    }
    return note;
  });

  public static findByFile = (use: λApp | λNote[], source: λSource | string) => Parser.use(use, 'notes').filter(n => n.source_id === Parser.useName(source));
  
  public static findByEvent = (use: λApp | λNote[], event: λEvent | string) => Parser.use(use, 'notes').filter(n => n.events.some(e => e.id === Parser.useId(event)));

  public static timestamp = (note: λNote): number => {
    let sum = 0
    note.events.forEach(e => sum += e.timestamp);
    return (sum / note.events.length) || (note.time_end ? (note.time_start + note.time_end) / 2 : note.time_start);
  }
}

export class Link {
  public static parse = (app: λApp, links: RawLink[]): λLink[] => links.map(l => {
    const seenIds = new Set<λRawEventMinimized['id']>();
    l.events = [...(l.data.events || []), ...l.events].filter(e => Object.values(e).every(v => !!v) && !seenIds.has(e.id) && seenIds.add(e.id));

    delete l.data.events;

    return {
      ...l,
      source_id: l.src_file,
      data: {
        ...l.data,
        color: λColor['name -> hex'](l.data.color)
      },
      events: Event.parse(app, l),
      _uuid: Source.id(app, l.src_file).id,
    }
  });

  public static findByFile = (use: λApp | λLink[], source: λSource | μ.Source): λLink[] => Parser.use(use, 'links').filter(l => l.source_id === Parser.useUUID(source));
  
  // public static findByEvent = (use: Information | λLink[], event: λEvent | string): λLink[] => Parser.use(use, 'links').filter(l => l.events.some(e => e._id === Parser.useId(event)));

  public static timestamp = (link: λLink): number => {
    let sum = 0
    link.events.forEach(e => sum += e.timestamp);
    return (sum / link.events.length) || (link.time_end ? (link.time_start + link.time_end) / 2 : link.time_start);
  }
}

export class Parser {
  public static use = <K extends keyof λApp['target']>(x: λApp | λApp['target'][K], expects: K): λApp['target'][K] => Array.isArray(x) ? x as λApp['target'][K] : (x as λApp)['target'][expects];

  public static useName = (unknown: λOperation | λContext | λSource | λSource | string): string => typeof unknown === 'string' ? unknown : unknown.name;

  public static useId = (unknown: λEvent | string): string => typeof unknown === 'string' ? unknown : unknown.id;

  public static useUUID = <T extends λContext | λSource | λSource | λSource | λFilter>(unknown: T | string): μ.Context | μ.Source | μ.Filter | μ.Operation | μ.Source | μ.Source | μ.Window => {
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

export type UUIDED<K extends λContext | λSource | λSource | λFilter> = K | K['id'];

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

  const Source = Symbol('Source');
  export type Source = UUID & {
    readonly [Source]: unique symbol;
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