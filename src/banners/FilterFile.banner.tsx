import s from './styles/FilterFileBanner.module.css'
import { Banner } from '@/ui/Banner'
import { Application } from '@/context/Application.context'
import { useCallback, useEffect, useMemo, useRef, useState, SetStateAction, memo } from 'react'
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
import { Glyph } from '@/entities/Glyph'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs'
import { Textarea } from '@/ui/Textarea'
import { Label } from '@/ui/Label'

interface FilterFileBannerProps extends Banner.Props {
  sources: Source.Type[]
  query?: Query.Type
  keys?: string[]
  create_notes?: boolean;
  notes_color?: string;
  notes_tags?: string[];
  notes_glyph_id?: Glyph.Id;
  name?: string;
}

const LastQueriesComponent = memo(({ 
  list, 
  onSelect,
  Info,
  files
}: { 
  list: Query.Type[], 
  onSelect: (q: Query.Type) => void,
  Info: any,
  files: Source.Type[]
}) => {
  if (list.length === 0) return null;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button icon="ClockFading" variant="secondary">
          Last filters
        </Button>
      </Popover.Trigger>
      <Popover.Content className={s.lastFilters}>
        <Stack dir="column">
          {list.map((q, i) => (
            <div key={i}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Stack>
                        <p>{q.string}</p>
                        <Button icon="Check" variant="glass" onClick={() => {
                          onSelect(q);
                          Info.setQuery(files, q);
                        }} />
                      </Stack>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className={s.tooltip}>
                    <p>{q.string}</p>
                    <p>{JSON.stringify(q.filters, null, 2)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {list.length - 1 > i && <Separator />}
            </div>
          ))}
        </Stack>
      </Popover.Content>
    </Popover.Root>
  );
});

