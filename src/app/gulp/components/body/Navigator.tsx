import { Button, Stack } from "@impactium/components";
import { cn } from "@impactium/utils";
import s from './styles/Navigator.module.css'
import { useApplication } from "@/context/Application.context";
import { File, Note } from "@/class/Info";
import { useEffect, useState } from "react";
import { λNote } from "@/dto/Dataset";
import { NotePoint } from "@/ui/Note";
import { Icon } from "@impactium/icons";

export namespace Navigator {
  export interface Props extends Stack.Props {

  }
}

export function Navigator({ className, ...props }: Navigator.Props) {
  const { Info, app } = useApplication();
  const [notes, setNotes] = useState<λNote[]>([]);

  useEffect(() => {
    const files = File.selected(app);

    const notes = files.map(file => Note.findByFile(app, file)).flat();

    setNotes(notes);
  }, [app.target.notes]);

  const targetNoteButtonHandler = () => {
    // focus
  }

  return (
    <Stack pos='relative' dir='column' ai='flex-start' className={cn(className, s.navigator)} {...props}>
      {notes.map(note => <Combination icon={Note.icon(note)} name={note.name} func={targetNoteButtonHandler} accent={note.color} description={note.description} />)}
    </Stack>
  )
}

namespace Combination {
  export interface Props extends Stack.Props {
    icon: Icon.Name;
    name: string;
    accent: string;
    func: (...props: any[]) => void;
    description: string;
  }
}

function Combination({ icon, name, description, func, accent, ...props }: Combination.Props) {
  return (
    <Stack className={s.combination} style={{ color: accent }}>
      <Icon name={icon}  />
      <p>{name}</p>
      <span>{description}</span>
      <Button img='MagnifyingGlassSmall' onClick={func} variant='ghost' />
    </Stack>
  )
}