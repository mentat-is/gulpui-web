import { useApplication } from '@/context/Application.context';
import s from './styles/NotesWindow.module.css';
import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Note } from '@/class/Info';
import { λNote } from '@/dto/Dataset';

interface FloatingWindowProps {
  onClose: () => void;
  focus: (note: λNote) => void;
}

export function NotesWindow({ onClose, focus }: FloatingWindowProps) {
  const { app } = useApplication();
  
  return (
    <Banner title='Notes' onClose={onClose} className={s.main}>
      {app.target.notes.map(note => {
        const events = Note.events(app, note);

        return (
          <div className={s.unit} data-accent={note.color} style={{ background: `linear-gradient(to top, ${note.color}, ${note.color + 48})` }}>
            <span className={s.background} />
            <SymmetricSvg text={events[0]?.id || note.name} />
            <div className={s.group}>
              <p className={s.top}>{note.name}</p>
              <p className={s.bottom}>{note.text || note.description}</p>
            </div>
            <Button variant='outline' onClick={() => focus(note)} img='MoveRight' revert>View</Button>
          </div>
        )
      })}
    </Banner>
  );
};
