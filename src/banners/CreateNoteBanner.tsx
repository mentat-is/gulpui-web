import { Operation, Parser } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { ResponseBase } from "@/dto/ResponseBase.dto";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import {
  ColorPicker,
  ColorPickerTrigger,
  ColorPickerPopover,
} from "@/ui/Color";
import { useRef, useState } from "react";
import s from './styles/CreateNoteBanner.module.css'
import { Input } from "@/ui/Input";
import { Badge } from "@/ui/Badge";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Card } from "@/ui/Card";
import { cn } from "@/ui/utils";
import { Separator } from "@/ui/Separator";
import { NoteCreateRequest } from "@/dto/NoteCreateRequest.dto";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { Switch } from "@/ui/Switch";

interface CreateNoteBannerProps {
  context: string,
  filename: string,
  events?: λEvent[] | λEvent
}

export function CreateNoteBanner({ context, filename, events }: CreateNoteBannerProps) {
  const { app, api, destroyBanner, Info } = useApplication();
  const [tag, setTag] = useState<string>('');
  const [tags, setTags] = useState<Array<string>>([]);
  const [color, setColor] = useState<string>('#ffffff');
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [_private, _setPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const tag_ref = useRef<HTMLInputElement>(null);

  const levelMap = ['DEFAULT', 'WARNING', 'ERROR'];

  const send = async () => {
    setLoading(true);
    api<ResponseBase<unknown>>('/note_create', {
      method: 'POST',
      data: {
        operation_id: Operation.selected(app)?.id,
        context,
        src_file: filename,
        ws_id: app.general.ws_id,
        color,
        level,
        private: _private
      },
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: NoteCreateRequest.body({ title, text, tags }, events)
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

  return (
    <Banner title='Create note'>
      <Card className={s.overview}>
        <p>Title: {<Input revert img='https://cdn.impactium.fun/ui/heading/h1.svg' value={title} onChange={e => setTitle(e.currentTarget.value)}/>}</p>
        <Separator />
        <p>Text: {<Input revert img='https://cdn.impactium.fun/ui/heading/h2.svg' value={text} onChange={e => setText(e.currentTarget.value)}/>}</p>
        <Separator />
        <p>Context: <span>{context}</span></p>
        <Separator />
        <p>File: <span>{filename}</span></p>
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
      <Card className={s.tags}>
        <div className={s.content}>
        <p>Tags:</p>{tags.length ? tags.map(tag => <Badge onClick={() => deleteTag(tag)} value={tag} />) : <Badge variant='outline' value='No tags here...' />}
        </div>
        <div className={s.group}>
          <Input placeholder='Input tag name here...' ref={tag_ref} onChange={(e) => setTag(e.currentTarget.value)} value={tag}/>
          <Button img='Plus' variant={tag.length > 0 ? 'outline' : 'disabled'} className={cn(tag.length > 0 && s.focus)} onClick={addTag}>Add</Button>
        </div>
      </Card>
      <Button loading={loading} className={s.save} onClick={send} variant={title && text ? 'default' : 'disabled'} img='Check'>Create</Button>
    </Banner>
  )
}
