import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Application } from '@/context/Application.context'
import { Input } from '@/ui/Input'
import { Stack } from '@/ui/Stack'
import { Checkbox } from '@/ui/Checkbox'
import { Select } from '@/ui/Select'
import { Button } from '@/ui/Button'
import { Popover } from '@/ui/Popover'
import { Label } from '@/ui/Label'
import { Table } from '@/components/Table'
import { Source } from '@/entities/Source'
import { Context } from '@/entities/Context'
import { MinMax } from '@/class/Info'
import { Query } from '@/entities/Query'
import s from './styles/TableViewWindow.module.css'
import { cn } from '@impactium/utils'
import { toast } from 'sonner'
import { Toggle } from '@/ui/Toggle'
import { Internal } from '@/entities/addon/Internal'
import { format } from 'date-fns'
import { Logger } from '@/dto/Logger.class'
import { Icon } from '@impactium/icons'
import { Doc } from '@/entities/Doc'
import { NoteFunctionality } from '@/banners/Collab.functionality'
import { WindowBridge } from '@/lib/WindowBridge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'

export namespace TableViewWindow {
  export interface Props {
    initialSourceId?: Source.Id
    onClose?: () => void
  }
}

/**
 * Helper component for date selection using datetime-local input.
 * Converts nanoseconds timestamps to/from browser-compatible date strings.
 */
function InputDateSelection({ type, value, valid, onChange }: { 
  type: 'min' | 'max', 
  value: string, 
  valid: boolean, 
  onChange: (val: string) => void 
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  
  /**
   * Formats a nanosecond timestamp string into a "yyyy-MM-dd'T'HH:mm" format.
   */
  const getFormattedValue = (val: string) => {
    try {
      const ms = Number(BigInt(val) / 1000000n)
      return format(ms, "yyyy-MM-dd'T'HH:mm")
    } catch {
      return ""
    }
  }

  const [localValue, setLocalValue] = useState(getFormattedValue(value))

  useEffect(() => {
    setLocalValue(getFormattedValue(value))
  }, [value])

  // Native showPicker support for better UX
  useEffect(() => {
    const input = inputRef.current
    const icon = input?.parentElement?.querySelector('svg')
    const clickHandler = () => input?.showPicker?.()
    icon?.addEventListener('click', clickHandler)
    return () => icon?.removeEventListener('click', clickHandler)
  }, [])

  return (
    <Input
      ref={inputRef}
      label={type === 'min' ? 'From' : 'To'}
      type="datetime-local"
      valid={valid}
      variant="highlighted"
      icon="Calendar"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        onChange(e.target.value)
      }}
    />
  )
}

/**
 * Helper component for ISO string selection.
 * Handles manual entry of ISO 8601 strings and synchronizes with nanosecond state.
 */
function InputISOSelection({ type, value, valid, onChange }: { 
  type: 'min' | 'max', 
  value: string, 
  valid: boolean, 
  onChange: (val: string) => void 
}) {
  const [localValue, setLocalValue] = useState(Internal.Transformator.toISO(value))

  useEffect(() => {
    // Only update local value if it's different from the formatted current value
    // to avoid interrupting user typing
    const currentISO = Internal.Transformator.toISO(value)
    if (Internal.Transformator.toNanos(localValue) !== Internal.Transformator.toNanos(currentISO)) {
       setLocalValue(currentISO)
    }
  }, [value])

  return (
    <Input
      label={type === 'min' ? 'From' : 'To'}
      type="text"
      icon="Calendar"
      placeholder="Enter date in ISO format"
      variant="highlighted"
      valid={valid}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        onChange(e.target.value)
      }}
    />
  )
}

/**
 * TableViewWindow Component
 * Opens a paginated table view of raw events for a specific source.
 */
