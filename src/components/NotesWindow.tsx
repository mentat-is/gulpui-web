import { useApplication } from '@/context/Application.context'
import s from './styles/NotesWindow.module.css'
import { Banner } from '@/ui/Banner'
import { λNote } from '@/dto/Dataset'
import { NotePoint } from '@/ui/Note'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Input } from '@impactium/components'
import { Context, File } from '@/class/Info'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Notification } from '@/ui/Notification'

interface FloatingWindowProps {
  onClose: () => void
  focus: (note: λNote) => void
}

export function NotesWindow({ onClose }: FloatingWindowProps) {
  const { app } = useApplication()
  const [search, setSearch] = useState('');

  const parentRef = useRef<HTMLDivElement>(null)

  const sortedNotes = useMemo(() => {
    const filtered = search.length ? app.target.notes.filter(n => {
      const searchLower = search.toLowerCase()
      return (
        n.name.toLowerCase().includes(searchLower) ||
        n.text.toLowerCase().includes(searchLower) ||
        File.id(app, n.source_id).name.toLowerCase().includes(searchLower) ||
        Context.id(app, n.context_id).name.toLowerCase().includes(searchLower) ||
        n.tags.some(t => t.toLowerCase() === searchLower)
      )
    }) : app.target.notes;

    return filtered
      .sort((a, b) => a.context_id.localeCompare(b.context_id))
      .sort((a, b) => a.source_id.localeCompare(b.source_id))
  }, [app.target.notes, search, app]);

  const virtualizer = useVirtualizer({
    count: sortedNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32 + 8,
    overscan: 5,
  })

  return (
    <Banner title="Notes" onClose={onClose} className={s.main}>
      <Input
        placeholder='Context name, source name, note title or note description'
        img='MagnifyingGlass'
        variant='highlighted'
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div
        ref={parentRef}
        className={s.result}
        style={{
          height: '100%',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <NotePoint.Combination note={sortedNotes[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
      <Notification value='You can scroll tags list horizontally' variant='informational' icon='Information' />
    </Banner>
  )
}