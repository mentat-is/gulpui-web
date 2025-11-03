import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Application } from '@/context/Application.context'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Notification } from '@/ui/Notification'
import { Context } from '@/entities/Context'
import { Source } from '@/entities/Source'
import { Note } from '@/entities/Note'
import { NotePoint } from '@/ui/Note'
import { Select } from '@/ui/Select'
import { Banner } from '@/ui/Banner'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'

import s from './styles/NotesWindow.module.css'

interface FloatingWindowProps {
  onClose: () => void
  focus: (note: Note.Type) => void
}

export function NotesWindow({ onClose }: FloatingWindowProps) {
  const { app } = Application.use()
  const [search, setSearch] = useState('');

  const getAvailableTags = useCallback(() => {
    const tags = new Set<string>();
    app.target.notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag.toLowerCase()));
    })
    return [...tags.values()];
  }, [app.target.notes]);

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const availableTags = useMemo(() => getAvailableTags(), [getAvailableTags]);

  const parentRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const sortedNotes = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    
    const filtered = app.target.notes.filter(n => {
      return !search || (
        n.name.toLowerCase().includes(lowerSearch) ||
        n.text.toLowerCase().includes(lowerSearch) ||
        Source.Entity.id(app, n.source_id).name.toLowerCase().includes(lowerSearch) ||
        Context.Entity.id(app, n.context_id).name.toLowerCase().includes(lowerSearch) ||
        n.tags.some(t => t.toLowerCase() === lowerSearch)
      );
    }).filter(n =>
      !selectedTags.size || [...selectedTags].every(tag => n.tags.map(t => t.toLowerCase()).includes(tag))
    );

    return filtered.sort((a, b) => {
      const byContext = a.context_id.localeCompare(b.context_id);
      return byContext !== 0 ? byContext : a.source_id.localeCompare(b.source_id);
    });
  }, [app.target.notes, search, app, selectedTags]);

  const virtualizer = useVirtualizer({
    count: sortedNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <Banner title="Notes" onClose={onClose} className={s.main}>
      <Stack>
        <Input
          placeholder='Context name, source name, note title or note description'
          icon='MagnifyingGlass'
          variant='highlighted'
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select.Multi.Root
          value={[...selectedTags]}
          onValueChange={values => setSelectedTags(new Set(values))}
        >
          <Select.Trigger>
            <Select.Multi.Value
              icon={['DataPointMedium', 'DataPoint']}
              placeholder='Select tags to be shown'
              text={len => typeof len === 'number' ? `Selected ${len} tags` : len}
            />
          </Select.Trigger>
          <Select.Content container={windowRef.current ?? undefined}>
            {availableTags.map(tag => (
              <Select.Item key={tag} value={tag}>
                {tag}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Multi.Root>
      </Stack>
      <div
        ref={parentRef}
        className={s.result}
        style={{ height: '100%', overflow: 'auto' }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map(item => (
            <div
              key={item.key}
              style={{
                position: 'absolute',
                width: '100%',
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <NotePoint.Combination note={sortedNotes[item.index]} />
            </div>
          ))}
        </div>
      </div>
      <Notification value='You can scroll tags list horizontally' variant='informational' icon='Information' />
      <div ref={windowRef} className={s.portalContainer} />
    </Banner>
  )
}
