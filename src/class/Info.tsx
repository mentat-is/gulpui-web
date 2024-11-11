import { ElasticListIndex, OperationsList, type λApp } from '@/dto';
import { Api } from '@/dto/api.dto';
import { Bucket, MinMax, QueryMaxMin } from '@/dto/QueryMaxMin.dto';
import { RawOperation, λOperation } from '@/dto/Operation.dto';
import { λContext } from '@/dto/Context.dto';
import { QueryOperations } from '@/dto/QueryOperations.dto';
import { λEvent, λEventFormForCreateRequest } from '@/dto/ChunkEvent.dto';
import { PluginEntity, PluginEntityResponse, λPlugin } from '@/dto/Plugin.dto';
import React from 'react';
import { λIndex } from '@/dto/Index.dto';
import { ResponseBase, ResponseError } from '@/dto/ResponseBase.dto';
import { λFile } from '@/dto/File.dto';
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

interface RefetchOptions {
  uuids?: Arrayed<λFile['uuid']>;
  hidden?: boolean;
  range?: MinMax;
}

interface InfoProps {
  app: λApp,
  setInfo: React.Dispatch<React.SetStateAction<λApp>>, 
  api: Api
  timeline: React.RefObject<HTMLDivElement>;
}

export class Info implements InfoProps {
  app: λApp;
  setInfo: React.Dispatch<React.SetStateAction<λApp>>;
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
    this.timeline = timeline;
  }

  setTimelineFilteringoptions = (file: λFile | λFile['uuid'], options: FilterOptions) => this.setInfoByKey({
    ...this.app.timeline.filtering_options,
    [Parser.useUUID(file)]:
    options
  }, 'timeline', 'filtering_options');

  refetch = async ({ uuids = [], hidden, range }: RefetchOptions = {}) => {
    uuids = Parser.array(uuids);

    const operation = Operation.selected(this.app);
    const contexts = Context.selected(this.app);

    if (!operation || !contexts.length) return;

    uuids.length
      ? uuids.forEach(uuid => this.events_reset_in_file(uuid))
      : this.events_reset();
    
    await this.mapping();

    const files: λFile[] = (uuids.length
      ? uuids.reduce<λFile[]>((files, uuid) => {
        const file = File.uuid(this.app, uuid);

        if (file) files.push(file);
        else {
          Logger.error(`File with uuid ${uuid} not found in application data`, `${Info.name}.${this.refetch.name}`);
          toast('File not found in application data', {
            description: `See console for further details. UUID: ${uuid}`
          });
        }

        return files;
      }, [])
      : File.selected(this.app))

    await this.notes_reload();

    await this.links_reload();

    await this.glyphs_reload();

    if (!hidden) {
      this.deload(files.map(f => f.uuid));
    }
    
    await Promise.all(files.map(async file => {
      if (!this.app.target.bucket.selected && !range) return Logger.error(`${Info.name}.${this.refetch.name} for file ${file?.uuid}-${file?.uuid} has been executed, but was cancelled bacause range is ${typeof range} and ${typeof this.app.target.bucket.selected}`, Info.name);

      return await this.api('/query_raw', {
        method: 'POST',
        data: {
          ws_id: this.app.general.ws_id,
          req_id: file.uuid
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Filter.body(this.app, file, range),
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

  cancel = async (r: μ.File) => {
    Logger.log(`Request canselation has been requested for file ${File.uuid(this.app, r).name}`, Info.name);

    return await this.api('/stats_cancel_request', {
      method: 'PUT',
      data: { r },
      ignore: true
    });
  }

  filters_cache = (file: λFile | μ.File) => {
    Logger.log(`Caching has been requested for file ${File.uuid(this.app, file).name}`, Info.name);

    const uuid = Parser.useUUID(file) as μ.File;
    this.setInfoByKey({
      data: this.app.timeline.cache.data.set(uuid, this.app.target.events.get(uuid) || []),
      filters: { ...this.app.timeline.cache.filters, [uuid]: this.app.target.filters[uuid] }
    }, 'timeline', 'cache');

    this.render();
  }

  filters_undo = (file: λFile | μ.File) => {
    const uuid = Parser.useUUID(file) as μ.File;

    this.setInfoByKey({
      ...this.app.target.filters,
      [uuid]: this.app.timeline.cache.filters[uuid]
    }, 'target', 'filters');

    this.app.target.events.delete(uuid);
    this.app.target.events.set(uuid, this.app.timeline.cache.data.get(uuid) || []);

    this.setInfoByKey(this.app.target.events, 'target', 'events');
    this.filters_delete_cache(file);
    this.render();
  }

  filters_delete_cache = (file: λFile | μ.File) => {
    const uuid = Parser.useUUID(file) as μ.File;

    this.app.timeline.cache.data.delete(uuid);

    this.setInfoByKey({
      data: this.app.timeline.cache.data,
      filters: { ...this.app.timeline.cache.filters, [uuid]: undefined }
    }, 'timeline', 'cache');
  }
  
  // Methods to set different parts of the application state related to ElasticSearch mappings and data transfer
  setUpstream = (num: number) => this.setInfoByKey(this.app.transfered.up + num, 'transfered', 'up');
  setDownstream = (num: number) => this.setInfoByKey(this.app.transfered.down + num, 'transfered', 'down');

  setLoaded = (files: μ.File[]) => {
    const message = files.length > 1
      ? `Files: [${files.map(f => File.uuid(this.app, f).name).join(', ')}] has been fully loaded`
      : `File: ${File.uuid(this.app, files[0])?.name} with uuid ${files[0]} has been fully loaded`;

    Logger.log(message, Info.name);

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
  index_reload = () => this.api<ElasticListIndex>('/elastic_list_index').then(response => this.setInfoByKey(response.isSuccess() ? response.data : [], 'target', 'indexes'));

  index_select = (index: λIndex) => this.setInfoByKey(Index.select(this.app, index), 'target', 'indexes');

  // 🔥 OPERATIONS
  operations_reload = () => this.api<OperationsList>('/operation_list', {
    method: 'POST'
  }).then(response => {
    if (response.isSuccess()) {
      Logger.log(`API /operation_list has been fetched successfully. Total amount: ${response.data.length}`, Info.name);
      this.setInfoByKey(Operation.reload(response.data, this.app), 'target', 'operations');
    } else {
      Logger.error(response, Info.name);
    }
  });

  operations_select = (operation: λOperation) => this.setInfoByKey(Operation.select(this.app, operation), 'target', 'operations');
  
  operations_set = (operations: λOperation[]) => this.setInfoByKey(Operation.reload(operations, this.app), 'target', 'operations');
  /* ПОСТАВИТЬ НОВЫЕ ОПЕРАЦИИ С ОХ ПОЛНЫМ ОБНУЛЕНИЕМ, И ПОВТОРНЫМ СЕЛЕКТОМ ПРЕДЫДУЩЕ-ВЫБРАННОГО */
  
  // 🔥 CONTEXTS
  // Получить выбранные контексты
  contexts_select = (contexts: λContext[]) => this.setInfoByKey(Context.select(this.app, contexts), 'target', 'contexts');

  contexts_set = (contexts: λContext[]) => this.setInfoByKey(contexts, 'target', 'contexts');

  // 🔥 PLUGINS
  plugins_set = (plugins: λPlugin[]) => this.setInfoByKey(plugins, 'target', 'plugins');

  plugins_fetch = () => this.api<PluginEntityResponse>('/plugin_list').then(res => {
    if (res.isSuccess()) {
      return res.data;
    } else {
      toast('Error fetching plugin_list', {
        description: (res as unknown as ResponseError).data.exception.msg
      })
    }
  });

  // 🔥 FILES
  files_select = (files: λFile[]) => this.setInfoByKey(File.select(this.app, files), 'target', 'files');
  files_unselect = (files: Arrayed<λFile>) => {
    if (this.app.timeline.target && Parser.array(files).map(file => file.uuid).includes(this.app.timeline.target._uuid)) {
      this.setTimelineTarget(null);
    }
    this.setInfoByKey(File.unselect(this.app, files), 'target', 'files')
  };
  files_set = (files: λFile[]) => this.setInfoByKey(files, 'target', 'files');
  files_set_color = (file: λFile, color: Gradients) => this.setInfoByKey(File.replace({ ...file, color }, this.app), 'target', 'files');
  files_replace = (file: λFile) => this.setInfoByKey(File.replace(file, this.app), 'target', 'files');
  file_find_by_filename_and_context = (filename: λFile['name'], context: λContext['name']) => File.findByNameAndContextName(this.app, filename, context);

  // 🔥 EVENTS 
  events_selected = () => Event.selected(this.app);
  events_add = (events: λEvent | λEvent[]) => this.setInfoByKey(Event.add(this.app, events), 'target', 'events');
  events_reset_in_file = (uuid: μ.File) => {
    Logger.log(`All events has been erased from file with uuid ${uuid}`, `${Info.name}.${this.events_reset_in_file.name}`);
    this.setInfoByKey(Event.delete(this.app, uuid), 'target', 'events')
  };
  events_reset = () => this.setInfoByKey(new Map(), 'target', 'events');

  notes_set = (notes: λNote[]) => this.setInfoByKey(notes, 'target', 'notes');

  notes_reload = async () => {
    const src_file: λFile['name'][] = []
    const context: λContext['name'][] = []
    const operation_id: λOperation['id'][] = []
    
    File.selected(this.app).forEach(file => {
      src_file.push(file.name);

      const { name, operation } = Context.findByPugin(this.app, file._uuid) || {};

      if (!name || !operation) return;

      if (!context.includes(name))
        context.push(name);

      if (!operation_id.includes(operation.id))
        operation_id.push(operation.id);
    });

    const response = await this.api<ResponseBase<RawNote[]>>('/note_list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        index: [Index.selected(this.app)?.name],
        src_file, 
        context,
        operation_id
      })
    });

    if (response.isSuccess()) {
      this.notes_set(Note.parse(this.app, response.data))
    } else {
      const error = (response as unknown as ResponseError).data.exception.name;
      Logger.error(`Notes fetch was failed. Reason:
${error}`, Info.name);

      return;
    };

    Logger.log(`Notes has been fetched successfully. Total amount: ${response.data.length}`, Info.name);
  }

  notes_delete = (note: λNote) => this.api<ResponseBase<boolean>>('/note_delete', {
    method: 'DELETE',
    data: {
      note_id: note.id,
      ws_id: this.app.general.ws_id
    }
  }).then(async (res) => {
    if (res.isSuccess()) {
      await this.notes_reload();
      toast('Note deleted successfully');
    } else {
      toast((res as unknown as ResponseError).data.exception.name);
    }
  });

  links_reload = async () => {
    const src_file: λFile['name'][] = []
    const context: λContext['name'][] = []
    const operation_id: λOperation['id'][] = []
    
    File.selected(this.app).forEach(file => {
      src_file.push(file.name);

      const { name, operation } = Context.findByPugin(this.app, file._uuid) || {};

      if (!name || !operation) return;

      if (!context.includes(name))
        context.push(name);

      if (!operation_id.includes(operation.id))
        operation_id.push(operation.id);
    });
    
    const response = await this.api<ResponseBase<RawLink[]>>('/link_list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        index: [Index.selected(this.app)?.name],
        src_file,
        context,
        operation_id
      })
    });

    if (response.isSuccess()) {
      this.links_set(response.data)
    } else {
      const error = (response as unknown as ResponseError).data.exception.name;
      Logger.error(`Links fetch was failed. Reason:
${error}`, Info.name);

      return;
    };

    Logger.log(`Links has been fetched successfully. Total amount: ${response.data.length}`, Info.name);
  }

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

  glyphs_reload = async () => {
    const parse = (glyphs: λGlyph[]) => {
      // Все иконки внутри приложения
      const values = Object.values(GlyphMap);

      values.forEach(async (value, id) => {
        // Проверяем, есть ли такая иконка на бекенде
        const exist = glyphs.find(g => g.name === value || g.id === id);

        if (exist) return;

        const formData = new FormData();
        formData.append('glyph', new Blob([""], { type: 'image/png' }));

        // Если нет, то создаём
        await this.api<ResponseBase<unknown>>('/glyph_create', {
          method: 'POST',
          data: {
            name: value,
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

    await this.api<ResponseBase<λGlyph[]>>('/glyph_list', {
      method: 'POST',
    }).then(res => res.isSuccess() ? parse(res.data) : toast('Error fetching glyphs', {
      description: (res as unknown as ResponseError).data.exception.name
    }));
  }

  query_operations = async () => {
    const operations: λOperation[] = [];
    const contexts: λContext[] = [];
    const plugins: λPlugin[] = [];
    const files: λFile[] = [];

    const bucket = await this.query_max_min({ ignore: true });

    const rawOperations =  await this.api<QueryOperations>('/query_operations').then(res => res.data || []);
    

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
          const c_uuid = generateUUID() as λContext['uuid'];
          const context: λContext = {
            operation: { name, id },
            name: rawContext.name,
            doc_count: rawContext.doc_count,
            uuid: c_uuid,
            plugins: rawContext.plugins.map(rawPlugin => {
              const p_uuid = generateUUID() as λPlugin['uuid'];
              const plugin: λPlugin = {
                name: rawPlugin.name,
                context: rawContext.name,
                uuid: p_uuid,
                _uuid: c_uuid,
                files: rawPlugin.src_file.map(rawFile => {
                  const f_uuid = generateUUID() as λFile['uuid'];
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
                    plugin: rawPlugin.name,
                    _uuid: p_uuid,
                    offset: 0,
                    color: 'thermal',
                    engine: 'default',
                    uuid: f_uuid
                  }
                  files.push(file)
                  return file.uuid;
                })
              };
              plugins.push(plugin)
              return plugin.uuid;
            })
          };
          contexts.push(context);
          return context.uuid;
        })
      };
      operations.push(operation);
    });

    this.setInfo(app => ({
      ...app,
      ...{
        target: {
          ...app.target,
          bucket,
          operations,
          contexts,
          plugins,
          files
        }
      }
    }));

    Logger.log(`/query_operations has been successfully fetched. Total data:
Operations: ${operations.length}
Contexts: ${contexts.length}
Plugins: ${plugins.length}
Files: ${files.length}`, Info.name);

    return { operations, contexts, plugins, files };
  }

  setBucketSelected = (range: MinMax) => {
    LoggerHandler.bucketSelection(range, this.app.target.bucket.timestamp);

    this.setBucket({
      ...this.app.target.bucket,
      selected: range
    });
    return range;
  };

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
  setTimelineTarget = (event?: λEvent | null) => this.setInfoByKey(event, 'timeline', 'target');
  setTimelineFilter = (filter: string) => this.setInfoByKey(filter, 'timeline', 'filter');
  
  increasedTimelineScale = (current: number = this.app.timeline.scale) => current + (current / 16);
  
  decreasedTimelineScale = () => this.app.timeline.scale - this.app.timeline.scale / 16;

  query_max_min = ({ ignore }: { ignore?: boolean}) => this.api<QueryMaxMin>('/query_max_min', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      operation_id: [Operation.selected(this.app)?.id]
    })
  }).then(response => {
    const fulfilled = Boolean(response.data.buckets.length);

    const timestamp: MinMax = {
      max: response.data.buckets[0]['*']['max_@timestamp'],
      min: response.data.buckets[0]['*']['min_@timestamp'],
    }
    const selected = this.app.target.bucket.selected
      ? this.app.target.bucket.selected
      : differenceInMonths(timestamp.max, timestamp.min) > 6
        ? null
        : timestamp;

    const bucket: Bucket = {
      total: response.data.total,
      fetched: this.app.target.bucket.fetched || 0,
      event_code: {
        max: fulfilled ? response.data.buckets[0]['*']['max_event.code'] : 1,
        min: fulfilled ? response.data.buckets[0]['*']['min_event.code'] : 0
      },
      timestamp,
      selected
    };

    if (!ignore) {
      this.setBucket(bucket);
    }

    return bucket;
  });

  filters_add = (uuid: UUID, filters: λFilter[]): void => this.setInfoByKey(({ ...this.app.target.filters, [uuid]: filters}), 'target', 'filters');

  filters_remove = (file: λFile | λFile['uuid']) => this.setInfoByKey(({ ...this.app.target.filters, [Parser.useUUID(file)]: []}), 'target', 'filters');

  filters_change = (file: λFile | μ.File, filter: λFilter | λFilter['uuid'], obj: Partial<λFilter>) => {
    const file_uuid = Parser.useUUID(file) as μ.File;
    const filter_uuid = Parser.useUUID(filter) as μ.Filter;

    const file_filters = this.app.target.filters[file_uuid];

    Object.assign(file_filters.find(filter => filter.uuid === filter_uuid) || {}, obj);

    this.setInfoByKey(this.app.target.filters, 'target', 'filters');
  }

  mapping = () => this.api<MappingFileListRequest>('/mapping_file_list').then(async (res) => {
    const plugins = await this.plugins_fetch();

    if (!plugins) return;

    plugins.forEach(plugin => { plugin.mappings = [] });

    if (res.isSuccess()) {
      const mappings = res.data;

      mappings.forEach(mapping => {
        const plugin = plugins.find(p => mapping.metadata.plugin.some(_plugin => _plugin === p.filename));

        delete (mapping as Partial<RawMapping>).metadata;

        plugin?.mappings.push(mapping);
      })

      this.setInfoByKey(plugins, 'general', 'ingest');
    }
  });

  files_reorder_upper = (uuid: λFile['uuid']) => {
    const files = this.app.target.files
    const index = files.findIndex(file => file.uuid === uuid);

    if (index === 0) return;

    const file = files[index];
    files[index] = files[index - 1]
    files[index -  1] = file;

    this.setInfoByKey(files, 'target', 'files');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }

  files_reorder_lower = (uuid: λFile['uuid']) => {
    const files = this.app.target.files
    const index = files.findIndex(file => file.uuid === uuid);

    if (index === files.length - 1) return;

    const file = files[index];
    files[index] = files[index + 1]
    files[index + 1] = file;

    this.setInfoByKey(files, 'target', 'files');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }

  sigma = {
    set: async (file: λFile | λFile['uuid'], sigma: { name: string, content: string }) => {
      // eslint-disable-next-line
      const uuid = Parser.useUUID(file) as μ.File;

      this.setInfoByKey({
        ...this.app.target.sigma,
        [uuid]: {
          name: sigma.name,
          content: sigma.content
        }
      }, 'target', 'sigma');

      this.events_reset_in_file(uuid);

      await this.api('/query_sigma', {
        method: 'POST',
        data: {
          ws_id: this.app.general.ws_id,
          req_id: uuid
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

      this.deload(uuid);
    },
  
    remove: (file: λFile | λFile['uuid']) => {
      // eslint-disable-next-line
      const uuid = Parser.useUUID(file) as λFile['uuid'];

      // eslint-disable-next-line
      delete this.app.target.sigma[uuid];
      this.setInfoByKey(this.app.target.sigma, 'target', 'sigma');
      this.deload(uuid);
    }
  }

  files_repin = (uuid: λFile['uuid']) => {
    const files = this.app.target.files
    const index = files.findIndex(file => file.uuid === uuid);

    files[index].pinned = !files[index].pinned;

    this.setInfoByKey(files, 'target', 'files');
    this.setTimelineScale(this.app.timeline.scale + 0.0001);
  }   
  
  get width(): number {
    return this.app.timeline.scale * (this.timeline.current?.clientWidth || 1);
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

  public static findByNameAndId = (app: λApp, { id, name }: Pick<λOperation, 'id' | 'name'>): λOperation | undefined => app.target.operations.find(o => o.name === name && o.id === id);

  public static select = (use: λApp | λOperation[], operation: λOperation | undefined): λOperation[] => Parser.use(use, 'operations').map(o => o.name === operation?.name ? Operation._select(o) : Operation._unselect(o));
  
  public static contexts = (app: λApp): λContext[] => app.target.contexts.filter(c => c.operation.name === Operation.selected(app)?.name);

  private static _select = (o: λOperation): λOperation => ({ ...o, selected: true });

  private static _unselect = (o: λOperation): λOperation => ({ ...o, selected: false });
}

export class Context {
  public static reload = (newContexts: λContext[], app: λApp): λContext[] => Context.select(newContexts, Context.selected(app));

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (use: λApp | λContext[]): λContext[] => Parser.use(use, 'contexts').filter(c => c.selected && ('target' in use ? Operation.selected(use)?.name === c.operation.name : true));

  public static find = (use: λApp | λContext[], context: λContext | λContext['uuid']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.uuid === Parser.useUUID(context));

  public static findByPugin = (use: λApp | λContext[], plugin: λPlugin | λPlugin['uuid']): λContext | undefined => Parser.use(use, 'contexts').find(c => c.plugins.some(p => p === Parser.useUUID(plugin)));

  public static select = (use: λApp | λContext[], selected: Arrayed<λContext | λContext['uuid']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.uuid === Parser.useUUID(s)) ? Context._select(c) : c);
  
  public static unselect = (use: λApp | λContext[], unselected: Arrayed<λContext | λContext['uuid']>): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(unselected).find(s => c.uuid === Parser.useUUID(s)) ? Context._unselect(c) : c);

  public static check = (use: λApp | λContext[], selected: Arrayed<λContext | UUID>, check?: boolean): λContext[] => Parser.use(use, 'contexts').map(c => Parser.array(selected).find(s => c.uuid === Parser.useUUID(s)) ? (check ? (Context._select(Context.uuid(use, c))) : Context._unselect(Context.uuid(use, c))) : c);
  
  public static uuid = (use: λApp | λContext[], context: λContext | λContext['uuid']) => Parser.use(use, 'contexts').find(c => c.uuid === Parser.useUUID(context))!;
  
  public static plugins = (app: λApp, context: λContext | string | UUID): λPlugin[] => app.target.plugins.filter(p => p._uuid === Parser.useUUID(context) || p.context === Parser.useName(context));

  private static _select = (c: λContext): λContext => ({ ...c, selected: true });

  private static _unselect = (c: λContext): λContext => ({ ...c, selected: false });
}

export class Plugin {
  public static reload = (newPlugins: λPlugin[], app: λApp): λPlugin[] => Plugin.select(newPlugins, Plugin.selected(app));

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (use: λApp | λPlugin[]): λPlugin[] => Parser.use(use, 'plugins').filter(p => p.selected && ('target' in use ? Context.selected(use).some(c => c.name === p.context) : true));

  public static select = (use: λApp | λPlugin[], selected: Arrayed<λPlugin | λPlugin['uuid']>): λPlugin[] => Parser.use(use, 'plugins').map(p => Parser.array(selected).find(s => p.name === Parser.useUUID(s)) ? Plugin._select(p) : p);

  public static unselect = (use: λApp | λPlugin[], unselected: Arrayed<λPlugin | λPlugin['uuid']>): λPlugin[] => Parser.use(use, 'plugins').map(p => Parser.array(unselected).find(s => p.name === Parser.useUUID(s)) ? Plugin._unselect(p) : p);

  public static uuid = (use: λApp | λPlugin[], uuid: μ.Plugin) => Parser.use(use, 'plugins').find(p => p.uuid === uuid)!;

  public static context = (use: λApp, plugin: λPlugin) => Context.uuid(use, plugin._uuid);

  public static check = (use: λApp | λPlugin[], selected: Arrayed<λPlugin | λPlugin['uuid']>, check: boolean): λPlugin[] => Parser.use(use, 'plugins').map(p => Parser.array(selected).find(s => p.uuid === Parser.useUUID(s) && check) ? Plugin._select(p) : Plugin._unselect(p));

  public static files = (app: λApp, plugin: λPlugin): λFile[] => app.target.files.filter(f => f._uuid === plugin.uuid);

  private static _select = (p: λPlugin): λPlugin => ({ ...p, selected: true });

  private static _unselect = (p: λPlugin): λPlugin => ({ ...p, selected: false });
}

export class File {
  public static replace = (file: λFile, use: λApp | λFile[]): λFile[] => Parser.use(use, 'files').map(f => file.uuid === f.uuid ? file : f);

  public static reload = (files: Arrayed<λFile>, app: λApp): λFile[] => File.select(Parser.array(files), File.selected(app));

  // Ищем выбранные контексты где выбранная операция совпадает по имени
  public static selected = (app: λApp): λFile[] => File.pins(app.target.files.filter(f => f.selected && Plugin.selected(app).some(p => p.uuid === f._uuid))).filter(f => f.name.toLowerCase().includes(app.timeline.filter.toLowerCase()) || Plugin.uuid(app, f._uuid)?.context.toLowerCase().includes(app.timeline.filter.toLowerCase()));
  
  public static select = (use: λApp | λFile[], selected: Arrayed<λFile | string>): λFile[] => Parser.use(use, 'files').map(f => Parser.array(selected).find(s => f.uuid === Parser.useUUID(s)) ? File._select(f) : f);

  public static pins = (use: λApp | λFile[]) => Parser.use(use, 'files').sort((a, b) => a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1);
 
  public static plugin = (app: λApp, file: λFile) => Plugin.uuid(app, file._uuid);

  public static context = (app: λApp, file: λFile) => Context.uuid(app, Plugin.uuid(app, file._uuid)._uuid);

  public static findByNameAndContextName = (app: λApp, filename: λFile['name'], context: λContext['name']) => app.target.files.find(f => f.name === filename && Context.plugins(app, context).some(p => p.uuid === f._uuid))!;

  public static uuid = (use: λApp | λFile[], file: λFile | μ.File) => typeof file === 'string' ? Parser.use(use, 'files').find(f => f.uuid === Parser.useUUID(file))! : file;

  public static unselect = (use: λApp | λFile[], unselected: Arrayed<λFile | string>): λFile[] => Parser.use(use, 'files').map(f => Parser.array(unselected).find(s => f.uuid === Parser.useUUID(s)) ? File._unselect(f) : f);

  public static check = (use: λApp | λFile[], selected: Arrayed<λFile | string>, check: boolean): λFile[] => Parser.use(use, 'files').map(f => Parser.array(selected).find(s => f.uuid === Parser.useUUID(s) && check) ? File._select(f) : File._unselect(f));

  public static events = (app: λApp, file: λFile | μ.File): λEvent[] => Event.get(app, Parser.useUUID(file) as μ.File);
  
  public static notes = (app: λApp, files: Arrayed<λFile>): λNote[] => Parser.array(files).map(f => Note.findByFile(app, f)).flat();

  public static index = (app: λApp, file: λFile | μ.File) => File.selected(app).findIndex(f => f.uuid === Parser.useUUID(file));

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
  uuid: μ.Filter;
  key: string;
  type: FilterType;
  value: any;
  isOr?: boolean
}

export class Filter {
  public static find = (app: λApp, file: λFile) => app.target.filters[file.uuid] || [];

  public static base = (app: λApp, file: λFile, range?: MinMax) => {
    const context = Context.findByPugin(app, file._uuid);

    if (!context) {
      throw new ApplicationError(`GulpQueryFilter.base() cannot allocate context for file ${file.name} with uuid_${file.uuid}`)
    }

    //eslint-disable-next-line
    return `(operation_id:${context.operation.id} AND (gulp.context: \"${context.name}\") AND gulp.source.file:"${file.name}" AND @timestamp:>=${Math.max(file.timestamp.min, (range?.min || -Infinity))} AND @timestamp:<=${Math.min(file.timestamp.max, (range?.max || Infinity))})`
  }

  public static parse(app: λApp, file: λFile, range?: MinMax) {
    const base = Filter.base(app, file, range);
    
    const query = Filter.query(app, file);

    return query ? `${base} AND ${query}` : base;
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
  
  static body = (app: λApp, file: λFile, range?: MinMax) => ({
    query_raw: {
      bool: {
        must: [
          {
            query_string: {
              query: Filter.parse(app, file, range),
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

export class Mapping {
  public static find = (app: λApp, plugin: PluginEntity['filename']) => app.general.ingest.find(p => p.filename === plugin)?.mappings || [];
}

export class Event {
  public static delete = (app: λApp, uuid: μ.File) => {
    app.target.events.delete(uuid);
    app.target.events.set(uuid, []);
    return app.target.events;
  }

  public static get = (app: λApp, uuid: μ.File): λEvent[] => app.target.events.get(uuid) || app.target.events.set(uuid, []).get(uuid)!;

  public static selected = (app: λApp): λEvent[] => File.selected(app).map(f => Event.get(app, f.uuid)).flat();

  public static add = (app: λApp, _events: λEvent | λEvent[]) => {
    const events = Parser.array(_events);
    events.map(e => Event.get(app, e._uuid).push(e));
    events.sort((a, b) => a.timestamp - b.timestamp);
    return app.target.events;
  }

  public static parse = (app: λApp, original: RawNote | RawLink): λEvent[] => Parser.array(original.events).reduce<λEvent[]>((result, e) => {
    e.context = e.context || original.context;
    e.src_file = e.src_file || original.src_file;
    e.operation_id = e.operation_id || original.operation_id;

    const file = File.findByNameAndContextName(app, e.src_file, e.context);

    if (file) {
      result.push({
        _id: e.id,
        operation_id: e.operation_id,
        timestamp: e['@timestamp'],
        file: e.src_file,
        context: e.context,
        event: {
          duration: 1,
          code: '0'
        },
        _uuid: file.uuid,
      })
    };
    
    return result
  }, []);

  public static findByIdAndUUID = (app: λApp, eventId: string | string[], uuid: μ.File) => Event.get(app, uuid).filter(e => Parser.array(eventId).includes(e._id));

  public static findById = (app: λApp, eventId: string | string[]) => Array.from(app.target.events, ([k, v]) => v).flat().filter(e => Parser.array(eventId).includes(e._id));

  public static formatToCreateRequest = (events: Arrayed<λEvent>): λEventFormForCreateRequest[] => Parser.array(events).map(e => ({
    id: e._id,
    timestamp: e.timestamp,
    operation_id: e.operation_id,
    context: e.context,
    src_file: e.file
  }))
}

export class Note {
  public static parse = (app: λApp, notes: RawNote[]): λNote[] => notes.map(n => {
    const note: λNote = {
      ...n,
      file: n.src_file,
      events: Event.parse(app, n),
      data: {
        ...n.data,
        color: λColor['name -> hex'](n.data.color)
      },
      _uuid: File.findByNameAndContextName(app, n.src_file, n.context).uuid
    }
    return note;
  });

  public static findByFile = (use: λApp | λNote[], file: λFile | string) => Parser.use(use, 'notes').filter(n => n.file === Parser.useName(file));
  
  public static findByEvent = (use: λApp | λNote[], event: λEvent | string) => Parser.use(use, 'notes').filter(n => n.events.some(e => e._id === Parser.useId(event)));

  public static timestamp = (note: λNote): number => {
    let sum = 0
    note.events.forEach(e => sum += e.timestamp);
    return (sum / note.events.length) || (note.time_end ? (note.time_start + note.time_end) / 2 : note.time_start);
  }
}

export class Link {
  public static parse = (app: λApp, links: RawLink[]): λLink[] => links.map(l => {
    const events: λEvent['_id'][] = [];

    if (!events.includes(l.data.src))
      events.push(l.data.src);

    if (l.data.events?.length) {
      events.push(...l.data.events.map(e => e.id).filter(e => !events.includes(e)));
    }

    if (l.events) {
      l.events.forEach(e => {
        if (!events.includes(e.id)) events.push(e.id);
      })
    }

    l.events = Event.findById(app, events).map(e => ({
      '@timestamp': e.timestamp,
      context: e.context,
      id: e._id,
      operation_id: e.operation_id,
      src_file: e.file
    }));

    return {
      ...l,
      file: l.src_file,
      data: {
        ...l.data,
        color: λColor['name -> hex'](l.data.color)
      },
      events: Event.parse(app, l),
      _uuid: File.findByNameAndContextName(app, l.src_file, l.context).uuid,
    }
  });

  public static findByFile = (use: λApp | λLink[], file: λFile | μ.File): λLink[] => Parser.use(use, 'links').filter(l => l._uuid === Parser.useUUID(file));
  
  // public static findByEvent = (use: Information | λLink[], event: λEvent | string): λLink[] => Parser.use(use, 'links').filter(l => l.events.some(e => e._id === Parser.useId(event)));

  public static timestamp = (link: λLink): number => {
    let sum = 0
    link.events.forEach(e => sum += e.timestamp);
    return (sum / link.events.length) || (link.time_end ? (link.time_start + link.time_end) / 2 : link.time_start);
  }
}

export class Parser {
  public static use = <K extends keyof λApp['target']>(x: λApp | λApp['target'][K], expects: K): λApp['target'][K] => Array.isArray(x) ? x as λApp['target'][K] : (x as λApp)['target'][expects];

  public static useName = (unknown: λOperation | λContext | λPlugin | λFile | string): string => typeof unknown === 'string' ? unknown : unknown.name;

  public static useId = (unknown: λEvent | string): string => typeof unknown === 'string' ? unknown : unknown._id;

  public static useUUID = <T extends λContext | λPlugin | λFile | λFilter>(unknown: T | string): T['uuid'] => {
    if (typeof unknown === 'string') {
      return unknown as T['uuid'];
    } else {
      return (unknown as T).uuid;
    }
  };
  

  public static array = <K extends unknown>(unknown: Arrayed<K>): K[] => Array.isArray(unknown) ? unknown : [unknown];
}

export type Arrayed<K> = K | K[];

export type UUIDED<K extends λContext | λPlugin | λFile | λFilter> = K | K['uuid'];

export namespace μ {
  const File = Symbol('File');
  export type File = UUID & {
    readonly [File]: unique symbol;
  };

  const Filter = Symbol('Filter');
  export type Filter = UUID & {
    readonly [Filter]: unique symbol;
  };
  
  const Plugin = Symbol('Plugin');
  export type Plugin = UUID & {
    readonly [Plugin]: unique symbol;
  };

  const Context = Symbol('Context');
  export type Context = UUID & {
    readonly [Context]: unique symbol;
  };
}

export namespace λ {
  const Timestamp = Symbol('Timestamp');
  export type Timestamp = number & {
    readonly [Timestamp]: unique symbol;
  };

  const Height = Symbol('Height');
  export type Height = number & {
    readonly [Height]: unique symbol;
  };

  const X = Symbol('X');
  export type X = number & {
    readonly [X]: unique symbol;
  };
}
