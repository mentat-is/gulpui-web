import { Toggle } from "@/ui/Toggle"
import { copy, fws } from "@/ui/utils"
import { Icon } from "@impactium/icons"
import { cn } from "@impactium/utils"
import { Select } from "@/ui/Select"
import { Switch } from "@/ui/Switch"
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { useMemo, useCallback, ChangeEvent, memo, useState, useEffect } from "react"
import SyntaxHighlighter from "react-syntax-highlighter"
import s from './styles/QueryBuilder.module.css';
import { Stack } from "@/ui/Stack"
import { Button } from "@/ui/Button"
import { Input } from "@/ui/Input"
import { Filter } from "@/entities/Filter"
import { Label } from "@/ui/Label"

export namespace OpenSearchQueryBuilder {
  export type Condition =
    | 'regexp'
    | 'wildcard'
    | 'range'
    | 'LTE'
    | 'GTE'

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
    { value: 'regexp', label: 'Regexp', icon: 'Asterisk' },
    { value: 'wildcard', label: 'Wildcard', icon: 'Dices' },
    { value: 'range', label: 'Range', icon: 'CalendarRange' },
    { value: 'LTE', label: 'Lte', icon: 'ArrowDown' },
    { value: 'GTE', label: 'Gte', icon: 'ArrowUp' }
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

  const JsonPreview = memo(({ value }: { value: string }) => (
    <SyntaxHighlighter language='JSON' style={highlight.vs2015} customStyle={{ background: 'none', height: '100%' }}>
      {value}
    </SyntaxHighlighter>
  ));

