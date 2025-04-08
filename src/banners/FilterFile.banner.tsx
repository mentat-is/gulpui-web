import s from './styles/FilterFileBanner.module.css'
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Banner } from '@/ui/Banner'
import { useApplication } from '@/context/Application.context'
import { Select } from '@/ui/Select'
import { Button, Stack, Input } from '@impactium/components'
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, FilterOptions, λFilter } from '@/class/Info'
import { copy, fws } from '@/ui/utils'
import { λFile } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { SetState } from '@/class/API'
import { cn } from '@impactium/utils'

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
              variant='highlighted'
              img='Code'
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
        filters: λFilter[];
        setFilters: (filters: λFilter[]) => void;
      }
    }

    export const Add = ({ filters, init, setFilters, ...props }: Query.Add.Props) => {
      const add = useCallback(() => {
        filters.push({
          id: `condition-${Date.now()}` as λFilter['id'],
          type: 'term',
          field: init,
          value: '',
          operator: 'must',
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

    export namespace Filter {
      export interface Props extends Stack.Props {
        filters: λFilter[];
        setFilters: (filters: λFilter[]) => void;
        keys: string[]
      }
    }

    export const Filter = ({ filters, setFilters, keys }: Query.Filter.Props) => {
      const update = useCallback((id: λFilter['id'], key: string, value: string) => {
        setFilters(filters.map((condition) =>
          condition.id === id ? { ...condition, [key]: value } : condition,
        ))
      }, [filters, setFilters]);

      const remove = useCallback((id: λFilter['id']) => {
        setFilters(filters.filter((condition) => condition.id !== id))
      }, [filters, setFilters]);

      return (
        <Stack ai='stretch' dir='column'>
          {filters.map((condition) => (
            <Stack
              dir='column'
              ai='flex-start'
              className={s.card}
              key={condition.id}
            >
              <Stack style={fws}>
                <Select.Root
                  value={condition.operator}
                  onValueChange={(value) =>
                    update(condition.id, 'operator', value)
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
                  value={condition.type}
                  onValueChange={(value) => update(condition.id, 'type', value)}
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
                <Button
                  variant='outline'
                  onClick={() => remove(condition.id)}
                  img='Trash2'
                />
              </Stack>
              <Stack style={fws}>
                <Stack pos='relative'>
                  <Input className={s.key_input} img='Dot' variant='highlighted' placeholder='Field name' value={condition.field} onChange={(e) => update(condition.id, 'field', e.target.value)} />
                  <Select.Root
                    value={condition.field}
                    onValueChange={(e) => update(condition.id, 'field', e)}
                  >
                    <Select.Trigger className={s.trigger} />
                    <Select.Content>
                      {keys.map((k) => (
                        <Select.Item key={k} value={k}>
                          {k}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Stack>
                <Input
                  variant='highlighted'
                  img='ChevronRightSmall'
                  placeholder={condition.type === 'range' ? 'min,max' : 'Value'}
                  value={condition.value}
                  onChange={(e) => update(condition.id, 'value', e.target.value)}
                />
              </Stack>
            </Stack>
          ))}
        </Stack>
      )
    }
  }
}

interface FilterFileBannerProps extends Banner.Props {
  file: λFile
}

export function FilterFileBanner({ file, ...props }: FilterFileBannerProps) {
  const { app, Info, spawnBanner, destroyBanner } = useApplication()
  const [loading, setLoading] = useState<boolean>(false)
  const query = Info.getQuery(file.id)

  useEffect(() => {
    if (app.timeline.filtering_options[file.id]) return

    Info.event_keys(file).then((data) => Info.setTimelineFilteringoptions(file, data))
  }, [app.timeline.filtering_options])

  const submit = async () => {
    setLoading(true)
    Info.filters_cache(file)
    Info.refetch({ ids: file.id }).then(() => {
      Info.render()
      if (props.back) {
        props.back()
      } else {
        destroyBanner()
      }
    })
  }

  const Done = () => (
    <Button img='Check' variant='glass' loading={loading} onClick={submit} />
  )

  const Undo = () => (
    <Button
      img='Undo'
      variant='ghost'
      onClick={() => Info.filters_undo(file)}
    />
  )

  const QueryStringPart = useMemo(() => (
    <OpenSearchQueryBuilder.Query.String style={fws} string={query.string} setString={(str) => Info.setQueryString(file.id, str)} reset={() => Info.setQueryString(file.id, Filter.base(file))} />
  ), [file, Info])

  const AddCondition = useMemo(() => {
    return (
      <OpenSearchQueryBuilder.Query.Add filters={query.filters} setFilters={(filters: λFilter[]) => Info.setFilters(file.id, filters)} init={app.timeline.filtering_options[file.id]?.[0] ?? ''} />
    )
  }, [query.filters, file.id]);

  const QueryConditions = useMemo(() => {
    const setFilters = (filters: λFilter[]) => Info.setFilters(file.id, filters);;

    return (
      <OpenSearchQueryBuilder.Query.Filter filters={query.filters} setFilters={setFilters} keys={Object.keys(app.timeline.filtering_options[file.id] || {})} />
    )
  }, [query.filters, app.timeline.filtering_options, file.id])

  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  const previewCurrentFilterButtonClickHandler = async () => {
    setIsPreviewLoading(true);
    const { docs, total_hits } = await Info.preview_file(file)
    setIsPreviewLoading(false)

    spawnBanner(<Preview.Banner total={total_hits} values={docs} fixed back={() => spawnBanner(<FilterFileBanner file={file} {...props} />)} />)
  }

  return (
    <Banner
      title='Choose filtering options'
      done={<Done />}
      side={<OpenSearchQueryBuilder.Preview query={Filter.query(Info.getQuery(file.id))} />}
      className={s.banner}
      option={<Undo />}
      {...props}
    >
      {QueryStringPart}
      {AddCondition}
      <Separator />
      {QueryConditions}
      <Stack>
        <Button
          variant='secondary'
          style={{ width: '100%' }}
          onClick={() => Info.request_cancel_for_file(file.id)}
          img='FileX'
        >Cancel all requests for this file</Button>
        <Button variant='glass' loading={isPreviewLoading} onClick={previewCurrentFilterButtonClickHandler} img='PreviewDocument'>Preview result of current filter</Button>
      </Stack>
    </Banner>
  )
}
