import { Event, Operation, Parser } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { ResponseBase } from "@/dto/ResponseBase.dto";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import {
  ColorPicker,
  ColorPickerTrigger,
  ColorPickerPopover,
} from "@/ui/Color";
import { useState } from "react";
import s from './styles/CreateNoteBanner.module.css'
import { Input } from "@/ui/Input";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Card } from "@/ui/Card";
import { Separator } from "@/ui/Separator";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { Switch } from "@/ui/Switch";
import { LinkCreateRequest } from "@/dto/LinkCreateRequest.dto";
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { λFile } from "@/dto/File.dto";
import { λLink } from "@/dto/Link.dto";
import { stringToHexColor } from "@/ui/utils";

interface CreateLinkBannerProps {
  context: string,
  file: λFile,
  events: λEvent[] | λEvent
}

export function CreateLinkBanner({ context, file, events }: CreateLinkBannerProps) {
  const { app, api, destroyBanner, Info, spawnBanner } = useApplication();
  const [color, setColor] = useState<string>('#ffffff');
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [_private, _setPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const levelMap = ['DEFAULT', 'WARNING', 'ERROR'];

  const send = async () => {
    setLoading(true);
    api<ResponseBase<unknown>>('/link_create', {
      method: 'POST',
      data: {
        operation_id: Operation.selected(app)?.id,
        context,
        src_file: file.name,
        ws_id: app.general.ws_id,
        src: Parser.array(events)[0]._id,
        color,
        level,
        private: _private,
        name
      },
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: LinkCreateRequest.body({ name, description, events })
    }).then(() => {
      destroyBanner();
      Info.links_reload()
    });
  }

  const update = async (link: λLink) => {
    const body = LinkCreateRequest.body({ ...link, events: [...Parser.array(events), ...link.events as λEvent[]] })

    console.log(JSON.parse(body));

    api<any>('/link_update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        link_id: link.id,
        ws_id: app.general.ws_id,
      },
      body 
    }).then(() => {
      Info.links_reload().then(() => {
        destroyBanner();
      });
    });
  }

  const Subtitle = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost'>Connect to existing one</Button>
      </PopoverTrigger>
      <PopoverContent className={s.popover}>
        {app.target.links.filter(l => !l.events.some(e => Parser.array(events).map(e => e._id).includes(e._id))).map(l => (
            <div className={s.event_unit} onClick={() =>update(l)}>
              <SymmetricSvg text={l.events.map(e => e._id).join().toString()} />
              <div className={s.text}>
                <p className={s.top}>{l.name || l.file}</p>
                <p className={s.bottom}>{l.description || l.context}</p>
              </div>
              <Button variant='outline'>Connect</Button>
            </div>
          ))}
      </PopoverContent>
    </Popover>
  );

  return (
    <Banner title='Create link' subtitle={!!app.target.links.filter(l => !l.events.some(e => Parser.array(events).map(e => e._id).includes(e._id))).length && <Subtitle />}>
      <Card className={s.overview}>
        <p>Name: {<Input placeholder='*Required' revert img='https://cdn.impactium.fun/ui/heading/h1.svg' value={name} onChange={e => setName(e.currentTarget.value)}/>}</p>
        <Separator />
        <p>Description: {<Input placeholder='*Required' revert img='https://cdn.impactium.fun/ui/heading/h2.svg' value={description} onChange={e => setDescription(e.currentTarget.value)}/>}</p>
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
          <ColorPicker color={file.color} setColor={setColor}>
            <ColorPickerTrigger />
            <ColorPickerPopover />
          </ColorPicker>
        </div>
        <Separator />
        <div className={s.unit}>
          <p>Log level:</p>
          <Select onValueChange={(v) => setLevel(levelMap.findIndex(l => l === v) as 0 | 1 | 2)} value={levelMap[level]}>
              <SelectTrigger className={s.trigger}>
                <SelectValue defaultValue={0} placeholder="Choose log level" />
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
      </Card>
      <Card>
        {Parser.array(events).map(e => (
          <div className={s.event_unit}>
            <SymmetricSvg text={e._id} />
            <div className={s.text}>
              <p className={s.top}>{e._id}</p>
              <p className={s.bottom}>{e.file}</p>
            </div>
          </div>
        ))}
      </Card>
      <Button loading={loading} className={s.save} onClick={send} variant={name && description ? 'default' : 'disabled'} img='https://cdn.impactium.fun/ui/check/check.svg'>Create</Button>
    </Banner>
  )
}
