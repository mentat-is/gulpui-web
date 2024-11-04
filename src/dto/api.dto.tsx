import { ResponseBase } from "./ResponseBase.dto";
import { λ } from "./λ.class";

export type Api = <T extends ResponseBase>(
  path: RequestInfo | URL,
  options?: RequestInit & {
    server?: string;
    token?: string;
    isRaw?: boolean;
    isText?: boolean;
    ignore?: boolean;
    data?: { [key: string]: any };
  }
) => Promise<λ<T>>;