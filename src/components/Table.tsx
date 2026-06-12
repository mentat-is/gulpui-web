import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import s from './styles/Table.module.css'
import { cn } from '@impactium/utils'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Checkbox } from '@/ui/Checkbox'
import { Glyph } from '@/entities/Glyph'
import { Button } from '@/ui/Button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/ui/Tooltip'
import { Color } from '@/entities/Color'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/ui/ContextMenu'
import { useTableConfig } from '@/hooks/useTableConfig'

export type Object = Record<string, any>

export namespace Table {
  /**
   * Describes a single action button rendered per row.
   * The parent component manages the callback logic.
   */
  export interface Action<T extends Object> {
    /** Icon name from the icon library. */
    icon: Icon.Name
    /** Accessible label, rendered as a tooltip on hover. */
    label: string
    /** Callback executed when this action is triggered. */
    onClick: (value: T, index: number) => void
    /** Optional variant for the action button. Defaults to 'tertiary'. */
    variant?: 'secondary' | 'tertiary'
  }

  /**
   * Custom render function signature for individual cells.
   * Returns a React node to override the default stringified fallback.
   */
  export type CellRenderer<T extends Object> = (
    value: unknown,
    row: T,
    columnKey: string,
    rowIndex: number
  ) => React.ReactNode

  /** Map column keys to custom cell renderers. */
  export type RenderMap<T extends Object> = Record<string, CellRenderer<T>>

  /**
   * Describes the configuration of a single column inside the Table.
   */
  export interface ColumnDefinition<T extends Object> {
    /** The unique key identifying the field in data rows. */
    key: string
    /** Custom display label for the column header. */
    label?: string
    /** Custom width for this column. Can be a number (pixels) or string (e.g. 'auto', '100%'). */
    width?: number | string
    /** Custom render function specifically for cells in this column. */
    render?: CellRenderer<T>
  }

  export interface Props<T extends Object> extends Stack.Props {
    /** The array of data objects to display in the table. */
    values: T[]
    /** Whether to include a virtual index column ('i'). Defaults to true. */
    includeIndex?: boolean
    /** List of fields to explicitly hide from the table columns. */
    notshow?: string[]

    // --- Checkbox Selection ---
    /** Whether rows are selectable via checkboxes. */
    selectable?: boolean
    /** Set of indices representing currently selected rows (checkbox-based). */
    selectedrows?: Set<number>
    /** Callback triggered when a row's checkbox selection state changes. */
    onrowselect?: (index: number, selected: boolean) => void
    /** Callback triggered when the select-all header checkbox is toggled. */
    onSelectAll?: (selected: boolean) => void

    // --- Row Click Selection ---
    /** Callback fired when a row is clicked. Parent manages the active state. When provided, enables row hover effect. */
    onRowClick?: (value: T, index: number) => void
    /** Index of the currently active/selected row. Receives distinct visual styling. */
    activeRowIndex?: number

    // --- Actions ---
    /** Array of action configurations for per-row action buttons. */
    actions?: Action<T>[]

    /** @deprecated Use `actions` prop instead. */
    onrowaction?: (value: T, index: number) => void
    /** @deprecated Use `actions` prop instead. */
    iconAction?: string

    // --- Rendering ---
    /** Global custom cell renderer, applied to all columns without a specific renderMap entry. */
    renderCell?: CellRenderer<T>
    /** Per-column custom renderers keyed by column name. Takes priority over renderCell. */
    renderMap?: RenderMap<T>

    // --- Columns & Sorting ---
    /** Optional explicit list of columns to display. If omitted, columns are derived from data. */
    columns?: (string | ColumnDefinition<T>)[]
    /** The field currently being used for sorting. */
    sortField?: string
    /** The current sorting direction. */
    sortDirection?: 'asc' | 'desc'
    /** Callback triggered when a column header is clicked to change sorting. */
    onSort?: (field: string) => void

    // --- Highlighting ---
    /** The ID of the row to highlight (matches _id field). */
    highlightedId?: string

