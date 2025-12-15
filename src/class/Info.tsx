import { Default } from '@/dto/Dataset'
import React from 'react'
import { generateUUID, NodeFile, Refractor } from '@/ui/utils'
import { Logger } from '@/dto/Logger.class'
import { SetState } from './API'
import { Icon } from '@impactium/icons'
import { toast } from 'sonner'
import { Pointers } from '@/components/Pointers'
import { CustomParameters } from '@/components/CustomParameters'
import { Highlights } from '@/overlays/Highlights'
import { RenderEngine } from './RenderEngine'
import { SmartSocket } from './SmartSocket'
import { OpenSearchQueryBuilder } from '@/components/QueryBuilder'
import { Spinner } from '@/ui/Spinner'
import { Badge } from '@/ui/Badge'
import { Source } from '@/entities/Source'
import { Parser } from '@/entities/addon/Parser'
import { App } from '@/entities/App'
import { Doc } from '@/entities/Doc'
import { Glyph } from '@/entities/Glyph'
import { Operation } from '@/entities/Operation'
import { Context } from '@/entities/Context'
import { User } from '@/entities/User'
import { Request } from '@/entities/Request'
import { FileEntity } from '@/banners/Upload.banner'
import { Note } from '@/entities/Note'
import { Link } from '@/entities/Link'
import { CacheKey } from './Engine.dto'
import { Filter } from '@/entities/Filter'
import { Query } from '@/entities/Query'
import { Highlight } from '@/entities/Highlight'
import { Mapping } from '@/entities/Mapping'
import { Internal } from '@/entities/addon/Internal'
import { buffer } from 'stream/consumers'

export namespace GulpDataset {
  export namespace GetAvailableLoginApi {
    export type Response = Method[]

    export interface Method {
      name: string
      login: Struct
      logout: Struct
    }

    export interface Struct {
      method: string
      url: string
      params: Param[]
    }

    export interface Param {
      name: string
      type: 'str'
      location: 'body'
      description: string
      required?: boolean
      default_value?: null
    }
  }
  export namespace QueryGulp {
    export interface Options {
      preview?: boolean,
      id?: Source.Id,
      refetchKeys?: Array<keyof Doc.Type>
    }
  }
  export namespace QueryOperations {
    interface Operation {
      name: string
      id: string
      contexts: Context[]
    }

    interface Context {
      name: string
      id: string
      doc_count: number
      plugins: Plugin[]
    }

    interface Plugin {
      name: string
      sources: Source[]
    }

    export interface Source {
      name: string
      id: Source.Id
      doc_count: number
      'max_event.code': number
      'min_event.code': number
      'min_gulp.timestamp': bigint
      'max_gulp.timestamp': bigint
    }

    export type Summary = Operation[]
  }
  export namespace PluginList {
    export type Type = 'ingestion' | 'enrichment' | 'external' | 'extension'

    export namespace SigmaSupport {
      export type Type = 'backends' | 'pipelines' | 'output_formats'

      export interface Interface {
        name: string
        description: string
      }

      export type Summary = Record<SigmaSupport.Type, SigmaSupport.Interface>[]
    }

    export type DependsOn = 'eml'

    export interface Interface {
      display_name: string
      type: Type[]
      desc: string
      path: string
      data: {}
      filename: string
      sigma_support: SigmaSupport.Summary
      custom_parameters: CustomParameters.Interface[]
      depends_on: DependsOn[]
      tags: (string | 'extension')[]
      version: string
    }
  }
  export namespace QueryHistoryGet {
    export interface Interface {
      q: {
        query: {
          bool: Record<OpenSearchQueryBuilder.Operator, Record<OpenSearchQueryBuilder.Condition, any>[]>;
        }
      },
      external: boolean,
      query_options: {
        loop: boolean,
        name: string,
        sort: {
          '@timestamp': 'desc' | 'asc'
        },
        limit: number,
        preview_mode: boolean,
        note_parameters: {
          note_tags: string[]
        },
        ensure_default_fields: boolean
      },
      timestamp_msec: number
    }
    export type Response = Interface[]
  }
  export interface SigmaFile {
    name: string
    content: string
  }
}

interface RefetchOptions {
  ids?: Arrayed<Source.Id>;
  refetchKeys?: Record<Source.Id, Array<keyof Doc.Type>>;
}

interface InfoProps {
  app: App.Type
  setInfo: React.Dispatch<React.SetStateAction<App.Type>>
  timeline: React.RefObject<HTMLDivElement>
  scrollX: number;
  scrollY: number;
  setScrollX: SetState<number>;
  setScrollY: SetState<number>;
}

export class Info implements InfoProps {
  app: App.Type
  setInfo: SetState<App.Type>;
  timeline: React.RefObject<HTMLDivElement>;
  scrollX: number;
  scrollY: number;
  setScrollX: SetState<number>
  setScrollY: SetState<number>

  constructor({ app, setInfo, timeline, setScrollX, setScrollY, scrollX, scrollY }: InfoProps) {
    this.app = app
    this.setInfo = setInfo;
    this.timeline = timeline
    this.scrollX = scrollX;
    this.scrollY = scrollY;
    this.setScrollX = setScrollX;
    this.setScrollY = setScrollY;
  }

  refetch = async ({
    ids: _ids = Source.Entity.selected(this.app).map((f) => f.id),
    refetchKeys
  }: RefetchOptions = {}) => {
    const files: Source.Type[] = Parser.array(_ids).map((id) => Source.Entity.id(this.app, id));

    if (this.app.timeline.frame.min === 0) {
      this.setTimelineFrame({
        min: Math.min(...files.map(f => f.timestamp.min)),
        max: Math.max(...files.map(f => f.timestamp.max)),
      })
    }

    this.notes_reload()

    this.links_reload()

    this.highlights_reload()

    files.forEach((file) => {
      const query = this.getQuery(file);

      this.query_file(query, {
        id: file.id,
        preview: false,
        refetchKeys: refetchKeys ? refetchKeys[file.id] : undefined
      });
    })

    files.forEach(this.events_reset_in_file)
  }

  enrichment = (
    plugin: string,
    file: Source.Type,
    range: MinMax,
    custom_parameters: Record<string, any>,
    isShowOnlyEnriched: boolean
  ) => {
    return api('/enrich_documents', {
      method: 'POST',
      query: {
        operation_id: file.operation_id,
        plugin,
        ws_id: this.app.general.ws_id,
      },
      raw: true,
      body: {
        flt: {
          source_ids: [file.id],
          time_range: [
            Internal.Transformator.toNanos(range.min).toString(),
            Internal.Transformator.toNanos(range.max).toString()
          ]
        },
        external_parameters: {
          plugin_params: {
            custom_parameters,
          },
        },
      },
    }).then(({ req_id }) => {
      if (isShowOnlyEnriched) {
        this.events_reset_in_file(file);
        this.setLoading(req_id, file.id)
      }
      const sid = SmartSocket.Class.instance.con(SmartSocket.Message.Type.DOCUMENTS_CHUNK, m => m.req_id === req_id && this.app.general.loadings.byRequestId.has(req_id), m => {
        const events = Doc.Entity.normalize(m.payload.docs ?? []);

        this.events_add(events);

        if (m.payload.last) {
          this.delLoading(req_id)
          SmartSocket.Class.instance.coff(SmartSocket.Message.Type.DOCUMENTS_CHUNK, sid);
        }
      });
      SmartSocket.Class.instance.conce(SmartSocket.Message.Type.ENRICH_DONE, m => m.req_id === req_id, m => {
        if (m.payload.obj.status !== 'done') {
          toast.error('Enrichment failed', {
            icon: <Icon name='Stop' />,
            richColors: true
          });
        } else {
          toast.success('Enrichment finished', {
            description: `Total processed documents: ${m.payload.obj.data.total_hits ?? 0}`,
            icon: <Icon name='Check' />
          });
        }
      })
    })
  }

