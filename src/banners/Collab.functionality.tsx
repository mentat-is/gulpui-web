import { Context, Event, File, Link, Operation } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { TextareaHTMLAttributes, useCallback, useMemo, useRef, useState } from 'react'
import s from './styles/CreateNoteBanner.module.css'
import { Input } from '@impactium/components'
import { Badge } from '@/ui/Badge'
import { Card } from '@/ui/Card'
import { Separator } from '@/ui/Separator'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Default, λGlyph, λLink, λNote } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { Textarea } from '@/ui/Textarea'
import { Glyph } from '@/ui/Glyph'
import { cn } from '@impactium/utils'
import { Markdown } from '@/ui/Markdown'
import { toast } from 'sonner'
import { Description } from '@radix-ui/react-dialog'
import { Toggle } from '@/ui/Toggle'

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
      const [rawTags, setRawTags] = useState<string>(note?.tags ? note.tags.join(', ') : '');
      const [isPrivate, setIsPrivate] = useState<boolean>(false);
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

        const tags = rawTags.split(',').map(tag => tag.trim()).filter(t => t.length);

        setLoading(true);

        if (note?.id) {
          await Info.note_edit({
            id: note.id,
            name,
            text,
            color,
            event,
            glyph_id,
            tags
          })
        } else {
          await Info.note_create({
            color,
            event,
            glyph_id,
            name,
            text,
            isPrivate,
            tags
          })
        }

        setLoading(false);
        destroyBanner()
      }

      return (
        <UIBanner
          title={note?.id ? 'Edit note' : 'Create note'}
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
              value={Context.id(app, event['gulp.context_id']).name}
              icon="Box"
            />
            <Selection
              name="File"
              value={File.id(app, event['gulp.source_id']).name}
              icon="File"
            />
            <Selection name="Event" value={event._id} icon="Triangle" />
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
          <Input placeholder='Tags separated by comma' value={rawTags} onChange={e => setRawTags(e.target.value)} />
          {note?.id ? null : <Toggle option={['Public', 'Private']} checked={isPrivate} onCheckedChange={setIsPrivate} />}
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

export namespace LinkFunctionality {
  export namespace Create {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        event: λEvent
        link?: λLink
      }
    }

    export function Banner({ link, event, ...props }: LinkFunctionality.Create.Banner.Props) {
      const { app, spawnBanner, destroyBanner, Info } = useApplication()
      const [color, setColor] = useState<string>(link?.color || Default.Color.LINK)
      const [icon, setIcon] = useState<λGlyph['id'] | null>(link?.glyph_id || Glyph.List.keys().next().value || null)
      const [name, setName] = useState<string>(link?.name || '')
      const [description, setDescription] = useState<string>(link?.description || '');
      const [loading, setLoading] = useState<boolean>(false)

      const context = useMemo(() => {
        return Context.id(app, event['gulp.context_id'])
      }, [event])

      const file = useMemo(() => {
        return File.id(app, event['gulp.source_id'])
      }, [event])

      const send = async () => {
        setLoading(true);

        const glyph_id = icon as λGlyph['id'];

        if (link) {
          await Info.link_edit({
            id: link.id,
            color,
            description,
            events: link.doc_ids,
            glyph_id,
            name
          }).then(() => {
            if (props.back) {
              props.back()
            }
            destroyBanner();
          });
        } else {
          await Info.link_create({
            name,
            glyph_id,
            color,
            event,
            description
          }).then(() => {
            if (props.back) {
              props.back()
            }
            destroyBanner();
          })
        }
        setLoading(false);
      }

      const Option = useCallback(
        () => (
          <Button
            onClick={() => spawnBanner(<LinkFunctionality.Connect.Banner event={event} />)}
            variant="ghost"
            img="GitPullRequestCreateArrow"
          />
        ),
        [event],
      )

      const Done = useCallback(() => {
        return (
          <Button
            loading={loading}
            onClick={send}
            variant="glass"
            disabled={!name || !icon}
            img="Check"
          />
        )
      }, [loading, name, send])

      return (
        <UIBanner title="Create link" done={<Done />} option={<Option />}>
          <Stack className={s.general} ai="stretch" dir="column" gap={8}>
            <Selection name="Context" value={context.name} icon="Box" />
            <Selection name="File" value={file.name} icon="File" />
            <Selection name="Event" value={event._id} icon="Triangle" />
            <Separator />
            <Editable
              name="Title"
              value={name}
              icon="TextTitle"
              onChange={(e) => setName(String(e.currentTarget.value))}
              placeholder="Link title"
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
              value={description}
              onChange={(e) => setDescription(String(e.currentTarget.value))}
              placeholder="Link description"
            />
            <Stack gap={4} style={{ color: 'var(--gray-900)', marginLeft: 'auto', fontSize: 13 }}>
              <Icon name='AcronymMarkdown' size={20} />
              markdown supported.
            </Stack>
          </Stack>
        </UIBanner>
      )
    }
  }

  export namespace Connect {
    export interface Props {
      event: λEvent
    }
    export function Banner({ event }: LinkFunctionality.Connect.Props) {
      const { app, Info, spawnBanner } = useApplication()

      const connect = (link: λLink) => () => Info.links_connect(link, event)

      const links = useMemo(() => {
        return Link.selected(app).filter((l) => !l.doc_ids.some((e) => e === event._id))
      }, [app.target.links])

      const NoLinks = useMemo(() => {
        return (
          <Stack dir='column' gap={16}>
            <Stack gap={4} style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-dimmed)' }}>There is no links at all. <Icon name='FaceSad' size={18} /></Stack>
            <Button rounded onClick={() => spawnBanner(<LinkFunctionality.Create.Banner event={event} />)} img='GitPullRequestArrow'>Create link</Button>
          </Stack>
        )
      }, [spawnBanner])

      return (
        <UIBanner title="Connect link">
          {links.length ? links.map((link) => (
            <Button
              key={link.id}
              variant="secondary"
              style={{ color: link.color }}
              onClick={connect(link)}
              img={Link.icon(link)}
            >
              {link.name}
            </Button>
          )) : NoLinks}
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
      {props.children || <Input
        variant="highlighted"
        className={s.inp_input}
        img={icon}
        {...props}
      />}
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