    // --- Column Visibility (Phase 4) ---
    /** Enables the right-click context menu for toggling column visibility. */
    columnVisibility?: boolean
    /** Unique ID for this table, used to persist column visibility config in IndexedDB. */
    persistId?: string
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function flattenRow(
  value: Record<string, any>,
  parentKey = '',
): Record<string, any> {
  return Object.entries(value).reduce<Record<string, any>>((acc, [key, entry]) => {
    const nextKey = parentKey ? `${parentKey}.${key}` : key

    if (isPlainObject(entry)) {
      Object.assign(acc, flattenRow(entry, nextKey))
      return acc
    }

    acc[nextKey] = entry
    return acc
  }, {})
}

/**
 * Resolves the final list of row actions, handling backward compatibility
 * with the deprecated `onrowaction` / `iconAction` props.
 */
function resolveActions<T extends Object>(
  actions: Table.Action<T>[] | undefined,
  onrowaction: ((value: T, index: number) => void) | undefined,
  iconAction: string | undefined,
): Table.Action<T>[] {
  if (actions && actions.length > 0) {
    return actions
  }

  if (onrowaction) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Table] Props `onrowaction` and `iconAction` are deprecated. Use the `actions` prop instead.'
      )
    }
    return [{
      icon: (iconAction || 'Search') as Icon.Name,
      label: 'Action',
      onClick: onrowaction,
      variant: 'tertiary',
    }]
  }

  return []
}


