import s from './styles/FilterFileBanner.module.css'
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs'

import { Banner } from '@/ui/Banner'
import { useApplication } from '@/context/Application.context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/Select'
import { Button, Stack, Input } from '@impactium/components'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, FilterOptions, λFilter } from '@/class/Info'
import React from 'react'
import { copy, fws } from '@/ui/utils'
import { λFile } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { Separator } from '@/ui/Separator'

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
}

interface FilterFileBannerProps extends Banner.Props {
  file: λFile
}

export function FilterFileBanner({ file, ...props }: FilterFileBannerProps) {
  const { app, Info, destroyBanner } = useApplication()
  const [loading, setLoading] = useState<boolean>(false)
  const query = Info.getQuery(file.id)

  const addCondition = () =>
    Info.setFilters(file.id, [
      ...query.filters,
      {
        id: `condition-${Date.now()}` as λFilter['id'],
        type: 'term',
        field: app.timeline.filtering_options[file.id][0] ?? '',
        value: '',
        operator: 'must',
      } satisfies λFilter,
    ])

  useEffect(() => {
    if (app.timeline.filtering_options[file.id]) return

    api<FilterOptions>('/query_fields_by_source', {
      query: {
        operation_id: file.operation_id,
        context_id: file.context_id,
        source_id: file.id,
        ws_id: app.general.ws_id,
      },
    }).then((data) => Info.setTimelineFilteringoptions(file, data))
  }, [app.timeline.filtering_options])

  const submit = async () => {
    setLoading(true)
    Info.filters_cache(file)
    Info.refetch({ ids: file.id }).then(() => {
      destroyBanner()
      Info.render()
    })
  }

  const Done = () => (
    <Button img="Check" variant="glass" loading={loading} onClick={submit} />
  )
  const Undo = () => (
    <Button
      img="Undo"
      variant="ghost"
      onClick={() => Info.filters_undo(file)}
    />
  )

  const QueryStringPart = useMemo(() => {
    return (
      <Stack dir="column" gap={6} style={fws} ai="stretch">
        <p>Query String</p>
        <Stack>
          <Input
            variant="highlighted"
            img="Code"
            placeholder="Enter query_string part..."
            value={query.string}
            onChange={(e) => Info.setQueryString(file.id, e.target.value)}
          />
          <Button
            img="Copy"
            variant="secondary"
            onClick={() => copy(query.string)}
          />
          <Button
            img="Undo2"
            variant="secondary"
            onClick={() => Info.setQueryString(file.id, Filter.base(file))}
            revert
          >
            Reset
          </Button>
        </Stack>
      </Stack>
    )
  }, [file, Info])

  const Preview = () => {
    const query = Filter.query(Info.getQuery(file.id))
    const string = JSON.stringify(query, null, 2)

    return (
      <Stack pos="relative" className={s.preview}>
        <Button
          className={s.copy}
          img="Copy"
          onClick={() => copy(string)}
          variant="glass"
        />
        <SyntaxHighlighter
          language="JSON"
          style={highlight.vs2015}
          customStyle={{ background: 'none', height: '100%' }}
        >
          {string}
        </SyntaxHighlighter>
      </Stack>
    )
  }

  const removeCondition = useCallback(
    (id: string) => {
      Info.setFilters(
        file.id,
        query.filters.filter((condition) => condition.id !== id),
      )
    },
    [file.id, Info.setFilters],
  )

  const updateCondition = useCallback(
    (id: string, field: string, value: string) => {
      Info.setFilters(
        file.id,
        query.filters.map((condition) =>
          condition.id === id ? { ...condition, [field]: value } : condition,
        ),
      )
    },
    [file.id, Info.setFilters],
  )

  const QueryConditions = useMemo(() => {
    return (
      <Stack ai="stretch" dir="column">
        {query.filters.map((condition) => (
          <Stack
            dir="column"
            ai="flex-start"
            className={s.card}
            key={condition.id}
          >
            <Stack style={fws}>
              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  updateCondition(condition.id, 'operator', value)
                }
              >
                <SelectTrigger className={s.value}>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {OpenSearchQueryBuilder.OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      <Icon name={op.icon} />
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={condition.type}
                onValueChange={(value) =>
                  updateCondition(condition.id, 'type', value)
                }
              >
                <SelectTrigger className={s.value}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {OpenSearchQueryBuilder.CONDITIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <Icon name={type.icon} />
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => removeCondition(condition.id)}
                img="Trash2"
              />
            </Stack>
            <Stack style={fws}>
              <Select
                value={condition.field}
                onValueChange={(e) => updateCondition(condition.id, 'field', e)}
              >
                <SelectTrigger className={s.trigger}>
                  <SelectValue placeholder="Field name" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(
                    app.timeline.filtering_options[file.id] || {},
                  ).map((k) => (
                    <SelectItem value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                variant="highlighted"
                img="ChevronRightSmall"
                placeholder={condition.type === 'range' ? 'min,max' : 'Value'}
                value={condition.value}
                onChange={(e) =>
                  updateCondition(condition.id, 'value', e.target.value)
                }
              />
            </Stack>
          </Stack>
        ))}
      </Stack>
    )
  }, [query.filters, app.timeline.filtering_options, updateCondition])

  return (
    <Banner
      title="Choose filtering options"
      done={<Done />}
      side={<Preview />}
      className={s.banner}
      option={<Undo />}
      {...props}
    >
      {QueryStringPart}
      <Stack style={fws} jc="space-between">
        <p>Query conditions</p>
        <Button onClick={addCondition} variant="secondary" img="Plus">
          Add condition
        </Button>
      </Stack>
      <Separator />
      {QueryConditions}
      <Button
        variant="secondary"
        style={{ width: '100%' }}
        onClick={() => Info.request_cancel_for_file(file.id)}
        img="FileX"
      >
        Cancel all requests for this file
      </Button>
    </Banner>
  )
}
