import { useApplication } from '@/context/Application.context'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { λNote } from '@/dto/Dataset'
import { Event, Note } from '@/class/Info'
import { Point as UIPoint } from './Point'
import { Button, Stack } from '@impactium/components'
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
    }
  }

  export function Combination({
    className,
    note,
    ...props
  }: Combination.Props) {
    const { app, spawnDialog } = useApplication()

    const targetNoteButtonHandler = (note: λNote) => {
      const events = Event.ids(
        app,
        note.docs.map((d) => d.id),
      )
      if (events.length === 0) {
        return
      }

      spawnDialog(
        events.length > 1 ? (
          <DisplayGroupDialog events={events} />
        ) : (
          <DisplayEventDialog event={events[0]} />
        ),
      )
    }

    return (
      <Stack
        className={cn(s.combination, className)}
        style={{ color: note.color }}
        {...props}
      >
        <Icon name={Note.icon(note)} />
        <p>{note.name}</p>
        <span>{note.description}</span>
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
      const events = Note.events(app, note)

      if (events.length === 0) {
        return null
      }

      const target = events[0]

      const dialog =
        events.length === 1 ? (
          <DisplayEventDialog event={target} />
        ) : (
          <DisplayGroupDialog events={events} />
        )

      spawnDialog(dialog)
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
}