export function Table<T extends Object>({
  values: _values = [],
  className,
  includeIndex = true,
  columns: _columns,
  notshow,
  selectable,
  selectedrows,
  onrowselect,
  onSelectAll,
  onRowClick,
  activeRowIndex,
  onrowaction,
  iconAction,
  actions: _actions,
  renderCell,
  renderMap,
  sortField,
  sortDirection,
  onSort,
  highlightedId,
  columnVisibility: _columnVisibility,
  persistId: _persistId,
  ...props
}: Table.Props<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const isResizingRef = useRef(false)
  const lastResolvedActionsRef = useRef<Table.Action<T>[]>([])

  const handleSort = useCallback((field: string) => {
    if (isResizingRef.current) return
    onSort?.(field)
  }, [onSort])

  /** Resolve actions with backward compat for deprecated props. */
  const resolvedActions = useMemo(() => {
    const fresh = resolveActions(_actions, onrowaction, iconAction)
    const last = lastResolvedActionsRef.current
    if (
      last.length === fresh.length &&
      last.every((act, idx) => {
        const fAct = fresh[idx]
        return (
          act.icon === fAct.icon &&
          act.label === fAct.label &&
          act.variant === fAct.variant &&
          act.onClick === fAct.onClick
        )
      })
    ) {
      return last
    }
    lastResolvedActionsRef.current = fresh
    return fresh
  }, [_actions, onrowaction, iconAction])

  const { values, columns, renderMapFromColumns, columnLabels } = useMemo(() => {
    const flattenedValues = _values.map((value) => flattenRow(value))
    let columns: string[]
    const renderMapFromColDefs: Record<string, Table.CellRenderer<T>> = {}
    const labels: Record<string, string> = {}

    if (_columns) {
      const keys = _columns.map((col) => {
        if (typeof col === 'string') {
          return col
        } else {
          labels[col.key] = col.label || col.key
          if (col.render) {
            renderMapFromColDefs[col.key] = col.render
          }
          return col.key
        }
      })

      columns = [...keys]
        .filter((k) => !notshow?.includes(k))
      if (includeIndex && !columns.includes('i')) {
        columns.unshift('i')
      }
    } else {
      const keys = new Set<string>()
      flattenedValues.forEach((v) => {
        Object.keys(v).forEach((k) => {
          if (notshow && notshow.includes(k)) return
          if (!notshow && k === 'event.original') return
          keys.add(k)
        })
      })

      if (includeIndex) {
        keys.add('i')
      }

      columns = Array.from(keys.values()).sort((a, b) => a.localeCompare(b))
    }

    const example: Record<string, any> = {}
    columns.forEach((c) => (example[c] = '<BLANK>'))

    return {
      values: flattenedValues.map((v, i) =>
        Object.assign(JSON.parse(JSON.stringify(example)), v, includeIndex ? { i: i } : {}),
      ),
      columns,
      renderMapFromColumns: renderMapFromColDefs,
      columnLabels: labels,
    }
  }, [_values, includeIndex, _columns, notshow])

  /** Combined custom cell renderers from column definition and renderMap prop */
  const mergedRenderMap = useMemo(() => {
    return { ...renderMapFromColumns, ...renderMap }
  }, [renderMapFromColumns, renderMap])

  /**
   * Determines whether all visible rows are currently selected via checkboxes.
   * Used to drive the select-all header checkbox state.
   */
  const isAllSelected = useMemo(() => {
    if (!selectable || !selectedrows || values.length === 0) return false
    return values.length > 0 && selectedrows.size === values.length
  }, [selectable, selectedrows, values.length])

  /** Whether the table body has clickable rows (enables hover). */
  const isClickable = !!onRowClick

  // ─── Column Visibility (Phase 4) ───────────────────────────────────
  const { hiddenColumns, toggleColumn, resetConfig, isLoaded: configLoaded } = useTableConfig(
    _persistId,
    columns,
    !!_columnVisibility,
  )

  /** Columns filtered by visibility (hidden columns removed). */
  const visibleColumns = useMemo(() => {
    if (!_columnVisibility || hiddenColumns.size === 0) return columns
    return columns.filter((c) => !hiddenColumns.has(c))
  }, [columns, hiddenColumns, _columnVisibility])

  // ─── Column Resizing ───────────────────────────────────────────────
  const MIN_COL_WIDTH = 30
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  /** Calculate default column widths based on maximum character length of contents or custom column configuration */
  const defaultWidths = useMemo(() => {
    const widths: Record<string, number | string> = {}

    columns.forEach((col) => {
      // Check if a custom width is provided in column definitions
      const colDef = _columns?.find((c) => typeof c === 'object' && c !== null && c.key === col) as Table.ColumnDefinition<T> | undefined
      if (colDef && colDef.width !== undefined) {
        widths[col] = colDef.width
        return
      }

      let maxLen = col.length

      const sampleRows = values.slice(0, 100)
      for (const row of sampleRows) {
        const val = row[col]
        if (val !== undefined && val !== null && val !== '<BLANK>') {
          const str = typeof val === 'object'
            ? JSON.stringify(val)
            : String(val)
          if (str.length > maxLen) {
            maxLen = str.length
          }
        }
      }

      if (col === 'i') {
        widths[col] = 45
      } else {
        widths[col] = Math.max(80, Math.min(350, maxLen * 7.5 + 24))
      }
    })

    return widths
  }, [values, columns, _columns])

  /**
   * Handles the start of a column resize drag operation.
   * Attaches mousemove and mouseup listeners to the window for smooth tracking.
   */
  const handleResizeStart = useCallback((columnKey: string, startX: number, startWidth: number) => {
    isResizingRef.current = true
    const localDoc = wrapperRef.current?.ownerDocument ?? document
    const localWin = localDoc.defaultView ?? window

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta)
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }))
    }

    const onMouseUp = () => {
      localWin.removeEventListener('mousemove', onMouseMove)
      localWin.removeEventListener('mouseup', onMouseUp)
      localDoc.body.style.cursor = ''
      localDoc.body.style.userSelect = ''
      setTimeout(() => {
        isResizingRef.current = false
      }, 100)
    }

    localDoc.body.style.cursor = 'col-resize'
    localDoc.body.style.userSelect = 'none'
    localWin.addEventListener('mousemove', onMouseMove)
    localWin.addEventListener('mouseup', onMouseUp)
  }, [])

  /** Calculates the total width of the table by summing all column widths. */
  const totalTableWidth = useMemo(() => {
    let width = 0
    let hasFlexible = false
    if (selectable) width += 40
    visibleColumns.forEach((c) => {
      const w = columnWidths[c] ?? defaultWidths[c]
      if (typeof w === 'number') {
        width += w
      } else {
        hasFlexible = true
      }
    })
    if (resolvedActions.length > 0) {
      width += resolvedActions.length * 32 + 16
    }
    return hasFlexible ? '100%' : width
  }, [selectable, visibleColumns, columnWidths, defaultWidths, resolvedActions])

  /** Renders the inner table element with colgroup, thead, and tbody. */
  const tableElement = (
    <table className={s.table} style={{ width: totalTableWidth }}>
      <colgroup>
        {selectable && <col style={{ width: 40 }} />}
        {visibleColumns.map((c) => {
          const w = columnWidths[c] ?? defaultWidths[c]
          return <col key={`col-${c}`} style={w === 'auto' ? undefined : { width: w }} />
        })}
        {resolvedActions.length > 0 && <col style={{ width: resolvedActions.length * 32 + 16 }} />}
      </colgroup>
      <thead>
        <tr>
          {selectable && (
            <th className={s.selectAllCell}>
              {onSelectAll ? (
                <div className={s.centered}>
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(c) => onSelectAll(!!c)}
                  />
                </div>
              ) : null}
            </th>
          )}
          {visibleColumns.map((c, i) => (
            <Col
              c={c}
              label={columnLabels[c]}
              key={c + i}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onResizeStart={handleResizeStart}
            />
          ))}
          {resolvedActions.length > 0 && (
            <th className={s.actionCell} />
          )}
        </tr>
      </thead>
      <tbody data-clickable={isClickable || undefined}>
        {values.map((i, index) => (
          <Item
            columns={visibleColumns}
            key={(i._id || i.id || '') + index}
            i={i}
            index={index}
            selectable={selectable}
            selected={selectedrows?.has(index)}
            onRowSelect={onrowselect}
            actions={resolvedActions}
            onRowClick={onRowClick}
            isActive={activeRowIndex === index}
            highlighted={!!(highlightedId && i._id === highlightedId)}
            renderCell={renderCell}
            renderMap={mergedRenderMap}
          />
        ))}
      </tbody>
    </table>
  )

  return (
    <TooltipProvider>
      <Stack
        ai="flex-start"
        jc="flex-start"
        dir="column"
        ref={wrapperRef}
        className={cn(s.wrapper, className)}
        style={{
          ...props.style,
          ['--highlight-color' as any]: Color.Themer.getTargetGuideColor()
        }}
        {...props}
      >
        {!configLoaded ? null : _columnVisibility ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {tableElement}
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuLabel>Column Visibility</ContextMenuLabel>
              <ContextMenuSeparator />
              {columns.map((col) => (
                <ContextMenuCheckboxItem
                  key={col}
                  checked={!hiddenColumns.has(col)}
                  onCheckedChange={() => toggleColumn(col)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {columnLabels[col] || col}
                </ContextMenuCheckboxItem>
              ))}
              {hiddenColumns.size > 0 && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuCheckboxItem
                    checked={false}
                    onCheckedChange={() => resetConfig()}
                    onSelect={(e) => e.preventDefault()}
                  >
                    Show All Columns
                  </ContextMenuCheckboxItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          tableElement
        )}
      </Stack>
    </TooltipProvider>
  )
}

