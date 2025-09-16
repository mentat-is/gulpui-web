import { Toggle } from "@/ui/Toggle"
import { copy, fws } from "@/ui/utils"
import { Icon } from "@impactium/icons"
import { cn } from "@impactium/utils"
import { Select } from "@/ui/Select"
import { Switch } from "@/ui/Switch"
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { useMemo, useCallback, ChangeEvent } from "react"
import SyntaxHighlighter from "react-syntax-highlighter"
import s from './styles/QueryBuilder.module.css';
import { Stack } from "@/ui/Stack"
import { Button } from "@/ui/Button"
import { Input } from "@/ui/Input"
import { Filter } from "@/entities/Filter"

export namespace OpenSearchQueryBuilder {
  export type Condition =
    | 'term'
    | 'match'
    | 'regexp'
    | 'prefix'
    | 'wildcard'
    | 'range'

  export type Operator = 'must' | 'should' | 'must_not' | 'filter'

  interface Object<T> {
    value: T
    label: string
    icon: Icon.Name
  }

  export namespace Entity {
    export type Condition = Object<OpenSearchQueryBuilder.Condition>

    export type Operator = Object<OpenSearchQueryBuilder.Operator>
  }

  export const CONDITIONS: Entity.Condition[] = [
    { value: 'term', label: 'Term', icon: 'WholeWord' },
    { value: 'match', label: 'Match', icon: 'Search' },
    { value: 'regexp', label: 'Regexp', icon: 'Asterisk' },
    { value: 'prefix', label: 'Prefix', icon: 'Braces' },
    { value: 'wildcard', label: 'Wildcard', icon: 'Dices' },
    { value: 'range', label: 'Range', icon: 'CalendarRange' },
  ]

  export const OPERATORS: Entity.Operator[] = [
    { value: 'must', label: 'Must (AND)', icon: 'Ampersand' },
    { value: 'should', label: 'Should (OR)', icon: 'SlashForward' },
    { value: 'must_not', label: 'Must Not (NOT)', icon: 'CircleSlash2' },
    { value: 'filter', label: 'Filter', icon: 'Filter' },
  ]

  export const INITIAL = {
    bool: {
      must: [],
      should: [],
      must_not: [],
      filter: [],
    },
  }

  export namespace Preview {
    export interface Props extends Stack.Props {
      query: Record<string, any>;
    }
  }

  export const Preview = ({ query, className, ...props }: Preview.Props) => {
    const string = useMemo(() => JSON.stringify(query, null, 2), [query]);

    const copyQueryButtonClickHandler = useCallback(() => copy(string), [string]);

    return (
      <Stack pos='relative' className={cn(s.preview, className)} {...props}>
        <Button className={s.copy} img='Copy' onClick={copyQueryButtonClickHandler} variant='glass' />
        <SyntaxHighlighter language='JSON' style={highlight.vs2015} customStyle={{ background: 'none', height: '100%' }}>
          {string}
        </SyntaxHighlighter>
      </Stack>
    )
  }

  export namespace Query {
    export namespace String {
      export interface Props extends Stack.Props {
        string: string;
        setString: (string: string) => void;
        reset?: () => void;
      }
    }

    export const String = ({ string, setString, reset, ...props }: Query.String.Props) => {
      const queryStringInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => setString(event.target.value);

      const resetQueryStringButtonClickHandler = () => setString('');

      const copyQueryStringButtonClickHandler = () => copy(string);

      return (
        <Stack dir='column' gap={6} style={fws} ai='stretch' {...props}>
          <p>Query String</p>
          <Stack>
            <Input
              style={{ flex: 1 }}
              variant='highlighted'
              icon='Code'
              placeholder='Enter query_string part...'
              value={string}
              onChange={queryStringInputChangeHandler}
            />
            <Button img='Copy' variant='secondary' onClick={copyQueryStringButtonClickHandler} />
            <Button img='Undo2' variant='secondary' onClick={reset ? reset : resetQueryStringButtonClickHandler} revert>
              Reset
            </Button>
          </Stack>
        </Stack>
      )
    }

