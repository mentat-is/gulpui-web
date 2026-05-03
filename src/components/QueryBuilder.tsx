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
        textFilter: string;
        setTextFilter: (text: string) => void;
        reset?: () => void;
      }
    }

    export const String = ({ textFilter, setTextFilter, reset, ...props }: Query.String.Props) => {
      const queryStringInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => setTextFilter(event.target.value);

      const resetQueryStringButtonClickHandler = () => setTextFilter('');

      const copyQueryStringButtonClickHandler = () => copy(textFilter);

      return (
        <Stack dir='column' gap={6} style={fws} ai='stretch' {...props}>
          <Label value='Search in logs (event.original)' />
          <Stack>
            <Input
              style={{ flex: 1 }}
              variant='highlighted'
              icon='Code'
              className={s.query_string_input}
              placeholder='Search in raw log content...'
              value={textFilter}
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

    /** Shared type for the setFilters callback accepted by all builder components. */
    export type SetFilters = (action: Filter.Item[] | ((prev: Filter.Item[]) => Filter.Item[])) => void;

    export namespace Add {
      export interface Props extends Stack.Props {
        filters: Filter.Item[];
        setFilters: SetFilters;
      }
    }

    export const Add = ({ filters, setFilters, ...props }: Query.Add.Props) => {
      const addCondition = useCallback(() => {
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

      const addGroup = useCallback(() => {
        const group: Filter.Group = {
          id: `group-${Date.now()}` as Filter.Id,
          type: 'group',
          operator: 'must',
          children: [],
          enabled: true,
        };
        setFilters([...filters, group]);
      }, [filters, setFilters]);

      return (
        <Stack jc='space-between' {...props}>
          <p>Query conditions</p>
          <Stack>
            <Button onClick={addCondition} variant='secondary' icon='Plus'>
              Add condition
            </Button>
            <Button onClick={addGroup} variant='secondary' icon='FolderPlus'>
              Add group
            </Button>
          </Stack>
        </Stack>
      )
    }

    export namespace Filters {
      export interface Props extends Stack.Props {
        filters: Filter.Item[];
        setFilters: SetFilters;
        keys: string[]
      }
    }

    const FilterRow = memo(({
      filter,
      setFilters,
      keys,
    }: {
      filter: Filter.Type;
      setFilters: SetFilters;
      keys: string[];
    }) => {
      const [isOpen, setIsOpen] = useState(false);
      const [localField, setLocalField] = useState(filter.field);

      useEffect(() => {
        setLocalField(filter.field);
      }, [filter.field]);

      const update = useCallback((key: string, value: any) => {
        setFilters((prev) => prev.map((condition) =>
          condition.id === filter.id ? { ...condition, [key]: value } : condition
        ) as Filter.Item[]);
      }, [filter.id, setFilters]);

      const remove = useCallback(() => {
        setFilters((prev) => prev.filter((condition) => condition.id !== filter.id));
      }, [filter.id, setFilters]);

      const filteredKeys = useMemo(() => {
        if (!isOpen) return [];
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

    /**
     * Renders a nested group of conditions — effectively a parenthesis around its children.
     *
     * The group's `operator` controls where the whole group lands in its parent's bool.
     * Each child carries its own `operator`, so a single group can hold a free mix of
     * must / should / must_not / filter children.
     */
    const GroupRow = memo(({
      group,
      setFilters,
      keys,
    }: {
      group: Filter.Group;
      setFilters: SetFilters;
      keys: string[];
    }) => {
      const updateGroup = useCallback((key: string, value: any) => {
        setFilters(prev =>
          prev.map(item => item.id === group.id ? { ...item, [key]: value } : item) as Filter.Item[]
        );
      }, [group.id, setFilters]);

      const removeGroup = useCallback(() => {
        setFilters(prev => prev.filter(item => item.id !== group.id));
      }, [group.id, setFilters]);

      // Setter that operates on this group's children array
      const setChildFilters: SetFilters = useCallback(
        (action) => {
          setFilters(prev =>
            prev.map(item =>
              item.id === group.id
                ? {
                  ...item,
                  children: typeof action === 'function'
                    ? action((item as Filter.Group).children)
                    : action,
                } as Filter.Group
                : item
            )
          );
        },
        [group.id, setFilters]
      );

      const addChildCondition = useCallback(() => {
        const filter: Filter.Type = {
          id: `condition-${Date.now()}` as Filter.Id,
          type: 'wildcard',
          field: '',
          case_insensitive: true,
          value: '',
          operator: 'must',
          enabled: true,
        };
        setChildFilters(prev => [...prev, filter]);
      }, [setChildFilters]);

      const addChildGroup = useCallback(() => {
        const child: Filter.Group = {
          id: `group-${Date.now()}` as Filter.Id,
          type: 'group',
          operator: 'must',
          children: [],
          enabled: true,
        };
        setChildFilters(prev => [...prev, child]);
      }, [setChildFilters]);

      return (
        <Stack dir='column' ai='stretch' className={cn(s.group_container, !group.enabled && s.disabled)}>
          <Stack style={fws}>
            {/* Where this group goes in the parent bool */}
            <Select.Root value={group.operator} onValueChange={v => updateGroup('operator', v)}>
              <Select.Trigger className={s.value}>
                <Select.Value placeholder='Operator' />
              </Select.Trigger>
              <Select.Content>
                {OpenSearchQueryBuilder.OPERATORS.map(op => (
                  <Select.Item key={op.value} value={op.value}>
                    <Icon name={op.icon} />
                    {op.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Switch checked={group.enabled} onCheckedChange={v => updateGroup('enabled', v)} />
            <Button variant='secondary' icon='Plus' onClick={addChildCondition}>
              Add condition
            </Button>
            <Button variant='secondary' icon='FolderPlus' onClick={addChildGroup}>
              Add group
            </Button>
            <Button variant='tertiary' icon='Trash2' onClick={removeGroup} />
          </Stack>
          <Stack dir='column' ai='stretch' className={s.group_children}>
            {group.children.map(child =>
              Filter.isGroup(child)
                ? <GroupRow key={child.id} group={child} setFilters={setChildFilters} keys={keys} />
                : <FilterRow key={child.id} filter={child} setFilters={setChildFilters} keys={keys} />
            )}
          </Stack>
        </Stack>
      );
    });

    export const Filters = memo(({ filters, setFilters, keys }: Query.Filters.Props) => {
      return (
        <Stack ai='stretch' dir='column'>
          {filters.map(item =>
            Filter.isGroup(item)
              ? <GroupRow key={item.id} group={item} setFilters={setFilters} keys={keys} />
              : <FilterRow key={item.id} filter={item} setFilters={setFilters} keys={keys} />
          )}
        </Stack>
      )
    });
  }
}