namespace Col {
  export interface Props extends Stack.Props {
    /** The column field name. */
    c: string
    /** Custom display label for the column header. */
    label?: string
    /** The field currently being used for sorting. */
    sortField?: string
    /** The current sorting direction. */
    sortDirection?: 'asc' | 'desc'
    /** Callback to trigger a sort on this column. */
    onSort?: (field: string) => void
    /** Callback to initiate column resize. */
    onResizeStart?: (columnKey: string, startX: number, startWidth: number) => void
  }
}

/**
 * Renders a table header cell with optional sorting interactivity and resize handle.
 *
 * @param props - Header column configurations and callbacks
 */
function Col({ c, label, sortField, sortDirection, onSort, onResizeStart, ...props }: Col.Props) {
  const thRef = useRef<HTMLTableCellElement>(null)

  /**
   * Determine if this column is the active sort column.
   * Handles the 'timestamp' / '@timestamp' aliasing.
   */
  const isSorted = useMemo(() => {
    if (!sortField) return false
    if (sortField === c) return true
    if (c === 'timestamp' && sortField === '@timestamp') return true
    if (c === '@timestamp' && sortField === 'timestamp') return true
    return false
  }, [c, sortField])

  /**
   * Initiates column resize on mousedown on the resize handle.
   * Reads the current rendered width as the starting value.
   */
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!thRef.current || !onResizeStart) return
    const startWidth = thRef.current.getBoundingClientRect().width
    onResizeStart(c, e.clientX, startWidth)
  }, [c, onResizeStart])

  return (
    <th
      ref={thRef}
      {...props}
      onClick={() => onSort?.(c)}
      style={{ cursor: onSort ? 'pointer' : 'default', userSelect: 'none', position: 'relative' }}
    >
      <Stack gap={4} ai="center" jc="flex-start" className={s.headerStack}>
        <span>{label ?? c}</span>
        {isSorted && onSort && (
          <Icon
            className={s.headerSortIcon}
            name={sortDirection === 'asc' ? 'SortAscending' : 'SortDescending'}
            size={14}
          />
        )}
      </Stack>
      {onResizeStart && (
        <div
          className={s.resizeHandle}
          onMouseDown={handleResizeMouseDown}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        />
      )}
    </th>
  )
}

