export interface ResponseBase<T = any> {
  status: 'success' | 'error';
  timestamp_msec: number;
  req_id: string;
  data: T;
}

export interface ResponseSuccess<T = any> extends ResponseBase<T> {
  status: 'success';
}

export interface ResponseError extends ResponseBase<{
  exception: {
    name: string;
    msg: string;
    trace: string;
  }
}> {
  status: 'error';
}
