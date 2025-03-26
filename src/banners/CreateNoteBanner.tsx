import { Context, Event, File, Operation } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { TextareaHTMLAttributes, useMemo, useRef, useState } from 'react'
import s from './styles/CreateNoteBanner.module.css'
import { Input } from '@impactium/components'
import { Badge } from '@/ui/Badge'
import { Card } from '@/ui/Card'
import { Separator } from '@/ui/Separator'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { λGlyph, λNote } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { Textarea } from '@/ui/Textarea'
import { Glyph } from '@/ui/Glyph'
import { cn } from '@impactium/utils'
import { Markdown } from '@/ui/Markdown'
import { toast } from 'sonner'

export namespace NoteFunctionality {
  export namespace Create {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        note?: λNote
        event: λEvent
      }
    }

    export function Banner({
      note,
      event,
      ...props
    }: NoteFunctionality.Create.Banner.Props) {
      const { app, destroyBanner, Info } = useApplication()
      const [color, setColor] = useState<string>(note?.color || '#ffffff')
      const [name, setName] = useState<string>(note?.name || '')
      const [text, setText] = useState<string>(note?.text || '')
      const [icon, setIcon] = useState<λGlyph['id'] | null>(note?.glyph_id || Glyph.List.keys().next().value || null)
      const [loading, setLoading] = useState<boolean>(false)

      const Sidebar = useMemo(() => {
        return (
          <Stack className={s.sidebar} ai='flex-start'>
            <Markdown value={text} />
          </Stack>

        )
      }, [text]);

      const send = async () => {
        const operation = Operation.selected(app)

        if (!operation) {
          return
        }

        const glyph_id = icon as λGlyph['id']

        if (note) {
          await Info.note_edit({
            id: note.id,
            name,
            text,
            color,
            event,
            glyph_id
          })
        } else {
          await Info.note_create({
            color,
            event,
            glyph_id,
            name,
            text
          })
        }
        destroyBanner()
      }

      return (
        <UIBanner
          title={note ? 'Edit note' : 'Create note'}
          done={
            <Button
              loading={loading}
              className={s.save}
              onClick={send}
              variant={name && text ? 'glass' : 'disabled'}
              img="Check"
            />
          }
          side={Sidebar}
          {...props}
        >
          <Stack className={s.general} ai="stretch" dir="column" gap={8}>
            <Selection
              name="Context"
              value={Context.id(app, event.context_id).name}
              icon="Box"
            />
            <Selection
              name="File"
              value={File.id(app, event.file_id).name}
              icon="File"
            />
            <Selection name="Event" value={event.id} icon="Triangle" />
          </Stack>
          <Separator />
          <Editable
            name="Title"
            value={name}
            icon="TextTitle"
            onChange={(e) => setName(String(e.currentTarget.value))}
            placeholder="Note title"
          />
          <Stack>
            <Stack jc="space-between" flex className={s.inp}>
              <p>Glyph:</p>
              <Glyph.Chooser icon={icon} setIcon={setIcon} className={s.chooser} />
            </Stack>
            <ColorPicker style={{ flex: 1 }} color={color} setColor={setColor}>
              <ColorPickerTrigger />
              <ColorPickerPopover />
            </ColorPicker>
          </Stack>
          <Textarea
            className={s.textarea}
            value={text}
            onChange={(e) => setText(String(e.currentTarget.value))}
            placeholder="Description"
          />
          <Stack gap={4} style={{ color: 'var(--gray-900)', marginLeft: 'auto', fontSize: 13 }}>
            <Icon name='AcronymMarkdown' size={20} />
            markdown supported.
          </Stack>
        </UIBanner>
      )
    }
  }
}

interface SelectionProps {
  icon: Icon.Name
  name: string
  value: string
}

type EditableProps = SelectionProps & TextareaHTMLAttributes<HTMLInputElement>

function Editable({ icon, name, ...props }: EditableProps) {
  return (
    <Stack className={cn(s.inp, s.editable)}>
      <p>{name}:</p>
      <Input
        variant="highlighted"
        className={s.inp_input}
        img={icon}
        {...props}
      />
    </Stack>
  )
}

function Selection({ icon, name, value }: SelectionProps) {
  return (
    <Stack className={cn(s.inp, s.selection)}>
      <p>{name}:</p>
      <Input
        variant="highlighted"
        className={s.inp_input}
        img={icon}
        disabled
        value={value}
      />
    </Stack>
  )
}