  enrich_single_id = (
    plugin: string,
    event: Doc.Type,
    custom_parameters: Record<string, any>,
  ): Promise<Doc.Type> | undefined => api<Doc.Type>('/enrich_single_id', {
    method: 'POST',
    query: {
      plugin,
      operation_id: event['gulp.operation_id'],
      ws_id: this.app.general.ws_id,
      doc_id: event._id,
    },
    body: { custom_parameters },
    toast: {
      onSuccess: () => toast.success('Document has been enriched successfully', {
        richColors: true,
        icon: <Icon name='Check' />
      })
    },
  })

  query_global = async ({
    filename,
    context,
    query,
    total,
    separately
  }: {
    context?: string;
    filename?: string;
    query: Query.Type;
    total: number;
    separately?: boolean;
  }) => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    if (!filename || !context) {
      separately = true;
    }

    if (!separately) {
      this.query_file(query, {
        id: this.virtualize(filename!, total, context!),
        preview: false
      });
    } else {
      this.query_file(query, {
        preview: false
      });
    }
  }

  virtualize = (fileName: string, total: number, contextName: string) => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return null!
    }

    const context_id = `temp-${contextName}` as Context.Id;

    const file: Source.Type = Source.Entity.virtualize(this.app, {
      name: fileName,
      context_id,
      operation_id: operation.id,
      total: 999999
    });

    const context: Context.Type = {
      id: context_id,
      color: '#00ff00',
      glyph_id: null as unknown as Glyph.Id,
      granted_user_group_ids: [],
      granted_user_ids: [],
      name: contextName,
      operation_id: operation.id,
      time_created: Date.now(),
      time_updated: Date.now(),
      type: 'context',
      selected: true,
      owner_user_id: this.app.general.user?.id!
    }

    this.setInfo(info => ({
      ...info,
      target: {
        ...info.target,
        files: [...info.target.files, file],
        contexts: [...info.target.contexts, context]
      }
    }));

    return file.id
  }

  query_file = async (query: Query.Type, {
    preview = false,
    id,
    refetchKeys
  }: GulpDataset.QueryGulp.Options) => {
    const operation = Operation.Entity.selected(this.app)
    if (!operation) {
      return
    }

    if (id) {
      const request = this.app.general.loadings.byFileId.get(id);
      if (request) {
        this.delLoading(request)
        this.request_cancel(request);
      }
    }

    const body = Filter.Entity.body(query);

    if (preview) {
      body.q_options.preview_mode = preview
    }

    body.q_options.limit = 10000;

    const request_query: Record<string, string> = {
      ws_id: this.app.general.ws_id,
      operation_id: operation.id,
      req_id: generateUUID(Request.Prefix.QUERY)
    }

    if (id) {
      body.q_options.fields = refetchKeys ?? [Source.Entity.id(this.app, id).settings.field];
    }

    const resp = await api<any>(
      '/query_raw', {
      method: 'POST',
      query: request_query,
      body,
      raw: true,
    }, ({ req_id, status }) => {
      if (status !== 'pending') {
        return;
      }

      const sid = SmartSocket.Class.instance.con(SmartSocket.Message.Type.DOCUMENTS_CHUNK, m => m.req_id === req_id && this.app.general.loadings.byRequestId.has(req_id), m => {
        const events = Doc.Entity.normalize(m.payload.docs ?? []);

        this.events_add(events);
        if (m.payload.last) {
          this.delLoading(req_id);
          SmartSocket.Class.instance.coff(SmartSocket.Message.Type.DOCUMENTS_CHUNK, sid);
        };
      })
      SmartSocket.Class.instance.conce(SmartSocket.Message.Type.STATS_UPDATE, m => m.req_id === req_id, m => {
        if (m.payload.obj.status !== 'done') {
          toast.error(`Query ${req_id} failed`, {
            icon: <Icon name='Stop' />,
            description: `Has been failed ${m.payload.obj.data.failed_queries} queries from total amount of ${m.payload.obj.data.num_queries}. \n\nWhich is ${(m.payload.obj.data.num_queries / m.payload.obj.data.failed_queries) * 100}% of total amount of queries. \n\nTraces: \n${m.payload.obj.errors.map((error: string, index: number) => `Error number ${index + 1} is ${error}`).join('\n')}. \nQuery has been executed on server with id ${m.payload.obj.server_id}`,
            duration: 1000 * 2,
            // [λ] Uncomment next lines if not fixed in backend till 2026
            // description: `Has been failed ${m.payload.obj.data.failed_queries} queries from total amount of ${m.payload.obj.data.num_queries}. \n\nWhich is ${(m.payload.obj.data.num_queries / m.payload.obj.data.failed_queries) * 100}% of total amount of queries. \n\nTraces: \n${m.payload.obj.errors.map((error: string, index: number) => `Error number ${index + 1} is ${error}`).join('\n')}. \nQuery has been executed on server with id ${m.payload.obj.server_id}`,
            // duration: 1000 * 60 * 10,
            richColors: true
          })
        } else {
          console.log(m);
          toast.success('Query finished', {
            description: `Total processed documents: ${m.payload.obj.data.total_hits}`,
            icon: <Icon name='Check' />
          })
        }
      });

      if (id) {
        this.setLoading(req_id, id);
      }
    });

    if (preview) {
      if (!resp || (resp || {})?.data?.total_hits === 0) {
        toast.error('This filter returned no results. No matching documents were found', {
          icon: <Icon name='FaceUnhappy' />,
          richColors: true
        })
      } else {
        toast(`Total hits for this filter is ${resp.data?.total_hits}`)
      }
    }


    return resp ? resp.data : {
      docs: [],
      total_hits: 0
    };
  }

  getLastQueries = (): Promise<Query.Type[]> => api<GulpDataset.QueryHistoryGet.Response>('/query_history_get').then(list => {
    const queries: Query.Type[] = [];

    list.forEach(payload => {
      const root = payload.q.query;
      console.log(root, payload);
      if (!root) {
        return;
      }

      let string = '';
      const filters: Filter.Type[] = [];

      Object.entries(root.bool).forEach(([key, arr]) => {
        const operator = key as OpenSearchQueryBuilder.Operator;

        arr.forEach((obj) => {
          Object.entries(obj).forEach(([type, v]) => {
            if (type === 'query_string') {
              string = v.query
              return;
            }

            Object.keys(v).forEach(key => {
              if (typeof v[key] !== 'object') {
                filters.push({
                  operator,
                  type: type as OpenSearchQueryBuilder.Condition,
                  id: generateUUID(),
                  field: key,
                  value: v[key],
                  enabled: true
                })
              } else {
                filters.push({
                  operator,
                  type: type as OpenSearchQueryBuilder.Condition,
                  id: generateUUID(),
                  field: key,
                  value: v[key].value,
                  enabled: true
                })
              }
            })
          })
        })
      });

      if (!string) {
        Logger.error(`Cannot find query_string part in given object: \n${JSON.stringify(payload, null, 2)}`, 'Info.getLastQueries');
        string = Filter.Entity.base(Source.Entity.selected(this.app)[0]);
      }

      queries.push({
        string,
        filters
      })
    })

    return queries;
  });

  preview_file = (file: Source.Type, query = this.getQuery(file)) => this.query_file(query, { preview: true });

  preview_query = (query: Query.Type) => this.query_file(query, { preview: true });

  request_add = (req: Request.Type) => {
    const exist = this.app.general.requests.findIndex(r => r.id === req.id);
    if (exist >= 0) {
      this.app.general.requests[exist] = req;
    } else {
      this.app.general.requests = [...this.app.general.requests, req];
    }

    this.setInfoByKey(this.app.general.requests.sort((a, b) => b.time_created - a.time_created), 'general', 'requests');
  }

  request_list = () => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    return api<Request.Type[]>('/request_list', {
      method: 'GET',
      query: {
        operation_id: operation.id
      }
    }, requests => this.setInfoByKey(requests, 'general', 'requests'));
  }

  request_cancel = (req_id_to_cancel: Request.Id) => api('/request_cancel', {
    method: 'PATCH',
    query: { req_id_to_cancel },
  });

  filters_cache = (files: Array<Source.Type | Source.Id>) => {
    files.forEach(file => {
      const id = Parser.useUUID(file) as Source.Id

      Logger.log(`Caching has been requested for files ${Source.Entity.id(this.app, file).name}`, Info);

      this.app.timeline.cache.data.set(id, this.app.target.events.get(id) || []);
      this.app.timeline.cache.filters[id] = this.app.target.filters[id];
    })


    this.setInfoByKey(this.app.timeline.cache, 'timeline', 'cache');
    this.render();
  }

  filters_undo = (files: Array<Source.Type | Source.Id>) => {
    files.forEach(file => {
      const id = Parser.useUUID(file) as Source.Id;

      this.app.target.filters = {
        ...this.app.target.filters,
        [id]: this.app.timeline.cache.filters[id],
      }

      this.app.target.events.delete(id);
      this.app.target.events.set(id, this.app.timeline.cache.data.get(id) || []);

      this.filters_delete_cache(file);
    })

    this.setInfoByKey(this.app.target.filters, 'target', 'filters');
    this.setInfoByKey(this.app.target.events, 'target', 'events');
    this.render()
  }

  filters_delete_cache = (file: Source.Type | Source.Id) => {
    const id = Parser.useUUID(file) as Source.Id

    this.app.timeline.cache.data.delete(id)

    this.setInfoByKey(
      {
        data: this.app.timeline.cache.data,
        filters: { ...this.app.timeline.cache.filters, [id]: undefined },
      },
      'timeline',
      'cache',
    )
  }

  render = () => {
    Logger.log(`Render requested`, Info)
    this.setTimelineScale(this.app.timeline.scale + 0.000000001)
  }

  mapping_file_list = async (): Promise<Mapping.Type.Plugin[]> => {
    const shit = await api<Mapping.Raw[]>('/mapping_file_list')

    const parsed_shit = Mapping.Entity.parse(shit)

    const another_parsed_shit = await this.plugin_list().then((p) =>
      p.filter((p) => p.type.includes('ingestion')),
    )

    another_parsed_shit.forEach((shit) => {
      const found_shit = parsed_shit.find((ps) => ps.name === shit.filename)
      if (found_shit) {
        return
      } else {
        parsed_shit.push({
          name: shit.filename,
          methods: [],
        })
      }
    })

    const sorted_parsed_shit = parsed_shit.sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    this.setInfoByKey(sorted_parsed_shit, 'target', 'mappings')

    return sorted_parsed_shit
  }

  operations_select = (id: Operation.Id) => {
    this.setInfoByKey(
      Operation.Entity.select(this.app, id),
      'target',
      'operations',
    )
    this.setInfoByKey(this.app.target.contexts.map(context => ({
      ...context,
      selected: false
    })), 'target', 'contexts');

    this.setInfoByKey(this.app.target.files.map(file => ({
      ...file,
      selected: false
    })), 'target', 'files');
  }

  operations_set = (operations: Operation.Type[]) =>
    this.setInfoByKey(
      Operation.Entity.reload(operations, this.app),
      'target',
      'operations',
    )

  deleteOperation = (operation: Operation.Type, setLoading: SetState<boolean>) => {
    api(
      '/operation_delete',
      {
        method: 'DELETE',
        query: {
          operation_id: operation.id,
        },
        setLoading,
      },
      this.sync,
    )
  }

  // ⚠️ UNTOUCHABLE
  file_delete = (source: Source.Type) => {
    return api(
      '/source_delete',
      {
        method: 'DELETE',
        query: {
          source_id: source.id,
          ws_id: this.app.general.ws_id
        },
      },
      this.sync,
    )
  }

  file_ingest = async ({
    context,
    file,
    frame,
    settings,
    setProgress,
    preview_mode,
  }: FileEntity.IngestOptions) => {
    const operation = Operation.Entity.selected(this.app)
    if (!operation) {
      return
    }

    const plugin = settings.plugin
    if (!plugin) {
      return
    }

    const formData = new FormData()
    const payload: Record<any, any> = {
      plugin_params: {
        mapping_parameters: {
          mapping_file: settings.method,
          mapping_id: settings.mapping,
          mappings: {}
        },
        custom_parameters: settings.custom_parameters,
      },
      original_file_path: file.name,
      preview_mode,
      offset: settings.offset ?? 0
    }
    if (frame) {
      payload.flt = {
        int_filter: [frame.min, frame.max],
      }
    }

    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    const query: Record<string, string | boolean> = {
      plugin: plugin.split('.')[0],
      operation_id: operation.id,
      context_name: context,
      ws_id: this.app.general.ws_id,
    }

    const ingest = async (start = 0, id?: Request.Id): Promise<void | Doc.Type[]> => {
      formData.delete('f')

      const end = Math.min(file.size, preview_mode ? file.size : start + 1024 * 1024 * 8) // 8MB

      formData.append('f', file.slice(start, end), file.name)

      if (id && !query.req_id) {
        query.req_id = id
      }

      const response = await api<any>('/ingest_file', {
        method: 'POST',
        body: formData,
        deassign: true,
        raw: true,
        query,
        headers: {
          size: file.size.toString(),
          continue_offset: start.toString(),
        },
      })

      if (preview_mode) {
        return response.data as unknown as Doc.Type[]
      }

      // resume
      if (response.data.continue_offset)
        return ingest(response.data.continue_offset, response.req_id);


      if (setProgress) setProgress(end / file.size * 100)

      // next
      if (end < file.size) {
        return ingest(end, response.req_id);
      }
    }

    const id = generateUUID<Request.Id>(Request.Prefix.INGESTION);

    if (!this.app.target.contexts.find(c => c.name === context)) {
      SmartSocket.Class.instance.conce(SmartSocket.Message.Type.COLLAB_CREATE, m => m.req_id === id, m => {
        if (m.payload.obj.type !== 'context') {
          return;
        }


        console.log(m.payload, '814');
        // [λ] Fix
        const contexts = Refractor.array(...this.app.target.contexts, m.payload.obj as never);

        this.setInfoByKey(contexts, 'target', 'contexts');
      })
    }

    SmartSocket.Class.instance.conce(SmartSocket.Message.Type.COLLAB_CREATE, m => m.req_id === id, m => {
      if (m.payload.obj.type !== 'source') {
        return;
      }

      this.setLoading(m.req_id, m.payload.obj.id as unknown as Source.Id);

      // @ts-ignore
      this.app.target.files = Refractor.array(...this.app.target.files, Source.Entity.normalize(this.app, m.payload.obj));

      this.setInfoByKey(this.app.target.files, 'target', 'files');
    })

    const sid = SmartSocket.Class.instance.con(SmartSocket.Message.Type.DOCUMENTS_CHUNK, m => m.req_id === id && this.app.general.loadings.byRequestId.has(id), m => {
      if (typeof m.payload.docs === 'undefined') {
        return;
      }

      const events = Doc.Entity.normalize(m.payload.docs);

      const files = Refractor.array(...this.app.target.files);
      const file = Source.Entity.id(files, events[0]['gulp.source_id']);

      this.events_add(events);

      const all = Source.Entity.events(this.app, file.id);

      const sorted = Doc.Entity.sort(all);

      const exist = files.findIndex(f => f.id === file.id);

      const timestamp = {
        min: sorted[sorted.length - 1].timestamp,
        max: sorted[0].timestamp
      };

      files[exist] = Source.Entity.normalize(this.app, {
        ...file,
        timestamp,
        nanotimestamp: {
          min: Internal.Transformator.toNanos(timestamp.min),
          max: Internal.Transformator.toNanos(timestamp.max)
        },
        total: all.length,
        selected: true
      });

      const frame: MinMax = {
        min: Math.min(...files.map(f => f.timestamp.min)),
        max: Math.max(...files.map(f => f.timestamp.max))
      }

      this.setInfoByKey(files, 'target', 'files');
      this.setInfoByKey(frame, 'timeline', 'frame');

      if (m.payload.last) {
        this.delLoading(m.req_id);
        SmartSocket.Class.instance.coff(SmartSocket.Message.Type.DOCUMENTS_CHUNK, sid);
        toast.success(`Source ${file.name} has been ingested successfully`, {
          description: `Total amount of documents is: ${Source.Entity.events(this.app, file.id).length}`,
          richColors: true,
          icon: <Icon name='Check' />
        });
      } else {
        toast.success(`Has been added ${events.length} events to source ${file.name}`, {
          description: `There are ${all.length} events at this moment`
        })
      }
    })

    return ingest(0, id);
  }

  // ⚠️ UNTOUCHABLE
  file_set_settings = (id: Source.Id, settings: Partial<Source.Type['settings']>) => {
    const file = Source.Entity.id(this.app, id);;
    const newSettings = {
      ...file.settings,
      ...settings
    } satisfies Source.Type['settings'];

    if (!Source.Entity.isEventKeyFetched(this.app, id, [newSettings.field])) {
      this.refetch({ ids: id, refetchKeys: { [id]: [newSettings.field] } })
    }

    return this.setInfoByKey(
      this.app.target.files.map((file) => id === file.id
        ? { ...file, settings: newSettings }
        : file
      ),
      'target',
      'files'
    )
  }

  file_set_total = (id: Source.Id, total = 0) =>
    this.setInfoByKey(
      this.app.target.files.map(file => file.id === id ? { ...file, total } : file),
      'target', 'files'
    )

  // ⚠️ UNTOUCHABLE
  context_delete = (context: Context.Type, delete_data: boolean) => api<any>('/context_delete', {
    method: 'DELETE',
    query: {
      context_id: context.id,
      delete_data,
      ws_id: this.app.general.ws_id
    },
  }, this.sync);

  events_add = (newEvents: Doc.Type[]) => this.setInfoByKey(Doc.Entity.add(this.app, newEvents), 'target', 'events');

  event_keys = async (file: Source.Type): Promise<Filter.Options> => {
    if (!file) {
      return Internal.Transformator.toAsync({});
    }

    if (Source.Entity.isVirtual(file)) {
      const ids = file.id.split('-').slice(1) as Source.Id[];

      const filterOptionsStack = await Promise.all(ids.map(id => this.event_keys(Source.Entity.id(this.app, id))));

      return filterOptionsStack.flat().reduce<Filter.Options>((acc, cur) => {
        Object.keys(cur).forEach(c => {
          if (!acc[c]) {
            acc[c] = cur[c];
          }
        });

        return acc;
      }, {});
    };

    return api<Filter.Options>('/query_fields_by_source', {
      query: {
        operation_id: file.operation_id,
        context_id: file.context_id,
        source_id: file.id,
        ws_id: this.app.general.ws_id,
      }
    })
  }

  events_reset_in_file = (file: Source.Type) => {
    this.setInfoByKey(Doc.Entity.delete(this.app, file), 'target', 'events')
  }

  setDialogSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'dialogSize')
  }

  // need to refactor 1000%
  // socket must suck but never mind
  ai_listen = (req_id: Request.Id) => {
    let buffer = '';

    const sid = SmartSocket.Class.instance.con(
      SmartSocket.Message.Type.AI_ASSISTANT_STREAM,
      m => m.req_id === req_id && this.app.general.loadings.byRequestId.has(req_id),
      m => {
        buffer += m.payload;

        const chat = this.app.general.ai_chat;
        const last = chat.messages.length - 1;

        if (chat.messages[last]?.from === 'ai') {
          chat.messages[last].text = buffer;
          this.setInfoByKey(chat, 'general', 'ai_chat');
        }
      }
    );

    SmartSocket.Class.instance.conce(
      SmartSocket.Message.Type.AI_ASSISTANT_DONE,
      m => m.req_id === req_id,
      () => {
        const chat = this.app.general.ai_chat;
        chat.streaming = false;
        this.setInfoByKey(chat, 'general', 'ai_chat');

        this.delLoading(req_id);
        SmartSocket.Class.instance.coff(
          SmartSocket.Message.Type.AI_ASSISTANT_STREAM,
          sid
        );
      }
    );

    SmartSocket.Class.instance.conce(
      SmartSocket.Message.Type.AI_ASSISTANT_ERROR,
      m => m.req_id === req_id,
      m => {
        const chat = this.app.general.ai_chat;
        chat.streaming = false;

        const last = chat.messages.length - 1;
        if (chat.messages[last]?.from === 'ai') {
          chat.messages[last].text = `❌ ${m.payload}`;
        }

        this.setInfoByKey(chat, 'general', 'ai_chat');
        this.delLoading(req_id);

        SmartSocket.Class.instance.coff(
          SmartSocket.Message.Type.AI_ASSISTANT_STREAM,
          sid
        );
      }
    );
  };

  // need to refactor 100%
  // api for chat
  get_ai_hint = async(logs: any[]) => {
    const operation = Operation.Entity.selected(this.app);
    if(!operation) return;

    const req_id = generateUUID(Request.Prefix.AI) as Request.Id;

    await api(
      '/get_ai_hint',
      {
        method: 'POST',
        query: {
          token: Internal.Settings.token,
          ws_id: this.app.general.ws_id,
          operation_id: operation.id,
          req_id
        },
        body: logs,
        raw: true
      }
    );

    this.setLoading(req_id, 'ai' as Source.Id)
    this.ai_listen(req_id);
  };

  // get my flagget events
  get_flagged_events = (): Doc.Type[] => {
    const raw = localStorage.getItem('flagged-events');
    if (!raw) {
      return [];
    }

    const ids = new Set<string>(JSON.parse(raw));
    if (!ids.size) return [];

    const result: Doc.Type[] = [];

    for (const events of this.app.target.events.values()) {
      for (const event of events) {
        if (ids.has(event._id)) {
          result.push(event);
        }
      }
    }
    return result;
  };

  // need to refactor 100%
  // unit all this shit
  ai_analyze_flagged_events = async () => {
    const logs = this.get_flagged_events();
    if (!logs.length) {
      this.ai_chat_addMessage('ai', 'No flagged events found to analyze.');
      return;
    }

    this.ai_chat_addMessage('user', `Analyze ${logs.length} flagged events`);
    
    this.ai_chat_addMessage('ai', '');
    const chat = this.app.general.ai_chat;
    chat.streaming = true;
    this.setInfoByKey(chat, 'general', 'ai_chat');

    await this.get_ai_hint(
      logs.map(e => ({
        'event.original': e['event.original'],
        timestamp: e['@timestamp'],
        'agent.type': e['agent.type'],
        'gulp.source_id': e['gulp.source_id'],
        'gulp.context_id': e['gulp.context_id'],
      }))
    );
  };

  // need to refactor 100%
  ai_chat_addMessage = (from: 'user' | 'ai', text: string) => {
    const chat = this.app.general.ai_chat;
    chat.messages.push({ from, text });
    this.setInfoByKey(chat, 'general', 'ai_chat');
  };


  // ⚠️ UNTOUCHABLE
  notes_reload = async () => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    const files = Source.Entity.selected(this.app).map((f) => f.id);
    if (files.length === 0) {
      Logger.warn('Tried to fetch all notes from all operations. Ignoring', 'Info.notes_reload');
      return;
    }
    let notes: Note.Type[] = [];
    const fetch = async (offset = 0) => {
      const fetched = await api<Note.Type[]>('/note_list', {
        method: 'POST',
        query: {
          operation_id: operation.id
        },
        body: {
          source_ids: files,
          offset,
          limit: 500
        },
      });

      if (fetched.length) {
        notes = ([...notes, ...fetched]).sort((a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a));
        if (notes.length % 2500 === 0) {
          toast(`Fetched ${notes.length} notes`, {
            description: 'Continuing...',
            icon: <Spinner />
          });
        }

        this.setInfoByKey([...notes], 'target', 'notes');

        return new Promise(res => {
          setTimeout(() => {
            res(fetch(offset + 500));
          });
        });
      } else {
        const message = `${notes.length} notes has been fetched in ${offset / 500} rounds`;
        Logger.log(message, Info);
        this.setInfoByKey([...notes], 'target', 'notes'); // Сохранение данных после завершения всех запросов
        if (notes.length >= 2500) {
          toast.success(message, {
            icon: <Icon name='Check' />,
            richColors: true
          });
        }
      }
    };

    await fetch();

    Note.Entity[CacheKey].clear();

    return notes;
  };

  /**
   * 
   * @param key Key of settings object
   * @param value Value to save. Be carreful, it can save any shit
   */
  setSettings = (key: string, value: any) => this.setInfoByKey(value, 'settings', key);

  setLoading(req_id: Request.Id, file_id: Source.Id) {
    const loadings = this.app.general.loadings;
    loadings.byRequestId.set(req_id, file_id);
    loadings.byFileId.set(file_id, req_id);
    this.setInfoByKey(loadings, 'general', 'loadings');
  }

  delLoading(req_id: Request.Id) {
    const loadings = this.app.general.loadings;
    loadings.byRequestId.delete(req_id);
    const file_id = [...loadings.byFileId.entries()].find(e => e[1] === req_id)?.[0];
    if (file_id) {
      loadings.byFileId.delete(file_id);
    }
    this.setInfoByKey(loadings, 'general', 'loadings');
  }

  // ⚠️ UNTOUCHABLE
  note_delete = (note: Note.Type) =>
    api('/note_delete', {
      method: 'DELETE',
      query: {
        obj_id: note.id,
        ws_id: this.app.general.ws_id,
      },
    }).then(() => {
      const index = this.app.target.notes.findIndex(n => n.id === note.id);
      const updated = [...this.app.target.notes];
      if (index !== -1) {
        updated.splice(index, 1);
        this.setInfoByKey(updated.sort((a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a)), 'target', 'notes');
      }
    });

  note_create = ({
    name,
    text,
    color = Default.Color.NOTE,
    glyph_id = Glyph.List.entries().find(e => e[1] === Default.Icon.NOTE)![0]!,
    event,
    isPrivate,
    tags
  }: {
    name: string,
    text: string,
    color: string,
    event: Doc.Type,
    glyph_id: Glyph.Id,
    isPrivate: boolean,
    tags: string[]
  }) => api<Note.Type>('/note_create', {
    method: 'POST',
    query: {
      operation_id: event['gulp.operation_id'],
      context_id: event['gulp.context_id'],
      source_id: event['gulp.source_id'],
      ws_id: this.app.general.ws_id,
      name,
      color,
      glyph_id,
      private: isPrivate,
    },

    toast: {
      onSuccess: () => toast.success(`Note ${name} has been created successfully`, {
        richColors: true,
        icon: <Icon name='Check' />
      })
    },
    body: {
      text,
      tags,
      doc: Doc.Entity.toDoc(event),
    },
  }).then(note => {
    const updated = [...this.app.target.notes];
    updated.push(note);
    this.setInfoByKey(updated.sort((a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a)), 'target', 'notes');
  });

  note_edit = ({
    id: obj_id,
    name,
    text,
    color,
    glyph_id = Glyph.List.entries().find(e => e[1] === Default.Icon.NOTE)![0]!,
    event,
    tags
  }: {
    id: Note.Id,
    name: string,
    text: string,
    color: string,
    event: Doc.Type,
    glyph_id: Glyph.Id,
    tags: string[]
  }) => api<Note.Type>('/note_update', {
    method: 'PATCH',
    query: {
      obj_id,
      ws_id: this.app.general.ws_id,
      name,
      glyph_id,
      color,
    },
    toast: {
      onSuccess: () => toast.success(`Note ${name} has been updated successfully`, {
        richColors: true,
        icon: <Icon name='Check' />
      })
    },
    body: {
      text,
      tags,
      doc: Doc.Entity.toDoc(event),
    }
  }).then(note => {
    const index = this.app.target.notes.findIndex(n => n.id === note.id);
    if (index === -1) {
      Logger.error(`Note with id: ${note.id} was not found in application data`);
      return;
    }
    const updated = [...this.app.target.notes];
    updated[index] = note;
    this.setInfoByKey(updated.sort((a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a)), 'target', 'notes');
  });

  // ⚠️ UNTOUCHABLE
  links_reload = async () => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    return api<Link.Type[]>(
      '/link_list',
      {
        method: 'POST',
        query: {
          operation_id: operation.id
        },
        body: {
          source_ids: Source.Entity.selected(this.app).map((f) => f.id),
        },
      },
      links => this.setInfoByKey(links, 'target', 'links'),
    )
  }

  link_delete = (link: Link.Type) =>
    api(
      '/link_delete',
      {
        method: 'DELETE',
        query: {
          obj_id: link.id,
          ws_id: this.app.general.ws_id,
        },
      },
      this.links_reload,
    )

  link_create = ({
    name,
    event,
    glyph_id = Glyph.List.entries().find(e => e[1] === Default.Icon.LINK)![0]!,
    color = Default.Color.LINK,
    description
  }: {
    name: string,
    event: Doc.Type,
    glyph_id: Glyph.Id,
    color: string,
    description: string
  }) => {
    return api<Link.Type>('/link_create', {
      method: 'POST',
      query: {
        doc_id_from: event._id,
        operation_id: event['gulp.operation_id'],
        ws_id: this.app.general.ws_id,
        name,
        glyph_id,
        color,
        description
      },

      toast: {
        onSuccess: () => toast.success(`Link ${name} has been created successfully`, {
          richColors: true,
          icon: <Icon name='Check' />
        })
      },
      body: {
        doc_ids: [event._id]
      }
    }).then(this.links_reload);
  }

  link_edit = ({
    id: obj_id,
    name,
    color = Default.Color.LINK,
    glyph_id,
    events,
    description
  }: {
    id: Link.Id,
    name: string,
    glyph_id: Glyph.Id,
    color: string,
    events: Doc.Type['_id'][],
    description: string
  }) => api('/link_update', {
    method: 'PATCH',
    query: {
      obj_id,
      name,
      color,
      glyph_id,
      ws_id: this.app.general.ws_id,
      description
    },
    toast: {
      onSuccess: () => toast.success(`Link ${name} has been updated successfully`, {
        richColors: true,
        icon: <Icon name='Check' />
      })
    },
    body: {
      doc_ids: events
    },
  }).then(this.links_reload)

  links_connect = (link: Link.Type, event: Doc.Type) => api<Link.Type>('/link_update', {
    method: 'PATCH',
    query: {
      obj_id: link.id,
      ws_id: this.app.general.ws_id,
    },
    toast: {
      onSuccess: () => toast.success(`Event ${event._id} has been connected to link ${link.name} successfully`, {
        richColors: true,
        icon: <Icon name='Check' />
      })
    },
    body: {
      doc_ids: Refractor.array(...link.doc_ids, event._id),
    },
  }).then(this.links_reload)

  links_disconnect = (link: Link.Type, event: Doc.Type) => api<Link.Type>('/link_update', {
    method: 'PATCH',
    query: {
      obj_id: link.id,
      ws_id: this.app.general.ws_id,
    },
    toast: {
      onSuccess: () => toast.success(`Event ${event._id} has been disconnected from link ${link.name} successfully`, {
        richColors: true,
        icon: <Icon name='Check' />
      })
    },
    body: {
      doc_ids: Refractor.array(...link.doc_ids.filter(id => id !== event._id)),
    },
  }).then(this.links_reload)

  highlights_reload = () => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    return api<Highlight.Type[]>('/highlight_list', {
      method: 'POST',
      query: {
        operation_id: operation.id
      }
    }, h => this.setInfoByKey(h, 'target', 'highlights'))
  };

  highlight_create = async ({
    time_range,
    name,
    icon: glyph_id = Glyph.List.entries().find(e => e[1] === Default.Icon.HIGHLIGHT)![0]!,
    color = Default.Color.HIGHLIGHT as NonNullable<Badge.Variant>,
    tags = []
  }: {
    time_range: Range,
    name: string,
    icon: Glyph.Id | null,
    color: Badge.Variant
    tags?: string[]
  }) => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    const files = Source.Entity.selected(this.app);
    if (!files.length) {
      return;
    }

    const source_id = files[0].id;

    return api('/highlight_create', {
      method: 'POST',
      query: {
        operation_id: operation.id,
        ws_id: this.app.general.ws_id,
        source_id,
        name,
        color,
        glyph_id
      },
      toast: {
        onSuccess: () => toast.success(`Highlight ${name} has been created successfully`, {
          richColors: true,
          icon: <Icon name='Check' />
        })
      },
      body: {
        time_range,
        tags
      }
    }).then(this.highlights_reload);
  }

  highlight_delete = (obj_id: Highlight.Id) => api('highlight_delete', {
    method: 'DELETE',
    query: {
      obj_id,
      ws_id: this.app.general.ws_id,
    }
  }).then(() => {
    Highlights.remove(obj_id)
    this.highlights_reload();
  });

  glyphs_reload = async () => {
    Glyph.List.clear()

    const glyphs = await api<Glyph.Type[]>('/glyph_list', {
      method: 'POST',
    });

    const queue: (() => Promise<void>)[] = [];

    const synced = new Map<string, Glyph.Id>();

    glyphs.forEach(g => {
      synced.set(g.name, g.id);
      Glyph.List.set(g.id, g.name);
    });

    const notSynced = Glyph.Raw.filter(glyph => !synced.has(glyph));

    notSynced.forEach((name) => {
      queue.push(async () => {
        const formData = new FormData()
        formData.append('img', new Blob())

        await api<Glyph.Type>('/glyph_create', {
          method: 'POST',
          deassign: true,
          query: { name },
          body: formData,
        },
          (glyph) => {
            Glyph.List.set(glyph.id, glyph.name)
          },
        )
      })
    })

    const runQueue = async () => {
      const tasks = queue.splice(0, 10).map((task) => task())
      await Promise.all(tasks)
      if (queue.length > 0) {
        await runQueue()
      }
    }

    await runQueue()

    Logger.log(`Glyphs has been syncronized with gulp-backend`, Info)

    while (Glyph.Entries.length) { Glyph.Entries.pop(); }
    Glyph.Entries.push(...Array.from(Glyph.List.entries()));

    this.setInfoByKey(true, 'general', 'glyphs_syncronized')
  }

  setPointers = (pointer: Pointers.Pointer) => {
    const pointers = this.app.timeline.pointers

    const target = pointers.find((p) => p.id === pointer.id)

    if (target) {
      Object.assign(target, pointer)
    } else {
      pointers.push(pointer)
    }

    this.setInfoByKey(pointers, 'timeline', 'pointers')
  }

  session_create = async ({
    name,
    icon = Default.Icon.SESSION,
    color = Default.Color.SESSION,
    scroll,
    scale
  }: {
    name: string,
    icon: Icon.Name,
    color: string,
    scroll?: { x: number, y: number },
    scale?: number
  }) => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    const sessions = await this.session_list();
    if (sessions.some(s => s.name === name)) {
      toast.error('Session with this name is already exist', {
        richColors: true
      })
      return
    }

    sessions.push({
      name,
      icon,
      color,
      selected: {
        files: Source.Entity.selected(this.app).map(f => f.id),
        contexts: Context.Entity.selected(this.app).map(c => c.id),
        operations: operation.id
      },
      timeline: {
        scale: this.app.timeline.scale,
        frame: {
          min: this.app.timeline.frame.min,
          max: this.app.timeline.frame.max
        },
        filter: this.app.timeline.filter,
        target: this.app.timeline.target,
        scroll: scroll ?? { x: this.scrollX, y: this.scrollY }
      },
      filters: this.app.target.filters,
      hidden: this.app.hidden
    })

    if (!this.app.general.user) {
      Logger.warn('Tried to create session before user has been defined');
      return;
    }

    return api<undefined>('/user_update', {
      method: 'PATCH',
      query: {
        user_id: this.app.general.user?.id,
      },
      raw: true,
      body: {
        user_data: {
          sessions
        }
      }
    })
  }

  session_autosave = async () => {
    const prefix = 'Autosaved session '
    const sessions = await this.session_list();
    const prev = sessions.filter(session => session.name.startsWith(prefix));
    if (prev.length) {
      await this.sessions_delete(prev.map(s => s.name));
    }

    await this.session_create({
      name: prefix + new Date().toUTCString(),
      color: 'var(--green-700)',
      icon: 'RefreshClockwise'
    });
  }

  sessions_delete = async (names: string[]) => {
    for (const name of names) {
      try {
        await this.session_delete(name);
      } catch (err) {
        Logger.log(
          `Failed to delete session ${name}`,
          'Session.Delete.Banner.deleteSessionButtonClickHandler',
          { richColors: true, icon: <Icon name='Warning' /> }
        );
      }
    }
  }

  session_delete = async (name: string) => {
    if (!this.app.general.user) {
      Logger.error('Tried to delete session but there is no user', this.session_delete);
      return;
    }

    const sessions = await this.session_list();

    return api<undefined>('/user_update', {
      method: 'PATCH',
      query: {
        user_id: this.app.general.user.id,
      },
      raw: true,
      body: {
        user_data: {
          sessions: sessions.filter(s => s.name !== name)
        }
      }
    })
  }

  session_load = async (session: Internal.Session.Data) => {

    this.setInfoByKey(session.timeline.target, 'timeline', 'target');
    this.setInfoByKey(session.timeline.frame, 'timeline', 'frame');
    this.setInfoByKey(session.timeline.filter, 'timeline', 'filter');
    setTimeout(() => {
      this.setScrollX(session.timeline.scroll.x);
      this.setScrollY(session.timeline.scroll.y);
      this.setInfoByKey(session.timeline.scale, 'timeline', 'scale');
    }, 100);
    this.setInfoByKey(Operation.Entity.select(this.app, session.selected.operations), 'target', 'operations');
    this.setInfoByKey(Context.Entity.select(this.app, session.selected.contexts), 'target', 'contexts');
    this.setInfoByKey(Source.Entity.select(this.app, session.selected.files), 'target', 'files');
    this.setInfoByKey(session.filters, 'target', 'filters');
    if (session.hidden && typeof session.hidden === "object") {
      Object.keys(session.hidden).forEach(k => {
        const key = k as keyof App.Type['hidden'];
        this.setInfoByKey(session.hidden[key], 'hidden', key);
      });
    }

    setTimeout(() => {
      this.refetch();
    }, 0);
  }

  async session_list(user = this.app.general.user): Promise<Internal.Session.Data[]> {
    if (!user) {
      return Internal.Transformator.toAsync([]);
    }

    return api<any>('/user_get_by_id', {
      method: 'GET',
      query: { user_id: user.id }
    }).then(data => {
      const sessions = data
        ? data.user_data.sessions
        : [];

      return sessions || [];
    }).catch(error => {
      toast.error('Failed to load your sessions', {
        description: `Error message: ${JSON.stringify(error)}`,
        icon: <Icon name='FaceSad' />
      })
    });
  };

  sync = async () => {
    await this.mapping_file_list()

    const operations = await api<Operation.Type[]>('/operation_list', {
      method: 'POST'
    }).then(operations => operations.map(operation => {
      // @ts-ignore
      delete operation.contexts;
      // @ts-ignore
      delete operation.operation_data;

      const exist = Operation.Entity.id(this.app, operation.id) ?? {};

      operation.selected = exist.selected ?? false;

      return operation;
    }));

    const contexts = await Promise.all(operations.map(operation => api<Context.Type[]>('/context_list', { query: { operation_id: operation.id } }))).then(contexts => contexts.flat().map(context => {
      // @ts-ignore
      delete context.sources;

      const exist = Context.Entity.id(this.app, context.id) ?? {};

      context.selected = exist.selected ?? false;

      return context;
    }));

    const detailedFileInformation = await this.getDetails()

    const files = await Promise.all(contexts
      .map(context => api<Source.Type[]>('/source_list', {
        query: {
          operation_id: context.operation_id,
          context_id: context.id
        }
      })))
      .then(files => files
        .flat()
        .map(file => Source.Entity.normalize(this.app, file, detailedFileInformation
          .find(details => details.id === file.id)
        )))
      .then(files => files.filter(file => file !== null));

    Logger.log(`${operations.length} operations has been added to application data`, this.sync);
    Logger.log(`${contexts.length} contexts has been added to application data`, this.sync);
    Logger.log(`${files.length} files has been added to application data`, this.sync);

    RenderEngine.reset('range');

    this.setInfoByKey(operations, 'target', 'operations');
    this.setInfoByKey(contexts, 'target', 'contexts');
    this.setInfoByKey(files, 'target', 'files');

    return { operations, contexts, files };
  }

  syncFile = (id: Source.Id) => api<Source.Type>('/source_get_by_id', {
    query: { obj_id: id }
  }).then(async (file) => {
    const details = await this.getDetails().then(d => d.find(f => f.id === id));
    if (!details) {
      Logger.fatal('No detailed information for file has been provided');
    }

    const normalized = Source.Entity.normalize(this.app, file, details);

    const exist = this.app.target.files.findIndex(f => f.id === file.id);
    if (exist >= 0) {
      this.app.target.files[exist] = normalized;
    } else {
      this.app.target.files = [...this.app.target.files, normalized];
    }

    this.setInfoByKey(this.app.target.files, 'target', 'files');
  })

  getDetails = () => api<GulpDataset.QueryOperations.Summary>('/query_operations').then(operations => operations.map(operation => operation.contexts.map(context => context.plugins.map(plugin => plugin.sources))).flat(3));

  query_single_id = (doc_id: Doc.Type['_id'], operation_id: Operation.Id) => {
    return api<Doc.Type>('/query_single_id', {
      method: 'POST',
      query: {
        doc_id,
        operation_id,
      },
    });
  }

  // ⚠️ UNTOUCHABLE
  plugin_list = async (): Promise<GulpDataset.PluginList.Interface[]> => {
    const plugins = this.app.target.plugins
    if (plugins.length) {
      return Internal.Transformator.toAsync(plugins)
    }

    Logger.warn('No plugins found in application data', 'plugin_list')
    Logger.log('Fetching plugins...', 'plugin_list')

    const list = await api<GulpDataset.PluginList.Interface[]>('/plugin_list', list => list.sort((a, b) => a.filename.localeCompare(b.filename)));
    if (!list) {
      return [];
    }

    this.setInfoByKey(list, 'target', 'plugins')

    Logger.log(
      `Fetched and sorted ${list.length} plugins. Names:`,
      'plugin_list',
    )
    Logger.log(
      list.map((l) => l.filename),
      'plugin_list',
    )

    return list
  }

  setTimelineFrame = (frame: MinMax) => this.setInfoByKey(frame, 'timeline', 'frame')

  login = async (credentials: Pick<User.Minified, 'id' | 'password'>) => {
    const user = await api<User.Type>('/login', {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
      },
      toast: {
        onSuccess: () => toast.success('Access granted', {
          richColors: true,
          icon: <Icon name='Check' />
        }),
        onError: response => toast.error(`Login failed`, {
          richColors: true,
          description: `Reason: ${response.data.__error.msg}`,
          icon: <Icon name='Warning' />
        }),
      },
      body: {
        user_id: credentials.id,
        password: credentials.password
      },
    });

    if (!user) {
      return null;
    }

    Internal.Settings.token = user.token

    await this.plugin_list();
    await this.glyphs_reload();
    await this.sync();

    this.setInfoByKey(Object.assign(credentials, user), 'general', 'user');

    return user;
  }

  setTimelineScale = (scale: number) => {
    return this.setInfoByKey(
      Math.max(0.01, Math.min(9999999, scale)),
      'timeline',
      'scale'
    )
  }

  setTimelineTarget = (event?: Doc.Type | null | 1 | -1): Doc.Type => {
    const { target } = this.app.timeline

    if (typeof event === 'number' && target) {
      const events = Source.Entity.events(this.app, target['gulp.source_id'])
      const index = events.findIndex((event) => event._id === target._id) + event
      event = events[index]
    }

    if (typeof event !== 'undefined') {
      this.setInfoByKey(event as Doc.Type, 'timeline', 'target')
    }

    return event as Doc.Type
  }

  setTimelineFilter = (filter: string) =>
    this.setInfoByKey(filter, 'timeline', 'filter')

  increasedTimelineScale = (current: number = this.app.timeline.scale) =>
    current + current / 8

  decreasedTimelineScale = () =>
    this.app.timeline.scale - this.app.timeline.scale / 8

  query_external = async (
    plugin: string,
    custom_parameters: Record<string, string | number | object | null | undefined>,
    isPreviewMode = false
  ): Promise<{
    total_hits: number,
    docs: Doc.Type[]
  }> => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return { total_hits: 0, docs: [] };
    }

    return api('/query_external', {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
        operation_id: operation.id,
        plugin
      },
      body: {
        q: [
          {
            query: {
              query_string: {
                query: '*',
              },
            },
          }
        ],
        plugin_params: {
          custom_parameters
        },
        q_options: {
          preview_mode: isPreviewMode
        },
      },
    })
  }

  setQuery = (file: Arrayed<Source.Type>, query: Query.Type): void => {
    const files = Parser.array(file);

    files.forEach(file => {
      const prev = this.app.target.filters[file.id];

      this.app.target.filters[file.id] = {
        string: query.string || Filter.Entity.base(file),
        filters: (Array.isArray(query.filters) && query.filters.length > 0) ? query.filters : prev?.filters ?? []
      };
    });

    this.setInfoByKey(Refractor.object(this.app.target.filters), 'target', 'filters');
  }

  getQuery = (file: Source.Type): Query.Type => {
    const query = this.app.target.filters[file.id];

    if (!query) {
      const q = Filter.Entity.default(this.app, file.id)

      this.setQuery(file, q);

      return q
    }

    return query
  }

  filters_remove = (file: Source.Type | Source.Id) => {
    const id = Parser.useUUID(file) as Source.Id;
    const filters = Refractor.object({
      ...this.app.target.filters,
      [id]: Filter.Entity.default(this.app, file)
    });

    return this.setInfoByKey(filters, 'target', 'filters');
  }

  useReverseScroll = (bool: boolean) => {
    localStorage.setItem('settings.__isScrollReversed', String(bool))
    this.setInfoByKey(bool, 'timeline', 'isScrollReversed')
  }

  files_reorder_upper = (id: Source.Id) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    if (index === 0) return

    const file = files[index]
    files[index] = files[index - 1]
    files[index - 1] = file

    this.setInfoByKey(files, 'target', 'files')
    this.render();
  }

  files_reorder_lower = (id: Source.Id) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    if (index === files.length - 1) return

    const file = files[index]
    files[index] = files[index + 1]
    files[index + 1] = file

    this.setInfoByKey(files, 'target', 'files')
    this.render();
  }

  query_sigma = async (src_ids: Source.Id[], sigmas: NodeFile[], notes: boolean) => {
    const operation = Operation.Entity.selected(this.app);
    if (!operation) {
      return;
    }

    return api('/query_sigma', {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
        operation_id: operation.id
      },
      raw: true,
      body: {
        sigmas: await Promise.all(sigmas.map(s => s.text())),
        q_options: {
          note_parameters: {
            create_notes: notes,
          },
        },
        src_ids
      },
      toast: {
        onSuccess: () => toast.success('Sigma rule has been successfully applied', {
          richColors: true,
          icon: <Icon name='Check' />
        }),
        onError: response => toast.error('Sigma rule has not been applied', {
          richColors: true,
          icon: <Icon name='Warning' />
        }),
      }
    }, ({ req_id }) => {
      SmartSocket.Class.instance.conce(SmartSocket.Message.Type.STATS_UPDATE, m => m.req_id === req_id, m => {
        console.log(m);
        if (m.payload.obj.status !== 'done') {
          toast.error('Sigma query failed', {
            icon: <Icon name='Stop' />,
            richColors: true
          });
        } else {
          toast.success(`Sigma query ${m.payload.obj.name} has been successfully finished`, {
            description: `Total matches: ${m.payload.obj.data.total_hits ?? 0}`,
            icon: <Icon name='Sigma' />
          });
        }
      })
    });
  }

  toggle_visibility = (key: keyof App.Type['hidden']) => this.setInfoByKey(!this.app.hidden[key], 'hidden', key);

  files_repin = (id: Source.Id) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    files[index].pinned = !files[index].pinned

    this.setInfoByKey(files, 'target', 'files')
    this.render();
  }

  get width(): number {
    return (
      this.app.timeline.scale *
      (document.getElementById('canvas')?.clientWidth || 1)
    )
  }

  setInfoByKey = <K extends keyof App.Type, S extends keyof App.Type[K]>(
    value: App.Type[K][S],
    section: K,
    key: S,
  ) => {
    this.setInfo((_info) => {
      this.app = {
        ..._info,
        [section]: {
          ..._info[section],
          [key]: value,
        },
      }

      return this.app
    })
  }
}

export type Arrayed<K> = K | K[]

export type UUIDED<K extends Context.Type | Source.Type | Source.Type | Filter.Type> = K | K['id']

export const Pattern = {
  Server: new RegExp(
    /https?:\/\/(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})?(:\d+)?(\/[^\s]*)?/,
  ),
  Username: /^[\s\S]{3,48}$/,
  Password: /^[\s\S]{3,48}$/,
}

export interface MinMax<T extends number | bigint = number> {
  min: T
  max: T
}

export type Range = [number, number];

export const MinMaxBase = {
  min: 0,
  max: 0,
}
