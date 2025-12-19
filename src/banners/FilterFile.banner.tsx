import s from './styles/FilterFileBanner.module.css'
import { Banner } from '@/ui/Banner'
import { Application } from '@/context/Application.context'
import { Select } from '@/ui/Select'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fws } from '@/ui/utils'
import { Icon } from '@impactium/icons'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { Popover } from '@/ui/Popover'
import { OpenSearchQueryBuilder } from '@/components/QueryBuilder'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { Query } from '@/entities/Query'
import { Source } from '@/entities/Source'
import { Filter } from '@/entities/Filter'
import { Context } from '@/entities/Context'
import { toast } from 'sonner'
import { Checkbox } from '@/ui/Checkbox'

interface FilterFileBannerProps extends Banner.Props {
  files: Source.Type[]
  query?: Query.Type
  keys?: string[]
}

function normalizeQuery(input: unknown): Query.Type | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as any
  return {
    string: typeof obj.string === 'string' ? obj.string : '',
    filters: Array.isArray(obj.filters) ? obj.filters : []
  }
}

export function FilterFileBanner({
  files: initFiles,
  query: initQuery,
  keys: initKeys,
  ...props
}: FilterFileBannerProps) {
  const { app, Info, spawnBanner, destroyBanner } = Application.use()
  const jsonRef = useRef<HTMLTextAreaElement | null>(null)
  const hasExternalInitQuery = useRef(Boolean(initQuery))

  const [loading, setLoading] = useState(false)
  const [isEditQuery, setIsEditQuery] = useState(false)
  const [files, setFiles] = useState<Source.Type[]>(initFiles)
  const [query, setQuery] = useState<Query.Type>(initQuery ?? { string: '', filters: [] })

  const base = useMemo<Query.Type>(() => ({ string: '', filters: [] }), [])

  const updateQuery = useCallback((): Query.Type => {
    if (!files.length) return base
    const q = Info.getQuery(files[0])
    return { ...q, string: files.length === 1 ? q.string : '' }
  }, [Info, files, base])

  useEffect(() => {
    if (hasExternalInitQuery.current) return
    setQuery(updateQuery())
  }, [files, updateQuery])

  const [keys, setKeys] = useState<string[]>(initKeys ?? [])

  useEffect(() => {
    if (initKeys?.length) {
      setKeys(initKeys)
      return
    }

    let cancelled = false

      ; (async () => {
        const set = new Set<string>()
        await Promise.all(
          files.map(async file => {
            const fileKeys = await Info.event_keys(file)
            Object.keys(fileKeys).forEach(k => set.add(k))
          })
        )
        if (!cancelled) setKeys([...set])
      })()

    return () => {
      cancelled = true
    }
  }, [Info, files, initKeys])

  const setFilters = useCallback(
    (filters: Filter.Type[]) => setQuery(q => ({ ...q, filters })),
    []
  )

  const submit = useCallback(async () => {
    setLoading(true)
    try {
      Info.filters_cache(files)
      Info.setQuery(files, query)
      await Info.refetch({ ids: files.map(f => f.id) })
      Info.render()
      props.back ? props.back() : destroyBanner()
    } finally {
      setLoading(false)
    }
  }, [Info, files, query, props, destroyBanner])

  const jsonSubmit = useCallback(async () => {
    if (!jsonRef.current) return

    let normalized: Query.Type | null = null
    try {
      const parsed = JSON.parse(jsonRef.current.value)
      normalized = normalizeQuery(parsed)
    } catch {
      toast.error('Invalid JSON in EditQuery', { richColors: true })
      return
    }
    if (!normalized) return

    setLoading(true)
    try {
      Info.filters_cache(files)
      Info.setQuery(files, normalized)
      await Info.refetch({ ids: files.map(f => f.id) })
      Info.render()
      props.back ? props.back() : destroyBanner()
    } finally {
      setLoading(false)
    }
  }, [Info, files, props, destroyBanner])

  const Done = useMemo(
    () => (
      <Button
        icon="Check"
        variant="glass"
        loading={loading}
        onClick={isEditQuery ? jsonSubmit : submit}
      />
    ),
    [loading, isEditQuery, jsonSubmit, submit]
  )

  const Undo = useMemo(
    () => <Button icon="Undo" variant="tertiary" onClick={() => Info.filters_undo(files)} />,
    [Info, files]
  )

  const QueryStringPart = useMemo(() => {
    if (files.length > 1) return null
    return (
      <OpenSearchQueryBuilder.Query.String
        style={fws}
        string={query.string}
        setString={string => setQuery(q => ({ ...q, string }))}
        reset={() => setQuery(base)}
      />
    )
  }, [files.length, query.string, base])

  const AddCondition = useMemo(
    () => <OpenSearchQueryBuilder.Query.Add filters={query.filters} setFilters={setFilters} />,
    [query.filters, setFilters]
  )

  const QueryConditions = useMemo(
    () => (
      <OpenSearchQueryBuilder.Query.Filters
        filters={query.filters}
        setFilters={setFilters}
        keys={keys}
      />
    ),
    [query.filters, setFilters, keys]
  )

  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const previewCurrentFilterButtonClickHandler = useCallback(() => {
    setIsPreviewLoading(true)
    Info.preview_query({
      ...query,
      string: Filter.Entity.base(files)
    })
      .then(({ docs, total_hits }) => {
        if (total_hits > 0) {
          spawnBanner(
            <Preview.Banner
              total={total_hits}
              values={docs}
              fixed
              back={() =>
                spawnBanner(
                  <FilterFileBanner
                    files={files}
                    query={query}
                    keys={keys}
                    {...props}
                  />
                )
              }
            />
          )
        }
      })
      .finally(() => setIsPreviewLoading(false))
  }, [Info, query, files, keys, spawnBanner, props])

  const [lastQueriesList, setLastQueriesList] = useState<Query.Type[]>([])

  useEffect(() => {
    Info.getLastQueries().then(setLastQueriesList)
  }, [Info])

  const LastQueries = useMemo(() => {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button icon="ClockFading" variant="secondary">
            Last filters
          </Button>
        </Popover.Trigger>

        <Popover.Content className={s.lastFilters}>
          <Stack dir="column">
            {lastQueriesList.map((q, i) => (
              <div key={i}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Stack>
                          <p>{q.string}</p>
                          <Button icon="Check" variant="glass" onClick={() => Info.setQuery(files, q)} />
                        </Stack>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className={s.tooltip}>
                      <p>{q.string}</p>
                      <p>{JSON.stringify(q.filters, null, 2)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {lastQueriesList.length - 1 > i && <Separator />}
              </div>
            ))}
          </Stack>
        </Popover.Content>
      </Popover.Root>
    )
  }, [lastQueriesList, Info, files])

  const EditQuery = useMemo(() => {
    return (
      <textarea
        ref={jsonRef}
        style={{
          height: '100%',
          minHeight: '200px',
          fontFamily: 'monospace',
          fontSize: 14,
          padding: 12
        }}
        defaultValue={JSON.stringify(query, null, 2)}
      />
    )
  }, [query])

  const contextSelectButtonClickHandlerConstructor = useCallback(
    (id: Context.Id) => () =>
      setFiles(prev => {
        const newSources = Context.Entity.sources(app, id)
        const map = new Map<Source.Id, Source.Type>(
          [...newSources, ...prev].map(file => [file.id, file])
        )

        if (prev.some(file => newSources.some(s => s.id === file.id))) {
          newSources.forEach(s => map.delete(s.id))
        }

        return [...map.values()]
      }),
    [app]
  )

  const selectedContexts = Context.Entity.selected(app);

  return (
    <Banner
      title="Choose filtering options"
      done={Done}
      side={<OpenSearchQueryBuilder.Preview query={Filter.Entity.query(query)} />}
      back={isEditQuery ? () => setIsEditQuery(v => !v) : undefined}
      subtitle={LastQueries}
      className={s.banner}
      option={Undo}
      {...props}
    >
      {isEditQuery ? (
        EditQuery
      ) : (
        <>
          <Select.Multi.Root
            value={files.map(file => file.id)}
            onValueChange={ids => setFiles(ids.map(id => Source.Entity.id(app, id as Source.Id)))}
          >
            <Select.Trigger>
              <Select.Multi.Value
                icon={['File', 'Files']}
                placeholder="Select files to apply filters"
                text={len =>
                  typeof len === 'number'
                    ? `Selected ${len} files`
                    : Source.Entity.id(app, len as Source.Id).name
                }
              />
            </Select.Trigger>

            <Select.Content>
              {selectedContexts.map((context, i) => {
                const sources = Context.Entity.sources(app, context).filter(src => src.selected)
                if (!sources.length) return null

                return (
                  <>
                    <Select.Group key={context.id} className={s.group}>
                      <Select.Label>
                        {context.name}
                      </Select.Label>
                      {sources.map(src => (
                        <Select.Item key={src.id} value={src.id}>
                          <Icon name={Source.Entity.icon(src) || 'File'} />
                          {src.name}
                        </Select.Item>
                      ))}
                    </Select.Group>
                    {i > 1 && selectedContexts.length - 1 !== i}
                  </>
                )
              })}
            </Select.Content>
          </Select.Multi.Root>

          {QueryStringPart}
          {AddCondition}
          <Separator />
          {QueryConditions}

          <Stack ai="center" jc="flex-start" dir="row">
            <Button
              variant="glass"
              loading={isPreviewLoading}
              onClick={previewCurrentFilterButtonClickHandler}
              icon="PreviewDocument"
            >
              Preview result of current filter
            </Button>

            <Button
              variant="glass"
              onClick={() => setIsEditQuery(v => !v)}
              icon="FileJson"
            >
              Edit query
            </Button>
          </Stack>
        </>
      )}
    </Banner>
  )
}
