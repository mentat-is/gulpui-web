import { type Callback } from '@impactium/types'
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

interface ResponseErrorBody {
  request: {
    path: string,
    method: string,
    query: string,
    headers: {
      [key: string]: string
    },
    body: string
  },
  __error: {
    name: string;
    msg: string;
    trace: string;
  }
}

type ResponseError = ResponseBase<ResponseErrorBody>

export class ResponseHandler<T extends ResponseBase<any>> {
  status: 'success' | 'error' | 'pending'
  req_id: Request.Id;
  timestamp: Date
  data: T['data']

  constructor(data: T) {
    this.status = data.status ?? 'error';
    this.req_id = data.req_id ?? '' as Request.Id;
    this.timestamp = data.timestamp ?? Date.now();
    this.data = data.data ?? { message: 'internal_server_error', statusCode: 500 };
  }
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>


type Toast<T> = ((data: ResponseBase<T>) => string | number | undefined) | null | undefined;

export interface RequestOptions<T> {
  toast?: {
    onSuccess?: Toast<T>;
    onError?: Toast<ResponseErrorBody>;
  }
  setLoading?: SetState<boolean>
  query?: Record<string, any>;
  body?: Record<string, any> | RequestInit['body']
  deassign?: boolean
}

type RawTrueOptions<T> = Omit<RequestInit, 'body'> & {
  raw: true
} & RequestOptions<T>
type RawFalseOptions<T> = Omit<RequestInit, 'body'> & {
  raw?: false
} & RequestOptions<T>
type AnyOptions<T> = Omit<RequestInit, 'body'> & {
  raw?: boolean
} & RequestOptions<T>

export type Api = {
  /**
   * @param setLoading: SetState<boolean>
   *
   * @param toast: keyof Locale | boolean
   */
  <T>(path: string, options: RawTrueOptions<T>): Promise<ResponseHandler<ResponseBase<T>>>
  <T>(path: string, options?: RawFalseOptions<T>): Promise<T>
  <T>(path: string, options?: AnyOptions<T>): Promise<ResponseHandler<ResponseBase<T>> | T>

  <T>(
    path: string,
    options: RawTrueOptions<T>,
    callback: Callback<ResponseHandler<ResponseBase<T>>>,
  ): Promise<ResponseHandler<ResponseBase<T>>>
  <T>(
    path: string,
    options?: RawFalseOptions<T>,
    callback?: Callback<T>,
  ): Promise<T>
  <T>(
    path: string,
    options?: AnyOptions<T>,
    callback?: Callback<ResponseHandler<ResponseBase<T>> | T>,
  ): Promise<ResponseHandler<ResponseBase<T>> | T>

  <T>(
    path: string,
    callback: Callback<ResponseHandler<ResponseBase<T>>>,
    options: RawTrueOptions<T>,
  ): Promise<ResponseHandler<ResponseBase<T>>>
  <T>(
    path: string,
    callback: Callback<T>,
    options?: RawFalseOptions<T>,
  ): Promise<T>
  <T>(
    path: string,
    callback: Callback<ResponseHandler<ResponseBase<T>> | T>,
    options?: AnyOptions<T>,
  ): Promise<ResponseHandler<ResponseBase<T>> | T>
}

type unresolwedArgument<T> =
  | (RequestInit & RequestOptions<T> & { raw?: boolean })
  | Callback<T>
  | undefined

export function parseApiOptions<T>(
  a: unresolwedArgument<T>,
  b: unresolwedArgument<T>,
  _path: string,
) {
  const options: RequestInit & RequestOptions<T> & { raw?: boolean } = {}
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

  const res = new ResponseHandler((await response?.json()) as ResponseBase<T>)

  const isSuccess = res.status === 'success' || res.status === 'pending';

  if (isSuccess) {
    if (options.toast?.onSuccess) {
      options.toast?.onSuccess(res);
    }
    // @ts-ignore
    soft(options.raw ? res : res.data, callback);
  } else if ((res.data as ResponseErrorBody).__error.name === 'MissingPermission') {
    Internal.Settings.token = ''
    Logger.warn('Session has been expired', api, {
      icon: <Icon name='Warning' />,
      richColors: true
    });
    // @ts-ignore
    window.spawnBanner(<Auth.Banner />);
  } else if (options.toast?.onError) {
    options.toast?.onError(res as ResponseError)
  }

  soft(() => false, options.setLoading)

  return options.raw ? res : res.data;
}

globalThis.api = api