namespace Item {
  export interface Props<T extends Object> extends Stack.Props {
    /** The flattened data row. */
    i: T
    /** Visible column keys. */
    columns: string[]
    /** Row index within the table. */
    index: number
    /** Whether checkbox selection is enabled. */
    selectable?: boolean
    /** Whether this row's checkbox is checked. */
    selected?: boolean
    /** Callback when this row's checkbox changes. */
    onRowSelect?: (index: number, selected: boolean) => void
    /** Resolved list of row-level action buttons. */
    actions: Table.Action<T>[]
    /** Callback when the row itself is clicked (click-selection). */
    onRowClick?: (value: T, index: number) => void
    /** Whether this row is the active/click-selected row. */
    isActive: boolean
    /** Whether this row is highlighted by external ID match. */
    highlighted: boolean
    /** Global custom cell renderer. */
    renderCell?: Table.CellRenderer<T>
    /** Per-column custom cell renderers. */
    renderMap?: Table.RenderMap<T>
  }
}

/**
 * Renders a single table body row with optional checkbox, actions, and custom rendering.
 */
const Item = React.memo(
  function ItemInner<T extends Object>({
    i,
    columns,
    index,
    selectable,
    selected,
    onRowSelect,
    actions,
    onRowClick,
    isActive,
    highlighted,
    renderCell,
    renderMap,
    ...props
  }: Item.Props<T>) {
    /**
     * Handle row click for click-selection.
     * Prevents triggering row click when clicking on interactive elements (checkbox, button).
     */
    const handleRowClick = useCallback((e: React.MouseEvent) => {
      if (!onRowClick) return
      const target = e.target as HTMLElement
      if (target.closest('button, input, [role="checkbox"]')) return
      onRowClick(i, index)
    }, [onRowClick, i, index])

    return (
      <tr
        className={cn(s.item, isActive && s.activeRow, highlighted && s.highlighted)}
        onClick={handleRowClick}
        {...props}
      >
        {selectable && (
          <td className={cn(s.value, s.actionCell)}>
            <div className={s.centered}>
              <Checkbox checked={!!selected} onCheckedChange={(c) => onRowSelect?.(index, !!c)} />
            </div>
          </td>
        )}
        {columns.map((c, idx) => {
          const cellValue = i[c]

          // Priority: renderMap[column] > renderCell > default Value component
          const columnRenderer = renderMap?.[c]
          if (columnRenderer) {
            return (
              <td className={cn(s.value, cellValue === '<BLANK>' && s.blank)} key={c + idx}>
                {columnRenderer(cellValue, i, c, index)}
              </td>
            )
          }
          if (renderCell) {
            return (
              <td className={cn(s.value, cellValue === '<BLANK>' && s.blank)} key={c + idx}>
                {renderCell(cellValue, i, c, index)}
              </td>
            )
          }
          return <Value k={c} v={cellValue} key={c + cellValue + idx} />
        })}
        {actions.length > 0 && (
          <td className={cn(s.value, s.actionsCell)}>
            <Stack gap={4} ai="center" jc="center">
              {actions.map((action) => (
                <Tooltip key={action.label} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      className={s.Button_Icon}
                      icon={action.icon}
                      variant={action.variant || 'tertiary'}
                      onClick={() => action.onClick(i, index)}
                    />
                  </TooltipTrigger>
                  <TooltipContent sideOffset={4}>
                    {action.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </Stack>
          </td>
        )}
      </tr>
    )
  },
  (prevProps, nextProps) => {
    if (prevProps.index !== nextProps.index) return false
    if (prevProps.selectable !== nextProps.selectable) return false
    if (prevProps.selected !== nextProps.selected) return false
    if (prevProps.isActive !== nextProps.isActive) return false
    if (prevProps.highlighted !== nextProps.highlighted) return false
    if (prevProps.i !== nextProps.i) return false
    if (prevProps.columns.length !== nextProps.columns.length) return false
    for (let i = 0; i < prevProps.columns.length; i++) {
      if (prevProps.columns[i] !== nextProps.columns[i]) return false
    }
    if (prevProps.actions !== nextProps.actions) return false
    return true
  }
) as <T extends Object>(props: Item.Props<T>) => React.ReactElement | null

namespace Value {
  export interface Props extends Stack.Props {
    k: string
    v: any
  }
}

/**
 * Renders a single cell value, with auto-detection of text truncation.
 * If the value is truncated, hovers trigger a portalled Tooltip.
 * Keeps a completely stable DOM structure to prevent hover flickering and layout shifts.
 */
const Value = React.memo(
  function ValueInner({ k, v, ...props }: Value.Props) {
    const [open, setOpen] = useState(false)
    const cellRef = useRef<HTMLTableCellElement>(null)
    const triggerRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
      if (!open) return

      /**
       * Handles mouse clicks outside the cell and the active tooltip portal
       * to close/dismiss the active tooltip.
       *
       * @param event - The global MouseEvent object.
       */
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        if (
          cellRef.current &&
          !cellRef.current.contains(target) &&
          !target.closest('[data-table-tooltip="true"]')
        ) {
          setOpen(false)
        }
      }

      const localDoc = cellRef.current?.ownerDocument ?? document
      localDoc.addEventListener('click', handleClickOutside)
      return () => {
        localDoc.removeEventListener('click', handleClickOutside)
      }
    }, [open])

    const isObject = typeof v === 'object' && v !== null
    const isArray = Array.isArray(v)

    const stringified = isArray
      ? JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val), 2)
      : isObject
        ? JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val), 2)
        : typeof v === 'bigint'
          ? v.toString()
          : String(v)

    const displayValue = isArray || isObject
      ? stringified
      : stringified

    if (k === 'color') {
      props.style = {
        ...props.style,
        color: stringified,
      }
    }

    const glyph = Glyph.List.get(v as Glyph.Id)
    const icon =
      k === 'glyph_id' && glyph ? <Icon size={12} name={glyph} /> : null

    const content = (
      <>
        {icon}
        {displayValue}
      </>
    )

    const tooltipText = isArray || isObject ? stringified : displayValue

    const handleMouseEnter = () => {
      if (!triggerRef.current) return
      // Detect if text is truncated (overflowing).
      // We add a 1px tolerance to avoid subpixel rendering false-positives.
      const isOverflowing = triggerRef.current.scrollWidth > triggerRef.current.clientWidth + 1
      if (isOverflowing) {
        setOpen(true)
      }
    }

    const handleMouseLeave = () => {
      setOpen(false)
    }

    return (
      <td
        ref={cellRef}
        className={cn(s.value, displayValue === '<BLANK>' && s.blank)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <Tooltip open={open} delayDuration={0}>
          <TooltipTrigger asChild>
            <span ref={triggerRef} className={s.triggerSpan}>
              {content}
            </span>
          </TooltipTrigger>
          <TooltipContent
            data-table-tooltip="true"
            sideOffset={4}
            style={{
              maxWidth: 400,
              maxHeight: 300,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              background: 'var(--background-100)',
              padding: 8,
              border: '1px solid var(--gray-400)',
              borderRadius: 6,
              zIndex: 1500,
            }}
          >
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </td>
    )
  },
  (prevProps, nextProps) => {
    return prevProps.k === nextProps.k && prevProps.v === nextProps.v
  }
)
