import { ResponseBase, ResponseError, ResponseSuccess } from "./ResponseBase.dto";

export class λ<T extends ResponseBase<T['data']>> {
  status: 'success' | 'error';
  timestamp_msec: number;
  req_id: string;
  data: T['data'];

  constructor(data?: T) {
    this.status = data?.status || 'error';
    this.timestamp_msec = data?.timestamp_msec || Date.now();
    this.req_id = data?.req_id || '0';
    this.data = data?.data || {
      exception: {
        msg: 'Server not found'
      }
    };
  }

  isError(): this is λ<ResponseError> {
    return this.status === 'error';
  }

  isSuccess(): this is λ<ResponseSuccess<T['data']>> {
    return this.status === 'success';
  }
}
