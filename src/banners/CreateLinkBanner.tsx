import { Context, File } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button, Stack } from '@impactium/components';
import {
  ColorPicker,
  ColorPickerPopover,
  ColorPickerTrigger
} from '@/ui/Color';
import { useCallback, useMemo, useState } from 'react';
import s from './styles/CreateLinkBanner.module.css'
import { Input } from '@impactium/components';
import { Separator } from '@/ui/Separator';
import { λEvent } from '@/dto/ChunkEvent.dto';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Default, λGlyph } from '@/dto/Dataset';
import { Icon } from '@impactium/icons';
import { Glyph } from '@/ui/Glyph';
import { cn } from '@impactium/utils';
import { ConnectPopover } from '@/app/gulp/components/Connect.popover';

interface CreateLinkBannerProps {
  event: λEvent
}

export function CreateLinkBanner({ event }: CreateLinkBannerProps) {
  const { app, destroyBanner, Info } = useApplication();
  const [color, setColor] = useState<string>('#ffffff');
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const [icon, setIcon] = useState<λGlyph['id'] | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [_private, _setPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const levelMap = ['DEFAULT', 'WARNING', 'ERROR'];

  const context = useMemo(() => {
    return Context.id(app, event.context_id);
  }, [event]);
  
  const file = useMemo(() => {
    return File.id(app, event.file_id);
  }, [event]);

  const send = async () => {
    api('/link_create', {
      method: 'POST',
      query: {
        doc_id_from: event.id,
        operation_id: event.operation_id,
        ws_id: app.general.ws_id,
        name,
        glyph_id: icon || Default.Icon.LINK,
        color
      },
      body: {
        doc_ids: [
          event.id
        ]
      },
      setLoading
    }, () => {
      destroyBanner();
      Info.links_reload()
    });
  }

  const option = useCallback(() => (
    <Popover open={true}>
      <PopoverTrigger asChild>
        <Button variant='ghost' img='GitPullRequest' />
      </PopoverTrigger>
      <PopoverContent className={s.popover}>
        <ConnectPopover event={event} />
      </PopoverContent>
    </Popover>
  ), []);

  const done = useCallback(() => {
    return (
      <Button loading={loading} onClick={send} variant='glass' disabled={!name} img='Check' />
    )
  }, [loading, name, send])

  return (
    <Banner title='Create link' done={done()} option={option()}>
      <Stack className={s.general} ai='stretch' dir='column' gap={8}>
        <DetailedLinkInfoUnit name='Context' value={context.name} icon='Box' />
        <DetailedLinkInfoUnit name='File' value={file.name} icon='File' />
        <DetailedLinkInfoUnit name='Event' value={event.id} icon='Triangle' />
        <Separator />
        <EditableLinkField name='Title'>
          <Input variant='highlighted' img='TextTitle' value={name} onChange={e => setName(e.currentTarget.value)} />
        </EditableLinkField>
        <EditableLinkField name='Color'>
          <ColorPicker color={color} setColor={setColor}>
            <ColorPickerTrigger />
            <ColorPickerPopover />
          </ColorPicker>
        </EditableLinkField>
        <EditableLinkField name='Glyph'>
          <Glyph.Chooser icon={icon} setIcon={setIcon} />
        </EditableLinkField>
      </Stack>
    </Banner>
  )
}

namespace EditableLinkField {
  export interface Props extends Stack.Props {
    name: string;
  }
}

function EditableLinkField({ name, className, children, ...props }: EditableLinkField.Props) {
  return (
    <Stack dir='row' className={cn(s.unit, s.editable, className)} {...props}>
      <p>{name}:</p>
      {children}
    </Stack>
  )
}

namespace DetailedLinkInfoUnit {
  export interface Props {
    name: string;
    icon: Icon.Name;
    value: string;
  }
}

function DetailedLinkInfoUnit({ name, icon, value }: DetailedLinkInfoUnit.Props) {
  return (
    <Stack className={s.unit}>
      <p>{name}:</p>
      <Input variant='highlighted' className={s.inp_input} img={icon} disabled value={value} />
    </Stack>
  )
}