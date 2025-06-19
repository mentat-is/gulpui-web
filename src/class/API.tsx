import { capitalize } from '@impactium/utils'
import { type Callback } from '@impactium/types'
import { toast } from 'sonner'
import { Internal } from './Info'
import { Logger } from '@/dto/Logger.class'
import { λRequest } from '@/dto/Dataset'

interface ResponseBase<T = any> {
  status: 'success' | 'error' | 'pending'
  timestamp: Date
  req_id: λRequest['id']
  data: T
}

type ResponseSuccess<T = any> = ResponseBase<T>

type ResponseError = ResponseBase<{
  statusCode: number
  message: string
}>

export class λ<T extends ResponseBase<any>> {
  status: 'success' | 'error' | 'pending'
  req_id: λRequest['id']
  timestamp: Date
  data: T['data']

  constructor(data?: T) {
    this.status = data?.status || 'error'
    this.req_id = data?.req_id || ('' as λRequest['id'])
    this.timestamp = data?.timestamp || new Date()
    this.data = data
      ? data.data
      : ({
        message: 'internal_server_error',
        statusCode: 500,
      } as ResponseError['data'])
  }

  isError = (): this is ResponseError => this.status === 'error'

  isSuccess = (): this is λ<ResponseSuccess<T['data']>> =>
    this.status === 'success' || this.status === 'pending'
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export interface RequestOptions {
  useNumericHost?: boolean
  toast?: string | boolean
  setLoading?: SetState<boolean>
  query?: Record<string, string | number | boolean | null> | string | URLSearchParams
  body?: Record<string, any> | RequestInit['body']
  deassign?: boolean
}

type RawTrueOptions = Omit<RequestInit, 'body'> & {
  raw: true
} & RequestOptions
type RawFalseOptions = Omit<RequestInit, 'body'> & {
  raw?: false
} & RequestOptions
type AnyOptions = Omit<RequestInit, 'body'> & {
  raw?: boolean
} & RequestOptions

export type Api = {
  /**
   * @param setLoading: SetState<boolean>
   *
   * @param toast: keyof Locale | boolean
   */
  <T>(path: string, options: RawTrueOptions): Promise<λ<ResponseBase<T>>>
  <T>(path: string, options?: RawFalseOptions): Promise<T>
  <T>(path: string, options?: AnyOptions): Promise<λ<ResponseBase<T>> | T>

  <T>(
    path: string,
    options: RawTrueOptions,
    callback: Callback<λ<ResponseBase<T>>>,
  ): Promise<λ<ResponseBase<T>>>
  <T>(
    path: string,
    options?: RawFalseOptions,
    callback?: Callback<T>,
  ): Promise<T>
  <T>(
    path: string,
    options?: AnyOptions,
    callback?: Callback<λ<ResponseBase<T>> | T>,
  ): Promise<λ<ResponseBase<T>> | T>

  <T>(
    path: string,
    callback: Callback<λ<ResponseBase<T>>>,
    options: RawTrueOptions,
  ): Promise<λ<ResponseBase<T>>>
  <T>(
    path: string,
    callback: Callback<T>,
    options?: RawFalseOptions,
  ): Promise<T>
  <T>(
    path: string,
    callback: Callback<λ<ResponseBase<T>> | T>,
    options?: AnyOptions,
  ): Promise<λ<ResponseBase<T>> | T>
}

type unresolwedArgument<T> =
  | (RequestInit & RequestOptions & { raw?: boolean })
  | Callback<T>
  | undefined

export function parseApiOptions<T>(
  a: unresolwedArgument<T>,
  b: unresolwedArgument<T>,
  _path: string,
) {
  const options: RequestInit & RequestOptions & { raw?: boolean } = {}
  let callback: Callback<T> | Callback<Promise<T>> | undefined

  if (typeof a === 'function') {
    callback = a
    if (b && typeof b === 'object') {
      Object.assign(options, b)
    }
  } else if (typeof a === 'object') {
    Object.assign(options, a)
    if (b && typeof b === 'function') {
      callback = b
    }
  }

  const headers: Record<string, string> = {
    token: Internal.Settings.token,
  }

  if (!options.deassign) {
    headers['Content-Type'] = 'application/json'
  }

  options.headers = Object.assign(options.headers || {}, headers)

  if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    )
  }

  const path = _path.startsWith('/') ? _path : `/${_path}`

  const toStringObject = (obj: typeof options.query) =>
    obj
      ? Object.fromEntries(
        Object.entries(options.query || {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      )
      : ''

  const query = new URLSearchParams(toStringObject(options.query))

  return {
    options,
    callback,
    query,
    path,
    endpoint: Internal.Settings.server,
  }
}

export function soft<T>(value: T, func?: SetState<T>) {
  if (func) func((_: T) => value as T)
}

const api: Api = async function <T>(
  _path: string,
  arg2?: any,
  arg3?: any,
): Promise<λ<ResponseBase<T>> | T> {
  const { options, callback, query, path, endpoint } = parseApiOptions<T>(
    arg2,
    arg3,
    _path,
  )

  soft(true, options.setLoading)

  const response = await fetch(
    `${endpoint}${path}${query ? `?${query}` : ''}`,
    {
      ...options,
    },
  ).catch(() => { });

  const res = new λ(await response?.json())

  const isSuccess = res.isSuccess()

  const result = options.raw ? res : isSuccess ? res.data : null

  if (isSuccess) {
    if (typeof options.toast === 'string') {
      toast(options.toast)
    }
    if (callback) {
      await callback(result)
    }
  } else if (options.toast !== false) {
    toast.error(
      toSeparatedCase(res.data?.__error?.name),
      {
        description: res.data?.__error?.msg
          ? capitalize(res.data.__error.msg)
          : 'Check console for further information',
      },
    )
  }
  if (res.data?.__error?.name === 'MissingPermission') {
    const message = 'Session expired, reloading window'
    Logger.warn(message, 'API')
    Internal.Settings.token = ''
    toast.error(message, {
      richColors: true,
    })
  }

  soft(false, options.setLoading)

  return result
}

const toSeparatedCase = (str: string): string => {
  if (!str) return 'Unknown Error'

  const withSpaces = str.replace(/([a-z])([A-Z])/g, '$1 $2')

  const words = withSpaces.split(/[\s_]+/)

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

globalThis.api = api
