import { useApplication } from '@/context/Application.context'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { λNote } from '@/dto/Dataset'
import { Event, Note } from '@/class/Info'
import { Point as UIPoint } from './Point'
import { Button, Input, Stack } from '@impactium/components'
import { Icon } from '@impactium/icons'
import s from './styles/Note.module.css'
import { cn } from '@impactium/utils'
import { Badge } from './Badge'
import { formatDistanceToNow } from 'date-fns'
import { Separator } from './Separator'
import { Markdown } from './Markdown'
import { useEffect, useState } from 'react'
import { Select } from './Select'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

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
        <span>{note.text}</span>
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

  export namespace Group {
    export interface Props extends Omit<UIPoint.Props, 'name' | 'accent' | 'icon'> {
      notes: λNote[]
    }
  }

  export function Group({ notes, ...props }: Group.Props) {
    if (notes.length === 0) {
      return null
    }

    return (
      <Stack className={s.wrapper} pos='absolute' style={{ top: props.y, left: props.x }} dir='column-reverse' gap={0}>
        <UIPoint icon='Dot' accent='var(--gray-1000)' name='' y={0} x={0}>
          {notes.length}
        </UIPoint>
        <Stack className={s.content} dir='column'>
          {notes.map(note => <NotePoint.Combination note={note} />)}
        </Stack>
      </Stack>
    )
  }

  export namespace Detailed {
    export interface Props extends Stack.Props {
      notes: λNote[]
    }
  }

  export function Detailed({ notes, className, ...props }: Detailed.Props) {
    if (notes.length === 0) {
      return null
    }

    const { app } = useApplication();
    const [note, setNote] = useState<λNote>(notes[0])
    const [isRevealed, setIsRevealed] = useState<boolean>(false);

    useEffect(() => {
      if (note) {
        setNote(Note.id(app, note.id))
      } else {
        setNote(notes[0])
      }
    }, [notes])

    return (
      <Stack dir='column' ai='stretch' className={cn(s.detailed, className)} {...props}>
        <Stack dir='column' ai='stretch' className={s.header}>
          <Stack>
            <Select.Root onValueChange={(v) => setNote(Note.id(app, v as λNote['id']))}>
              <Select.Trigger style={{ color: note.color }} value={note.id}>
                <Select.Icon name={Note.icon(note)} />
                <p>{note.name}</p>
              </Select.Trigger>
              <Select.Content>
                {notes.map(note => (
                  <Select.Item style={{ color: note.color }} value={note.id}>
                    <Select.Icon name={Note.icon(note)} />
                    <p>{note.name}</p>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Button variant='ghost' img='Trash2'>Delete</Button>
          </Stack>
          <Stack style={{ flexWrap: 'wrap' }} jc='space-between'>
            <Badge variant='outline' icon='ClockRewind' style={{ color: 'var(--gray-900)', background: 'var(--gray-300)', whiteSpace: 'nowrap' }}>
              Created {formatDistanceToNow(note.time_created, { addSuffix: true })}
            </Badge>
            <Button rounded variant='glass' img='PencilEdit' size='sm' style={{ height: 20 }}>Edit</Button>
          </Stack>
        </Stack>
        <Separator />
        <Stack dir='column' style={{ minHeight: 32 }} gap={0} ai='unset' pos='relative'>
          <Markdown className={cn(s.description, isRevealed && s.revealed)} value={note.text} />
          <Button style={{ width: '100%', position: 'absolute', bottom: 0 }} variant='glass' onClick={() => setIsRevealed(v => !v)} img='AcronymMarkdown'>{isRevealed ? 'Hide' : 'Reveal'} description</Button>
        </Stack>
      </Stack>
    )

  }
}
