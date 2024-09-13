import { ResponseBase } from "./ResponseBase.dto";
import { RawOperation } from './Operation.dto';

export type QueryOperations = ResponseBase<RawOperation[]>