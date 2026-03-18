import s from './styles/FilterFileBanner.module.css'
import { Banner } from '@/ui/Banner'
import { Application } from '@/context/Application.context'
import { useCallback, useEffect, useMemo, useRef, useState, SetStateAction } from 'react'
import { fws } from '@/ui/utils'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { Popover } from '@/ui/Popover'
import { OpenSearchQueryBuilder } from '@/components/QueryBuilder'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'
import { Checkbox } from '@/ui/Checkbox'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { Query } from '@/entities/Query'
import { Source } from '@/entities/Source'
import { Filter } from '@/entities/Filter'
import { Operation } from '@/entities/Operation'
import { Doc } from '@/entities/Doc'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs'
import { Textarea } from '@/ui/Textarea'
import { Label } from '@/ui/Label'

interface FilterFileBannerProps extends Banner.Props {
  sources: Source.Type[]
  query?: Query.Type
  keys?: string[]
}

/**
 * FilterFileBanner Component
 * 
 * Provides a tabbed interface (Builder/Manual) for creating and editing filters.
 * Manages dual state: 
 * 1. 'Structure' state (Builder tab) using `query` (Query.Type)
 * 2. 'Raw' state (Manual tab) using `manualContent` (string)
 * 
 * Ensures persistence across modal re-opens via `Info` class and handles independent
 * state management for each mode.
 */
