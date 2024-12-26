export type Acceptable = 'date' | 'long' | 'text';

export interface ElasticGetMappingUnit {
    [key: string]: Acceptable;
}
