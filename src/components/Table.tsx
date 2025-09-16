import { useMemo } from 'react'
import s from './styles/Table.module.css'
import { cn } from '@impactium/utils'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Glyph } from '@/entities/Glyph'

export type Object = Record<string, any>

export namespace Table {
  export interface Props<T extends Object> extends Stack.Props {
    values: T[]
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
      Object.keys(v).forEach((k) =>
        k === 'event.original' ? void 0 : keys.add(k),
      )
    })

    keys.add('i')

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
            {columns.map((c, i) => (
              <Col c={c} key={c + i} />
            ))}
          </tr>
        </thead>
        {values.map((i, index) => (
          <Item columns={columns} key={String(i) + index} i={i} />
        ))}
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

  return (
    <td className={cn(s.value, value === '<BLANK>' && s.blank)} {...props}>
      {icon}
      {value}
    </td>
  )
}
