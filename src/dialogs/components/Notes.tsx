import { λEvent } from '@/dto/ChunkEvent.dto';
import s from '../styles/DisplayEventDialog.module.css';
import { useApplication } from '@/context/Application.context';
import { Note } from '@/class/Info';
import { Card } from '@/ui/Card';
import { NoteContent } from '@/ui/Note';
import { useState } from 'react';
import { λNote } from '@/dto/Note.dto';

interface NotesProps {
  notes: λNote[]
}

export function Notes({ notes }: NotesProps) {
  const { Info } = useApplication();
  const [loading, setLoading] = useState<boolean>(false);

  const deleteNote = async (note: λNote) => {
    setLoading(true);
    await Info.notes_delete(note);
    setLoading(false);
  }

  return (
    <div className={s.notes}>
      {notes.map(note => (
        <Card key={note.id}>
          <NoteContent loading={loading} deleteNote={() => deleteNote(note)} note={note} />
        </Card>
      ))}
    </div>
  )
}