export function FilterFileBanner({
  sources: initSources,
  query: initQuery,
  keys: initKeys,
  create_notes: initCreateNotes,
  notes_color,
  notes_tags,
  notes_glyph_id,
  name,
  ...props
}: FilterFileBannerProps) {
  const { app, Info, spawnBanner, destroyBanner } = Application.use()

  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<Source.Type[]>(initSources)
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [createNotesChecked, setCreateNotesChecked] = useState(!!initCreateNotes);
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

  const getCleanBase = useCallback((targetFiles: Source.Type[]): Query.Type => ({
    string: Filter.Entity.base(targetFiles),
    filters: []
  }), []);

  const getManualContentFromQuery = useCallback((q: Query.Type): string => {
    if (q.raw) return JSON.stringify(q.raw, null, 2);
    return JSON.stringify(Filter.Entity.query({ ...q, isManual: false, fieldTypeMap } as any), null, 2)
  }, [fieldTypeMap]);

  const resetToCleanBase = useCallback((targetFiles: Source.Type[]) => {
    const cleanBase = getCleanBase(targetFiles)
    setQuery(cleanBase);
    setManualContent(JSON.stringify(Filter.Entity.query({ ...cleanBase, fieldTypeMap } as any), null, 2));
  }, [getCleanBase, fieldTypeMap]);

  const fileIds = useMemo(() => files.map(f => f.id), [files])

  const handleSourceChange = useCallback((action: SetStateAction<Source.Id[]>) => {
    let newIds: Source.Id[] = []
    if (typeof action === 'function') {
      newIds = action(files.map(f => f.id))
    } else {
      newIds = action
    }

    const newFiles = newIds.map(id => Source.Entity.id(app, id))
    setFiles(newFiles)

    const newIdsStr = newIds.sort().join(',')
    if (newIdsStr !== prevFileIds.current) {
      if (isManual) {
        toast.info('Query reset based on source selection')
        resetToCleanBase(newFiles)
      } else {
        toast.info('Query string updated based on source selection')
        const newBaseString = Filter.Entity.base(newFiles)
        setQuery(prev => {
          const updated = { ...prev, string: newBaseString }
          setManualContent(JSON.stringify(Filter.Entity.query({ ...updated, fieldTypeMap } as any), null, 2))
          return updated
        })
      }
      prevFileIds.current = newIdsStr
    }
  }, [app, files, isManual, resetToCleanBase, fieldTypeMap])

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      let startingQuery = initQuery
      if (!startingQuery && files.length) {
        const persisted = Info.getQuery(files[0]) as Query.Type & { raw?: any; mode?: 'builder' | 'manual' }
        if (persisted && (persisted.filters?.length || persisted.string || persisted.raw)) {
          startingQuery = persisted
        }
      }

      if (startingQuery) {
        setQuery(startingQuery)
        setIsManual(!!startingQuery.isManual)
        setManualContent(getManualContentFromQuery(startingQuery))
        prevFileIds.current = files.map(f => f.id).sort().join(',')
        return
      } else {
        resetToCleanBase(initSources)
        prevFileIds.current = initSources.map(f => f.id).sort().join(',')
      }
    }
  }, [files, initQuery, initSources, Info, getManualContentFromQuery, resetToCleanBase])

  useEffect(() => {
    if (initKeys?.length) {
      setKeys(initKeys)
      return
    }

    let cancelled = false
    ;(async () => {
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
        const sortedKeys = [...set].sort((a, b) => a.localeCompare(b));
        setKeys(sortedKeys)
        setFieldTypeMap(map)
      }
    })()
    return () => { cancelled = true }
  }, [Info, files, initKeys])

  const setFilters = useCallback(
    (filters: Filter.Type[] | ((prev: Filter.Type[]) => Filter.Type[])) =>
      setQuery(q => ({
        ...q,
        filters: typeof filters === 'function' ? filters(q.filters) : filters
      })),
    []
  )

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
    }
    return { ...builderState, raw: manualState, isManual }
  }, [isManual, manualContent, query])

  const submit = useCallback(async () => {
    const finalQuery = getFinalQuery()
    if (!finalQuery) return

    setLoading(true)
    try {
      Info.filters_cache(files)
      Info.setQuery(files, finalQuery)
      await Info.refetch({
        ids: files.map(f => f.id),
        addToHistory: true,
        create_notes: createNotesChecked,
        notes_color,
        notes_tags,
        notes_glyph_id,
        name,
      })
      Info.render()
      props.back ? props.back() : destroyBanner()
    } finally {
      setLoading(false)
    }
  }, [Info, files, getFinalQuery, createNotesChecked, notes_color, notes_tags, notes_glyph_id, name, props, destroyBanner])

  const queryWithFlaggedEvents = useMemo(() => {
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

  const QueryStringPart = useMemo(() => (
    <OpenSearchQueryBuilder.Query.String
      style={fws}
      string={query.string}
      setString={string => setQuery(q => ({ ...q, string }))}
      reset={() => setQuery(q => ({ ...q, string: Filter.Entity.base(files) }))}
    />
  ), [files, query.string])

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
                    create_notes={initCreateNotes}
                    notes_color={notes_color}
                    notes_tags={notes_tags}
                    notes_glyph_id={notes_glyph_id}
                    name={name}
                    {...props}
                  />
                )
              }
            />
          )
        }
      })
      .finally(() => setIsPreviewLoading(false))
  }, [Info, getFinalQuery, files, keys, spawnBanner, props, initCreateNotes, name, notes_color, notes_glyph_id, notes_tags])

  const [lastQueriesList, setLastQueriesList] = useState<Query.Type[]>([])

  useEffect(() => {
    Info.getLastQueries().then(setLastQueriesList)
  }, [Info])

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
      side={!isManual ? <OpenSearchQueryBuilder.Preview query={queryWithFlaggedEvents} /> : null}
      subtitle={<LastQueriesComponent list={lastQueriesList} onSelect={setQuery} Info={Info} files={files} />}
      className={s.banner}
      {...props}
    >
      {useMemo(() => (
        <Source.Select.Multi
          selected={fileIds}
          setSelected={handleSourceChange}
          placeholder="Select files to apply filters"
        />
      ), [fileIds, handleSourceChange])}

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
      {initCreateNotes !== undefined && initCreateNotes !== null && initCreateNotes !== false && (
        <>
          <Separator style={{ margin: '8px 0' }} />
          <Stack style={{ margin: '8px 0' }}>
            <Checkbox
              id='create_notes'
              checked={createNotesChecked}
              onCheckedChange={(v) => setCreateNotesChecked(!!v)}
            />
            <Label
              htmlFor='create_notes'
              value='If flagged for any documents found gulp add a note.'
              cursor='pointer'
            />
          </Stack>
        </>
      )}
    </Banner>
  )
}
