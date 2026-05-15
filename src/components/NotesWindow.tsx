import '@/global.css'
import { useState, useMemo, useRef, useCallback, useEffect, useSyncExternalStore } from 'react'
import { Application } from '@/context/Application.context'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Context } from '@/entities/Context'
import { Source } from '@/entities/Source'
import { Note } from '@/entities/Note'
import { Doc } from '@/entities/Doc'
import { Select } from '@/ui/Select'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { Banner as UIBanner } from '@/ui/Banner'
import { DataStore } from '@/store/DataStore'
import { Checkbox } from '@/ui/Checkbox'
import { Button } from '@/ui/Button'
import { Toggle } from '@/ui/Toggle'
import { formatTimestampToReadableString } from '../ui/utils'
import { WindowBridge } from '@/lib/WindowBridge'

import s from './styles/NotesWindow.module.css'

interface FloatingWindowProps {
  onClose: () => void
}

interface BulkDeleteNotesBannerProps {
  noteIds: Note.Id[]
  onDeleted: () => void
}

function BulkDeleteNotesBanner({ noteIds, onDeleted }: BulkDeleteNotesBannerProps) {
  const { Info, destroyBanner } = Application.use()
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const confirmDelete = async () => {
    setLoading(true)
    await Info.notes_delete_bulk(noteIds)
    setLoading(false)
    onDeleted()
    destroyBanner()
  }

  return (
    <UIBanner
      title='Delete notes'
      done={(
        <Button
          loading={loading}
          icon='Trash2'
          variant='glass'
          onClick={confirmDelete}
          disabled={!isSubmitted}
        />
      )}
    >
      <p>Are you sure you want to delete {noteIds.length} selected notes?</p>
      <Toggle
        option={["No, don`t delete", "Yes, i`m sure"]}
        checked={isSubmitted}
        onCheckedChange={setIsSubmitted}
      />
    </UIBanner>
  )
}

const TABLE_ROW_HEIGHT = 44

