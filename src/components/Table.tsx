import { useCallback, useMemo, useRef } from 'react'
import s from './styles/Table.module.css'
import { cn } from '@impactium/utils'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Checkbox } from '@/ui/Checkbox'
import { Glyph } from '@/entities/Glyph'
import { Button } from '@/ui/Button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/ui/Tooltip'
import { Color } from '@/entities/Color'

export type Object = Record<string, any>

export namespace Table {
  export interface Props<T extends Object> extends Stack.Props {
    /** The array of data objects to display in the table. */
    values: T[]
    /** Whether to include a virtual index column ('i'). Defaults to true. */
    includeIndex?: boolean
    /** List of fields to explicitly hide from the table columns. */
    notshow?: string[]
    /** Whether rows are selectable via checkboxes. */
    selectable?: boolean
    /** Set of indices representing currently selected rows. */
    selectedrows?: Set<number>
    /** Callback triggered when a row's selection state changes. */
    onrowselect?: (index: number, selected: boolean) => void
    /** Callback triggered when the action button (iconAction) is clicked for a row. */
    onrowaction?: (value: T, index: number) => void
    /** The name of the icon to display for the row action button. */
    iconAction?: string
    /** Optional explicit list of columns to display. If omitted, columns are derived from data. */
    columns?: string[]
    /** The field currently being used for sorting. */
    sortField?: string
    /** The current sorting direction. */
    sortDirection?: 'asc' | 'desc'
    /** Callback triggered when a column header is clicked to change sorting. */
    onSort?: (field: string) => void
    /** The ID of the row to highlight (matches _id field). */
    highlightedId?: string
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


export function Table<T extends Object>({
  values: _values = [],
  className,
  includeIndex = true,
  columns: _columns,
  notshow,
  selectable,
  selectedrows,
  onrowselect,
  onrowaction,
  iconAction,
  sortField,
  sortDirection,
  onSort,
  highlightedId,
  ...props
}: Table.Props<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const { values, columns } = useMemo(() => {
    const flattenedValues = _values.map((value) => flattenRow(value))
    let columns: string[]

    if (_columns) {
      columns = [..._columns]
        .filter((k) => !notshow?.includes(k))
        .sort((a, b) => a.localeCompare(b))
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
    }
  }, [_values, includeIndex, _columns, notshow])


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
        <table className={s.table}>
          <thead>
            <tr>
              {selectable && <th style={{ width: '40px', textAlign: 'center' }}></th>}
              {onrowaction && <th style={{ width: '40px', textAlign: 'center' }}></th>}
              {columns.map((c, i) => (
                <Col
                  c={c}
                  key={c + i}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((i, index) => (
              <Item
                columns={columns}
                key={(i._id || i.id || '') + index}
                i={i}
                index={index}
                selectable={selectable}
                selected={selectedrows?.has(index)}
                onRowSelect={onrowselect}
                onRowAction={onrowaction}
                iconAction={iconAction}
                highlighted={!!(highlightedId && i._id === highlightedId)}
              />
            ))}
          </tbody>
        </table>
      </Stack>
    </TooltipProvider>
  )
}

namespace Col {
  export interface Props extends Stack.Props {
    /** The column field name. */
    c: string
    /** The field currently being used for sorting. */
    sortField?: string
    /** The current sorting direction. */
    sortDirection?: 'asc' | 'desc'
    /** Callback to trigger a sort on this column. */
    onSort?: (field: string) => void
  }
}

/**
 * Renders a table header cell with optional sorting interactivity.
 */
function Col({ c, sortField, sortDirection, onSort, ...props }: Col.Props) {
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

  return (
    <th
      {...props}
      onClick={() => onSort?.(c)}
      style={{ cursor: onSort ? 'pointer' : 'default', userSelect: 'none' }}
    >
      <Stack gap={4} ai="center" jc="flex-start">
        <span>{c}</span>
        {isSorted && onSort && (
          <Icon
            name={sortDirection === 'asc' ? 'SortAscending' : 'SortDescending'}
            size={14}
          />
        )}
      </Stack>
    </th>
  )
}

namespace Item {
  export interface Props<T extends Object> extends Stack.Props {
    i: T
    columns: string[]
    index: number
    selectable?: boolean
    selected?: boolean
    onRowSelect?: (index: number, selected: boolean) => void
    onRowAction?: (value: T, index: number) => void
    iconAction?: string
    highlighted: boolean
  }
}

function Item<T extends Object>({ i, columns, index, selectable, selected, onRowSelect, onRowAction, iconAction, highlighted, ...props }: Item.Props<T>) {
  return (
    <tr className={cn(s.item, highlighted && s.highlighted)} {...props}>
      {selectable && (
        <td className={cn(s.value, s.actionCell)}>
          <div className={s.centered}>
            <Checkbox checked={!!selected} onCheckedChange={(c) => onRowSelect?.(index, !!c)} />
          </div>
        </td>
      )}
      {
        onRowAction && (
          <td className={cn(s.value, s.actionCell)}>
            <div className={s.centered}>
              <Button className={s.Button_Icon} icon={iconAction as Icon.Name} variant="glass" onClick={() => onRowAction?.(i, index)} />
            </div>
          </td>
        )
      }
      {columns.map((c, idx) => (
        <Value k={c} v={i[c]} key={c + i[c] + idx} />
      ))}
    </tr>
  )
}

namespace Value {
  export interface Props extends Stack.Props {
    k: string
    v: any
  }
}

function Value({ k, v, ...props }: Value.Props) {
  const isObject = typeof v === 'object' && v !== null
  const isArray = Array.isArray(v)

  const stringified = isArray
    ? JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val), 2)
    : isObject
      ? JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val), 2)
      : typeof v === 'bigint'
        ? v.toString()
        : String(v)

  const displayValue = isArray
    ? `Array(${v.length})`
    : isObject
      ? `Object`
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

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <td className={cn(s.value, displayValue === '<BLANK>' && s.blank)} {...props}>
            {content}
          </td>
        </TooltipTrigger>
        <TooltipContent
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
            zIndex: 50,
          }}
        >
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
