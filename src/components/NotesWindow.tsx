import { useApplication } from '@/context/Application.context';
import s from './styles/NotesWindow.module.css';
import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Note } from '@/class/Info';
import { λNote } from '@/dto/Dataset';
import { NotePoint } from '@/ui/Note';

interface FloatingWindowProps {
  onClose: () => void;
  focus: (note: λNote) => void;
}

export function NotesWindow({ onClose, focus }: FloatingWindowProps) {
  const { app } = useApplication();
  
  return (
    <Banner title='Notes' onClose={onClose} className={s.main}>
      {app.target.notes.map(note => <NotePoint.Combination note={note} />)}
    </Banner>
  );
};
