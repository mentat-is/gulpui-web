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
  ΞNote,
  GulpObject,
  ΞLink,
  λGroup,
  λRequest,
  ΞRequest,
} from '@/dto/Dataset'
import {
  λDoc,
  λEvent,
  λExtendedEvent,
  ΞDoc,
  ΞEvent,
  ΞxtendedEvent,
} from '@/dto/ChunkEvent.dto'
import React from 'react'
import { Gradients } from '@/ui/utils'
import { Acceptable } from '@/dto/ElasticGetMapping.dto'
import { UUID } from 'crypto'
import { λGlyph } from '@/dto/Dataset'
import { Logger } from '@/dto/Logger.class'
import { Engine } from './Engine.dto'
import { Session } from '@/dto/App.dto'
import { SetState } from './API'
import { λMapping } from '@/dto/MappingFileList.dto'
import { Glyph } from '@/ui/Glyph'
import { Icon } from '@impactium/icons'
import { Permissions } from '@/banners/Permissions.banner'
import { toast } from 'sonner'
import { OpenSearchQueryBuilder } from '@/banners/FilterFile.banner'
import { Pointers } from '@/components/Pointers'

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
    export type Summary = Object[]

    export type Type = 'ingestion' | 'enrichment' | 'external'

    export namespace SigmaSupport {
      export type Type = 'backends' | 'pipelines' | 'output_formats'

      export interface Object {
        name: string
        description: string
      }

      export type List = Object[]

      export type Summary = Record<SigmaSupport.Type, SigmaSupport.List>[]
    }

    export namespace CustomParameters {
      export type Type = 'int' | 'str' | 'bool' | 'dict' | 'list'

      export interface Object {
        name: string
        type: Type
        default_value: any
        desc: string
        required: boolean
        invalid?: boolean
      }

      export type List = Object[]
    }

    export type DependsOn = 'eml'

    export interface Object {
      display_name: string
      type: Type[]
      desc: string
      path: string
      data: {}
      filename: string
      sigma_support: SigmaSupport.Summary
      custom_parameters: CustomParameters.List
      depends_on: DependsOn[]
      tags: string[]
      version: string
    }
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
  export namespace RequestList {
    export type Summary = ΞRequest[]
  }
}

interface RefetchOptions {
  ids?: Arrayed<λFile['id']>
}

interface InfoProps {
  app: λApp
  setInfo: React.Dispatch<React.SetStateAction<λApp>>
  timeline: React.RefObject<HTMLDivElement>
}

export namespace Internal {
  export enum LocalStorageItemsList {
    TIMELINE_RENDER_ENGINE = 'settings.__engine',
    TIMELINE_RENDER_COLOR = 'settings.__color',
    TIMELINE_PRETTY_CROSSHAIR = 'settings.__crosshair',
    TIMELINE_FOCUS_FIELD = 'settings.__field',
    GENERAL_SERVER_VALUE = '__server',
    GENERAL_TOKEN_VALUE = '__token',
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
      field: 'weight',
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
        field,
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

