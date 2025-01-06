export type Acceptable = 'date_nanos' | 'long' | 'text' | 'keyword';

export interface ElasticGetMappingUnit {
    [key: string]: Acceptable;
}