export function TableViewWindow({ initialSourceId, onClose }: TableViewWindow.Props) {
  // --- Constants ---
  const DEFAULT_HIDDEN_FIELDS = [
    "_id", 
    "gulp.source_id", 
    "gulp.context_id", 
    "gulp.operation_id", 
    "gulp.event_code", 
    "event.original", 
    "gulp.timestamp",
    "gulp.unmapped",
    "gulp.enrich"
  ]

  // --- Context & Infrastructure ---
  const { Info, app, spawnBanner, banner } = Application.use()
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  
  // --- Selection & Sync State ---
  const [isSynced, setIsSynced] = useState<boolean>(false)
  const [selectedSourceId, setSelectedSourceId] = useState<Source.Id | null>(initialSourceId ?? null)
  
  const selectedSource = useMemo(() => 
    selectedSourceId ? Source.Entity.id(app, selectedSourceId) : null
  , [app, selectedSourceId])

  const selectedOperationId = app.target.operations.find(o => o.selected)?.id

  // --- Filter Derived State ---
  const syncedSourceFilter = selectedSourceId ? app.target.filters?.[selectedSourceId] : null
  
  const serializedFilters = useMemo(() => {
    return JSON.stringify(syncedSourceFilter?.filters || [])
  }, [syncedSourceFilter])
  
  const syncedTextFilter = syncedSourceFilter?.text_filter || '';

  const [localFieldTypeMap, setLocalFieldTypeMap] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    setLocalFieldTypeMap(null)
  }, [selectedSourceId])

  useEffect(() => {
    if (syncedSourceFilter?.fieldTypeMap && Object.keys(syncedSourceFilter.fieldTypeMap).length > 0) {
      setLocalFieldTypeMap(syncedSourceFilter.fieldTypeMap)
    }
  }, [syncedSourceFilter?.fieldTypeMap])

  const columns = useMemo(() => {
    if (!localFieldTypeMap) return undefined
    return Object.keys(localFieldTypeMap).sort((a, b) => a.localeCompare(b))
  }, [localFieldTypeMap])

  // --- Pagination & Search State ---
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sortField, setSortField] = useState<string>('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  /**
   * Memoized list of fields that are allowed for sorting in OpenSearch.
   * 
   * Exclusions:
   * - Data types: 'text', 'flattened', 'unmapped', 'flat_object'
   * - Field patterns: 'gulp.unmapped.*', 'gulp.enrich.*'
   * - Specific hidden fields: DEFAULT_HIDDEN_FIELDS
   * 
   * Note: '@timestamp' is preferred, but 'timestamp' is always added as a fallback
   * if no timestamp field survived the filter.
   */
  const sortableFields = useMemo(() => {
    const map = localFieldTypeMap
    const fields: string[] = []

    if (map) {
      Object.entries(map).forEach(([field, type]) => {
        const t = String(type).toLowerCase().trim()
        const f = String(field).toLowerCase().trim()

        const isDisallowedType = ['text', 'flattened', 'unmapped', 'flat_object'].includes(t)
        const isInternalGulpField = f.startsWith("gulp.unmapped") || f.startsWith("gulp.enrich")
        const isHiddenField = DEFAULT_HIDDEN_FIELDS.includes(f)

        if (!isDisallowedType && !isInternalGulpField && !isHiddenField) {
          fields.push(field)
        }
      })
    }

    if (!fields.includes('timestamp') && !fields.includes('@timestamp')) {
      fields.push('timestamp')
    }

    return fields.sort((a, b) => a.localeCompare(b))
  }, [localFieldTypeMap])

  /**
   * Resets sort field if it's no longer valid for the selected source.
   */
  useEffect(() => {
    // If current sortField is not in sortableFields, try to find a valid default
    if (!sortableFields.includes(sortField)) {
      if (sortField === 'timestamp' && sortableFields.includes('@timestamp')) {
        setSortField('@timestamp')
      } else if (sortField === '@timestamp' && sortableFields.includes('timestamp')) {
        setSortField('timestamp')
      } else if (sortField !== 'timestamp') {
        setSortField('timestamp')
      }
    }
  }, [sortableFields, sortField])

  // --- Data & Results State ---
  const [data, setData] = useState<any[]>([])
  const [totalHits, setTotalHits] = useState<number>(0)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  
  // --- Display & Validation State ---
  const [manual, setManual] = useState(false)
  const [isMinValid, setIsMinValid] = useState(true)
  const [isMaxValid, setIsMaxValid] = useState(true)
  const [timeFrame, setTimeFrame] = useState<{ min: string, max: string }>({
    min: (app.timeline.frame.min * 1000000).toString(),
    max: (app.timeline.frame.max * 1000000).toString(),
  })

  // --- Performance Optimization: State Adjustment during Rendering ---
  /**
   * Pattern: Adjusting state while rendering.
   * This logic detects changes in global state (like filters or timeline) or selection 
   * and resets local pagination/search state within a single render pass.
   * This prevents "useEffect cascades" that cause double-fetches.
   */
  const prevSyncRef = useRef({
    sourceId: selectedSourceId,
    operationId: selectedOperationId,
    isSynced,
    filters: serializedFilters,
    textFilter: syncedTextFilter
  });

  useEffect(() => {
    const prev = prevSyncRef.current;
    
    const hasLogicalChange = 
      prev.sourceId !== selectedSourceId ||
      prev.operationId !== selectedOperationId ||
      prev.isSynced !== isSynced ||
      (isSynced && (prev.filters !== serializedFilters || prev.textFilter !== syncedTextFilter));

    if (hasLogicalChange) {
      const opChanged = prev.operationId !== selectedOperationId;
      const sourceChanged = prev.sourceId !== selectedSourceId;

      // Reset pagination and search
      setCurrentPage(1);
      setSearchQuery('');
      setLocalSearchQuery('');

      if (opChanged) {
        setSelectedSourceId(null);
        setData([]);
        setTotalHits(0);
      }

      // Sync timeframe
      if (isSynced) {
        setTimeFrame({
          min: (app.timeline.frame.min * 1000000).toString(),
          max: (app.timeline.frame.max * 1000000).toString(),
        });
      } else if (sourceChanged && selectedSource) {
        setTimeFrame({
          min: selectedSource.nanotimestamp?.min ? selectedSource.nanotimestamp.min.toString() : (app.timeline.frame.min * 1000000).toString(),
          max: selectedSource.nanotimestamp?.max ? selectedSource.nanotimestamp.max.toString() : (app.timeline.frame.max * 1000000).toString(),
        });
      }

      // Update ref
      prevSyncRef.current = {
        sourceId: selectedSourceId,
        operationId: selectedOperationId,
        isSynced,
        filters: serializedFilters,
        textFilter: syncedTextFilter
      };
      
      // Il fetchTableData verrà triggerato automaticamente dall'useEffect 
      // che ha come dipendenze questi stati (currentPage, sortField, ecc.)
    }
  }, [selectedSourceId, selectedOperationId, isSynced, serializedFilters, syncedTextFilter, app.timeline.frame, selectedSource]);

  /**
   * Derived pagination info.
   */
  const totalPages = Math.max(1, Math.ceil(totalHits / pageSize))

  /**
   * Page overflow protection.
   * If total results decrease, ensure we don't stay on a non-existent page.
   */
  if (currentPage > totalPages) {
    setCurrentPage(1)
  }

  // --- Derived Query Parameters ---
  const activeMin = isSynced && selectedSource?.nanotimestamp?.min 
      ? selectedSource.nanotimestamp.min.toString() 
      : timeFrame.min;
      
  const activeMax = isSynced && selectedSource?.nanotimestamp?.max 
      ? selectedSource.nanotimestamp.max.toString() 
      : timeFrame.max;
  const activeFilters = isSynced && selectedSourceId ? app.target.filters[selectedSourceId] : null
  const activeSerializedFilters = isSynced ? serializedFilters : "[]"
  const activeTextFilter = isSynced ? syncedTextFilter : searchQuery

  // --- Data Fetching ---

  /**
   * Main function to fetch events from the backend.
   * Uses query_paginate to retrieve a specific slice of data based on current state.
   */
  const fetchTableData = useCallback(async () => {
    if (!selectedSource) return;
    setLoading(true)
    try {
      let queryObj: Query.Type
      
      // Branch logic: Determine if we use synced global filters or local search query
      if (isSynced) {
        if (activeFilters) {
          let filter = {...activeFilters}
          if (filter.source_config) {filter.source_config.source_ids=[selectedSource.id]}
          queryObj = { ...filter, text_filter: syncedTextFilter, } as any;
        } else {
          queryObj = {
            string: "",
            filters: [],
            text_filter: "",
            source_config: {
              operation_id: selectedSource.operation_id,
              source_ids: [selectedSource.id],
              range: { min: activeMin, max: activeMax },
            },
          } as any;
        }
      } else {
        queryObj = {
          string: '',
          filters: [],
          text_filter: searchQuery,
          source_config: {
            operation_id: selectedSource.operation_id,
            source_ids: [selectedSource.id],
            range: { min: activeMin, max: activeMax }
          }
        } as any;
      }

      const limit = pageSize
      const offset = pageSize * (currentPage - 1)
      const sortOpt = {
        [sortField === 'timestamp' ? '@timestamp' : sortField]: sortDirection
      }

      const res = await Info.query_paginate(queryObj, { limit, offset, sort: sortOpt })
      
      setData(res?.docs || [])
      setTotalHits(res?.total_hits || 0)
      setSelectedRows(new Set())
    } catch (e) {
      toast.error('Failed to fetch table data')
    } finally {
      setLoading(false)
    }
    // We use stable primitives (IDs and serialized strings) for dependencies to avoid 
    // redundant fetches when global object references change.
  }, [selectedSource?.id, selectedSource?.operation_id, isSynced, activeMin, activeMax, activeSerializedFilters, activeTextFilter, pageSize, currentPage, sortField, sortDirection, Info])

  /**
   * Effect to trigger fetch whenever logical query parameters change.
   */
  useEffect(() => {
    fetchTableData()
  }, [fetchTableData])

  // --- Event Handlers ---

  /**
   * Commits the local search query and resets to page 1.
   */
  const triggerSearch = useCallback(() => {
    setSearchQuery(localSearchQuery)
    setCurrentPage(1)
  }, [localSearchQuery])

  /**
   * Updates local search query state as user types.
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(e.target.value)
  }

  /**
   * Handles Enter key press in search input.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerSearch()
    }
  }

  /**
   * Validates and updates the time range boundaries.
   */
  const handleTimeChange = (type: 'min' | 'max', value: string | number) => {
    try {
      const nanos = Internal.Transformator.toNanos(value).toString()
      if (nanos === '0' && value !== '') {
        if (type === 'min') setIsMinValid(false)
        else setIsMaxValid(false)
        return
      }
      
      setTimeFrame(prev => {
        const next = { ...prev, [type]: nanos }
        const min = BigInt(next.min)
        const max = BigInt(next.max)
        setIsMinValid(min < max)
        setIsMaxValid(max > min)
        return next
      })
      setCurrentPage(1)
    } catch (e) {
      if (type === 'min') setIsMinValid(false)
      else setIsMaxValid(false)
    }
  }

  /**
   * Updates the sort field and resets to page 1.
   */
  const handleSortFieldChange = (val: string) => {
    setSortField(val)
    setCurrentPage(1)
  }

  /**
   * Toggles the sort direction and resets to page 1.
   */
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    setCurrentPage(1)
  }

  /**
   * Selects or deselects all visible rows.
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data.map((_, i) => i)))
    } else {
      setSelectedRows(new Set())
    }
  }

  /**
   * Performs bulk operations (flagging or notes) on selected rows.
   */
  const handleBulkAction = async (action: 'flagged' | 'notes') => {
    if (!selectedSource) return
    if (selectedRows.size === 0) {
      toast.error('No items selected')
      return
    }
    const selectedDocs = Array.from(selectedRows).map(i => data[i])
    
    if (action === 'flagged') {
      for (const doc of selectedDocs) {
        Doc.Entity.flag.toggle(doc._id, selectedSource.operation_id)
      }
      const bridge = WindowBridge.create(WindowBridge.generateId(), () => {})
      bridge.send(WindowBridge.MessageType.FLAGS_CHANGED, {
        docId: selectedDocs[0]._id,
        operationId: selectedSource.operation_id,
      })
      bridge.destroy()
    } else if (action === 'notes') {
      spawnBanner(<NoteFunctionality.Create.Banner events={selectedDocs} container={container} />, 'table')
    }
  }

  /**
   * Handles clicking an action on a specific row (usually to target an event in the main view).
   */
  const handleRowAction = useCallback((doc: any) => {
    if(!selectedSource) return;
    const bridge = WindowBridge.create(WindowBridge.generateId(), () => {})
    bridge.send(WindowBridge.MessageType.TARGET_NOTE, {
      docId: doc._id,
      operationId: selectedSource.operation_id,
    })
    bridge.destroy()
  }, [selectedSource?.operation_id])

  // --- Window Bridge Listener ---
  useEffect(() => {
    const bridgeId = WindowBridge.generateId()
    const bridge = WindowBridge.create(bridgeId, (message) => {
      if (message.type === WindowBridge.MessageType.TABLE_SELECT_SOURCE) {
        const payload = message.payload as WindowBridge.TableSelectSourcePayload
        setSelectedSourceId(payload.sourceId as Source.Id)
      }
    })
    return () => bridge.destroy()
  }, [])

  // --- Constants ---
  
  const isAllSelected = data.length > 0 && selectedRows.size === data.length

  return (
    <div className={s.main} ref={setContainer}>
      <div className={s.header}>
        <h2>Table View{selectedSource ? `: ${selectedSource.name}` : ''}</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Toggle
                  checked={isSynced}
                  onCheckedChange={setIsSynced}
                  option={['Detached', 'Synced']}
                  disabled={!selectedSourceId}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div style={{ maxWidth: 300 }}>
                {isSynced 
                  ? "Synced: Following global filters and timeline range. Local search is disabled."
                  : "Detached: Use local search and independent time range filters."}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className={s.row1}>
        <div className={s.sourceRow}>
          <Select.Root onValueChange={(val) => setSelectedSourceId(val as Source.Id)} value={selectedSourceId || ''}>
            <Select.Trigger data-no-icon>
              <Stack gap={8} ai="center">
                <Icon name='File' />
                <Select.Value placeholder="Select a source..." />
              </Stack>
            </Select.Trigger>
            <Select.Content container={container}>
              {Source.Entity.selected(app).map(f => {
                const ctx = Context.Entity.id(app, f.context_id)
                return (
                  <Select.Item key={f.id} value={f.id}>
                    {f.name} {ctx ? `(${ctx.name})` : ''}
                  </Select.Item>
                )
              })}
            </Select.Content>
          </Select.Root>
        </div>

        {!isSynced && (<Stack ai="center" gap={12}>
          <Toggle
            checked={manual}
            onCheckedChange={setManual}
            option={['Select dates', 'ISO String']}
            disabled={!selectedSourceId}
          />
        </Stack>)}
        {!isSynced && (<div className={s.timeRow}>
          {manual ? (
            <>
              <InputISOSelection
                type="min"
                value={timeFrame.min}
                valid={isMinValid}
                onChange={(val) => handleTimeChange('min', val)}
              />
              <InputISOSelection
                type="max"
                value={timeFrame.max}
                valid={isMaxValid}
                onChange={(val) => handleTimeChange('max', val)}
              />
            </>
          ) : (
            <>
              <InputDateSelection
                type="min"
                value={timeFrame.min}
                valid={isMinValid}
                onChange={(val) => handleTimeChange('min', val)}
              />
              <InputDateSelection
                type="max"
                value={timeFrame.max}
                valid={isMaxValid}
                onChange={(val) => handleTimeChange('max', val)}
              />
            </>
          )}
        </div>)}
        {!isSynced && (<div className={s.searchRow}>
          <Stack gap={8} ai="flex-end">
            <Input
              label="Search"
              placeholder="Search event.original..."
              icon="MagnifyingGlass"
              variant="highlighted"
              value={localSearchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
            <Button
              variant="glass"
              icon="MagnifyingGlassSmall"
              onClick={triggerSearch}
              title="Search"
            />
          </Stack>
        </div>)}
      </div>

      <div className={s.row2}>
        <div className={s.row2Left}>
          <Stack gap={8} ai="center">
            <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
            <span className={cn(s.label, s.pointer)} onClick={() => handleSelectAll(!isAllSelected)}>
              Select All Visible
            </span>
          </Stack>
          
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button 
                variant="secondary" 
                icon="ChevronDown"
                disabled={selectedRows.size === 0}
              >
                Action
              </Button>
            </Popover.Trigger>
            <Popover.Content align="start" sideOffset={4} className={s.popoverContent} container={container}>
              <div 
                className={s.menuItem} 
                onClick={() => handleBulkAction('flagged')}
              >
                <Icon name="Flag" size={14} />
                <span>Flag</span>
              </div>
              <div 
                className={s.menuItem} 
                onClick={() => handleBulkAction('notes')}
              >
                <Icon name="StickyNote" size={14} />
                <span>New notes</span>
              </div>
            </Popover.Content>
          </Popover.Root>

          <Stack gap={8} ai="center">
            <Label value="sort:" />
            <Select.Root onValueChange={handleSortFieldChange} value={sortField}>
              <Select.Trigger data-no-icon className={s.sortSelect}><Select.Value /></Select.Trigger>
              <Select.Content container={container}>
                {sortableFields.map(f => (
                  <Select.Item key={f} value={f}>{f}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Button 
              variant="secondary" 
              icon={sortDirection === 'asc' ? 'SortAscending' : 'SortDescending'} 
              onClick={toggleSortDirection} 
              title="Toggle Sort Direction" 
            />
          </Stack>
        </div>

        <div className={s.row2Right}>
          <span className={s.label}>
            Show {totalHits > 0 ? pageSize * (currentPage - 1) + 1 : 0}-{Math.min(pageSize * currentPage, totalHits)} of {totalHits}
          </span>
          
          <Stack gap={8} ai="center">
            <Select.Root onValueChange={(val) => setPageSize(Number(val))} value={pageSize.toString()}>
              <Select.Trigger className={s.pageSelect}><Select.Value placeholder="50" /></Select.Trigger>
              <Select.Content container={container}>
                <Select.Item value="20">20</Select.Item>
                <Select.Item value="50">50</Select.Item>
                <Select.Item value="100">100</Select.Item>
              </Select.Content>
            </Select.Root>
            <span className={s.label}>/ page</span>
          </Stack>

          <span className={s.label}>
            Page {currentPage} of {totalPages}
          </span>

          <Stack gap={4}>
            <Button variant="secondary" icon="ChevronLeft" disabled={currentPage <= 1 || loading} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} title="Previous Page" />
            <Button variant="secondary" icon="ChevronRight" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} title="Next Page" />
          </Stack>
        </div>
      </div>

      <div className={s.result}>
        {!selectedSourceId ? (
           <div className={s.placeholder}>Select a source to view events</div>
        ) : loading ? (
           <p className={s.label}>Loading data...</p>
        ) : data.length > 0 ? (
           <Table 
             values={data}
             columns={columns}
             includeIndex={false} 
             notshow={DEFAULT_HIDDEN_FIELDS} 
             selectable={true}
             selectedrows={selectedRows}
             onrowselect={(index, selected) => {
               setSelectedRows(prev => {
                 const next = new Set(prev)
                 if (selected) next.add(index)
                 else next.delete(index)
                 return next
               })
             }}
             onrowaction={handleRowAction}
             iconAction="Search"
             sortField={sortField}
             sortDirection={sortDirection}
             onSort={(field) => {
               if (sortableFields.includes(field)) {
                 if (sortField === field) {
                   toggleSortDirection()
                 } else {
                   handleSortFieldChange(field)
                 }
               }
             }}
             highlightedId={app.timeline.target?._id}
           />
        ) : (
           <p className={s.label}>No data found matching your query.</p>
        )}
      </div>
      {banner?.target === 'table' && banner.node}
    </div>
  )
}
