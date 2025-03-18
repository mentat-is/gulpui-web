import { Context, Event, File, Operation } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { TextareaHTMLAttributes, useRef, useState } from 'react'
import s from './styles/CreateNoteBanner.module.css'
import { Input } from '@impactium/components'
import { Badge } from '@/ui/Badge'
import { Card } from '@/ui/Card'
import { Separator } from '@/ui/Separator'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { λGlyph, λNote } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { Textarea } from '@/ui/Textarea'
import { Popover, PopoverTrigger } from '@/ui/Popover'
import { Glyph } from '@/ui/Glyph'
import { cn } from '@impactium/utils'

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
      const [tag, setTag] = useState<string>('')
      const [tags, setTags] = useState<Array<string>>(note?.tags || [])
      const [color, setColor] = useState<string>(note?.color || '#ffffff')
      const [name, setName] = useState<string>(note?.name || '')
      const [text, setText] = useState<string>(note?.text || '')
      const [icon, setIcon] = useState<λGlyph['id'] | null>(
        note?.glyph_id || Glyph.List.keys().next().value || null,
      )
      const [loading, setLoading] = useState<boolean>(false)
      const tag_ref = useRef<HTMLInputElement>(null)

      const send = async () => {
        const operation = Operation.selected(app)

        if (!operation) {
          return
        }

        api('/note_create', {
          method: 'POST',
          setLoading,
          query: {
            operation_id: operation.id,
            context_id: event.context_id,
            source_id: note?.file_id || event.file_id,
            ws_id: app.general.ws_id,
            name,
            color,
            glyph_id: icon as λGlyph['id'],
          },
          body: {
            text,
            tags,
            docs: Event.formatForServer(event),
          },
        }).then(() => {
          destroyBanner()
          Info.notes_reload()
        })
      }

      const addTag = () => {
        setTags((tags) =>
          tag_ref.current && !tags.includes(tag_ref.current.value)
            ? [...tags, tag_ref.current.value]
            : tags,
        )
        setTag('')
      }

      const deleteTag = (tag: string) =>
        setTags((tags) => tags.filter((t) => t !== tag))

      return (
        <UIBanner
          title="Create note"
          done={
            <Button
              loading={loading}
              className={s.save}
              onClick={send}
              variant={name && text ? 'glass' : 'disabled'}
              img="Check"
            />
          }
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
          <ColorPicker color={color} setColor={setColor}>
            <ColorPickerTrigger />
            <ColorPickerPopover />
          </ColorPicker>
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
          <Separator />
          <Stack jc="space-between" dir="row">
            <p>Glyph:</p>
            <Glyph.Chooser icon={icon} setIcon={setIcon} />
          </Stack>
          <Card className={s.tags}>
            <div className={s.content}>
              <p>Tags:</p>
              {tags.length ? (
                tags.map((tag) => (
                  <Badge key={tag} onClick={() => deleteTag(tag)} value={tag} />
                ))
              ) : (
                <Badge variant="outline" value="No tags here..." />
              )}
            </div>
            <div className={s.group}>
              <Input
                placeholder="Input tag name here..."
                ref={tag_ref}
                onChange={(e) => setTag(e.currentTarget.value)}
                value={tag}
              />
              <Button
                img="Plus"
                variant={tag.length > 0 ? 'outline' : 'disabled'}
                className={cn(tag.length > 0 && s.focus)}
                onClick={addTag}
              >
                Add
              </Button>
            </div>
          </Card>
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
