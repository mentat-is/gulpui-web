import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { useCallback, useMemo, useState } from 'react'
import s from './styles/CreateNoteBanner.module.css'
import { Separator } from '@/ui/Separator'
import { Default } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { Textarea } from '@/ui/Textarea'
import { Markdown } from '@/ui/Markdown'
import { Toggle } from '@/ui/Toggle'
import { Input } from '@/ui/Input'
import { Label } from '@/ui/Label'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Doc } from '@/entities/Doc'
import { Note } from '@/entities/Note'
import { Glyph } from '@/entities/Glyph'
import { Operation } from '@/entities/Operation'
import { Context } from '@/entities/Context'
import { Source } from '@/entities/Source'
import { Link } from '@/entities/Link'

export namespace NoteFunctionality {
  export namespace Create {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        note?: Note.Type
        event: Doc.Type
      }
    }

    export function Banner({
      note,
      event,
      ...props
    }: NoteFunctionality.Create.Banner.Props) {
      const { app, destroyBanner, Info } = Application.use()
      const [color, setColor] = useState<string>(note?.color || '#ffffff')
      const [name, setName] = useState<string>(note?.name || '')
      const [text, setText] = useState<string>(note?.text || '')
      const [rawTags, setRawTags] = useState<string>(note?.tags ? note.tags.join(', ') : '');
      const [isPrivate, setIsPrivate] = useState<boolean>(false);
      const [icon, setIcon] = useState<Glyph.Id | null>(note?.glyph_id || Glyph.List.keys().next().value || null)
      const [loading, setLoading] = useState<boolean>(false)

      const Sidebar = useMemo(() => {
        return (
          <Stack className={s.sidebar} ai='flex-start'>
            <Markdown value={text} />
          </Stack>

        )
      }, [text]);

      const send = async () => {
        const operation = Operation.Entity.selected(app)

        if (!operation) {
          return
        }

        const glyph_id = icon as Glyph.Id

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
              icon='Check'
            />
          }
          side={Sidebar}
          {...props}
        >
          <Stack className={s.general} ai='stretch' dir='column' gap={8}>
            <Input
              label='Context'
              variant='highlighted'
              className={s.inp_input}
              disabled
              value={Context.Entity.id(app, event['gulp.context_id']).name}
              icon={Default.Icon.CONTEXT}
            />
            <Input
              label='Source'
              variant='highlighted'
              className={s.inp_input}
              disabled
              value={Source.Entity.id(app, event['gulp.source_id']).name}
              icon={Default.Icon.SOURCE}
            />
            <Input
              label='Event'
              variant='highlighted'
              className={s.inp_input}
              disabled
              value={event._id}
              icon='Triangle'
            />
          </Stack>
          <Separator />
          <Input
            name='Title'
            value={name}
            icon='TextTitle'
            onChange={(e) => setName(String(e.currentTarget.value))}
            placeholder='Note title'
            variant='highlighted'
            className={s.inp_input}
          />
          <Stack className={s.chooser_wrapper}>
            <Glyph.Chooser label='Glyph' icon={icon} setIcon={setIcon} />
            <Stack dir='column' gap={6} ai='flex-start' data-input>
              <Label value='Pick a color' />
              <ColorPicker color={color} setColor={setColor}>
                <ColorPickerTrigger />
                <ColorPickerPopover />
              </ColorPicker>
            </Stack>
          </Stack>
          <Input placeholder='Tags separated by comma' value={rawTags} onChange={e => setRawTags(e.target.value)} />
          {note?.id ? null : <Toggle option={['Public', 'Private']} checked={isPrivate} onCheckedChange={setIsPrivate} />}
          <Textarea
            className={s.textarea}
            value={text}
            onChange={(e) => setText(String(e.currentTarget.value))}
            placeholder='Description'
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
        event: Doc.Type
        link?: Link.Type
      }
    }

    export function Banner({ link, event, ...props }: LinkFunctionality.Create.Banner.Props) {
      const { app, spawnBanner, destroyBanner, Info } = Application.use()
      const [color, setColor] = useState<string>(link?.color || Default.Color.LINK)
      const [icon, setIcon] = useState<Glyph.Id | null>(link?.glyph_id || Glyph.List.keys().next().value || null)
      const [name, setName] = useState<string>(link?.name || '')
      const [description, setDescription] = useState<string>(link?.description || '');
      const [loading, setLoading] = useState<boolean>(false)

      const context = useMemo(() => {
        return Context.Entity.id(app, event['gulp.context_id'])
      }, [event])

      const file = useMemo(() => {
        return Source.Entity.id(app, event['gulp.source_id'])
      }, [event])

      const send = async () => {
        setLoading(true);

        const glyph_id = icon as Glyph.Id;

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
            variant='tertiary'
            icon='GitPullRequestCreateArrow'
          />
        ),
        [event],
      )

      const Done = useCallback(() => {
        return (
          <Button
            loading={loading}
            onClick={send}
            variant='glass'
            disabled={!name || !icon}
            icon='Check'
          />
        )
      }, [loading, name, send])

      return (
        <UIBanner title='Create link' done={<Done />} option={<Option />}>
          <Stack className={s.general} ai='stretch' dir='column' gap={8}>
            <Input
              label='Context'
              variant='highlighted'
              className={s.inp_input}
              disabled
              value={context.name}
              icon={Default.Icon.CONTEXT}
            />
            <Input
              label='Source'
              variant='highlighted'
              className={s.inp_input}
              disabled
              value={file.name}
              icon={Default.Icon.SOURCE}
            />
            <Input
              label='Event'
              variant='highlighted'
              className={s.inp_input}
              disabled
              value={event._id}
              icon='Triangle'
            />
            <Separator />
            <Input
              label='Title'
              value={name}
              variant='highlighted'
              icon='TextTitle'
              onChange={(e) => setName(String(e.currentTarget.value))}
              placeholder='Link title'
            />
            <Stack className={s.chooser_wrapper}>
              <Glyph.Chooser label='Glyph' icon={icon} setIcon={setIcon} />
              <Stack dir='column' gap={6} ai='flex-start' data-input>
                <Label value='Pick a color' />
                <ColorPicker color={color} setColor={setColor}>
                  <ColorPickerTrigger />
                  <ColorPickerPopover />
                </ColorPicker>
              </Stack>
            </Stack>
            <Textarea
              className={s.textarea}
              value={description}
              onChange={(e) => setDescription(String(e.currentTarget.value))}
              placeholder='Link description'
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
      event: Doc.Type
    }
    export function Banner({ event }: LinkFunctionality.Connect.Props) {
      const { app, Info, spawnBanner } = Application.use()

      const connect = (link: Link.Type) => () => Info.links_connect(link, event)

      const links = useMemo(() => {
        return Link.Entity.selected(app).filter((l) => !l.doc_ids.some((e) => e === event._id))
      }, [app.target.links])

      const NoLinks = useMemo(() => {
        return (
          <Stack dir='column' gap={16}>
            <Stack gap={4} style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--second)' }}>There is no links at all. <Icon name='FaceSad' size={18} /></Stack>
            <Button rounded onClick={() => spawnBanner(<LinkFunctionality.Create.Banner event={event} />)} icon='GitPullRequestArrow'>Create link</Button>
          </Stack>
        )
      }, [spawnBanner])

      return (
        <UIBanner title='Connect link'>
          {links.length ? links.map((link) => (
            <Button
              key={link.id}
              variant='secondary'
              style={{ color: link.color }}
              onClick={connect(link)}
              icon={Link.Entity.icon(link)}
            >
              {link.name}
            </Button>
          )) : NoLinks}
        </UIBanner>
      )
    }
  }
}
