import '@/global.css'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Application } from '@/context/Application.context'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Notification } from '@/ui/Notification'
import { Context } from '@/entities/Context'
import { Source } from '@/entities/Source'
import { Note } from '@/entities/Note'
import { Doc } from '@/entities/Doc'
import { NotePoint } from '@/ui/Note'
import { Select } from '@/ui/Select'
import { Banner } from '@/ui/Banner'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { DataStore } from '@/store/DataStore'
import { Checkbox } from '@/ui/Checkbox'
import { Button } from '@/ui/Button'
import { formatTimestampToReadableString, stringToHexColor } from "../ui/utils";
import { WindowBridge } from '@/lib/WindowBridge'

import s from './styles/NotesWindow.module.css'
import { TooltipProvider } from '@radix-ui/react-tooltip'

interface FloatingWindowProps {
  onClose: () => void
}

export function NotesWindow({ onClose }: FloatingWindowProps) {
  const { app, Info } = Application.use()
  const [search, setSearch] = useState('');
  const [showOnlyVisible, setShowOnlyVisible] = useState<boolean>(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<Note.Id>>(new Set());

  const getAvailableTags = useCallback(() => {
    const tags = new Set<string>();
    DataStore.notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag.toLowerCase()));
    })
    return [...tags.values()];
  }, [app.timeline.renderVersion]);

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const availableTags = useMemo(() => getAvailableTags(), [getAvailableTags]);

  useEffect(() => {
    const currentAvailable = new Set(availableTags.map(t => t.toLowerCase()));
    setSelectedTags(prev => {
      const next = new Set([...prev].filter(tag => currentAvailable.has(tag.toLowerCase())));
      return next.size === prev.size ? prev : next;
    });
  }, [availableTags]);

  const parentRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const sortedNotes = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    const filtered = DataStore.notes.filter(n => {
      return !search || (
        n.name.toLowerCase().includes(lowerSearch) ||
        n.text.toLowerCase().includes(lowerSearch) ||
        Source.Entity.id(app, n.source_id).name.toLowerCase().includes(lowerSearch) ||
        Context.Entity.id(app, n.context_id).name.toLowerCase().includes(lowerSearch) ||
        n.tags.some(t => t.toLowerCase() === lowerSearch)
      );
    }).filter(n =>
      !selectedTags.size || [...selectedTags].every(tag => n.tags.map(t => t.toLowerCase()).includes(tag))
    ).filter(n =>
      !showOnlyVisible || !!Doc.Entity.id(app, n.doc._id)
    );

    return filtered.sort((a, b) => {
      const byContext = a.context_id.localeCompare(b.context_id);
      return byContext !== 0 ? byContext : a.source_id.localeCompare(b.source_id);
    });
  }, [app.timeline.renderVersion, search, app, selectedTags, showOnlyVisible]);

  const isAllSelected = useMemo(() => {
    return sortedNotes.length > 0 && sortedNotes.every(n => selectedNoteIds.has(n.id));
  }, [sortedNotes, selectedNoteIds]);

  const selectAllLabel = useMemo(() => {
    if (isAllSelected) return `Deselect All (${selectedNoteIds.size} selected)`;
    return `Select All (${sortedNotes.length} visible)`;
  }, [isAllSelected, selectedNoteIds.size, sortedNotes.length]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedNoteIds(new Set(sortedNotes.map(n => n.id)));
    } else {
      setSelectedNoteIds(new Set());
    }
  }, [sortedNotes]);

  const toggleNoteSelection = useCallback((id: Note.Id) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = async () => {
    if (selectedNoteIds.size === 0) return;
    const deletedIds = [...selectedNoteIds];
    await Info.notes_delete_bulk(deletedIds);
    // Notify main tab about deleted notes via BroadcastChannel
    const bridge = WindowBridge.create(WindowBridge.generateId(), () => {})
    bridge.send(WindowBridge.MessageType.NOTES_CHANGED, {
      action: 'deleted',
      ids: deletedIds,
    })
    bridge.destroy()
    setSelectedNoteIds(new Set());
  };

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
          placeholder='Context name, source name, note title or text'
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
            {availableTags.sort().map(tag => (
              <Select.Item key={tag} value={tag}>
                {tag}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Multi.Root>
      </Stack>
      <Stack gap={10} ai="center" style={{ padding: '0 12px' }}>
        <Checkbox
          style={{ height: 20, width: 20 }}
          checked={isAllSelected}
          onCheckedChange={handleSelectAll as any}
        />
        <span
          style={{ fontSize: '13px', opacity: 0.8, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => handleSelectAll(!isAllSelected)}
        >
          {selectAllLabel}
        </span>
      </Stack>
      <Stack gap={10} ai="center" style={{ padding: '0 12px' }}>
        <Checkbox
          style={{ height: 20, width: 20 }}
          checked={showOnlyVisible}
          onCheckedChange={(v: any) => setShowOnlyVisible(!!v)}
        />
        <span
          style={{ fontSize: '13px', opacity: 0.8, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setShowOnlyVisible(v => !v)}
        >
          Show only notes for visible events
        </span>
      </Stack>
      <div
        ref={parentRef}
        className={s.result}
        style={{ height: '100%', overflow: 'auto' }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map(item => {
            const note = sortedNotes[item.index];
            const context = Context.Entity.id(app, note.context_id);

            return (
            <TooltipProvider>
              <div
                key={item.key}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <Stack
                  gap={12}
                  ai="center"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    paddingLeft: 8,
                  }}
                >
                  <Checkbox
                    style={{ height: 20, width: 20 }}
                    checked={selectedNoteIds.has(note.id)}
                    onCheckedChange={() => toggleNoteSelection(note.id)}
                  />

                  <NotePoint.Combination note={note} style={{ flex: 1 }} />
                </Stack>
              </div>
            </TooltipProvider>  
            );
          })}
        </div>
      </div>
      <Notification value='You can scroll tags list horizontally' variant='informational' icon='Information' />
      <Stack jc="flex-end" style={{ padding: '12px 0 0 0' }}>
        <Button
          variant="glass"
          disabled={selectedNoteIds.size === 0}
          onClick={handleBulkDelete}
          icon="Trash2"
        >
          Delete selected notes ({selectedNoteIds.size})
        </Button>
      </Stack>
      <div ref={windowRef} className={s.portalContainer} />
    </Banner>
  )
}
