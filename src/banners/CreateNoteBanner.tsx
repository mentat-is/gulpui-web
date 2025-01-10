import { Context, Event, File, Operation, Parser } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button, Stack } from '@impactium/components';
import {
  ColorPicker,
  ColorPickerTrigger,
  ColorPickerPopover,
} from '@/ui/Color';
import { useRef, useState } from 'react';
import s from './styles/CreateNoteBanner.module.css';
import { Input, InputProps } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { cn } from '@/ui/utils';
import { Separator } from '@/ui/Separator';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { Switch } from '@/ui/Switch';
import { λGlyph } from '@/dto/Dataset';
import { GlyphsPopover } from '@/components/Glyphs.popover';
import { GlyphMap } from '@/dto/Glyph.dto';
import { Icon } from '@impactium/icons';
import { Textarea } from '@/ui/Textarea';

interface CreateNoteBannerProps {
  event: λEvent
}

interface SelectionProps {
  icon: Icon.Name;
  name: string;
  value: string;
}

type EditableProps = SelectionProps & InputProps;

export function CreateNoteBanner({ event }: CreateNoteBannerProps) {
  const { app, destroyBanner, Info } = useApplication();
  const [tag, setTag] = useState<string>('');
  const [tags, setTags] = useState<Array<string>>([]);
  const [color, setColor] = useState<string>('#ffffff');
  const [name, setName] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [icon, setIcon] = useState<λGlyph['id'] | null>(GlyphMap.keys().next().value || null);
  const [_private, _setPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const tag_ref = useRef<HTMLInputElement>(null);

  const send = async () => {
    const operation = Operation.selected(app);

    if (!operation) {
      return;
    }
    
    api('/note_create', {
      method: 'POST',
      setLoading,
      query: {
        operation_id: operation.id,
        context_id: event.context_id,
        source_id: event.file_id,
        ws_id: app.general.ws_id,
        name,
        color,
        private: String(_private),
        glyph_id: icon!
      },
      body: {
        text,
        tags,
        docs: Event.formatForServer(event)
      }
    }).then(() => {
      destroyBanner();
      Info.notes_reload()
    });
  }

  const addTag = () => {
    setTags(tags => tag_ref.current && !tags.includes(tag_ref.current.value)
      ? [...tags, tag_ref.current.value]
      : tags);
    setTag('');
  }

  const deleteTag = (tag: string) => setTags(tags => tags.filter(t => t !== tag));

  function Selection({ icon, name, value }: SelectionProps) {
    return (
      <Stack className={cn(s.inp, s.selection)}>
        <p>{name}:</p>
        <Input className={s.inp_input} img={icon} disabled value={value} />
      </Stack>
    )
  }

  function Editable({ icon, name, value }: EditableProps) {
    return (
      <Stack className={cn(s.inp, s.editable)}>
        <p>{name}:</p>
        <Input className={s.inp_input} img={icon} value={value} />
      </Stack>
    )
  }

  return (
    <Banner title='Create note' done={<Button loading={loading} className={s.save} onClick={send} variant={name && text ? 'glass' : 'disabled'} img='Check'/>}>
      <Stack className={s.general} ai='stretch' dir='column' gap={8}>
        <Selection name='Context' value={Context.id(app, event.context_id).name} icon='Box' />
        <Selection name='File' value={File.id(app, event.file_id).name} icon='File' />
        <Selection name='Event' value={event.id} icon='Triangle' />
      </Stack>
      <Separator />
      <Editable name='Title' value={name} icon='TextTitle' onChange={e => setName(e.currentTarget.value)} placeholder='Note title' />
      <Editable name='Description' value={text} icon='TextQuote' onChange={e => setName(e.currentTarget.value)}>
        <Textarea />
      </Editable>
      <Separator />
      <Card className={s.color}>
        <div className={s.unit}>
          <p>Color:</p>
          <ColorPicker color={color} setColor={setColor}>
            <ColorPickerTrigger />
            <ColorPickerPopover />
          </ColorPicker>
        </div>
        <Separator />
        <div className={s.unit}>
          <p>Glyph:</p>
          <GlyphsPopover icon={icon} setIcon={setIcon} />
        </div>
        <Separator />
        <div className={s.unit}>
          <p>Private: {_private ? 'Yes' : 'No'}</p>
          <Switch checked={_private} onCheckedChange={_setPrivate}></Switch>
        </div>
      </Card>
      <Card className={s.tags}>
        <div className={s.content}>
        <p>Tags:</p>{tags.length ? tags.map(tag => <Badge onClick={() => deleteTag(tag)} value={tag} />) : <Badge variant='outline' value='No tags here...' />}
        </div>
        <div className={s.group}>
          <Input placeholder='Input tag name here...' ref={tag_ref} onChange={(e) => setTag(e.currentTarget.value)} value={tag}/>
          <Button img='Plus' variant={tag.length > 0 ? 'outline' : 'disabled'} className={cn(tag.length > 0 && s.focus)} onClick={addTag}>Add</Button>
        </div>
      </Card>
    </Banner>
  )
}