    export namespace Add {
      export interface Props extends Stack.Props {
        init: string;
        filters: Filter.Type[];
        setFilters: (filters: Filter.Type[]) => void;
      }
    }

    export const Add = ({ filters, init, setFilters, ...props }: Query.Add.Props) => {
      const add = useCallback(() => {
        filters.push({
          id: `condition-${Date.now()}` as Filter.Id,
          type: 'wildcard',
          field: init,
          case_insensitive: true,
          value: '',
          operator: 'must',
          enabled: true
        })
        setFilters(filters);
      }, [filters, init, setFilters]);

      return (
        <Stack jc='space-between' {...props}>
          <p>Query conditions</p>
          <Button onClick={add} variant='secondary' img='Plus'>
            Add condition
          </Button>
        </Stack>
      )
    }

    export namespace Filters {
      export interface Props extends Stack.Props {
        filters: Filter.Type[];
        setFilters: (filters: Filter.Type[]) => void;
        keys: string[]
      }
    }

    export const Filters = ({ filters, setFilters, keys }: Query.Filters.Props) => {
      const update = useCallback((id: Filter.Id, key: string, value: any) => {
        setFilters(filters.map((condition) =>
          condition.id === id ? { ...condition, [key]: value } : condition,
        ))
      }, [filters, setFilters]);

      const remove = useCallback((id: Filter.Id) => {
        setFilters(filters.filter((condition) => condition.id !== id))
      }, [filters, setFilters]);

      return (
        <Stack ai='stretch' dir='column'>
          {filters.map((filter) => (
            <Stack
              dir='column'
              ai='stretch'
              className={cn(s.card, !filter.enabled && s.disabled)}
              key={filter.id}
            >
              <Stack style={fws}>
                <Select.Root
                  value={filter.operator}
                  onValueChange={(value) =>
                    update(filter.id, 'operator', value)
                  }
                >
                  <Select.Trigger className={s.value}>
                    <Select.Value placeholder='Operator' />
                  </Select.Trigger>
                  <Select.Content>
                    {OpenSearchQueryBuilder.OPERATORS.map((op) => (
                      <Select.Item key={op.value} value={op.value}>
                        <Icon name={op.icon} />
                        {op.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Select.Root
                  value={filter.type}
                  onValueChange={(value) => update(filter.id, 'type', value)}
                >
                  <Select.Trigger className={s.value}>
                    <Select.Value placeholder='Type' />
                  </Select.Trigger>
                  <Select.Content>
                    {OpenSearchQueryBuilder.CONDITIONS.map((type) => (
                      <Select.Item key={type.value} value={type.value}>
                        <Icon name={type.icon} />
                        {type.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Switch checked={filter.enabled} onCheckedChange={value => update(filter.id, 'enabled', value)} />
                <Button
                  variant='tertiary'
                  onClick={() => remove(filter.id)}
                  img='Trash2'
                />
              </Stack>
              <Stack style={fws}>
                <Stack pos='relative'>
                  <Input className={s.key_input} icon='Dot' variant='highlighted' placeholder='Field name' value={filter.field} onChange={(e) => update(filter.id, 'field', e.target.value)} />
                  <Select.Root
                    value={filter.field}
                    onValueChange={(e) => update(filter.id, 'field', e)}
                  >
                    <Select.Trigger className={s.trigger} />
                    <Select.Content>
                      {keys.sort((a, b) => a.localeCompare(b)).map((k) => (
                        <Select.Item key={k} value={k}>
                          {k}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Stack>
                <Input
                  variant='highlighted'
                  icon='ChevronRightSmall'
                  placeholder={filter.type === 'range' ? 'min,max' : 'Value'}
                  value={filter.value}
                  onChange={(e) => update(filter.id, 'value', e.target.value)}
                />
              </Stack>
              {filter.type === 'wildcard' ? <Toggle option={['Case sensitive', 'Case insensitive']} checked={filter.case_insensitive} onCheckedChange={v => update(filter.id, 'case_insensitive', v)} /> : null}
            </Stack>
          ))}
        </Stack>
      )
    }
  }
}