      Internal.Settings.crosshair = Internal.Settings.default.crosshair

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
    public static activate = <T extends Pick<GulpObject<μ.File>, 'glyph_id'>>(
      defaultValue: Icon.Name,
    ): ((obj: T) => Icon.Name) => {
      return (obj: T) => {
        if (obj.glyph_id) {
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
}

export interface λUser {
  token: string
  id: μ.User
  time_expire: number
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

class User {
  instanse!: User
  storage!: λUser
  constructor(general: λUser) {
    if (this.instanse) {
      this.instanse.storage = general
      return this.instanse
    }

    this.storage = general
    this.instanse = this
    return
  }

  isAuthorized = () =>
    Boolean(this.storage.id.length > 0 && this.storage.time_expire > Date.now())
}

export class Info implements InfoProps {
  app: λApp
  setInfo: React.Dispatch<React.SetStateAction<λApp>>
  timeline: React.RefObject<HTMLDivElement>
  User: User

  constructor({ app, setInfo, timeline }: InfoProps) {
    this.app = app
    this.User = new User(app.general)
    this.setInfo = setInfo
    this.timeline = timeline
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
  }: RefetchOptions = {}) => {
    const files: λFile[] = Parser.array(_ids).map((id) => File.id(this.app, id))

    const operation = Operation.selected(this.app)
    const contexts = Context.selected(this.app)

    if (!operation || !contexts.length) {
      return
    }

    files.forEach(this.events_reset_in_file)

    await this.notes_reload()

    await this.links_reload()

    files.forEach((file) => {
      this.query_file(file)
    })
  }

  enrichment = (
    plugin: string,
    file: λFile,
    range: MinMax,
    custom_parameters: Record<string, any>,
  ) => {
    const body = Filter.query({
      string: Filter.base(file, range),
      filters: [],
    })

    return api<void>('/enrich_documents', {
      method: 'POST',
      query: {
        operation_id: file.operation_id,
        plugin,
        ws_id: this.app.general.ws_id,
      },
      body: {
        ...body,
        external_parameters: {
          plugin_params: {
            custom_parameters,
          },
        },
      },
    })
  }

  enrich_single_id = (
    plugin: string,
    event: λEvent,
    custom_parameters: Record<string, any>,
  ): Promise<Record<string, string>> | undefined => {
    return api('/enrich_single_id', {
      method: 'POST',
      query: {
        plugin,
        operation_id: event.operation_id,
        ws_id: this.app.general.ws_id,
        doc_id: event.id,
      },
      body: { custom_parameters },
      toast: 'Enrichment Error',
    })
  }

  query_file: {
    (file: λFile, preview: true): Promise<{
      total_hits: number,
      docs: λEvent[]
    }>
    (file: λFile, preview?: false): Promise<undefined>
  } = async (file, preview = false) => {
    const operation = Operation.selected(this.app)
    if (!operation) {
      return
    }

    const body = Filter.body(this.getQuery(file.id))

    if (preview) {
      body.q_options.preview_mode = preview
    }

    return (await api<any>(
      '/query_raw',
      {
        method: 'POST',
        query: {
          ws_id: this.app.general.ws_id,
          operation_id: operation.id,
        },
        body,
        raw: true,
      },
      (res) => {
        this.request_add({
          id: res.req_id,
          for: file.id,
          status: res.status,
          type: 'query',
          on: Date.now(),
        })
      },
    )).data
  }

  preview_file = (file: λFile) => this.query_file(file, true)

  request_add = (req: λRequest) => {
    if (this.app.general.requests.every(r => r.id !== req.id)) {
      this.request_replace(...this.app.general.requests, req)
    }
  }


  request_replace = (...req: λRequest[]) =>
    this.setInfoByKey(
      req.sort((a, b) => b.on - a.on),
      'general',
      'requests',
    )

  request_cancel = (req_id_to_cancel: λRequest['id']) => {
    const fileId = this.request_finish(req_id_to_cancel, 'canceled')
    toast(
      `Request ${req_id_to_cancel} for ${fileId ? File.id(this.app, fileId).name : 'some file'} has been canceled`,
    )

    api('/request_cancel', {
      method: 'PATCH',
      query: { req_id_to_cancel },
    })
  }

  request_cancel_for_file = (file: λFile['id']) =>
    Promise.all(
      this.app.general.requests
        .filter((r) => r.for === file && r.status === 'pending')
        .map((r) => this.request_cancel(r.id)),
    )

  request_finish = (
    id: λRequest['id'],
    status: λRequest['status'],
  ): λFile['id'] | null => {
    const exist = this.app.general.requests.find((r) => r.id === id)
    if (exist) {
      exist.status = status
      this.request_replace(...this.app.general.requests)
      return exist.for
    }
    return null
  }

  request_list = (): Promise<λRequest[]> =>
    api<GulpDataset.RequestList.Summary>('/request_list').then((reqs) =>
      reqs.map((r) => ({
        id: r.id,
        for: null,
        on: r.time_created,
        status: r.status,
        type: 'unknown',
      })),
    )

  filters_cache = (file: λFile | μ.File) => {
    Logger.log(
      `Caching has been requested for file ${File.id(this.app, file).name}`,
      Info.name,
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
    Logger.log(`Render requested`, Info.name)
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

  operations_select = (operation: λOperation) => {
    this.setInfoByKey(
      Operation.select(this.app, operation),
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

  selectAll = (filter: string) => {
    const operation = Operation.selected(this.app)

    if (!operation) {
      return
    }

    const contexts = Context.select(this.app, Operation.contexts(this.app))

    const files = File.select(
      this.app,
      Context.selected(contexts)
        .map((c) => Context.files(this.app, c))
        .flat()
        .filter((f) => f.name.toLowerCase().includes(filter)),
    )

    this.setInfo((i) => ({
      ...i,
      target: {
        ...i.target,
        contexts,
        files,
      },
    }))
  }
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
        .includes(this.app.timeline.target.file_id)
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
        mapping_file: settings.method,
        mapping_id: settings.mapping,
      },
      original_file_path: file.name,
    }
    if (frame) {
      payload.flt = {
        int_filter: [frame.min, frame.max],
      }
    }
    formData.append('payload', JSON.stringify(payload))

    const chunkSize = 1024 * size * 1024

    const query: Record<string, string | boolean> = {
      plugin: plugin.split('.')[0],
      operation_id: operation.id,
      context_name: context,
      ws_id: 'pashalko',
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

      this.request_add({
        for: null,
        id: response.req_id,
        status: response.status,
        type: 'ingest',
        on: response.timestamp.valueOf(),
      })

      if (preview) {
        return response.data as unknown as λEvent[]
      }

      // if uploadig failed - resume uploading
      if (response.isError() && response.data.continue_offset) return ingest(response.data.continue_offset, response.req_id)


      setProgress(end / file.size * 100)
      // if uploadig done - upload next chunk
      if (end < file.size) return ingest(end, response.req_id);
    }

    return ingest();
  }

  // ⚠️ UNTOUCHABLE
  file_set_render_engine = (ids: λFile['id'][], engine: Engine.List) =>
    this.setInfoByKey(
      this.app.target.files.map((file) => ({
        ...file,
        settings: {
          ...file.settings,
          engine: ids.includes(file.id) ? engine : file.settings.engine,
        },
      })),
      'target',
      'files',
    )

  // ⚠️ UNTOUCHABLE
  file_set_settings = (ids: λFile['id'][], settings: λFile['settings']) =>
    this.setInfoByKey(
      this.app.target.files.map((file) =>
        ids.includes(file.id)
          ? { ...file, settings: { ...file.settings, ...settings } }
          : file,
      ),
      'target',
      'files',
    )

  file_set_total = (id: λFile['id'], total = 0) =>
    this.setInfoByKey(
      this.app.target.files.map(file => file.id === id ? { ...file, total } : file),
      'target', 'files'
    )

  events_add = (newEvents: λEvent[]) => {
    const events = Event.add(this.app, newEvents)

    const ids = new Set<`${λEvent['id']}|${λFile['id']}`>()

    newEvents.forEach((e) => {
      ids.add(`${e.id}|${e.file_id}`)
    })

    let hasToSync = false

    Array.from(ids).forEach((unit) => {
      const [eid, fid] = unit.split('|')

      const exist = this.app.target.files.find((file) => file.id === fid)
      if (!exist) {
        const event = newEvents.find((e) => e.id === eid)
        if (!event) {
          Logger.error('WTF?', 'AppSocket', {
            toast: true,
          })

          return
        }

        hasToSync = true

        this.app.target.files.push({
          id: event.file_id,
          name: 'Unknown file',
          color: 'thermal',
          code: {
            min: 0,
            max: 1,
          },
          context_id: event.context_id,
          description: '?',
          glyph_id: Default.Icon.FILE as λGlyph['id'],
          granted_user_group_ids: [],
          granted_user_ids: [],
          type: 'file',
          operation_id: event.operation_id,
          time_created: 0,
          time_updated: 0,
          settings: Internal.Settings.all(),
          timestamp: {
            min: 0,
            max: new Date(Date.now()).getTime(),
          },
          nanotimestamp: {
            min: 0n,
            max: 0n,
          },
          total: -1,
          selected: true,
        })
      }
    })

    this.app.target.events = events

    if (hasToSync) {
      this.sync()
    }

    this.setInfo(this.app)
  }

  events_reset_in_file = (files: Arrayed<λFile>) =>
    this.setInfoByKey(Event.delete(this.app, files), 'target', 'events')

  setDialogSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'dialogSize')
  }

  setFooterSize = (number: number) => {
    this.setInfoByKey(number, 'timeline', 'footerSize')
  }

  // ⚠️ UNTOUCHABLE
  notes_reload = () =>
    api<ΞNote[]>(
      '/note_list',
      {
        method: 'POST',
        body: {
          source_ids: File.selected(this.app).map((f) => f.id),
        },
      },
      (notes) => this.setInfoByKey(Note.normalize(notes), 'target', 'notes'),
    )

  // ⚠️ UNTOUCHABLE
  note_delete = (note: λNote) =>
    api(
      '/note_delete',
      {
        method: 'DELETE',
        query: {
          object_id: note.id,
          ws_id: this.app.general.ws_id,
        },
      },
      this.notes_reload,
    )

  // ⚠️ UNTOUCHABLE
  links_reload = async () => {
    return api<ΞLink[]>(
      '/link_list',
      {
        method: 'POST',
        body: {
          source_ids: File.selected(this.app).map((f) => f.id),
        },
      },
      async (raw) => {
        const links: λLink[] = []

        await Promise.all(
          raw.map(async (link) => {
            const events = await Promise.all(
              link.doc_ids.map((id) =>
                this.query_single_id(id, link.operation_id),
              ),
            )

            const docs: λDoc[] = []

            events.forEach((event) => {
              if (event) {
                const doc = Event.toDoc(event.normalized)

                docs.push(doc)
              }
            })

            links.push(Link.normalize(link, docs))
          }),
        )

        this.setInfoByKey(links, 'target', 'links')
      },
    )
  }

  link_delete = (link: λLink) =>
    api(
      '/link_delete',
      {
        method: 'DELETE',
        query: {
          object_id: link.id,
          ws_id: this.app.general.ws_id,
        },
      },
      this.links_reload,
    )

  links_connect = async (link: λLink, event: λEvent) => {
    const links = await api<λLink>('/link_update', {
      method: 'PATCH',
      query: {
        object_id: link.id,
        ws_id: this.app.general.ws_id,
      },
      body: {
        doc_ids: [...link.doc_ids, event.id],
      },
    })

    await this.links_reload()

    return links
  }

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

    Logger.log(`Glyphs has been syncronized with gulp-backend`, Info.name)
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
        sources.map((source) => {
          return {
            id: source.id,
            name: source.name,
            total: source.doc_count,
            code: {
              min: source['min_event.code'],
              max: source['max_event.code'],
            },
            timestamp: {
              min: source['min_gulp.timestamp'] / 1_000_000,
              max: Math.max(
                source['max_gulp.timestamp'] / 1_000_000,
                source['min_gulp.timestamp'] / 1_000_000 + 1,
              ),
            },
            nanotimestamp: {
              min: BigInt(source['min_gulp.timestamp']),
              max: BigInt(source['max_gulp.timestamp']),
            },
          }
        }),
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
            selected: Context.id(this.app, rawContext.id)?.selected ?? true,
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
                selected: File.id(this.app, rawFile.id)?.selected ?? true,
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

    if (operations.length === 1) {
      operations[0].selected = true
    }

    Logger.log(
      `${operations.length} operations has been added to application data`,
      this.sync.name,
    )
    Logger.log(operations.map((c) => c.id))
    Logger.log(
      `${contexts.length} contexts has been added to application data`,
      this.sync.name,
    )
    Logger.log(contexts.map((c) => c.id))
    Logger.log(
      `${files.length} files has been added to application data`,
      this.sync.name,
    )
    Logger.log(files.map((f) => f.id))

    this.app.target.operations = operations
    this.app.target.contexts = contexts
    this.app.target.files = files
    this.setInfo(this.app)
  }

  query_single_id = (doc_id: λEvent['id'], operation_id: λOperation['id']) => {
    return api<ΞxtendedEvent>('/query_single_id', {
      method: 'POST',
      query: {
        doc_id,
        operation_id,
      },
    }).then((raw) => {
      if (!raw) {
        return
      }

      return {
        normalized: Event.normalizeFromDetailed(raw),
        raw,
      }
    })
  }

  // ⚠️ UNTOUCHABLE
  plugin_list = async (): Promise<GulpDataset.PluginList.Summary> => {
    const plugins = this.app.target.plugins
    if (plugins.length) {
      return Internal.Transformator.toAsync(plugins)
    }

    Logger.warn('No plugins found in application data', 'plugin_list')
    Logger.log('Fetching plugins...', 'plugin_list')

    const list = await api<GulpDataset.PluginList.Summary>('/plugin_list').then(
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

  setTimelineFrame = (frame: MinMax) =>
    this.setInfoByKey(frame, 'timeline', 'frame')

  login = (obj: λUser) => {
    Internal.Settings.token = obj.token

    this.setInfo((info) => ({
      ...info,
      general: {
        ...info.general,
        ...obj,
      },
    }))
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
      const events = File.events(this.app, target.file_id)
      const index = events.findIndex((event) => event.id === target.id) + event
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
    uri: string,
    params: Record<string, string | number | object | null | undefined>,
  ) => {
    return api('/query_raw', {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
      },
      body: {
        q: {
          query: {
            query_string: {
              query: '*',
            },
          },
        },
        q_options: {
          plugin,
          uri,
          external_parameters: {
            custom_parameters: params,
          },
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
      const base: λQuery = {
        string: Filter.base(File.id(this.app, id)),
        filters: [],
      }

      this.setQuery(id, base)

      return base
    }

    return query
  }

  filters_remove = (file: λFile | λFile['id']) =>
    this.setInfoByKey(
      { ...this.app.target.filters, [Parser.useUUID(file)]: [] },
      'target',
      'filters',
    )

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
    this.setTimelineScale(this.app.timeline.scale + 0.0001)
  }

  files_reorder_lower = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    if (index === files.length - 1) return

    const file = files[index]
    files[index] = files[index + 1]
    files[index + 1] = file

    this.setInfoByKey(files, 'target', 'files')
    this.setTimelineScale(this.app.timeline.scale + 0.0001)
  }

  query_sigma = (body: Record<string, any>) => {
    return api('/query_sigma', {
      method: 'POST',
      query: {
        ws_id: this.app.general.ws_id,
      },
      body,
      toast: 'Sigma rule has been successfully applied',
    })
  }

  sigma = {
    set: async (
      files: Arrayed<λFile>,
      plugin: string,
      sigma: GulpDataset.SigmaFile,
      notes: boolean,
    ) => {
      files = Parser.array(files)

      const newSigma: typeof this.app.target.sigma = this.app.target.sigma

      files.forEach((file) => (newSigma[file.id] = sigma))

      this.setInfoByKey(newSigma, 'target', 'sigma')

      this.events_reset_in_file(files)

      return Promise.all(
        files.map((file) => {
          return this.query_sigma({
            sigmas: [sigma.content],
            q_options: {
              sigma_parameters: {
                plugin,
              },
              note_parameters: {
                create_notes: notes,
              },
            },
            flt: {
              source_ids: [file.id],
            },
          })
        }),
      )
    },
    remove: (file: λFile | λFile['id']) => {
      const id = Parser.useUUID(file) as λFile['id']

      delete this.app.target.sigma[id]
      this.setInfoByKey(this.app.target.sigma, 'target', 'sigma')
      this.refetch({ ids: typeof file === 'string' ? file : file.id })
    },
  }

  toggle_notes_visibility = () =>
    this.setInfoByKey(
      !this.app.timeline.hidden_notes,
      'timeline',
      'hidden_notes',
    )

  files_repin = (id: λFile['id']) => {
    const files = this.app.target.files
    const index = files.findIndex((file) => file.id === id)

    files[index].pinned = !files[index].pinned

    this.setInfoByKey(files, 'target', 'files')
    this.setTimelineScale(this.app.timeline.scale + 0.0001)
  }

  get width(): number {
    return (
      this.app.timeline.scale *
      (document.getElementById('canvas')?.clientWidth || 1)
    )
  }

  getCurrentSessionOptions = (): Session => {
    return {
      render: [],
      scroll: {
        x: 0,
        y: 0,
      },
    }
  }

  getSessions = (): Promise<λApp['general']['sessions']> => {
    return {} as Promise<λApp['general']['sessions']>
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
  public static icon = Internal.IconExtractor.activate<λOperation>(
    Default.Icon.OPERATION,
  )

  public static reload = (newOperations: λOperation[], app: λApp) =>
    Operation.select(newOperations, Operation.selected(app))

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
    operation: λOperation | undefined,
  ): λOperation[] =>
    Parser.use(use, 'operations').map((o) =>
      o.id === operation?.id ? Operation._select(o) : Operation._unselect(o),
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
  public static icon = Internal.IconExtractor.activate<λContext>(
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
    setProgress: (num: number) => void;
    preview?: boolean;
  }

  export interface Settings {
    plugin?: string
    method?: string
    mapping?: string
  }
}

export class File {
  // @ts-ignore
  public static icon = Internal.IconExtractor.activate<λFile>(Default.Icon.FILE)

  // ⚠️ UNTOUCHABLE
  public static selected = (app: λApp): λFile[] =>
    File.pins(app.target.files.filter((s) => s.selected)).filter(
      (s) =>
        s.name.toLowerCase().includes(app.timeline.filter.toLowerCase()) ||
        Context.id(app, s.context_id)
          .name.toLowerCase()
          .includes(app.timeline.filter.toLowerCase()),
    )

  public static select = (app: λApp, selected: λFile[]): λFile[] =>
    app.target.files.map((f) =>
      selected.find((s) => s.id === f.id) ? File._select(f) : f,
    )

  public static pins = (use: λApp | λFile[]) =>
    Parser.use(use, 'files').sort((a, b) =>
      a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1,
    )

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

  public static events = (app: λApp, file: λFile | μ.File): λEvent[] =>
    Event.get(app, Parser.useUUID(file) as μ.File)

  public static notes = (app: λApp, files: Arrayed<λFile>): λNote[] =>
    Parser.array(files)
      .map((s) => Note.findByFile(app, s))
      .flat()

  public static index = (app: λApp, file: λFile | μ.File) =>
    File.selected(app).findIndex((s) => s.id === Parser.useUUID(file))

  public static getHeight = (
    app: λApp,
    file: λFile | μ.File,
    scrollY: number,
  ) => 48 * this.index(app, file) - scrollY + 24

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
}

export interface λQuery {
  string: string
  filters: λFilter[]
}

export class Filter {
  static query = ({ filters, string }: λQuery) => {
    const query: Record<string, any> = structuredClone(
      OpenSearchQueryBuilder.INITIAL,
    )

    if (string.trim()) {
      query.bool.must.push({
        query_string: {
          query: string,
        },
      })
    }

    filters.forEach(({ type, field, value, operator }) => {
      if (!field || !value) return

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
          conditionObj = { wildcard: { [field]: value } }
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

  public static base = (file: λFile, range?: MinMax) =>
    `(gulp.operation_id: ${Filter.quotes(file.operation_id)} AND gulp.context_id: "${Filter.quotes(file.context_id)}" AND gulp.source_id: "${Filter.quotes(file.id)}" AND gulp.timestamp: [${range?.min ?? file.nanotimestamp.min} TO ${range?.max ?? file.nanotimestamp.max}])`

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
  public static delete = (app: λApp, files: Arrayed<λFile>) => {
    files = Parser.array(files)

    files.forEach((file) => {
      app.target.events.delete(file.id)
      app.target.events.set(file.id, [])
    })

    return app.target.events
  }

  public static id = (app: λApp, event: λEvent['id']): λEvent =>
    Array.from(app.target.events.values())
      .flat()
      .find((e) => e.id === event) as λEvent

  public static get = (app: λApp, id: μ.File): λEvent[] =>
    app.target.events.get(id) ||
    (app.target.events.set(id, []).get(id) as λEvent[])

  public static selected = (app: λApp): λEvent[] =>
    File.selected(app)
      .map((s) => Event.get(app, s.id))
      .flat()

  public static add = (app: λApp, events: λEvent[]) => {
    events.forEach((e) => Event.get(app, e.file_id).push(e))

    Logger.log(`${events.length} events has been processed`)

    return app.target.events
  }

  public static toDoc = ({
    id,
    file_id,
    context_id,
    nanotimestamp,
    operation_id,
    timestamp,
  }: λEvent): λDoc => ({
    id,
    file_id,
    context_id,
    nanotimestamp,
    operation_id,
    timestamp,
  })

  public static normalize = (raw: ΞDoc[]): λDoc[] =>
    raw.map((r) => ({
      id: r._id,
      timestamp: Internal.Transformator.toTimestamp(r['@timestamp']),
      nanotimestamp: Internal.Transformator.toNanos(r['@timestamp']),
      file_id: r['gulp.source_id'],
      context_id: r['gulp.context_id'],
      operation_id: r['gulp.operation_id'],
    }))

  public static normalizeFromDetailed = (
    raw: ΞxtendedEvent,
  ): λExtendedEvent => {
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
          path: raw['log.file.path'],
        },
      },
      agent: {
        type: raw['agent.type'],
      },
      event: {
        original: raw['event.original'],
        sequence: raw['event.sequence'],
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
        },
      },
      winlog: {
        record_id: raw['winlog.record_id'],
        channel: raw['winlog.channel'],
        computer_name: raw['winlog.computer_name'],
      },
    } satisfies λExtendedEvent
  }

  public static formatForServer = (event: λEvent) => {
    return [
      {
        '@timestamp': Internal.Transformator.toISO(event.nanotimestamp),
        _id: event.id,
        'gulp.context_id': event.context_id,
        'gulp.operation_id': event.operation_id,
        'gulp.source_id': event.file_id,
        'gulp.timestamp': Math.round(
          Internal.Transformator.toTimestamp(event.nanotimestamp),
        ),
      },
    ]
  }

  public static parse = (rawEvents: ΞEvent[]): λEvent[] =>
    rawEvents.map(
      (rawEvent) =>
        ({
          id: rawEvent._id,
          operation_id: rawEvent['gulp.operation_id'],
          context_id: rawEvent['gulp.context_id'],
          file_id: rawEvent['gulp.source_id'],
          timestamp: Math.round(rawEvent['gulp.timestamp'] / 1_000_000),
          nanotimestamp: BigInt(rawEvent['gulp.timestamp']),
          code: rawEvent['event.code'],
          weight: rawEvent['gulp.event_code'],
          duration: rawEvent['event.duration'],
        }) satisfies λEvent,
    )

  public static fields = (): string[] => [
    '_id',
    'gulp.operation_id',
    'gulp.context_id',
    'gulp.source_id',
    'gulp.timestamp',
    '@timestamp',
    'event.code',
    'gulp.event_code',
    'event.duration',
  ]

  public static ids = (app: λApp, ids: λEvent['id'][]) =>
    Array.from(app.target.events.values())
      .flat()
      .filter((e) => ids.includes(e.id))

  public static notes = (app: λApp, event: λEvent) =>
    app.target.notes.filter((n) => n.docs.some((doc) => doc.id === event.id))
}

export class Note {
  public static icon = Internal.IconExtractor.activate<λNote>(Default.Icon.NOTE)

  public static normalize = (notes: ΞNote[]) =>
    notes.map(
      (n) =>
        ({
          ...n,
          file_id: n.source_id,
          description: n.text,
          docs: Event.normalize(n.docs),
        }) satisfies λNote,
    )

  public static id = (app: λApp, id: λNote['id']) =>
    app.target.notes.find((n) => n.id === id) as λNote

  public static events = (app: λApp, note: λNote): λEvent[] =>
    Event.ids(
      app,
      note.docs.map((d) => d.id),
    )

  public static findByFile = (app: λApp, file: λFile) =>
    app.target.notes.filter((n) => n.file_id === file.id)

  public static timestamp = (app: λApp, note: λNote): number => {
    let sum = 0
    note.docs.forEach((d) => (sum += d.timestamp))
    return sum / note.docs.length || 1
  }
}

export class Link {
  public static icon = Internal.IconExtractor.activate<λLink>(Default.Icon.LINK)

  public static selected = (app: λApp) =>
    app.target.links.filter((link) =>
      link.doc_ids.every(
        (id) => File.id(app, Event.id(app, id).file_id).selected,
      ),
    )

  public static normalize = (link: ΞLink, docs: λDoc[]): λLink =>
    ({
      ...link,
      docs,
    }) satisfies λLink

  public static timestamp = (link: λLink): number => {
    let sum = 0

    link.docs?.forEach((d) => (sum += d.timestamp))
    return sum / link.docs?.length || 1
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
    plugin: λMapping.Plugin['name'],
  ): λMapping.Method['name'][] =>
    app.target.mappings
      .find((p) => p.name === plugin)
      ?.methods.map((m) => m.name) || []

  public static mappings = (
    app: λApp,
    plugin: λMapping.Plugin['name'],
    method: λMapping.Method['name'],
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
    typeof unknown === 'string' ? unknown : unknown.id

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

export const MinMaxBase = {
  min: 0,
  max: 0,
}
