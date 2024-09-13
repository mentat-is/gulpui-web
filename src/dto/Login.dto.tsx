import { ResponseBase } from "./ResponseBase.dto";

export type Login = ResponseBase<{
  id: number,
  user_id: number,
  token: string,
  time_expire: number,
  data: null
}>;
