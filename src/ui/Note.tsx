import { useApplication } from '@/context/Application.context'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { Point as UIPoint } from './Point'
import { Icon } from '@impactium/icons'
import s from './styles/Note.module.css'
import { cn } from '@impactium/utils'
import { formatTimestampToReadableString, stringToHexColor } from './utils'
import { Stack } from './Stack'
import { Badge } from './Badge'
import { Button } from './Button'
import { Doc } from '@/entities/Doc'
import { Context } from '@/entities/Context'
import { Source } from '@/entities/Source'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { Note } from '@/entities/Note'

export namespace NotePoint {
  export interface Props
    extends Omit<UIPoint.Props, 'icon' | 'accent' | 'name'> {
    notes: Note.Type[]
  }

  export namespace Combination {
    export interface Props extends Omit<Stack.Props, 'onClick'> {
      note: Note.Type
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

    const targetNoteButtonHandler = (note: Note.Type) => {
      const event = Doc.Entity.id(app, note.doc._id);

      spawnDialog(<DisplayEventDialog event={event} />);
    }

    return (
      <Stack
        className={cn(s.combination, note.tags.includes('auto') && s.hidden, className)}
        style={{ ...style, background: stringToHexColor(note.context_id) + '80' }}
        {...props}
      >
        <p>{formatTimestampToReadableString(note.doc['@timestamp'])}</p>
        <Icon name={Note.Entity.icon(note)} />
        <p>{note.name}</p>
        <span>{note.text}</span>
        <Stack className={s.badge_wrapper}>
          <Badge value={`${Context.Entity.id(app, note.context_id).name} / ${Source.Entity.id(app, note.source_id).name}`} />
          {note.tags.map(t => <Badge value={t} icon={isTagAreSeverityIndicator(t) ? NotePoint.getIconFromNoteSeverity(note) : undefined} variant={(isTagAreSeverityIndicator(t) ? NotePoint.getColorFromNoteSeverity(note) : 'gray-subtle') as any} />)}
        </Stack>

        <Button
          img="MagnifyingGlassSmall"
          onClick={() => targetNoteButtonHandler(note)}
          variant='tertiary'
        />
      </Stack>
    )
  }

  export function Point({ notes, ...props }: NotePoint.Props) {
    const { app, spawnDialog } = useApplication()

    const handleClick = () => {
      const ids = notes.map(n => n.doc._id);
      const events = Source.Entity.events(app, notes[0].source_id).filter(f => ids.includes(f._id));
      if (!events.length) {
        return;
      }

      if (events.length === 1) {
        return spawnDialog(<DisplayEventDialog event={events[0]} />)
      }

      return spawnDialog(<DisplayGroupDialog events={events} />);
    };

    return (
      <UIPoint
        onClick={handleClick}
        icon={notes.length > 1 ? 'Status' : Note.Entity.icon(notes[0])}
        accent={notes.length > 1 ? '#e8e8e8' : notes[0].color}
        name={(notes.length > 1 ? notes.length : notes[0].name).toString()}
        {...props}
      />
    )
  }

  export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

  export const SeverityToColorMap: Record<Severity, string> = {
    critical: 'red',
    high: 'amber',
    medium: 'blue',
    low: 'green',
    informational: 'gray'
  } as const;

  export type SeverityToColorMap = typeof SeverityToColorMap

  export const SeverityToIconMap: Record<Severity, Icon.Name> = {
    critical: 'Warning',
    high: 'DataPoint',
    medium: 'DataPointMedium',
    low: 'DataPointLow',
    informational: 'Information'
  } as const;

  export type SeverityToIconMap = typeof SeverityToIconMap

  /**
   * O(1) complexity
   */
  export const getSeverityFromNote = (note: Note.Type): Severity => {
    const target = note.tags.find(tag => isTagAreSeverityIndicator(tag));
    if (!target) {
      return 'informational';
    }

    const splited = target.split('_');
    if (splited.length !== 2) {
      return 'informational';
    }

    const key: Severity = splited[1] in SeverityToColorMap
      ? splited[1] as Severity
      : 'informational';

    return key;
  }

  export const getIconFromNoteSeverity = (note: Note.Type) => SeverityToIconMap[getSeverityFromNote(note)];

  export const getColorFromNoteSeverity = (note: Note.Type) => SeverityToColorMap[getSeverityFromNote(note)];

  export const isTagAreSeverityIndicator = (tag: string): boolean => tag.startsWith('severity_');
}