export function NotesWindow({ onClose }: FloatingWindowProps) {
  const { app, Info, spawnBanner, banner } = Application.use()
  useSyncExternalStore(DataStore.subscribe, DataStore.getSnapshot);
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

  const availableTags = useMemo(() => getAvailableTags(), [getAvailableTags, DataStore.notes.length]);

  useEffect(() => {
    const currentAvailable = new Set(availableTags.map(t => t.toLowerCase()));
    setSelectedTags(prev => {
      const next = new Set([...prev].filter(tag => currentAvailable.has(tag.toLowerCase())));
      return next.size === prev.size ? prev : next;
    });
  }, [availableTags]);

  useEffect(() => {
    const currentNoteIds = new Set(DataStore.notes.map(note => note.id))
    setSelectedNoteIds(prev => {
      const next = new Set([...prev].filter(id => currentNoteIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [DataStore.notes.length])

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
  }, [search, app, selectedTags, showOnlyVisible, DataStore.notes.length]);

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
    const deletedIds = [...selectedNoteIds]
    spawnBanner(
      <BulkDeleteNotesBanner
        noteIds={deletedIds}
        onDeleted={() => setSelectedNoteIds(new Set())}
      />,
      'table',
    )
  };

  const targetNoteButtonHandler = useCallback((note: Note.Type) => {
    const bridge = WindowBridge.create(WindowBridge.generateId(), () => { })
    bridge.send(WindowBridge.MessageType.TARGET_NOTE, {
      docId: note.doc._id,
      operationId: note.operation_id,
    })
    bridge.destroy()
  }, []);

  const handleDelete = useCallback((note: Note.Type) => {
    spawnBanner(
      <Note.Delete.Banner note={note} />,
      'table',
    )
  }, [spawnBanner]);

  const virtualizer = useVirtualizer({
    count: sortedNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TABLE_ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div className={s.main}>
      <div className={s.header}>
        <h3>Notes</h3>
      </div>
      <div className={s.content}>
        <Stack dir='column' flex={false} ai="stretch">
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
        <Stack gap={10} ai="center" flex={false} style={{ padding: '0 12px' }}>
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
        <Stack gap={10} ai="center" flex={false} style={{ padding: '0 12px' }}>
          <Checkbox
            style={{ height: 20, width: 20 }}
            checked={showOnlyVisible}
            onCheckedChange={(v: any) => setShowOnlyVisible(!!v)}
          />
          <span
            style={{ fontSize: '13px', opacity: 0.8, cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowOnlyVisible(v => !v)}
          >
            Show notes for visible sources only
          </span>
        </Stack>
        <div
          className={s.result}
          style={{ flex: 1, minHeight: 0 }}
        >
          <div className={`${s.tableRow} ${s.tableHeaderRow}`}>
            <div className={`${s.tableCell} ${s.checkboxCell}`}>
              <span className={s.headerLabel}>Sel</span>
            </div>
            <div className={`${s.tableCell} ${s.timestampCell}`}>
              <span className={s.headerLabel}>Timestamp</span>
            </div>
            <div className={`${s.tableCell} ${s.titleCell}`}>
              <span className={s.headerLabel}>Title</span>
            </div>
            <div className={`${s.tableCell} ${s.textCell}`}>
              <span className={s.headerLabel}>Text</span>
            </div>
            <div className={`${s.tableCell} ${s.contextCell}`}>
              <span className={s.headerLabel}>Context</span>
            </div>
            <div className={`${s.tableCell} ${s.sourceCell}`}>
              <span className={s.headerLabel}>Source</span>
            </div>
            <div className={`${s.tableCell} ${s.tagsCell}`}>
              <span className={s.headerLabel}>Tags</span>
            </div>
            <div className={`${s.tableCell} ${s.actionsCell}`}>
              <span className={s.headerLabel}>Actions</span>
            </div>
          </div>
          <div
            ref={parentRef}
            className={s.tableScroll}
            style={{ height: '100%', overflow: 'auto' }}
          >
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map(item => {
                const note = sortedNotes[item.index]
                const context = Context.Entity.id(app, note.context_id)
                const source = Source.Entity.id(app, note.source_id)
                const sourceColor = source.color || 'var(--accent)'

                return (
                  <div
                    key={item.key}
                    className={s.tableRowWrap}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: `${item.size}px`,
                      transform: `translateY(${item.start}px)`,
                    }}
                  >
                    <div className={s.tableRow}>
                      <div className={`${s.tableCell} ${s.checkboxCell}`}>
                        <Checkbox
                          style={{ height: 20, width: 20 }}
                          checked={selectedNoteIds.has(note.id)}
                          onCheckedChange={() => toggleNoteSelection(note.id)}
                        />
                      </div>
                      <div
                        className={`${s.tableCell} ${s.timestampCell}`}
                        title={formatTimestampToReadableString(note.doc.gulp_timestamp)}
                      >
                        {formatTimestampToReadableString(note.doc.gulp_timestamp)}
                      </div>
                      <div
                        className={`${s.tableCell} ${s.titleCell}`}
                        style={{ color: note.color }}
                        title={note.name}
                      >
                        {note.name}
                      </div>
                      <div className={`${s.tableCell} ${s.textCell}`} title={note.text}>
                        {note.text}
                      </div>
                      <div className={`${s.tableCell} ${s.contextCell}`} title={context.name}>
                        <span className={s.colorValue} style={{ color: context.color }}>
                          {context.name}
                        </span>
                      </div>
                      <div className={`${s.tableCell} ${s.sourceCell}`} title={source.name}>
                        <span className={s.colorValue} style={{ color: sourceColor }}>
                          {source.name}
                        </span>
                      </div>
                      <div
                        className={`${s.tableCell} ${s.tagsCell}`}
                        title={note.tags.join(', ')}
                      >
                        {note.tags.join(', ') || '-'}
                      </div>
                      <div className={`${s.tableCell} ${s.actionsCell}`}>
                        <Stack gap={8} ai="center" jc="flex-end">
                          <Button
                            icon="MagnifyingGlassSmall"
                            onClick={() => targetNoteButtonHandler(note)}
                            variant="glass"
                          />
                          <Button
                            icon="Trash2"
                            onClick={() => handleDelete(note)}
                            variant="glass"
                          />
                        </Stack>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className={s.footer}>
        <Stack jc="flex-end">
          <Button
            variant="glass"
            disabled={selectedNoteIds.size === 0}
            onClick={handleBulkDelete}
            icon="Trash2"
          >
            Delete selected notes ({selectedNoteIds.size})
          </Button>
        </Stack>
      </div>
      {banner?.target === 'table' ? banner.node : null}
      <div ref={windowRef} className={s.portalContainer} />
    </div>
  )
}
