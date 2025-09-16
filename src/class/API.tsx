import { capitalize } from '@impactium/utils'
import { type Callback } from '@impactium/types'
import { toast } from 'sonner'
import { Logger } from '@/dto/Logger.class'
import { Icon } from '@impactium/icons'
import { Auth } from '@/page/Auth.page'
import { Request } from '@/entities/Request'
import { Internal } from '@/entities/addon/Internal'

interface ResponseBase<T = any> {
  status: 'success' | 'error' | 'pending'
  timestamp: Date
  req_id: Request.Id
  data: T
}

type ResponseSuccess<T = any> = ResponseBase<T>

type ResponseError = ResponseBase<{
  statusCode: number
  message: string
}>

export class ResponseHandler<T extends ResponseBase<any>> {
  status: 'success' | 'error' | 'pending'
  req_id: Request.Id;
  timestamp: Date
  data: T['data']

  constructor(data: T = {} as T) {
    this.status = data.status ?? 'error';
    this.req_id = data.req_id ?? '' as Request.Id;
    this.timestamp = data.timestamp ?? Date.now();
    this.data = data.data ?? { message: 'internal_server_error', statusCode: 500 };
  }

  isError = (): this is ResponseError => this.status === 'error'
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export interface RequestOptions {
  toast?: string | boolean
  setLoading?: SetState<boolean>
  query?: Record<string, any>;
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
  <T>(path: string, options: RawTrueOptions): Promise<ResponseHandler<ResponseBase<T>>>
  <T>(path: string, options?: RawFalseOptions): Promise<T>
  <T>(path: string, options?: AnyOptions): Promise<ResponseHandler<ResponseBase<T>> | T>

  <T>(
    path: string,
    options: RawTrueOptions,
    callback: Callback<ResponseHandler<ResponseBase<T>>>,
  ): Promise<ResponseHandler<ResponseBase<T>>>
  <T>(
    path: string,
    options?: RawFalseOptions,
    callback?: Callback<T>,
  ): Promise<T>
  <T>(
    path: string,
    options?: AnyOptions,
    callback?: Callback<ResponseHandler<ResponseBase<T>> | T>,
  ): Promise<ResponseHandler<ResponseBase<T>> | T>

  <T>(
    path: string,
    callback: Callback<ResponseHandler<ResponseBase<T>>>,
    options: RawTrueOptions,
  ): Promise<ResponseHandler<ResponseBase<T>>>
  <T>(
    path: string,
    callback: Callback<T>,
    options?: RawFalseOptions,
  ): Promise<T>
  <T>(
    path: string,
    callback: Callback<ResponseHandler<ResponseBase<T>> | T>,
    options?: AnyOptions,
  ): Promise<ResponseHandler<ResponseBase<T>> | T>
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
  let callback: Callback<T> | undefined

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
    path
  }
}

export function soft<T>(value: T, func?: Callback<T>) {
  if (!func) {
    return;
  }

  return func(value);
}

const api: Api = async function <T>(
  _path: string,
  arg2?: any,
  arg3?: any,
): Promise<ResponseHandler<ResponseBase<T>> | T> {
  const { options, callback, query, path } = parseApiOptions<T>(
    arg2,
    arg3,
    _path,
  )

  soft(() => true, options.setLoading)

  const response = await fetch(
    `${Internal.Settings.server}${path}${query ? `?${query}` : ''}`,
    {
      ...options,
    },
  ).catch(() => { });

  const res = new ResponseHandler(await response?.json())

  const isSuccess = res.status === 'success' || res.status === 'pending';

  const error = res.data?.__error ?? {};

  const result = options.raw ? res : isSuccess ? res.data : null

  // [ OK ] Status
  // [ OK ] Data
  if (isSuccess) {
    if (typeof options.toast === 'string') {
      toast(options.toast)
    }
    soft(result, callback);

    // [FAIL] Status
    // [ OK ] Data
  } else if (error.name === 'MissingPermission') {
    Internal.Settings.token = ''
    Logger.warn('Session has been expired', api, {
      icon: <Icon name='Warning' />,
      richColors: true
    });
    // @ts-ignore
    window.spawnBanner(<Auth.Banner />);
    // [FAIL] Status
    // [ ?? ] Data
  } else if ((options.toast !== false)) {
    toast.error(toSeparatedCase(error.name), {
      description: capitalize(error.msg) ?? 'Check console for further information',
    });
  }

  soft(() => false, options.setLoading)

  return result;
}

const toSeparatedCase = (str: string): string => str
  ?.replace(/([a-z])([A-Z])/g, '$1 $2')
  .split(/[\s_]+/)
  .map((word) => word
    .charAt(0)
    .toUpperCase() + word.slice(1))
  .join(' ') ?? 'Unknown Error';

globalThis.api = api
