import { ResponseBase } from "./ResponseBase.dto";

export type Acceptable = 'date' | 'long' | 'text';

export interface ElasticGetMappingUnit {
    [key: string]: Acceptable;
}

export type ElasticGetMapping = ResponseBase<ElasticGetMappingUnit>