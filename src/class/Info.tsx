import { type λApp } from '@/dto'
import {
  λOperation,
  λContext,
  λFile,
  OperationTree,
  ΞSettings,
  λLink,
  λNote,
  Default,
  GulpObject,
  λGroup,
  λRequest,
  λHighlight,
} from '@/dto/Dataset'
import { λEvent } from '@/dto/ChunkEvent.dto'
import React from 'react'
import { generateUUID, getSortOrder, Gradients, NodeFile } from '@/ui/utils'
import { Acceptable } from '@/dto/ElasticGetMapping.dto'
import { UUID } from 'crypto'
import { λGlyph } from '@/dto/Dataset'
import { Logger } from '@/dto/Logger.class'
import { Engine, λCache } from './Engine.dto'
import { SetState } from './API'
import { λMapping } from '@/dto/MappingFileList.dto'
import { Glyph } from '@/ui/Glyph'
import { Icon } from '@impactium/icons'
import { Permissions } from '@/banners/Permissions.banner'
import { toast } from 'sonner'
import { OpenSearchQueryBuilder } from '@/banners/FilterFile.banner'
import { Pointers } from '@/components/Pointers'
import { XY } from '@/dto/XY.dto'
import { Badge, Spinner } from '@impactium/components'
import { CustomParameters } from '@/components/CustomParameters'
import { Highlights } from '@/overlays/Highlights'
import { RenderEngine } from './RenderEngine'
import { FuckSocket } from './FuckSocket'

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
      id?: λFile['id'],
      refetchKeys?: Array<keyof λEvent>
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

    interface Source {
      name: string
      id: λFile['id']
      doc_count: number
      'max_event.code': number
      'min_event.code': number
      'min_gulp.timestamp': number
      'max_gulp.timestamp': number
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
      query: {
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
  export namespace IngestFile {
    export interface Summary {
      continue_offset: number
      done: boolean
    }
  }
}

interface RefetchOptions {
  ids?: Arrayed<λFile['id']>;
  refetchKeys?: Record<λFile['id'], Array<keyof λEvent>>;
}

interface InfoProps {
  app: λApp
  setInfo: React.Dispatch<React.SetStateAction<λApp>>
  timeline: React.RefObject<HTMLDivElement>
  setScrollX: SetState<number>;
  setScrollY: SetState<number>;
}

export namespace Internal {
  export enum LocalStorageItemsList {
    TIMELINE_RENDER_ENGINE = 'settings.__engine',
    TIMELINE_RENDER_COLOR = 'settings.__color',
    TIMELINE_PRETTY_CROSSHAIR = 'settings.__crosshair',
    TIMELINE_FOCUS_FIELD = 'settings.__field',
    GENERAL_SERVER_VALUE = '__server',
    GENERAL_TOKEN_VALUE = '__token',
    IS_UTC_TIMESTAMPS = '__is_utc_timestamps',
  }

  export namespace Sync {
    export interface Options {
      contexts?: boolean
      files?: boolean
    }
  }

  export class Settings {
    static default: ΞSettings = {
      engine: 'default',
      color: 'thermal',
      field: 'gulp.event_code',
      offset: 0,
      crosshair: true,
    }

    public static get engine(): Engine.List {
      const engine = localStorage.getItem(
        Internal.LocalStorageItemsList.TIMELINE_RENDER_ENGINE,
      ) as Engine.List

      if (engine) {
        return engine
      }

      Internal.Settings.engine = Internal.Settings.default.engine

      return Internal.Settings.engine
    }

    public static set engine(engine: Engine.List) {
      localStorage.setItem(
        Internal.LocalStorageItemsList.TIMELINE_RENDER_ENGINE,
        engine,
      )
    }

    public static get color(): Gradients {
      const color = localStorage.getItem(
        Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR,
      ) as Gradients

      if (color) {
        return color
      }

      Internal.Settings.color = Internal.Settings.default.color

      return Internal.Settings.color
    }

    public static set color(color: Gradients) {
      localStorage.setItem(
        Internal.LocalStorageItemsList.TIMELINE_RENDER_COLOR,
        color,
      )
    }

    public static get field(): keyof λEvent {
      const field = localStorage.getItem(
        Internal.LocalStorageItemsList.TIMELINE_FOCUS_FIELD,
      ) as keyof λEvent

      if (field) {
        return field
      }

      Internal.Settings.field = Internal.Settings.default.field

      return Internal.Settings.field
    }

    public static set field(field: keyof λEvent) {
      localStorage.setItem(
        Internal.LocalStorageItemsList.TIMELINE_FOCUS_FIELD,
        field.toString(),
      )
    }

    public static all(): ΞSettings {
      return {
        engine: Settings.engine,
        color: Settings.color,
        field: Settings.field,
        offset: 0,
        crosshair: Settings.crosshair,
      }
    }

    public static get server(): string {
      const engine = localStorage.getItem(
        Internal.LocalStorageItemsList.GENERAL_SERVER_VALUE,
      )

      if (engine) {
        return engine
      }

      Internal.Settings.server = 'http://localhost:8080'

      return Internal.Settings.server
    }

    public static set server(server: string) {
      localStorage.setItem(
        Internal.LocalStorageItemsList.GENERAL_SERVER_VALUE,
        server,
      )
    }

    public static get token(): string {
      const token = localStorage.getItem(
        Internal.LocalStorageItemsList.GENERAL_TOKEN_VALUE,
      )

      if (token) {
        return token
      }

      Internal.Settings.token = '-'

      return Internal.Settings.token
    }

    public static set token(token: string) {
      localStorage.setItem(
        Internal.LocalStorageItemsList.GENERAL_TOKEN_VALUE,
        token,
      )
    }

    public static get crosshair(): boolean {
      const value = localStorage.getItem(
        Internal.LocalStorageItemsList.TIMELINE_PRETTY_CROSSHAIR,
      )

      if (value) {
        return value === 'true'
      }

      Internal.Settings.crosshair = true

      return Internal.Settings.crosshair
    }

    public static set isUTCTimestamps(is: boolean) {
      localStorage.setItem(Internal.LocalStorageItemsList.IS_UTC_TIMESTAMPS, String(is))
    }

    public static get isUTCTimestamps(): boolean {
      const value = localStorage.getItem(Internal.LocalStorageItemsList.IS_UTC_TIMESTAMPS)

      if (value) {
        return value === 'true'
      }

      Internal.Settings.isUTCTimestamps = false;

      return Internal.Settings.crosshair
    }

    public static set crosshair(crosshair: boolean) {
      localStorage.setItem(
        Internal.LocalStorageItemsList.TIMELINE_PRETTY_CROSSHAIR,
        String(crosshair),
      )
    }
  }

  export class IconExtractor {
    public static activate = <T extends Pick<GulpObject<μ.File>, 'glyph_id'> | null>(
      defaultValue: Icon.Name,
    ): ((obj: T) => Icon.Name) => {
      return (obj: T) => {
        if (obj?.glyph_id) {
          return Glyph.List.get(obj.glyph_id) ?? defaultValue
        }

        return defaultValue
      }
    }
  }

  export class Transformator {
    public static toTimestamp = (
      timestamp: string | number | Date | bigint,
    ): number => new Date(Number(this.toNanos(timestamp)) / 1_000_000).valueOf()

    public static toNanos = (
      timestamp: string | number | Date | bigint,
    ): bigint => {
      if (typeof timestamp === 'bigint') {
        return timestamp
      }
      if (timestamp instanceof Date) {
        return BigInt(Math.floor(timestamp.getTime() * 1_000_000))
      }
      if (typeof timestamp === 'number') {
        return BigInt(Math.floor(timestamp * 1_000_000))
      }
      const parsed = Date.parse(timestamp)
      if (isNaN(parsed)) {
        Logger.error(
          `Invalid transformation to NANOS from ${timestamp}`,
          Transformator.name,
        )
        return 0n
      }
      return BigInt(parsed) * 1_000_000n
    }

    public static toISO = (
      timestamp: string | number | Date | bigint,
    ): string => {
      if (timestamp instanceof Date) return timestamp.toISOString()
      if (typeof timestamp === 'number' || typeof timestamp === 'bigint')
        return new Date(this.toTimestamp(timestamp)).toISOString()
      const parsed = Date.parse(timestamp)
      if (isNaN(parsed)) {
        Logger.error(
          `Invalid transformation to ISO from ${timestamp}`,
          Transformator.name,
        )
        return new Date().toISOString()
      }
      return new Date(parsed).toISOString()
    }

    public static toAsync = <T extends any>(value: T): Promise<T> => {
      return new Promise((resolve) => resolve(value))
    }
  }

  export namespace Session {
    export interface Data {
      name: string
      icon: Icon.Name
      color: string
      selected: {
        files: λFile['id'][],
        contexts: λContext['id'][],
        operations?: λOperation['id']
      },
      timeline: {
        scale: number,
        frame: MinMax,
        scroll: XY,
        filter: string
        target: λEvent | null,
      },
      filters: λApp['target']['filters']
    }
  }
}

export interface λUser {
  token: string;
  id: μ.User;
  password: string;
  time_expire: number;
}

export type λDetailedUser = GulpObject<
  μ.User,
  {
    pwd_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
    permission: Permissions.Role[]
    time_last_login: number
    user_data: Record<string, any>
    type: 'user'
    name: string
    groups: λGroup[]
  }
>

export class Info implements InfoProps {
  app: λApp
  setInfo: React.Dispatch<React.SetStateAction<λApp>>
  timeline: React.RefObject<HTMLDivElement>
  setScrollX: SetState<number>
  setScrollY: SetState<number>


  constructor({ app, setInfo, timeline, setScrollX, setScrollY }: InfoProps) {
    this.app = app
    this.setInfo = setInfo
    this.timeline = timeline
    this.setScrollX = setScrollX
    this.setScrollY = setScrollY

  }

  setTimelineFilteringoptions = (
    file: λFile | λFile['id'],
    options: FilterOptions,
  ) =>
    this.setInfoByKey(
      {
        ...this.app.timeline.filtering_options,
        [Parser.useUUID(file)]: options,
      },
      'timeline',
      'filtering_options',
    )

  refetch = async ({
    ids: _ids = File.selected(this.app).map((f) => f.id),
    refetchKeys
  }: RefetchOptions = {}) => {
    const files: λFile[] = Parser.array(_ids).map((id) => File.id(this.app, id));

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
      const query = this.getQuery(file.id);

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
    file: λFile,
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
      }
      const sid = FuckSocket.Class.instance.con(FuckSocket.Message.Type.DOCUMENTS_CHUNK, m => m.req_id === req_id, m => {
        const events = Event.normalize(m.data.docs);

        this.events_add(events);

        if (m.data.last) {
          FuckSocket.Class.instance.coff(FuckSocket.Message.Type.DOCUMENTS_CHUNK, sid);
        }
      });
      FuckSocket.Class.instance.conce(FuckSocket.Message.Type.ENRICH_DONE, m => m.req_id === req_id, m => {
        if (m.data.status !== 'done') {
          toast.error('Enrichment failed', {
            icon: <Icon name='Stop' />,
            richColors: true
          });
        } else {
          toast.success('Enrichment finished', {
            description: `Total processed documents: ${m.data.total_hits ?? 0}`,
            icon: <Icon name='Check' />
          });
        }
      })
    })
  }

  enrich_single_id = (
    plugin: string,
    event: λEvent,
    custom_parameters: Record<string, any>,
  ): Promise<λEvent> | undefined => api<λEvent>('/enrich_single_id', {
    method: 'POST',
    query: {
      plugin,
      operation_id: event['gulp.operation_id'],
      ws_id: this.app.general.ws_id,
      doc_id: event._id,
    },
    body: { custom_parameters },
    toast: 'Document has been enriched successfully',
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
    query: λQuery;
    total: number;
    separately?: boolean;
  }) => {
    const operation = Operation.selected(this.app);
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
    const operation = Operation.selected(this.app);
    if (!operation) {
      return null!
    }

    const context_id = `temp-${contextName}` as λContext['id'];

    const file: λFile = File.virtualize(this.app, {
      name: fileName,
      context_id,
      operation_id: operation.id,
      total: 999999
    });

    const context: λContext = {
      id: context_id,
      files: [file.id],
      color: '#00ff00',
      description: '',
      glyph_id: null as unknown as λGlyph['id'],
      granted_user_group_ids: [],
      granted_user_ids: [],
      name: contextName,
      operation_id: operation.id,
      time_created: Date.now(),
      time_updated: Date.now(),
      type: 'context',
      selected: true
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

  query_file = async (query: λQuery, {
    preview = false,
    id,
    refetchKeys
  }: GulpDataset.QueryGulp.Options) => {
    const operation = Operation.selected(this.app)
    if (!operation) {
      return
    }

    const body = Filter.body(query);

    if (preview) {
      body.q_options.preview_mode = preview
    }

    const request_query: Record<string, string> = {
      ws_id: this.app.general.ws_id,
      operation_id: operation.id,
    }

    if (id) {
      body.q_options.fields = refetchKeys ?? [File.id(this.app, id).settings.field];
    }

    const resp = await api<any>(
      '/query_raw', {
      method: 'POST',
      query: request_query,
      body,
      raw: true,
    }, ({ req_id }) => {
      const sid = FuckSocket.Class.instance.con(FuckSocket.Message.Type.DOCUMENTS_CHUNK, m => m.req_id === req_id, m => {
        const events = Event.normalize(m.data.docs);

        this.events_add(events);
        if (m.data.last) {
          FuckSocket.Class.instance.coff(FuckSocket.Message.Type.DOCUMENTS_CHUNK, sid);
        };
      })
      FuckSocket.Class.instance.conce(FuckSocket.Message.Type.QUERY_DONE, m => m.req_id === req_id, m => {
        this.delLoading(req_id);

        if (m.data.status !== 'done') {
          toast.error('Query failed', {
            icon: <Icon name='Stop' />,
            richColors: true
          })
        } else {
          toast.success('Query finished', {
            description: `Total processed documents: ${m.data.total_hits}`,
            icon: <Icon name='Check' />
          })
        }
      });

      if (id) {
        this.setLoading(req_id, id);
      }
    });

    if (preview) {
      toast(`Total hits for this filter is ${resp.data?.total_hits || 0}`)
    }


    return resp.data || {
      docs: [],
      total_hits: 0
    };
  }

  getLastQueries = (): Promise<λQuery[]> => api<GulpDataset.QueryHistoryGet.Response>('/query_history_get').then(list => {
    const queries: λQuery[] = [];

    list.forEach(query => {
      const root = query.query.query;

      let string = '';
      const filters: λFilter[] = [];

      Object.entries(root.bool).forEach(([key, arr]) => {
        const operator = key as OpenSearchQueryBuilder.Operator;

        arr.forEach((obj) => {
          Object.entries(obj).forEach(([type, v]) => {
            if (type === 'query_string') {
              string = v
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
        Logger.error(`Cannot find query_string part in given object: \n${JSON.stringify(query, null, 2)}`, 'Info.getLastQueries');
        string = Filter.base(File.selected(this.app)[0]);
      }

      queries.push({
        string,
        filters
      })
    })

    console.log(queries);

    return queries;
  });

  preview_file = (file: λFile) => {
    const query = this.getQuery(file.id);
    return this.query_file(query, {
      preview: true
    });
  }

  request_add = (req: λRequest) => {
    const exist = this.app.general.requests.findIndex(r => r.id === req.id);
    if (exist >= 0) {
      this.app.general.requests[exist] = req;
    } else {
      this.app.general.requests = [...this.app.general.requests, req];
    }

    this.setInfoByKey(this.app.general.requests.sort((a, b) => b.time_created - a.time_created), 'general', 'requests');
  }

  request_cancel = (req_id_to_cancel: λRequest['id']) => api('/request_cancel', {
    method: 'PATCH',
    query: { req_id_to_cancel },
  });

  filters_cache = (file: λFile | μ.File) => {
    Logger.log(
      `Caching has been requested for file ${File.id(this.app, file).name}`,
      Info,
    )

    const id = Parser.useUUID(file) as μ.File
    this.setInfoByKey(
      {
        data: this.app.timeline.cache.data.set(
          id,
          this.app.target.events.get(id) || [],
        ),
        filters: {
          ...this.app.timeline.cache.filters,
          [id]: this.app.target.filters[id],
        },
      },
      'timeline',
      'cache',
    )

    this.render()
  }

  filters_undo = (file: λFile | μ.File) => {
    const id = Parser.useUUID(file) as μ.File

    this.setInfoByKey(
      {
        ...this.app.target.filters,
        [id]: this.app.timeline.cache.filters[id],
      },
      'target',
      'filters',
    )

    this.app.target.events.delete(id)
    this.app.target.events.set(id, this.app.timeline.cache.data.get(id) || [])

    this.setInfoByKey(this.app.target.events, 'target', 'events')
    this.filters_delete_cache(file)
    this.render()
  }

  filters_delete_cache = (file: λFile | μ.File) => {
    const id = Parser.useUUID(file) as μ.File

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

  mapping_file_list = async (): Promise<λMapping.Plugin[]> => {
    const shit = await api<λMapping.Raw[]>('/mapping_file_list')

    const parsed_shit = Mapping.parse(shit)

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

  operations_select = (id: λOperation['id']) => {
    this.setInfoByKey(
      Operation.select(this.app, id),
      'target',
      'operations',
    )
    this.contexts_unselect(this.app.target.contexts)
  }

  operations_set = (operations: λOperation[]) =>
    this.setInfoByKey(
      Operation.reload(operations, this.app),
      'target',
      'operations',
    )

  deleteOperation = (operation: λOperation, setLoading: SetState<boolean>) => {
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

  contexts_select = (contexts: λContext[]) => {
    const files = contexts
      .map((context) => Context.files(this.app, context))
      .flat()

    const c = Context.select(this.app, contexts)

    this.setInfoByKey(c, 'target', 'contexts')
    setTimeout(() => {
      this.files_select(files)
    }, 0)
  }
  contexts_unselect = (contexts: λContext[]) => {
    const files = contexts
      .map((context) => Context.files(this.app, context))
      .flat()

    const c = Context.unselect(this.app, contexts)

    this.setInfoByKey(c, 'target', 'contexts')
    setTimeout(() => {
      this.files_unselect(files)
    }, 0)
  }

  // ⚠️ UNTOUCHABLE
  context_delete = (context: λContext, wipe: boolean) => {
    return api<any>(
      '/context_delete',
      {
        method: 'DELETE',
        query: {
          operation_id: context.operation_id,
          context_id: context.id,
          delete_data: wipe,
        },
      },
      this.sync,
    )
  }

  contexts_checkout = () => {
    const contexts: λContext[] = this.app.target.contexts.map((c) => {
      const files = Context.files(this.app, c)

      if (files.every((file) => !file.selected)) {
        c.selected = false
      } else {
        c.selected = files.some((file) => file.selected)
      }

      return c
    })
    this.setInfoByKey(contexts, 'target', 'contexts')
  }

  fileActionSelectable = (filter: string, select: boolean) => {
    const operation = Operation.selected(this.app)

    if (!operation) {
      return
    }

    const contexts = Context.select(this.app, Operation.contexts(this.app))

    const files = File[select ? 'select' : 'unselect'](
      this.app,
      Context.selected(contexts)
        .map((c) => Context.files(this.app, c))
        .flat()
        .filter((f) => f.name.toLowerCase().includes(filter)),
    )

    if (select) {
      const ids: λFile['id'][] = [];
      files.forEach(file => {
        const events = File.events(this.app, file)
        if (!events.length) {
          return ids.push(file.id);
        }
      })
      if (ids.length) {
        this.refetch({ ids });
      }
    }

    this.setInfo((i) => ({
      ...i,
      target: {
        ...i.target,
        contexts,
        files,
      },
    }))
  }

  selectAll = (filter: string) => this.fileActionSelectable(filter, true)

  unselectAll = (filter: string) => this.fileActionSelectable(filter, false)

  files_select = (files: λFile[]) => {
    this.setInfoByKey(File.select(this.app, files), 'target', 'files')
    setTimeout(() => {
      this.contexts_checkout()
    }, 0)
  }
  files_unselect = (files: λFile[]) => {
    if (
      this.app.timeline.target &&
      Parser.array(files)
        .map((file) => file.id)
        .includes(this.app.timeline.target['gulp.source_id'])
    ) {
      this.setTimelineTarget(null)
    }
    this.setInfoByKey(File.unselect(this.app, files), 'target', 'files')
    setTimeout(() => {
      this.contexts_checkout()
    }, 0)
  }

  // ⚠️ UNTOUCHABLE
  file_delete = (file: λFile, wipe: boolean) => {
    return api(
      '/source_delete',
      {
        method: 'DELETE',
        query: {
          operation_id: file.operation_id,
          context_id: file.context_id,
          source_id: file.id,
          delete_data: wipe,
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
    size,
    setProgress,
    preview
  }: FileEntity.IngestOptions) => {
    const operation = Operation.selected(this.app)
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
    }
    if (frame) {
      payload.flt = {
        int_filter: [frame.min, frame.max],
      }
    }

    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    const chunkSize = 1024 * size * 1024

    const query: Record<string, string | boolean> = {
      plugin: plugin.split('.')[0],
      operation_id: operation.id,
      context_name: context,
      ws_id: this.app.general.ws_id,
    }

    if (preview) {
      query.preview_mode = preview
    }

    const ingest = async (start = 0, id?: string): Promise<void | λEvent[]> => {
      formData.delete('f')

      const end = Math.min(file.size, preview ? file.size : start + chunkSize)

      formData.append('f', file.slice(start, end), file.name)

      if (id && !query.req_id) {
        query.req_id = id
      }

      const response = await api<GulpDataset.IngestFile.Summary>('/ingest_file', {
        method: 'POST',
        body: formData,
        deassign: true,
        raw: true,
        toast: false,
        query,
        headers: {
          size: file.size.toString(),
          continue_offset: start.toString(),
        },
      })

      if (preview) {
        return response.data as unknown as λEvent[]
      }

      // resume
      if (response.isError() && response.data.continue_offset)
        return ingest(response.data.continue_offset, response.req_id);


      if (setProgress) setProgress(end / file.size * 100)

      // next
      if (end < file.size) {
        return ingest(end, response.req_id);
      }
    }

    const id = generateUUID<string>();

    if (!this.app.target.contexts.find(c => c.name === context)) {
      FuckSocket.Class.instance.conce(FuckSocket.Message.Type.NEW_CONTEXT, m => m.req_id === id, m => {
        this.app.target.contexts.push(m.data.data);

        this.setInfo(this.app);
      })
    }

    FuckSocket.Class.instance.conce(FuckSocket.Message.Type.NEW_SOURCE, m => m.req_id === id, m => {
      this.setLoading(m.req_id, m.data.data.id);

      this.app.target.files.push({
        ...m.data.data,
        selected: true,
        settings: Internal.Settings.all(),
        total: 0,
        timestamp: {
          min: Date.now() - 1,
          max: Date.now()
        }
      });

      this.setInfo(this.app);
    })

    const sid = FuckSocket.Class.instance.con(FuckSocket.Message.Type.DOCUMENTS_CHUNK, m => m.req_id === id, m => {
      const events = Event.normalize(m.data.docs);

      const file = File.id(this.app, events[0]['gulp.source_id']);

      this.events_add(events);
      Event.sort(this.app, file.id);

      const all = File.events(this.app, file.id);


      const exist = this.app.target.files.findIndex(f => f.id === file.id);

      this.app.target.files[exist] = {
        ...file,
        timestamp: {
          min: all[all.length - 1].timestamp,
          max: all[0].timestamp
        },
        total: all.length
      }

      this.app.target.files = [...this.app.target.files];

      this.app.timeline.frame.min = Math.min(...this.app.target.files.map(f => f.timestamp.min));
      this.app.timeline.frame.max = Math.max(...this.app.target.files.map(f => f.timestamp.max));

      this.setInfo(this.app);

      if (m.data.last) {
        this.delLoading(m.req_id);
        FuckSocket.Class.instance.coff(FuckSocket.Message.Type.DOCUMENTS_CHUNK, sid)
      }
    })

    return ingest(0, id);
  }

  // ⚠️ UNTOUCHABLE
  file_set_settings = (id: λFile['id'], settings: Partial<λFile['settings']>) => {
    const file = File.id(this.app, id);;
    const newSettings = {
      ...file.settings,
      ...settings
    } satisfies λFile['settings'];

    if (!File.isEventKeyFetched(this.app, id, [newSettings.field])) {
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

  file_set_total = (id: λFile['id'], total = 0) =>
    this.setInfoByKey(
      this.app.target.files.map(file => file.id === id ? { ...file, total } : file),
      'target', 'files'
    )

  events_add = (newEvents: λEvent[], addTo?: λFile['id']) => {
    const events = addTo ? Event.addTo(this.app, addTo, newEvents) : Event.add(this.app, newEvents)

    this.app.target.events = events

    this.setInfo(this.app)
  }

  event_keys = async (file: λFile): Promise<FilterOptions> => {
    if (!file) {
      return Internal.Transformator.toAsync({});
    }

    if (File.isVirtual(file)) {
      const ids = file.id.split('-').slice(1) as λFile['id'][];

      const filterOptionsStack = await Promise.all(ids.map(id => this.event_keys(File.id(this.app, id))));

      return filterOptionsStack.flat().reduce<FilterOptions>((acc, cur) => {
        Object.keys(cur).forEach(c => {
          if (!acc[c]) {
            acc[c] = cur[c];
          }
        });

        return acc;
      }, {});
    };

    return api<FilterOptions>('/query_fields_by_source', {
      query: {
        operation_id: file.operation_id,
        context_id: file.context_id,
        source_id: file.id,
        ws_id: this.app.general.ws_id,
      }
    })
  }

  events_reset_in_file = (file: λFile) => {
    this.setInfoByKey(Event.delete(this.app, file), 'target', 'events')
  }

  setDialogSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'dialogSize')
  }

  // ⚠️ UNTOUCHABLE
  notes_reload = async () => {
    const files = File.selected(this.app).map((f) => f.id);
    if (files.length === 0) {
      Logger.warn('Tried to fetch all notes from all operations. Ignoring', Info);
      return;
    }
    let notes: λNote[] = [];
    const fetch = async (offset = 0) => {
      const fetched = await api<λNote[]>('/note_list', {
        method: 'POST',
        body: {
          source_ids: files,
          offset,
          limit: 500
        },
      });

      if (fetched.length) {
        notes = ([...notes, ...fetched]).sort((a, b) => Note.timestamp(b) - Note.timestamp(a));
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

    Note[λCache].clear();

    return notes;
  };

  /**
   * 
   * @param key Key of settings object
   * @param value Value to save. Be carreful, it can save any shit
   */
  setSettings = (key: string, value: any) => this.setInfoByKey(value, 'settings', key);

  setLoading(req_id: λRequest['id'], file_id: λFile['id']) {
    this.app.general.loadings.byRequestId.set(req_id, file_id);
    this.app.general.loadings.byFileId.set(file_id, req_id);
    this.setInfo(this.app);
  }

  delLoading(req_id: λRequest['id']) {
    this.app.general.loadings.byRequestId.delete(req_id);
    const file_id = [...this.app.general.loadings.byFileId.entries()].find(e => e[1] === req_id)?.[0];
    if (file_id) {
      this.app.general.loadings.byFileId.delete(file_id);
    }
    this.setInfo(this.app);
  }

  // ⚠️ UNTOUCHABLE
  note_delete = (note: λNote) =>
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
        this.setInfoByKey(updated.sort((a, b) => Note.timestamp(b) - Note.timestamp(a)), 'target', 'notes');
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
    event: λEvent,
    glyph_id: λGlyph['id'],
    isPrivate: boolean,
    tags: string[]
  }) => api<λNote>('/note_create', {
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
    toast: `Note ${name} has been created successfully`,
    body: {
      text,
      tags,
      doc: Event.toDoc(event),
    },
  }).then(note => {
    const updated = [...this.app.target.notes];
    updated.push(note);
    this.setInfoByKey(updated.sort((a, b) => Note.timestamp(b) - Note.timestamp(a)), 'target', 'notes');
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
    id: λNote['id'],
    name: string,
    text: string,
    color: string,
    event: λEvent,
    glyph_id: λGlyph['id'],
    tags: string[]
  }) => api<λNote>('/note_update', {
    method: 'PATCH',
    query: {
      obj_id,
      ws_id: this.app.general.ws_id,
      name,
      glyph_id,
      color,
    },
    toast: `Note ${name} has been updated successfully`,
    body: {
      text,
      tags,
      doc: Event.toDoc(event),
    }
  }).then(note => {
    const index = this.app.target.notes.findIndex(n => n.id === note.id);
    if (index === -1) {
      Logger.error(`Note with id: ${note.id} was not found in application data`, Info + this.note_edit.name);
      return;
    }
    const updated = [...this.app.target.notes];
    updated[index] = note;
    this.setInfoByKey(updated.sort((a, b) => Note.timestamp(b) - Note.timestamp(a)), 'target', 'notes');
  });

  // ⚠️ UNTOUCHABLE
  links_reload = async () => {
    return api<λLink[]>(
      '/link_list',
      {
        method: 'POST',
        body: {
          source_ids: File.selected(this.app).map((f) => f.id),
        },
      },
      links => this.setInfoByKey(links, 'target', 'links'),
    )
  }

  link_delete = (link: λLink) =>
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
    event: λEvent,
    glyph_id: λGlyph['id'],
    color: string,
    description: string
  }) => {
    return api<λLink>('/link_create', {
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
      toast: `Link ${name} has been created successfully`,
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
    id: λLink['id'],
    name: string,
    glyph_id: λGlyph['id'],
    color: string,
    events: λEvent['_id'][],
    description: string
  }) => {
    return api('/link_update', {
      method: 'PATCH',
      query: {
        obj_id,
        name,
        color,
        glyph_id,
        ws_id: this.app.general.ws_id,
        description
      },
      toast: `Link ${name} has been updated successfully`,
      body: {
        doc_ids: events
      },
    }).then(this.links_reload);
  }

  links_connect = (link: λLink, event: λEvent) => {
    return api<λLink>('/link_update', {
      method: 'PATCH',
      query: {
        obj_id: link.id,
        ws_id: this.app.general.ws_id,
      },
      toast: `Event ${event._id} has been connected to link ${link.name} successfully`,
      body: {
        doc_ids: [...link.doc_ids, event._id],
      },
    }).then(this.links_reload);
  }

  highlights_reload = () => api<λHighlight[]>('/highlight_list', {
    method: 'POST',
  }, h => this.setInfoByKey(h, 'target', 'highlights'));

  highlight_create = async ({
    time_range,
    name,
    icon: glyph_id = Glyph.List.entries().find(e => e[1] === Default.Icon.HIGHLIGHT)![0]!,
    color = Default.Color.HIGHLIGHT as NonNullable<Badge.Variant>,
    tags = []
  }: {
    time_range: Range,
    name: string,
    icon: λGlyph['id'] | null,
    color: Badge.Variant
    tags?: string[]
  }) => {
    const operation = Operation.selected(this.app);
    if (!operation) {
      return;
    }

    const files = File.selected(this.app);
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
      toast: `Highlight ${name} has been created successfully`,
      body: {
        time_range,
        tags
      }
    }).then(this.highlights_reload);
  }

  highlight_delete = (obj_id: λHighlight['id']) => api('highlight_delete', {
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

    const glyphs = await api<λGlyph[]>('/glyph_list', {
      method: 'POST',
    })

    if (!glyphs) {
      return
    }

    const queue: (() => Promise<void>)[] = []

    Glyph.Raw.forEach((name) => {
      queue.push(async () => {
        const exist = glyphs.find((g) => g.name === name)

        if (exist) {
          Glyph.List.set(exist.id, exist.name)
          return
        }

        const formData = new FormData()
        formData.append('img', new Blob())

        await api<λGlyph>(
          '/glyph_create',
          {
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
    scroll
  }: {
    name: string,
    icon: Icon.Name,
    color: string,
    scroll: XY
  }) => {
    const operation = Operation.selected(this.app);
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
        files: File.selected(this.app).map(f => f.id),
        contexts: Context.selected(this.app).map(c => c.id),
        operations: operation.id
      },
      timeline: {
        scale: this.app.timeline.scale,
        frame: this.app.timeline.frame,
        filter: this.app.timeline.filter,
        target: this.app.timeline.target,
        scroll,
      },
      filters: this.app.target.filters,
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
      toast: `Session ${name} has been saved successfully`,
      raw: true,
      body: {
        user_data: {
          sessions
        }
      }
    })
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
      toast: `Session ${name} has been deleted successfully`,
      raw: true,
      body: {
        user_data: {
          sessions: sessions.filter(s => s.name !== name)
        }
      }
    })
  }

  session_load = async (session: Internal.Session.Data) => {
    this.setScrollX(session.timeline.scroll.x);
    this.setScrollY(session.timeline.scroll.y);

    this.setInfo(info => ({
      ...info,
      timeline: {
        ...info.timeline,
        scale: session.timeline.scale,
        target: session.timeline.target,
        frame: session.timeline.frame,
        filter: session.timeline.filter,
      },
      target: {
        ...info.target,
        operations: Operation.select(this.app, session.selected.operations),
        contexts: Context.select(this.app, session.selected.contexts),
        files: File.select(this.app, session.selected.files),
        filters: session.filters
      }
    }));
  }

  async session_list(): Promise<Internal.Session.Data[]> {
    if (!this.app.general.user) {
      Logger.warn('Tried to load sessions list before authorization');
      return Internal.Transformator.toAsync([]);
    }

    return api<any>('/user_get_by_id', {
      method: 'GET',
      query: { user_id: this.app.general.user.id }
    }).then(data => data.user_data.sessions || [])
  };

  sync = async () => {
    const operations: λOperation[] = []
    const contexts: λContext[] = []
    const files: λFile[] = []

    await this.mapping_file_list()

    const details = await api<GulpDataset.QueryOperations.Summary>(
      '/query_operations',
    )
      .then((raw) =>
        raw
          .map((o) => o.contexts.map((c) => c.plugins.map((p) => p.sources)))
          .flat(3),
      )
      .then((sources) =>
        sources.map((source) => ({
          id: source.id,
          name: source.name,
          total: source.doc_count,
          code: {
            min: source['min_event.code'],
            max: source['max_event.code'],
          },
          timestamp: {
            min: source['min_gulp.timestamp'] / 1000000,
            max: Math.max(
              source['max_gulp.timestamp'] / 1000000,
              source['min_gulp.timestamp'] / 1000000 + 1
            ),
          },
          nanotimestamp: {
            min: BigInt(source['min_gulp.timestamp']),
            max: BigInt(source['max_gulp.timestamp']),
          },
        })),
      )

    const rawOperations = await api<OperationTree[]>('/operation_list', {
      method: 'POST',
      query: {},
    })

    rawOperations.forEach((rawOperation: OperationTree) => {
      const exist = Operation.id(this.app, rawOperation.id)

      const operation: λOperation = {
        ...rawOperation,
        selected: exist?.selected ?? false,
        contexts: rawOperation.contexts.map((rawContext) => {
          const context: λContext = {
            ...rawContext,
            selected: Context.id(this.app, rawContext.id)?.selected ?? false,
            files: rawContext.sources.map((rawFile) => {
              const file: λFile = {
                ...rawFile,
                // @ts-ignore
                color: Internal.Settings.color,
                // @ts-ignore
                settings: Internal.Settings.all(),
                ...{
                  total: 0,
                  code: MinMaxBase,
                  timestamp: MinMaxBase,
                  nanotimestamp: {
                    min: BigInt(0),
                    max: BigInt(0),
                  },
                },
                ...File.id(this.app, rawFile.id),
                ...details.find((f) => f.id === rawFile.id),
                selected: File.id(this.app, rawFile.id)?.selected ?? false,
              }
              files.push(file)
              return file.id
            }),
          }
          contexts.push(context)
          return context.id
        }),
      }
      operations.push(operation)
    })

    Logger.log(`${operations.length} operations has been added to application data`, this.sync);
    Logger.log(`${contexts.length} contexts has been added to application data`, this.sync);
    Logger.log(`${files.length} files has been added to application data`, this.sync);

    RenderEngine.reset('range');

    this.app.target.operations = operations
    this.app.target.contexts = contexts
    this.app.target.files = files
    this.setInfo(this.app)

    return { operations, contexts, files };
  }

  query_single_id = (doc_id: λEvent['_id'], operation_id: λOperation['id']) => {
    return api<λEvent>('/query_single_id', {
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

    const list = await api<GulpDataset.PluginList.Interface[]>('/plugin_list').then(
      (list) => list.sort((a, b) => a.filename.localeCompare(b.filename)),
    )

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

  login = async (credentials: Pick<λUser, 'id' | 'password'>) => {
    const user = await api<λUser>('/login', {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
      },
      body: {
        user_id: credentials.id,
        password: credentials.password
      },
    }).then(user => {
      if (user) {
        return user;
      }

      toast.error('Invalid server URL, or username, or password', {
        richColors: true,
        icon: <Icon name='Warning' />
      });
    })

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

  setTimelineScale = (scale: number) =>
    this.setInfoByKey(
      Math.max(0.01, Math.min(9999999, scale)),
      'timeline',
      'scale',
    )

  setTimelineTarget = (event?: λEvent | null | 1 | -1): λEvent => {
    const { target } = this.app.timeline

    if (typeof event === 'number' && target) {
      const events = File.events(this.app, target['gulp.source_id'])
      const index = events.findIndex((event) => event._id === target._id) + event
      event = events[index]
    }

    if (typeof event !== 'undefined') {
      this.setInfoByKey(event as λEvent, 'timeline', 'target')
    }

    return event as λEvent
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
    docs: λEvent[]
  }> => {
    const operation = Operation.selected(this.app);
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

  setQuery = (id: λFile['id'], query: λQuery): void =>
    this.setInfoByKey(
      { ...this.app.target.filters, [id]: query },
      'target',
      'filters',
    )
  setFilters = (id: λFile['id'], filters: λFilter[]): void =>
    this.setInfoByKey(
      {
        ...this.app.target.filters,
        [id]: {
          string: this.app.target.filters[id].string,
          filters,
        },
      },
      'target',
      'filters',
    )
  setQueryString = (id: λFile['id'], string: string): void =>
    this.setInfoByKey(
      {
        ...this.app.target.filters,
        [id]: {
          filters: this.app.target.filters[id].filters,
          string,
        },
      },
      'target',
      'filters',
    )
  getQuery = (id: λFile['id']): λQuery => {
    const query = this.app.target.filters[id]

    if (!query) {
      const q = Filter.default(this.app, id)

      this.setQuery(id, q)

      return q
    }

    return query
  }


  filters_remove = (file: λFile | λFile['id']) => {
    this.app.target.filters[Parser.useUUID(file) as λFile['id']] = Filter.default(this.app, file);
    return this.setInfo(this.app);
  }

  useReverseScroll = (bool: boolean) => {
    localStorage.setItem('settings.__isScrollReversed', String(bool))
    this.setInfoByKey(bool, 'timeline', 'isScrollReversed')
  }

  files_reorder_upper = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    if (index === 0) return

    const file = files[index]
    files[index] = files[index - 1]
    files[index - 1] = file

    this.setInfoByKey(files, 'target', 'files')
    this.render();
  }

  files_reorder_lower = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    if (index === files.length - 1) return

    const file = files[index]
    files[index] = files[index + 1]
    files[index + 1] = file

    this.setInfoByKey(files, 'target', 'files')
    this.render();
  }

  query_sigma = async (src_ids: λFile['id'][], sigmas: NodeFile[], notes: boolean) => {
    const operation = Operation.selected(this.app);
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
      toast: 'Sigma rule has been successfully applied'
    }).then(({ req_id }) => {
      FuckSocket.Class.instance.conce(FuckSocket.Message.Type.QUERY_DONE, m => m.req_id === req_id, m => {
        if (m.data.status !== 'done') {
          toast.error('Sigma query failed', {
            icon: <Icon name='Stop' />,
            richColors: true
          });
        } else {
          toast.success(`Sigma query finished: ${m.data.name}`, {
            description: `Total processed documents: ${m.data.total_hits ?? 0}`,
            icon: <Icon name='Sigma' />
          });
        }
      })
    });
  }

  toggle_notes_visibility = (value?: boolean) =>
    this.setInfoByKey(
      value ?? !this.app.timeline.hidden_notes,
      'timeline',
      'hidden_notes',
    )

  files_repin = (id: λFile['id']) => {
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

  private setInfoByKey = <K extends keyof λApp, S extends keyof λApp[K]>(
    value: λApp[K][S],
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

export class Operation {
  public static icon = Internal.IconExtractor.activate<λOperation | null>(
    Default.Icon.OPERATION,
  )

  public static reload = (newOperations: λOperation[], app: λApp) => Operation.select(newOperations, Operation.selected(app)?.id)

  public static selected = (app: λApp): λOperation | undefined =>
    Logger.assert(
      app.target.operations.find((o) => o.selected),
      'No operation selected',
      'Operation.selected',
    )

  public static id = (use: λApp, id: λOperation['id']): λOperation =>
    Parser.use(use, 'operations').find((o) => o.id === id) as λOperation

  public static findByName = (
    app: λApp,
    name: λOperation['name'],
  ): λOperation | undefined =>
    app.target.operations.find((o) => o.name === name)

  public static select = (
    use: λApp | λOperation[],
    operation: λOperation['id'] | undefined,
  ): λOperation[] =>
    Parser.use(use, 'operations').map((o) =>
      o.id === operation ? Operation._select(o) : Operation._unselect(o),
    )

  public static contexts = (app: λApp): λContext[] =>
    app.target.contexts.filter(
      (c) => c.operation_id === Operation.selected(app)?.id,
    )

  private static _select = (o: λOperation): λOperation => ({
    ...o,
    selected: true,
  })

  private static _unselect = (o: λOperation): λOperation => ({
    ...o,
    selected: false,
  })
}

export class Context {
  public static icon = Internal.IconExtractor.activate<λContext | null>(
    Default.Icon.CONTEXT,
  )

  public static reload = (newContexts: λContext[], app: λApp): λContext[] =>
    Context.select(newContexts, Context.selected(app))

  public static frame = (app: λApp): MinMax =>
    File.selected(app)
      .map((f) => f.timestamp)
      .reduce(
        (acc, cur) => {
          acc.min = Math.min(cur.min, acc.min || cur.min)
          acc.max = Math.max(cur.max, acc.max)

          return acc
        },
        { min: 0, max: 0 },
      )

  public static selected = (use: λApp | λContext[]): λContext[] =>
    Parser.use(use, 'contexts').filter(
      (c) =>
        c.selected &&
        ('target' in use
          ? Operation.selected(use)?.id === c.operation_id
          : true),
    )

  public static findByName = (app: λApp, name: λContext['name']) =>
    Context.selected(app).find((c) => c.name === name)

  public static findByFile = (
    use: λApp | λContext[],
    file: λFile | λFile['id'],
  ): λContext | undefined =>
    Parser.use(use, 'contexts').find((c) =>
      c.files.some((p) => p === Parser.useUUID(file)),
    )

  public static select = (
    use: λApp | λContext[],
    selected: Arrayed<λContext | λContext['id']>,
  ): λContext[] =>
    Parser.use(use, 'contexts').map((c) =>
      Parser.array(selected).find((s) => c.id === Parser.useUUID(s))
        ? Context._select(c)
        : c,
    )

  public static unselect = (
    use: λApp | λContext[],
    unselected: Arrayed<λContext | λContext['id']>,
  ): λContext[] =>
    Parser.use(use, 'contexts').map((c) =>
      Parser.array(unselected).find((s) => c.id === Parser.useUUID(s))
        ? Context._unselect(c)
        : c,
    )

  public static check = (
    use: λApp | λContext[],
    selected: Arrayed<λContext | UUID>,
    check?: boolean,
  ): λContext[] =>
    Parser.use(use, 'contexts').map((c) =>
      Parser.array(selected).find((s) => c.id === Parser.useUUID(s))
        ? check
          ? Context._select(Context.id(use, c))
          : Context._unselect(Context.id(use, c))
        : c,
    )

  public static id = (
    use: λApp | λContext[],
    context: λContext | λContext['id'],
  ) =>
    Parser.use(use, 'contexts').find(
      (c) => c.id === Parser.useUUID(context),
    ) as λContext

  public static files = (
    app: λApp,
    context: λContext | λContext['id'],
  ): λFile[] =>
    app.target.files.filter((p) => p.context_id === Parser.useUUID(context))

  private static _select = (c: λContext): λContext => ({ ...c, selected: true })

  private static _unselect = (c: λContext): λContext => ({
    ...c,
    selected: false,
  })
}

export namespace FileEntity {
  export interface IngestOptions {
    context: λContext['id'] | string
    file: any;
    // Chunk size / bit numeric representation
    size: number;
    frame?: MinMax;
    settings: FileEntity.Settings;
    setProgress?: (num: number) => void;
    preview?: boolean;
  }

  export interface Settings {
    plugin?: string;
    method?: string;
    mapping?: string;
    custom_parameters: Record<string, any>;
  }
}

export class File {
  // @ts-ignore
  public static icon = Internal.IconExtractor.activate<λFile | null>(Default.Icon.FILE)

  // ⚠️ UNTOUCHABLE
  public static selected = (app: λApp): λFile[] =>
    File.pins(app.target.files.filter((s) => s.selected)).filter(
      (s) =>
        s.name?.toLowerCase().includes(app.timeline.filter.toLowerCase()) ||
        Context.id(app, s.context_id)
          .name?.toLowerCase()
          .includes(app.timeline.filter.toLowerCase()),
    )

  public static select = (app: λApp, selected: λFile[] | λFile['id'][]): λFile[] =>
    app.target.files.map((f) =>
      selected.map(s => Parser.useUUID(s)).find(id => id === f.id) ? File._select(f) : f,
    )

  public static pins = (use: λApp | λFile[]) =>
    Parser.use(use, 'files').sort((a, b) =>
      a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1,
    )

  public static isEventKeyFetched = (app: λApp, id: λFile | μ.File, keys: Array<keyof λEvent> = []) => {
    const file = File.id(app, id);
    return File.events(app, file).slice(0, 100).every(e => [...keys, file.settings.field].every(k => typeof e[k] !== 'undefined'));
  };

  public static context = (app: λApp, file: λFile) =>
    Context.id(app, file.context_id)

  public static id = (use: λApp | λFile[], file: λFile | μ.File) =>
    typeof file === 'string'
      ? (Parser.use(use, 'files').find(
        (s) => s.id === Parser.useUUID(file),
      ) as λFile)
      : file

  public static unselect = (app: λApp, unselected: λFile[]): λFile[] =>
    app.target.files.map((f) =>
      unselected.find((u) => u.id === f.id) ? File._unselect(f) : f,
    )

  public static check = (
    use: λApp | λFile[],
    selected: Arrayed<λFile | string>,
    check: boolean,
  ): λFile[] =>
    Parser.use(use, 'files').map((s) =>
      Parser.array(selected).find((f) => s.id === Parser.useUUID(f) && check)
        ? File._select(s)
        : File._unselect(s),
    )

  public static isVirtual = (file: λFile) => file.id.startsWith('temp');

  public static virtualize = (app: λApp, {
    name,
    total,
    context_id,
    operation_id,
  }: {
    name: string;
    total: number;
    context_id: λContext['id'];
    operation_id: λOperation['id'];
  }): λFile => {
    return ({
      name,
      id: generateUUID(),
      timestamp: app.timeline.frame,
      nanotimestamp: {
        min: BigInt(Math.round(app.timeline.frame.min)),
        max: BigInt(Math.round(app.timeline.frame.max)),
      },
      settings: Internal.Settings.all(),
      selected: true,
      operation_id,
      context_id,
      total,
      type: 'file',
      color: Internal.Settings.color,
      description: '',
      glyph_id: null as unknown as λGlyph['id'],
      granted_user_group_ids: [],
      granted_user_ids: [],
      time_created: Date.now(),
      time_updated: Date.now(),
    })
  }

  public static devirtualize = (app: λApp, file: λFile): λFile[] => file.id.split('-').slice(1).map(id => File.id(app, id as λFile['id'])).filter(f => f);

  public static events = (app: λApp, file: λFile | μ.File): λEvent[] =>
    Event.get(app, Parser.useUUID(file) as μ.File)

  public static notes = (app: λApp, files: Arrayed<λFile>): λNote[] => Parser.array(files).map((s) => Note.findByFile(app, s)).flat();

  public static index = (app: λApp, file: λFile | μ.File) => File.selected(app).findIndex((s) => s.id === Parser.useUUID(file))

  public static getHeight = (app: λApp, file: λFile | μ.File, scrollY: number) => 48 * this.index(app, file) - scrollY + 24

  private static _select = (p: λFile): λFile => ({ ...p, selected: true })

  private static _unselect = (p: λFile): λFile => ({ ...p, selected: false })
}

export enum FilterType {
  GREATER_OR_EQUAL = '>=',
  EQUAL = '==',
  LESS_OR_EQUAL = '<=',
  NOT_EQUAL = '!=',
  LESS_THAN = '<',
  GREATER_THAN = '>',
}

export type FilterOptions = Record<string, Acceptable>

export type λFilter = {
  id: μ.Filter
  type: OpenSearchQueryBuilder.Condition
  operator: OpenSearchQueryBuilder.Operator
  field: string
  value: any
  enabled: boolean
  case_insensitive?: boolean
}

export interface λQuery {
  string: string
  filters: λFilter[]
}

export class Filter {
  public static hasFilter = (app: λApp, file: λFile): false => false

  static query = ({ filters, string }: λQuery) => {
    const query: Record<string, any> = structuredClone(
      OpenSearchQueryBuilder.INITIAL,
    )

    if (string?.trim()) {
      query.bool.must.push({
        query_string: {
          query: string,
        },
      })
    }

    filters.forEach(({ type, field, value, operator, enabled, case_insensitive = false }) => {
      if (!field || !value || !enabled) return

      let conditionObj = {}

      switch (type) {
        case 'term':
          conditionObj = { term: { [field]: value } }
          break
        case 'match':
          conditionObj = { match: { [field]: value } }
          break
        case 'regexp':
          conditionObj = { regexp: { [field]: { value, flags: 'ALL' } } }
          break
        case 'prefix':
          conditionObj = { prefix: { [field]: value } }
          break
        case 'wildcard':
          conditionObj = { wildcard: { [field]: { value, case_insensitive } } }
          break
        case 'range':
          conditionObj = {
            range: {
              [field]: {
                gte: value.split(',')[0]?.trim() || 0,
                lte: value.split(',')[1]?.trim() || 0,
              },
            },
          }
          break
        default:
          conditionObj = { term: { [field]: value } }
      }

      query.bool[operator].push(conditionObj)
    })

    Object.keys(query.bool).forEach((key) => {
      if (query.bool[key].length === 0) {
        delete query.bool[key]
      }
    })

    return query
  }

  private static quotes = (str: string) =>
    str.includes(' ') ? `"${str}"` : str

  public static base = (file: λFile, range?: MinMax) => `(gulp.operation_id: ${Filter.quotes(file.operation_id)} AND gulp.context_id: "${Filter.quotes(file.context_id)}" AND gulp.source_id: "${Filter.quotes(file.id)}" AND gulp.timestamp: [${range?.min ?? file.nanotimestamp.min} TO ${range?.max ?? file.nanotimestamp.max}])`

  public static default = (app: λApp, file: λFile | λFile['id'], range?: MinMax): λQuery => {
    const id = typeof file === 'object' ? file.id : file;

    return {
      string: Filter.base(File.id(app, id), range ?? {
        min: Internal.Transformator.toNanos(app.timeline.frame.min).toString() as unknown as number,
        max: Internal.Transformator.toNanos(app.timeline.frame.max).toString() as unknown as number
      }),
      filters: [],
    }
  }

  static body = (query: λQuery) => {
    const body: Record<string, any> = {
      q: [{ query: Filter.query(query) }],
      q_options: {
        sort: {
          '@timestamp': 'desc',
        },
      },
    }

    return body
  }
}

export class Event {
  public static toDoc = (event: λEvent) => ({
    '_id': event._id,
    '@timestamp': event['@timestamp'],
    'gulp.context_id': event['gulp.context_id'],
    'gulp.operation_id': event['gulp.operation_id'],
    'gulp.source_id': event['gulp.source_id'],
    'gulp.timestamp': event['gulp.timestamp'],
  })

  public static delete = (app: λApp, files: Arrayed<λFile>) => {
    files = Parser.array(files)

    files.forEach((file) => {
      app.target.events.delete(file.id)
      app.target.events.set(file.id, [])
    })

    return app.target.events
  }

  public static range = (events: λEvent[]) => ({
    max: new Date(events[0]['@timestamp']).valueOf(),
    min: new Date(events[events.length - 1]['@timestamp']).valueOf()
  })

  public static id = (app: λApp, event: λEvent['_id']): λEvent =>
    Array.from(app.target.events.values())
      .flat()
      .find((e) => e._id === event) as λEvent

  public static get = (app: λApp, id: μ.File): λEvent[] =>
    app.target.events.get(id) ||
    (app.target.events.set(id, []).get(id) as λEvent[])

  public static sort = (app: λApp, id: μ.File) => app.target.events.set(id, app.target.events.get(id)?.sort((a, b) => b.timestamp - a.timestamp) ?? []);

  public static selected = (app: λApp): λEvent[] =>
    File.selected(app)
      .map((s) => Event.get(app, s.id))
      .flat()

  public static add = (app: λApp, events: λEvent[]) => {
    events.forEach((e) => Event.get(app, e['gulp.source_id']).push(e))

    return app.target.events
  }

  public static addTo = (app: λApp, file: λFile['id'], events: λEvent[]) => {
    events.forEach(e => Event.get(app, file).push(e));

    Logger.log(`${events.length} events has been added to file with id ${file}`, Info);

    return app.target.events;
  }

  public static timestamp = (event: λEvent) => Internal.Transformator.toTimestamp(event['@timestamp']);

  public static ids = (app: λApp, ids: λEvent['_id'][]) =>
    Array.from(app.target.events.values())
      .flat()
      .filter((e) => ids.includes(e._id))

  public static notes = (app: λApp, event: λEvent) => Note.findByFile(app, event['gulp.source_id']).filter((n) => n.doc._id === event._id);

  public static links = (app: λApp, event: λEvent) =>
    app.target.links.filter((l) => l.doc_ids.some(doc => doc === event._id))

  public static normalize = (docs: λEvent[]) => docs.map((e: λEvent) => ({
    ...e,
    ['gulp.timestamp']: BigInt(e['gulp.timestamp']),
    timestamp: Math.round(Number(e['gulp.timestamp']) / 1000000)
  })) as λEvent[];
}

export class Note {
  public static icon = Internal.IconExtractor.activate<λNote | null>(Default.Icon.NOTE)

  public static id = (app: λApp, id: λNote['id']) =>
    app.target.notes.find((n) => n.id === id) as λNote

  public static selected = (app: λApp): λNote[] => {
    const files = File.selected(app).map(file => file.id);

    return app.target.notes.filter((note) => files.includes(note.doc['gulp.source_id']));
  }

  public static event = (app: λApp, note: λNote): λEvent => Event.id(app, note.doc._id)

  public static [λCache] = new Map<λFile['id'], λNote[]>();

  public static indexSize = () => [...Note[λCache].values()].flat().length;

  public static updateIndexing = (app: λApp) => {
    Note[λCache].clear();

    app.target.files.forEach(file => {
      Note[λCache].set(file.id, app.target.notes.filter((n) => n.source_id === file.id));
    })

    Logger.log(`NOTES_INDEXES_HAS_BEEN_CREATED:${Note.indexSize()}`, Note.name);
  };

  public static findByFile = (app: λApp, file: λFile | λFile['id']): λNote[] => {
    const id = Parser.useUUID(file) as λFile['id'];
    const notes = Note[λCache].get(id);
    if (notes) {
      return notes;
    } else {
      this.updateIndexing(app);
      return Note.findByFile(app, file);
    }
  };

  public static timestamp = (note: λNote): number => {
    if (!note || !note.doc) {
      return 0;
    }

    return new Date(note.doc['@timestamp']).getTime();
  }
}

export class Link {
  public static icon = Internal.IconExtractor.activate<λLink | null>(Default.Icon.LINK)

  public static id = (app: λApp, id: λLink['id']): λLink => app.target.links.find(link => link.id === id)!;

  public static selected = (app: λApp) =>
    app.target.links.filter((link) =>
      link.doc_ids.every(
        (id) => File.id(app, Event.id(app, id)?.['gulp.source_id'])?.selected,
      ),
    )

  public static timestamp = (app: λApp, link: λLink): number => {
    if (link.doc_ids.length === 0) {
      return 0;
    }

    let sum = 0

    link.doc_ids.forEach(d => sum += Event.timestamp(Event.id(app, d)));

    return sum / link.doc_ids.length;
  }
}

export class Mapping {
  public static parse(raw: λMapping.Raw[]): λMapping.Plugin[] {
    const plugins: λMapping.Plugin[] = []

    raw.forEach((r) => {
      const isPluginExist = plugins.find((p) => p.name === r.metadata.plugin[0])

      if (!isPluginExist) {
        plugins.push({
          name: r.metadata.plugin[0],
          methods: [],
        })
      }

      const shit = plugins.find(
        (p) => p.name === r.metadata.plugin[0],
      ) as λMapping.Plugin

      shit.methods.push({
        name: r.filename,
        mappings: r.mapping_ids,
      })
    })

    return plugins
  }

  public static plugins = (app: λApp): λMapping.Plugin['name'][] =>
    app.target.mappings.map((p) => p.name)

  public static methods = (
    app: λApp,
    plugin?: λMapping.Plugin['name'],
  ): λMapping.Method['name'][] =>
    app.target.mappings
      .find((p) => p.name === plugin)
      ?.methods.map((m) => m.name) || []

  public static mappings = (
    app: λApp,
    plugin?: λMapping.Plugin['name'],
    method?: λMapping.Method['name'],
  ): λMapping.Mapping[] =>
    app.target.mappings
      .find((p) => p.name === plugin)
      ?.methods.find((m) => m.name === method)?.mappings || []
}

export class Parser {
  public static use = <K extends keyof λApp['target']>(
    x: λApp | λApp['target'][K],
    expects: K,
  ): λApp['target'][K] =>
    Array.isArray(x) ? (x as λApp['target'][K]) : (x as λApp)['target'][expects]

  public static useName = (
    unknown: λOperation | λContext | λFile | λFile | string,
  ): string => (typeof unknown === 'string' ? unknown : unknown.name)

  public static useId = (unknown: λEvent | string): string =>
    typeof unknown === 'string' ? unknown : unknown._id

  public static useUUID = <
    T extends λContext | λFile | λFile | λFile | λFilter,
  >(
    unknown: T | string,
  ): μ.Context | μ.File | μ.Filter | μ.Operation | μ.File | μ.File => {
    if (typeof unknown === 'string') {
      return unknown as T['id']
    } else {
      return (unknown as T)?.id
    }
  }

  public static array = <K extends unknown>(unknown: Arrayed<K>): K[] =>
    Array.isArray(unknown) ? unknown : [unknown]

  public static isSingle = (arr: Array<any>) => arr.length === 1
}

export type Arrayed<K> = K | K[]

export type UUIDED<K extends λContext | λFile | λFile | λFilter> = K | K['id']

export namespace μ {
  const Filter = Symbol('Filter')
  export type Filter = UUID & {
    readonly [Filter]: unique symbol
  }

  const Operation = Symbol('Operation')
  export type Operation = UUID & {
    readonly [Operation]: unique symbol
  }

  const Context = Symbol('Context')
  export type Context = UUID & {
    readonly [Context]: unique symbol
  }

  const File = Symbol('File')
  export type File = UUID & {
    readonly [File]: unique symbol
  }

  const Event = Symbol('Event')
  export type Event = UUID & {
    readonly [Event]: unique symbol
  }

  const Note = Symbol('Note')
  export type Note = UUID & {
    readonly [Note]: unique symbol
  }

  const Link = Symbol('Link')
  export type Link = UUID & {
    readonly [Link]: unique symbol
  }

  const Highlight = Symbol('Highlight')
  export type Highlight = UUID & {
    readonly [Highlight]: unique symbol
  }

  const Glyph = Symbol('Glyph')
  export type Glyph = UUID & {
    readonly [Glyph]: unique symbol
  }

  const Group = Symbol('Group')
  export type Group = UUID & {
    readonly [Group]: unique symbol
  }

  const User = Symbol('User')
  export type User = UUID & {
    readonly [User]: unique symbol
  }

  const Request = Symbol('Request')
  export type Request = UUID & {
    readonly [Request]: unique symbol
  }
}

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
