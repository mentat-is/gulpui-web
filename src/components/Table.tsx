import { useCallback, useMemo, useRef } from 'react'
import s from './styles/Table.module.css'
import { cn } from '@impactium/utils'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Glyph } from '@/entities/Glyph'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'

export type Object = Record<string, any>

export namespace Table {
  export interface Props<T extends Object> extends Stack.Props {
    values: T[]
    includeIndex?: boolean
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
  ...props
}: Table.Props<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const { values, columns } = useMemo(() => {
    const keys = new Set<string>()
    const flattenedValues = _values.map((value) => flattenRow(value))

    flattenedValues.forEach((v) => {
      Object.keys(v).forEach((k) =>
        k === 'event.original' ? void 0 : keys.add(k),
      )
    })

    if (includeIndex) {
      keys.add('i')
    }

    const columns = Array.from(keys.values()).sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length
      }

      return a.localeCompare(b)
    })

    const example: Record<string, any> = {}

    columns.forEach((c) => (example[c] = `<BLANK>`))

    return {
      values: flattenedValues.map((v, i) =>
        Object.assign(JSON.parse(JSON.stringify(example)), v, includeIndex ? { i: i } : {}),
      ),
      columns,
    }
  }, [_values, includeIndex])

  const handleWheelCapture = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = wrapperRef.current
    if (!container) return

    container.scrollTop += e.deltaY
    container.scrollLeft += e.deltaX
    e.preventDefault()
  }, [])

  return (
    <TooltipProvider>
      <Stack
        ai="flex-start"
        jc="flex-start"
        dir="column"
        ref={wrapperRef}
        onWheelCapture={handleWheelCapture}
        className={cn(s.wrapper, className)}
        {...props}
      >
        <table className={s.table}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <Col c={c} key={c + i} />
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((i, index) => (
              <Item columns={columns} key={String(i) + index} i={i} />
            ))}
          </tbody>
        </table>
      </Stack>
    </TooltipProvider>
  )
}

namespace Col {
  export interface Props extends Stack.Props {
    c: string
  }
}

function Col({ c, ...props }: Col.Props) {
  return <th {...props}>{c}</th>
}

namespace Item {
  export interface Props<T extends Object> extends Stack.Props {
    i: T
    columns: string[]
  }
}

function Item<T extends Object>({ i, columns, ...props }: Item.Props<T>) {
  return (
    <tr className={s.item} {...props}>
      {columns.map((c, index) => (
        <Value k={c} v={i[c]} key={c + i[c] + index} />
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
  const value = Array.isArray(v)
    ? `Array(${v.length}, ${JSON.stringify(v, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)})`
    : typeof v === 'object'
      ? String(v)
      : typeof v === 'bigint'
        ? v.toString()
        : v

  if (k === 'color') {
    props.style = {
      ...props.style,
      color: value,
    }
  }

  const glyph = Glyph.List.get(v as Glyph.Id)
  const icon =
    k === 'glyph_id' && glyph ? <Icon size={12} name={glyph} /> : null

  const tooltip = value == null ? '' : String(value)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <td className={cn(s.value, value === '<BLANK>' && s.blank)} {...props}>
          {icon}
          {value}
        </td>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
