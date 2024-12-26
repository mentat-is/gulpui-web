import { UUID } from "crypto";
import { between } from "@impactium/utils";
import { type Callback } from '@impactium/types'

interface ResponseBase<T = any> {
  status: number;
  timestamp: Date;
  req_id: UUID;
  data: T;
}

interface ResponseSuccess<T = any> extends ResponseBase<T> {};

interface ResponseError extends ResponseBase<{
  statusCode: number;
  message: string
}> {};


export class λ<T extends ResponseBase<any>> {
  status: number;
  req_id: UUID;
  timestamp: Date;
  data: T['data'];

  constructor(data?: T) {
    this.status = data?.status || 500;
    this.req_id = data?.req_id || '' as UUID;
    this.timestamp = data?.timestamp || new Date();
    this.data = data ? data.data : {
      message: 'internal_server_error',
      statusCode: 500,
    } as ResponseError['data'];
  }
  
  isError(): this is ResponseError {
    return between(this.status, 300, 500);
  }

  isSuccess(): this is λ<ResponseSuccess<T['data']>> {
    return between(this.status, 200, 299);
  }
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export interface RequestOptions {
  useNumericHost?: boolean;
  toast?: string | boolean;
  setLoading?: SetState<boolean>;
  query?: Record<string, string | number> | string | URLSearchParams;
  body?: Record<string, any> | RequestInit['body'];
};

type RawTrueOptions<T> = Omit<RequestInit, 'body'> & { raw: true } & RequestOptions;
type RawFalseOptions<T> = Omit<RequestInit, 'body'> & { raw?: false } & RequestOptions;
type AnyOptions<T> = Omit<RequestInit, 'body'> & { raw?: boolean } & RequestOptions;

export type Api = {
  /**
   * @param setLoading: SetState<boolean>
   * Ставит true в перед запросом и false после ответа
   * 
   * @param toast: keyof Locale | boolean
   * Используется при успешном запросе если string, или в случае boolean выводит сообщение об ошибке
  */
  <T>(path: string, options: RawTrueOptions<T>): Promise<λ<ResponseBase<T>>>;
  <T>(path: string, options?: RawFalseOptions<T>): Promise<T>;
  <T>(path: string, options?: AnyOptions<T>): Promise<λ<ResponseBase<T>> | T>;

  // Сигнатуры с callback
  <T>(path: string, options: RawTrueOptions<T>, callback: Callback<λ<ResponseBase<T>>>): Promise<λ<ResponseBase<T>>>;
  <T>(path: string, options?: RawFalseOptions<T>, callback?: Callback<T>): Promise<T>;
  <T>(path: string, options?: AnyOptions<T>, callback?: Callback<λ<ResponseBase<T>> | T>): Promise<λ<ResponseBase<T>> | T>;

  // Сигнатуры с callback как вторым аргументом
  <T>(path: string, callback: Callback<λ<ResponseBase<T>>>, options: RawTrueOptions<T>): Promise<λ<ResponseBase<T>>>;
  <T>(path: string, callback: Callback<T>, options?: RawFalseOptions<T>): Promise<T>;
  <T>(path: string, callback: Callback<λ<ResponseBase<T>> | T>, options?: AnyOptions<T>): Promise<λ<ResponseBase<T>> | T>;
};

type unresolwedArgument<T> = RequestInit & RequestOptions & { raw?: boolean} | Callback<T> | undefined;

export function parseApiOptions<T>(a: unresolwedArgument<T>, b: unresolwedArgument<T>, _path: string) {
  let options: RequestInit & RequestOptions & { raw?: boolean } = {};
  let callback: Callback<T> | undefined;

  if (typeof a === 'function') {
    callback = a;
    if (b && typeof b === 'object') {
      options = b;
    }
  } else if (typeof a === 'object') {
    options = a;
    if (b && typeof b === 'function') {
      callback = b;
    }
  }

  if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json'
    },
    options.body = JSON.stringify(options.body);
  }

  const path = _path.startsWith('/') ? _path : `/${_path}`;

  return {
    options,
    callback,
    query: options.query ? `?${new URLSearchParams(options.query.toString())}` : '',
    path,
    endpoint: localStorage.getItem('__server')
  };
}

export function soft<T>(value: T, func?: SetState<T>) {
  if (func) func((_: T) => value as T);
}


const api: Api = async function <T>(_path: string, arg2?: any, arg3?: any): Promise<λ<ResponseBase<T>> | T> {
  const { options, callback, query, path, endpoint } = parseApiOptions<T>(arg2, arg3, _path);

  soft(true, options.setLoading);

  const response = await fetch(`${endpoint}/api${path}${query}`, {
    credentials: 'include',
    method: 'GET',
    ...options,
    headers: options.headers,
  }).catch(() => undefined);

  const res = new λ(await response?.json());

  const isSuccess = res.isSuccess()

  const result = options.raw
    ? res
    : isSuccess
      ? res.data
      : null

  if (isSuccess && callback) {
    await callback(result);
  }

  soft(false, options.setLoading);

  return result;
}

globalThis.api = api