import { Operation, Parser } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import {
  ColorPicker,
  ColorPickerTrigger,
  ColorPickerPopover,
} from '@/ui/Color';
import { SetStateAction, useState } from 'react';
import s from './styles/CreateNoteBanner.module.css'
import { Input } from '@/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Card } from '@/ui/Card';
import { Separator } from '@/ui/Separator';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { Switch } from '@/ui/Switch';
import { LinkCreateRequest } from '@/dto/LinkCreateRequest.dto';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { λLink } from '@/dto/Link.dto';
import { LinkCombination } from '@/components/LinkCombination';
import { EventCombination } from '@/components/EventCombination';
import { GlyphsPopover } from '@/components/Glyphs.popover';
import { λFile } from '@/dto/Operation.dto';
import { format } from 'date-fns';

interface CreateLinkBannerProps {
  context: string,
  file: λFile,
  events: λEvent[] | λEvent
}

export function CreateLinkBanner({ context, file, events }: CreateLinkBannerProps) {
  const { app, destroyBanner, Info } = useApplication();
  const [color, setColor] = useState<string>('#ffffff');
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const [glyph_id, setGlyphId] = useState<number>(-1);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [_private, _setPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const levelMap = ['DEFAULT', 'WARNING', 'ERROR'];

  const send = async () => {
    const data: any = {
      operation_id: Operation.selected(app)?.id,
      context,
      src_file: file.name,
      ws_id: app.general.ws_id,
      src: Parser.array(events)[0].id,
      color,
      level,
      private: _private,
      name
    };

    if (glyph_id >= 0) {
      data.glyph_id = glyph_id
    }

    setLoading(true);
    api('/link_create', {
      method: 'POST',
      query: data,
      body: LinkCreateRequest.body({ name, description, events })
    }).then(() => {
      destroyBanner();
      Info.links_reload()
    });
  }

  const update = async (link: λLink) =>api<any>('/link_update', {
    method: 'PUT',
    query: {
      link_id: link.id,
      ws_id: app.general.ws_id,
    },
    body: LinkCreateRequest.body({ ...link, events: [...Parser.array(events), ...link.events as λEvent[]] })
  }, Info.links_reload).then(destroyBanner);

  const Subtitle = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost'>Connect to existing one</Button>
      </PopoverTrigger>
      <PopoverContent className={s.popover}>
        {app.target.links.filter(l => !l.events.some(e => Parser.array(events).map(e => e.id).includes(e.id))).map(l => (
            <LinkCombination link={l}>
              <Button onClick={() =>update(l)} variant='outline'>Connect</Button>
            </LinkCombination>
          ))}
      </PopoverContent>
    </Popover>
  );

  return (
    <Banner title='Create link' subtitle={!!app.target.links.filter(l => !l.events.some(e => Parser.array(events).map(e => e.id).includes(e.id))).length && <Subtitle />}>
      <Card className={s.overview}>
        <p>Name: <Input placeholder='*Required' revert img='Heading1' value={name} onChange={e => setName(e.currentTarget.value)}/></p>
        <Separator />
        <p>Description: <Input placeholder='*Required' revert img='Heading2' value={description} onChange={e => setDescription(e.currentTarget.value)}/></p>
        <Separator />
        <p>Context: <span>{context}</span></p>
        <Separator />
        <p>File: <span>{file.name}</span></p>
        <Separator />
        <p>At: <span>{format((Parser.array(events)[0]?.timestamp || 0), 'yyyy.MM.dd HH:mm:ss')}</span></p>
      </Card>
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
          <p>Log level:</p>
          <Select onValueChange={(v) => setLevel(levelMap.findIndex(l => l === v) as 0 | 1 | 2)} value={levelMap[level]}>
              <SelectTrigger className={s.trigger}>
                <SelectValue defaultValue={0} placeholder='Choose log level' />
            </SelectTrigger>
            <SelectContent>
              {levelMap.map(l => <SelectItem value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className={s.unit}>
          <p>Private: {_private ? 'Yes' : 'No'}</p>
          <Switch checked={_private} onCheckedChange={_setPrivate}></Switch>
        </div>
        <Separator />
        {/* <GlyphsPopover icon={glyph_id} setIcon={setGlyphId} /> */}
      </Card>
      <Card>
        {Parser.array(events).map(event => <EventCombination event={event} />)}
      </Card>
      <Button loading={loading} className={s.save} onClick={send} variant={name && description ? 'default' : 'disabled'} img='Check'>Create</Button>
    </Banner>
  )
}
