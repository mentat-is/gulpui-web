import { Context, File, Link } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner as UIBanner } from '@/ui/Banner';
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
import { Default, λGlyph, λLink } from '@/dto/Dataset';
import { Icon } from '@impactium/icons';
import { Glyph } from '@/ui/Glyph';
import { cn } from '@impactium/utils';

export namespace LinkComponents {
  export namespace Create {
    export interface Props {
      event: λEvent
    }
    export function Banner({ event }: LinkComponents.Create.Props) {
      const { app, spawnBanner, destroyBanner, Info } = useApplication();
      const [color, setColor] = useState<string>('#ffffff');
      const [icon, setIcon] = useState<λGlyph['id'] | null>(null);
      const [name, setName] = useState<string>('');
      const [_private, _setPrivate] = useState<boolean>(false);
      const [loading, setLoading] = useState<boolean>(false);
    
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
    
      const Option = useCallback(() => (
        <Button onClick={() => spawnBanner(<LinkComponents.Connect.Banner event={event} />)} variant='ghost' img='GitPullRequest' />
      ), [event]);
    
      const Done = useCallback(() => {
        return (
          <Button loading={loading} onClick={send} variant='glass' disabled={!name || !icon} img='Check' />
        )
      }, [loading, name, send])
    
      return (
        <UIBanner title='Create link' done={<Done />} option={<Option />}>
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
        </UIBanner>
      )
    }
  }

  export namespace Connect {
    export interface Props {
      event: λEvent
    }
    export function Banner({ event }: LinkComponents.Connect.Props) {
      const { app, Info } = useApplication();

      const connect = (link: λLink) => () => Info.links_connect(link, event);

      return (
        <UIBanner title='Connect link'>
          {Link.selected(app)
            .filter(l => !l.doc_ids.some(e => e === event.id))
            .map(link =>
              <Button
                variant='secondary'
                style={{ color: link.color }}
                onClick={connect(link)}
                img={Link.icon(link)}>
                  {link.name}
              </Button>
            )
          }
        </UIBanner>
      );
    }
  }
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