export function FilterFileBanner({
  sources: initSources,
  query: initQuery,
  keys: initKeys,
  ...props
}: FilterFileBannerProps) {
  const { app, Info, spawnBanner, destroyBanner } = Application.use()

  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<Source.Type[]>(initSources)
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  // -- State Management --
  // Builder Mode State
  const [query, setQuery] = useState<Query.Type>(initQuery ?? { string: '', filters: [] })

  // Manual Mode State (Raw JSON string)
  const [manualContent, setManualContent] = useState('')
  const [isManual, setIsManual] = useState<boolean>(!!initQuery?.isManual)

  const [keys, setKeys] = useState<string[]>(initKeys ?? [])
  const [fieldTypeMap, setFieldTypeMap] = useState<Record<string, string>>({})

  // Refs for change tracking
  const isFirstRun = useRef(true)
  const prevFileIds = useRef(files.map(f => f.id).sort().join(','))

  /** Generates a clean base query for the given files */
  const getCleanBase = (targetFiles: Source.Type[]): Query.Type => ({
    string: Filter.Entity.base(targetFiles),
    filters: []
  })

  /** 
   * Updates proper manual content derived from a query object.
   * If `raw` exists, uses it; otherwise generates from builder structure.
   */
  const getManualContentFromQuery = (q: Query.Type): string => {
    if (q.raw)
      return JSON.stringify(q.raw, null, 2);

    return JSON.stringify(Filter.Entity.query({ ...q, isManual: false, fieldTypeMap } as any), null, 2)
  }

  /**
   * Resets both Builder and Manual states to a clean base derived from current files.
   * Used when source selection changes or user explicitly resets.
   */
  const resetToCleanBase = (targetFiles: Source.Type[]) => {
    const cleanBase = getCleanBase(targetFiles)
    setQuery(cleanBase);
    setManualContent(JSON.stringify(Filter.Entity.query({ ...cleanBase, fieldTypeMap } as any), null, 2));
  }

  // -- Event Handlers --

  /**
   * Handles source selection changes.
   * PERFORMANCE: Uses imperative logic to avoid extra renders/effects.
   * Only triggers a reset if the file selection ACTUALLY changes.
   */
  const handleSourceChange = (action: SetStateAction<Source.Id[]>) => {
    let newIds: Source.Id[] = []

    if (typeof action === 'function') {
      newIds = action(files.map(f => f.id))
    } else {
      newIds = action
    }

    const newFiles = newIds.map(id => Source.Entity.id(app, id))

    // 1. Update Files State
    setFiles(newFiles)

    // 2. Conditional Reset (only if selection changed)
    const newIdsStr = newIds.sort().join(',')
    if (newIdsStr !== prevFileIds.current) {
      toast.info('Query reset based on source selection')
      resetToCleanBase(newFiles)

      // Update ref to track this new state
      prevFileIds.current = newIdsStr
    }
  }

  /**
   * Initialization Effect
   * Handles persistence restoration on mount.
   * If `initQuery` is missing (e.g. implicitly spawned), fetches saved state from `Info`.
   */
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false

      let startingQuery = initQuery
      // Fallback: Fetch persisted query from Info if no explicit prop
      if (!startingQuery && files.length) {
        const persisted = Info.getQuery(files[0]) as Query.Type & { raw?: any; mode?: 'builder' | 'manual' }
        if (persisted && (persisted.filters?.length || persisted.string || persisted.raw)) {
          startingQuery = persisted
        }
      }

      if (startingQuery) {
        // Restore State
        setQuery(startingQuery)
        setIsManual(!!startingQuery.isManual)
        setManualContent(getManualContentFromQuery(startingQuery))

        // Sync ref
        prevFileIds.current = files.map(f => f.id).sort().join(',')
        return
      } else {
        // Default Initialization
        resetToCleanBase(initSources)
        prevFileIds.current = initSources.map(f => f.id).sort().join(',')
      }
    }
    // Note: Subsequent updates are handled via handleSourceChange, not here.
  }, [files, initQuery, initSources, Info])

  // -- Keys Fetching --
  useEffect(() => {
    if (initKeys?.length) {
      setKeys(initKeys)
      return
    }

    let cancelled = false
      ; (async () => {
        const set = new Set<string>()
        const map: Record<string, string> = {}
        await Promise.all(
          files.map(async file => {
            const fileKeys = await Info.event_keys(file)
            Object.entries(fileKeys).forEach(([k, t]) => {
              set.add(k)
              map[k] = t as string
            })
          })
        )
        if (!cancelled) {
          setKeys([...set])
          setFieldTypeMap(map)
        }
      })()

    return () => { cancelled = true }
  }, [Info, files, initKeys])

  const setFilters = useCallback(
    (filters: Filter.Type[]) => setQuery(q => ({ ...q, filters })),
    []
  )

  /**
   * Constructs the final query object for execution.
   * Includes both Builder state and Manual state (marked by mode).
   * Validates JSON in Manual mode.
   */
  const getFinalQuery = useCallback((): Query.Type | null => {
    const builderState = { ...query }
    let manualState = undefined;

    try {
      manualState = JSON.parse(manualContent)
    } catch {
      if (isManual) {
        toast.error('Invalid JSON')
        return null
      }
      // In builder mode, we can ignore invalid manual content or fallback
    }

    return {
      ...builderState,
      raw: manualState,
      isManual
    }
  }, [isManual, manualContent, query])

  /** Submits the query to the App/Info, refetches, and closes. */
  const submit = useCallback(async () => {
    const finalQuery = getFinalQuery()
    if (!finalQuery) return

    setLoading(true)
    try {
      Info.filters_cache(files)
      // This saves the query (including mode/raw) to app state
      Info.setQuery(files, finalQuery)
      await Info.refetch({ ids: files.map(f => f.id), addToHistory: true })
      Info.render()
      props.back ? props.back() : destroyBanner()
    } finally {
      setLoading(false)
    }
  }, [Info, files, getFinalQuery, props, destroyBanner])

  // -- Render Components --

  const getQueryWithFlaggedEvents = useCallback(() => {
    const baseQuery = Filter.Entity.query({ ...query, fieldTypeMap } as any)
    if (flaggedOnly) {
      const operation = Operation.Entity.selected(app);
      const flaggedEvents = Doc.Entity.flag.getDocIds(app, operation?.id);
      if (flaggedEvents.length > 0) {
        if (!baseQuery.bool) baseQuery.bool = { must: [] }
        if (!baseQuery.bool.must) baseQuery.bool.must = []
        baseQuery.bool.must.push({ terms: { id: flaggedEvents } })
      }
    }
    return baseQuery
  }, [query, flaggedOnly, app, fieldTypeMap])

  const Done = useMemo(
    () => (
      <Button
        icon="Check"
        variant="glass"
        loading={loading}
        onClick={submit}
      />
    ),
    [loading, submit]
  )

  const QueryStringPart = useMemo(() => {
    return (
      <OpenSearchQueryBuilder.Query.String
        style={fws}
        string={query.string}
        setString={string => setQuery(q => ({ ...q, string }))}
        reset={() => setQuery(q => ({ ...q, string: Filter.Entity.base(files) }))}
      />
    )
  }, [files, query.string])

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
    const finalQuery = getFinalQuery()
    if (!finalQuery) return

    setIsPreviewLoading(true)
    Info.preview_query({...finalQuery , fieldTypeMap} as any)
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
                    sources={files}
                    query={finalQuery}
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
  }, [Info, getFinalQuery, files, keys, spawnBanner, props])

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

  // -- Manual Tab Handlers --

  const handleManualReset = () => {
    resetToCleanBase(files)
    toast.success('Reset to generated query from sources')
  }

  const handleBeautify = useCallback(() => {
    try {
      setManualContent(JSON.stringify(JSON.parse(manualContent), null, 2))
    } catch {
      toast.error('Failed to parse JSON input');
    }
  }, [manualContent]);

  return (
    <Banner
      title="Choose filtering options"
      done={Done}
      side={!isManual ? <OpenSearchQueryBuilder.Preview query={getQueryWithFlaggedEvents()} /> : null}
      subtitle={LastQueries}
      className={s.banner}
      {...props}
    >
      <Source.Select.Multi
        selected={files.map(f => f.id)}
        setSelected={handleSourceChange}
        placeholder="Select files to apply filters"
      />

      <Tabs value={String(isManual)} onValueChange={v => setIsManual(v === 'true')}>
        <Stack dir='row' jc='space-between'>
          <TabsList>
            <TabsTrigger value="false">Builder</TabsTrigger>
            <TabsTrigger value="true">Manual</TabsTrigger>
          </TabsList>
          <Stack style={{ margin: '8px 0' }}>
            <Checkbox id='isFlagedEventOnly' checked={flaggedOnly} onCheckedChange={(v) => setFlaggedOnly(!!v)} />
            <Label htmlFor='isFlagedEventOnly' value='Flagged events only' cursor='pointer' />
          </Stack>
        </Stack>
        <Separator style={{ margin: '8px 0' }} />
        <TabsContent value="false">
          <Stack dir='column' ai='stretch'>
            {QueryStringPart}
            {AddCondition}
            <Separator />
            {QueryConditions}
          </Stack>
        </TabsContent>
        <TabsContent value="true">
          <Textarea
            className={s.manualTextarea}
            value={manualContent}
            onChange={e => setManualContent(e.target.value)}
            placeholder="Edit OpenSearch query JSON..."
          />
        </TabsContent>
      </Tabs>
      <Stack ai="center" jc="flex-start" dir="row">
        <Button
          variant="glass"
          loading={isPreviewLoading}
          onClick={previewCurrentFilterButtonClickHandler}
          icon="PreviewDocument"
        >
          Preview result of current filter
        </Button>

        {isManual && (
          <>
            <Button
              variant="secondary"
              icon="RefreshCw"
              onClick={handleManualReset}
            >
              Reset to generated
            </Button>
            <Button
              variant="secondary"
              icon="Wand"
              onClick={handleBeautify}
            >
              Beautify
            </Button>
          </>
        )}
      </Stack>
    </Banner>
  )
}
