import { useApplication } from '@/context/Application.context'
import s from './styles/NotesWindow.module.css'
import { Banner } from '@/ui/Banner'
import { λNote } from '@/dto/Dataset'
import { NotePoint } from '@/ui/Note'
import { useEffect, useState } from 'react'
import { Input, Stack } from '@impactium/components'
import { Context, File } from '@/class/Info'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover'
import { Collab } from './CollabList'

interface FloatingWindowProps {
  onClose: () => void
  focus: (note: λNote) => void
}

export function NotesWindow({ onClose }: FloatingWindowProps) {
  const { app } = useApplication()
  const [sortedNotes, setSortedNotes] = useState<λNote[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSortedNotes(app.target.notes.filter(n => n.name.includes(search) || n.text.includes(search) || File.id(app, n.source_id).name.includes(search) || Context.id(app, n.context_id).name.includes(search)).sort((a, b) => a.context_id.localeCompare(b.context_id)).sort((a, b) => a.source_id.localeCompare(b.source_id)));
  }, [app.target.notes, search]);

  return (
    <Banner title="Notes" onClose={onClose} className={s.main}>
      <Input placeholder='Context name, source name, note title or note description' img='MagnifyingGlass' variant='highlighted' value={search} onChange={e => setSearch(e.target.value)} />
      <Stack className={s.result} dir='column'>
        {sortedNotes.map((note) => (
          <NotePoint.Combination key={note.id} note={note} />
        ))}
      </Stack>

    </Banner>
  )
}
