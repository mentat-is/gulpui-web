import { useApplication } from '@/context/Application.context'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { λNote } from '@/dto/Dataset'
import { Context, Event, File, Note } from '@/class/Info'
import { Point as UIPoint } from './Point'
import { Badge, Button, Stack } from '@impactium/components'
import { Icon } from '@impactium/icons'
import s from './styles/Note.module.css'
import { cn } from '@impactium/utils'

export namespace NotePoint {
  export interface Props
    extends Omit<UIPoint.Props, 'icon' | 'accent' | 'name'> {
    note: λNote
  }

  export namespace Combination {
    export interface Props extends Omit<Stack.Props, 'onClick'> {
      note: λNote
      withSource?: boolean
    }
  }

  export function Combination({
    className,
    style,
    note,
    ...props
  }: Combination.Props) {
    const { app, spawnDialog } = useApplication()

    const targetNoteButtonHandler = (note: λNote) => {
      const event = Event.id(app, note.doc._id);

      spawnDialog(<DisplayEventDialog event={event} />);
    }

    return (
      <Stack
        className={cn(s.combination, note.tags.includes('auto') && s.hidden, className)}
        style={{ ...style, color: note.color }}
        {...props}
      >
        <Icon name={Note.icon(note)} />
        <p>{note.name}</p>
        <span>{note.text}</span>
        <Stack className={s.badge_wrapper}>
          <Badge size='sm' value={`${Context.id(app, note.context_id).name} / ${File.id(app, note.source_id).name}`} variant='inverted' />
          {note.tags.map(t => <Badge size='sm' value={t} variant='gray-subtle' />)}
        </Stack>

        <Button
          img="MagnifyingGlassSmall"
          onClick={() => targetNoteButtonHandler(note)}
          variant="ghost"
        />
      </Stack>
    )
  }

  export function Point({ note, ...props }: NotePoint.Props) {
    const { app, spawnDialog } = useApplication()

    const openEvent = () => {
      const event = Note.event(app, note)

      if (event) {
        return null
      }

      spawnDialog(<DisplayEventDialog event={event} />);
    }

    return (
      <UIPoint
        onClick={openEvent}
        icon={Note.icon(note)}
        accent={note.color}
        name={note.name}
        {...props}
      />
    )
  }

  export namespace Group {
    export interface Props extends Omit<UIPoint.Props, 'name' | 'accent' | 'icon'> {
      notes: λNote[]
    }
  }

  export function Group({ notes, ...props }: Group.Props) {
    const { scrollY } = useApplication();
    if (notes.length === 0) {
      return null
    }

    return (
      <Stack className={s.wrapper} pos='absolute' style={{ top: props.y - scrollY, left: props.x }} dir='column-reverse' gap={0}>
        <UIPoint type='note' icon='Dot' accent='var(--gray-1000)' name='' y={0} x={0}>
          {notes.length}
        </UIPoint>
        <Stack className={s.content} dir='column'>
          {notes.map(note => <NotePoint.Combination key={note.id} note={note} />)}
        </Stack>
      </Stack>
    )
  }
}
