import { useMemo } from 'react'
import s from './styles/Table.module.css'
import { cn } from '@impactium/utils'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Checkbox } from '@/ui/Checkbox'
import { Glyph } from '@/entities/Glyph'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/ui/Tooltip'

export type Object = Record<string, any>

export namespace Table {
  export interface Props<T extends Object> extends Stack.Props {
    values: T[]
    notshow?: string[]
    selectable?: boolean
    selectedrows?: Set<number>
    onrowselect?: (index: number, selected: boolean) => void
  }
}

export function Table<T extends Object>({
  values: _values = [],
  className,
  ...props
}: Table.Props<T>) {
  const { values, columns } = useMemo(() => {
    const keys = new Set<string>()

    _values.forEach((v) => {
      Object.keys(v).forEach((k) => {
        if (props.notshow && props.notshow.includes(k)) return;
        if (!props.notshow && k === 'event.original') return;
        keys.add(k);
      })
    })
    if (!props.notshow?.includes('i')) {
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
      values: _values.map((v, i) =>
        Object.assign(JSON.parse(JSON.stringify(example)), v, { i: i }),
      ),
      columns,
    }
  }, [_values])

  return (
    <Stack ai="flex-start" jc="flex-start" dir="column" className={cn(s.wrapper, className)} {...props}>
      <table className={s.table}>
        <thead>
          <tr>
            {props.selectable && <th style={{ width: '40px', textAlign: 'center' }}></th>}
            {columns.map((c, i) => (
              <Col c={c} key={c + i} />
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((i, index) => (
            <Item 
              columns={columns} 
              key={String(i) + index} 
              i={i} 
              index={index}
              selectable={props.selectable}
              selected={props.selectedrows?.has(index)}
              onRowSelect={props.onrowselect}
            />
          ))}
        </tbody>
      </table>
    </Stack>
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
    index: number
    selectable?: boolean
    selected?: boolean
    onRowSelect?: (index: number, selected: boolean) => void
  }
}

function Item<T extends Object>({ i, columns, index, selectable, selected, onRowSelect, ...props }: Item.Props<T>) {
  return (
    <tr className={s.item} {...props}>
      {selectable && (
        <td className={s.value}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Checkbox checked={!!selected} onCheckedChange={(c) => onRowSelect?.(index, !!c)} />
          </div>
        </td>
      )}
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

  let content = (
    <>
      {icon}
      {displayValue}
    </>
  )

  if (isArray || isObject) {
    content = (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>{content}</span>
          </TooltipTrigger>
          <TooltipContent sideOffset={4} style={{ maxWidth: 400, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', textAlign: 'left', background: 'var(--background-100)', padding: 8, border: '1px solid var(--gray-400)', borderRadius: 6, zIndex: 50 }}>
            {stringified}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <td className={cn(s.value, displayValue === '<BLANK>' && s.blank)} {...props}>
      {content}
    </td>
  )
}
