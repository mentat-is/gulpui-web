import { OpenSearchQueryBuilder } from "@/components/QueryBuilder"
import { Acceptable } from "@/dto/ElasticGetMapping.dto"
import { Query } from "./Query"
import { Arrayed, MinMax } from "@/class/Info"
import { Source } from "./Source"
import { Parser } from "./addon/Parser"
import { App } from "./App"
import { UUID } from "crypto"
import { Internal } from "./addon/Internal"

export namespace Filter {
  export const name = 'Filter'
  const _ = Symbol(Filter.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export enum Operator {
    GREATER_OR_EQUAL = '>=',
    EQUAL = '==',
    LESS_OR_EQUAL = '<=',
    NOT_EQUAL = '!=',
    LESS_THAN = '<',
    GREATER_THAN = '>',
  }

  export type Options = Record<string, Acceptable>

  export interface Type {
    id: Filter.Id
    type: OpenSearchQueryBuilder.Condition
    operator: OpenSearchQueryBuilder.Operator
    field: string
    value: any
    enabled: boolean
    case_insensitive?: boolean
    min?: string
    max?: string
  }

  export class Entity {
    static query = ({ filters, string }: Query.Type) => {
      const query: Record<string, any> = structuredClone(
        OpenSearchQueryBuilder.INITIAL,
      )

      if (string?.trim()) {
        query.bool.must.push({
          query_string: {
            query: string,
          },
        })
      }

      filters.forEach(({ type, field, value, operator, enabled, case_insensitive = false }) => {
        if (!field || !value || !enabled) return

        let conditionObj = {}

        switch (type) {
          case 'term':
            conditionObj = { term: { [field]: value } }
            break
          case 'match':
            conditionObj = { match: { [field]: value } }
            break
          case 'regexp':
            conditionObj = { regexp: { [field]: { value, flags: 'ALL' } } }
            break
          case 'prefix':
            conditionObj = { prefix: { [field]: value } }
            break
          case 'wildcard':
            conditionObj = { wildcard: { [field]: { value, case_insensitive } } }
            break
          case 'range':
            conditionObj = {
              range: {
                [field]: {
                  gte: value.split(',')[0]?.trim() || 0,
                  lte: value.split(',')[1]?.trim() || 0,
                },
              },
            }
            break
          default:
            conditionObj = { term: { [field]: value } }
        }

        query.bool[operator].push(conditionObj)
      })

      Object.keys(query.bool).forEach((key) => {
        if (query.bool[key].length === 0) {
          delete query.bool[key]
        }
      })

      return query
    }

    private static quotes = (str: string) =>
      str.includes(' ') ? `"${str}"` : str

    public static base = (files: Arrayed<Source.Type>, range?: MinMax) => Parser.array(files).map(file => `(gulp.operation_id: ${Filter.Entity.quotes(file.operation_id)} AND gulp.context_id: "${Filter.Entity.quotes(file.context_id)}" AND gulp.source_id: "${Filter.Entity.quotes(file.id)}" AND gulp.timestamp: [${range?.min ?? file.nanotimestamp?.min ?? Internal.Transformator.toNanos(file.timestamp.min)} TO ${range?.max ?? file.nanotimestamp?.max ?? Internal.Transformator.toNanos(file.timestamp.max)}])`).reduce((acc, clause) => acc ? `(${acc} OR ${clause})` : clause, '');


    public static default = (app: App.Type, file: Source.Type | Source.Id, range?: MinMax): Query.Type => {
      const id = typeof file === 'object' ? file.id : file;

      return {
        string: Filter.Entity.base(Source.Entity.id(app, id), range ?? {
          min: Internal.Transformator.toNanos(app.timeline.frame.min).toString() as unknown as number,
          max: Internal.Transformator.toNanos(app.timeline.frame.max).toString() as unknown as number
        }),
        filters: [],
      }
    }

    static body = (query: Query.Type) => {
      const body: Record<string, any> = {
        q: [{ query: Filter.Entity.query(query) }],
        q_options: {
          sort: {
            '@timestamp': 'desc',
          },
        },
      }

      return body
    }
  }
}
