import { Acceptable } from "./ElasticGetMapping.dto";

export enum FilterType {
  GREATER_OR_EQUAL = '>=',
  EQUAL = '==',
  LESS_OR_EQUAL = '<=',
  NOT_EQUAL = '!=',
  LESS_THAN = '<',
  GREATER_THAN = '>'
}

export type FilterOptions = Record<string, Acceptable>;

export type GulpQueryFilterObject = {
  key: string;
  type: FilterType;
  value: any;
  static?: boolean
}

export type GulpQueryFilterArray = GulpQueryFilterObject[];

type GulpQueryFilterString = string; 

export class GulpQueryFilter {
  filters: GulpQueryFilterArray;

  constructor(filters: GulpQueryFilterArray = []) {
    this.filters = filters;
  }
  
  public get string(): GulpQueryFilterString {
    return GulpQueryFilter.parse(this.filters);
  }

  public static parse(array: GulpQueryFilterArray): GulpQueryFilterString {
    return array.map(filter => {
      let queryStringPart: string;

      const isParsable = !!parseInt(filter.value);

      const value = isParsable ? filter.value : `"${filter.value}"`

      switch (filter.type) {
        case FilterType.EQUAL:
          queryStringPart = `${filter.key}:${value}`;
          break;
        case FilterType.NOT_EQUAL:
          queryStringPart = `NOT ${filter.key}:${value}`;
          break;
        default:
          queryStringPart = `${filter.key}:${filter.type}${value}`;
          break;
      }

      return queryStringPart;
    }).join(' AND ');
  }
  
  static body = (filters: GulpQueryFilterArray) => JSON.stringify({
    query_raw: {
      bool: {
        must: [
          {
            query_string: {
              query: GulpQueryFilter.parse(filters),
              analyze_wildcard: true
            }
          }
        ]
      }
    },
    options: {
      sort: {
        '@timestamp': "desc"
      }
    }
  });
}