  export const Preview = memo(({ query, className, ...props }: Preview.Props) => {
    const [debouncedString, setDebouncedString] = useState(() => JSON.stringify(query, null, 2));

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedString(JSON.stringify(query, null, 2));
      }, 800); // Higher debounce for the heavy highlighter
      return () => clearTimeout(handler);
    }, [query]);

    const copyQueryButtonClickHandler = useCallback(() => copy(debouncedString), [debouncedString]);

    return (
      <Stack pos='relative' className={cn(s.preview, className)} {...props}>
        <Button className={s.copy} icon='Copy' onClick={copyQueryButtonClickHandler} variant='glass' />
        <JsonPreview value={debouncedString} />
      </Stack>
    )
  });

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
          <Label value='Query String' />
          <Stack>
            <Input
              style={{ flex: 1 }}
              variant='highlighted'
              icon='Code'
              className={s.query_string_input}
              placeholder='Enter query_string part...'
              value={string}
              onChange={queryStringInputChangeHandler}
            />
            <Button icon='Copy' variant='secondary' onClick={copyQueryStringButtonClickHandler} />
            <Button icon='Undo2' variant='secondary' onClick={reset ? reset : resetQueryStringButtonClickHandler} revert>
              Reset
            </Button>
          </Stack>
        </Stack>
      )
    }

    export namespace Add {
      export interface Props extends Stack.Props {
        filters: Filter.Type[];
        setFilters: (filters: Filter.Type[]) => void;
      }
    }

    export const Add = ({ filters, setFilters, ...props }: Query.Add.Props) => {
      const add = useCallback(() => {
        const filter: Filter.Type = {
          id: `condition-${Date.now()}` as Filter.Id,
          type: 'wildcard',
          field: '',
          case_insensitive: true,
          value: '',
          operator: 'must',
          enabled: true
        };

        setFilters([...filters, filter]);
      }, [filters, setFilters]);

      return (
        <Stack jc='space-between' {...props}>
          <p>Query conditions</p>
          <Button onClick={add} variant='secondary' icon='Plus'>
            Add condition
          </Button>
        </Stack>
      )
    }

    export namespace Filters {
      export interface Props extends Stack.Props {
        filters: Filter.Type[];
        setFilters: (filters: Filter.Type[] | ((prev: Filter.Type[]) => Filter.Type[])) => void;
        keys: string[]
      }
    }

    const FilterRow = memo(({ 
      filter, 
      setFilters, 
      keys 
    }: { 
      filter: Filter.Type; 
      setFilters: (filters: Filter.Type[] | ((prev: Filter.Type[]) => Filter.Type[])) => void; 
      keys: string[] 
    }) => {
      const [isOpen, setIsOpen] = useState(false);
      const [localField, setLocalField] = useState(filter.field);

      // Sync local field when external filter changes (e.g. on reset or mount)
      useEffect(() => {
        setLocalField(filter.field);
      }, [filter.field]);

      const update = useCallback((key: string, value: any) => {
        setFilters((prev) => prev.map((condition) =>
          condition.id === filter.id ? { ...condition, [key]: value } : condition
        ));
      }, [filter.id, setFilters]);

      const remove = useCallback(() => {
        setFilters((prev) => prev.filter((condition) => condition.id !== filter.id));
      }, [filter.id, setFilters]);

      const filteredKeys = useMemo(() => {
        if (!isOpen) return []; // Don't process keys if dropdown is closed
        const search = localField.toLowerCase();
        if (!search) return keys.slice(0, 100);
        return keys
          .filter(key => key.toLowerCase().includes(search))
          .slice(0, 100);
      }, [keys, localField, isOpen]);

      const handleFieldChange = (val: string) => {
        setLocalField(val);
        update('field', val);
      };

      return (
        <Stack
          dir='column'
          ai='stretch'
          className={cn(s.card, !filter.enabled && s.disabled)}
        >
          <Stack style={fws}>
            <Select.Root
              value={filter.operator}
              onValueChange={(value) => update('operator', value)}
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
              onValueChange={(value) => update('type', value)}
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
            <Switch checked={filter.enabled} onCheckedChange={value => update('enabled', value)} />
            <Button
              variant='tertiary'
              onClick={remove}
              icon='Trash2'
            />
          </Stack>
          <Stack style={fws}>
            <Stack pos='relative'>
              <Input 
                className={s.key_input} 
                icon='Dot' 
                variant='highlighted' 
                placeholder='Field name' 
                value={localField} 
                onChange={(e) => handleFieldChange(e.target.value)} 
              />
              <Select.Root value={filter.field} onValueChange={(e) => handleFieldChange(e)} onOpenChange={setIsOpen}>
                <Select.Trigger className={s.trigger} />
                <Select.Content style={{ minHeight: 60 }}>
                  <Input value={localField} disabled icon='MagnifyingGlass' variant='highlighted' />
                  {isOpen && filteredKeys.map((k) => (
                    <Select.Item key={k} value={k}>
                      {k}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Stack>
            {filter.type === 'LTE' ? (
              <Input
                variant='highlighted'
                icon='ChevronRightSmall'
                placeholder='Min value'
                value={filter.value}
                onChange={(e) => update('value', e.target.value)}
                prefix='<='
              />
            ) : filter.type === 'GTE' ? (
              <Input
                variant='highlighted'
                icon='ChevronRightSmall'
                placeholder='Max value'
                value={filter.value}
                onChange={(e) => update('value', e.target.value)}
                prefix='>='
              />
            ) : filter.type === 'range' ? (
              <Input
                variant='highlighted'
                icon='ChevronRightSmall'
                placeholder='min,max'
                value={filter.value}
                onChange={(e) => update('value', e.target.value)}
              />
            ) : (
              <Input
                variant='highlighted'
                icon='ChevronRightSmall'
                placeholder='Value'
                value={filter.value}
                onChange={(e) => update('value', e.target.value)}
              />
            )}
          </Stack>
          {filter.type === 'wildcard' ? <Toggle option={['Case sensitive', 'Case insensitive']} checked={filter.case_insensitive} onCheckedChange={v => update('case_insensitive', v)} /> : null}
        </Stack>
      );
    });

    export const Filters = memo(({ filters, setFilters, keys }: Query.Filters.Props) => {
      return (
        <Stack ai='stretch' dir='column'>
          {filters.map((filter) => (
            <FilterRow 
              key={filter.id} 
              filter={filter} 
              setFilters={setFilters} 
              keys={keys} 
            />
          ))}
        </Stack>
      )
    });
  }
}
