import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import s from './styles/Session.module.css'
import { toast } from 'sonner'
import { Default } from '@/dto/Dataset'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { Input } from '@/ui/Input'
import { Logger } from '@/dto/Logger.class'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Glyph } from '@/entities/Glyph'
import { Operation } from '@/entities/Operation'
import { Internal } from '@/entities/addon/Internal'
import { Label } from '@/ui/Label'
import { Select } from '@/ui/Select'
import { cn } from '@impactium/utils'

export namespace Session {
  export namespace Save {
    export namespace Banner {
      export type Props = UIBanner.Props
    }
    export function Banner({ ...props }: Session.Save.Banner.Props) {
      const [name, setName] = useState<string>('')
      const [color, setColor] = useState<string>(Default.Color.OPERATION)
      const [icon, setIcon] = useState<Glyph.Id | null>(null);
      const { Info, app, scrollX, scrollY } = Application.use();
      const [loading, setLoading] = useState<boolean>(false)

      const changenameHandler = (
        event: ChangeEvent<HTMLInputElement>,
      ) => {
        const { value } = event.target

        setName(value);
      }

      const saveSession = async () => {
        const operation = Operation.Entity.selected(app)
        if (!operation) {
          return
        }

        if (!icon) {
          toast.error('Session name should have icon', {
            richColors: true
          })
          return
        }

        setLoading(true);
        const session = await Info.session_create({
          name,
          color,
          icon: Glyph.List.get(icon)!
        });
        setLoading(false);
        if (session) {
          Logger.log(`Session ${name} has been saved succesfully`, Session.Save.Banner, {
            richColors: true,
            icon: <Icon name='Check' />
          })
          setTimeout(() => {
            reloadWindow();
          }, 250);
        }
      }

      const reloadWindow = () => {
        window.location.reload();
      }

      return (
        <UIBanner title='Save session' {...props}>
          <Stack className={s.param} dir='column' ai='stretch' gap={12}>
            <Input
              valid={name.length > 0}
              icon='TextTitle'
              label='Session name'
              placeholder='Enter session name'
              variant='highlighted'
              value={name}
              onChange={changenameHandler}
            />
            <Stack>
              <ColorPicker style={{ flex: 1 }} color={color} setColor={setColor}>
                <ColorPickerTrigger />
                <ColorPickerPopover />
              </ColorPicker>
              <Glyph.Chooser style={{ flex: 1 }} icon={icon} setIcon={setIcon} />
            </Stack>
          </Stack>
          <Stack className={s.buttons}>
            <Button loading={loading} onClick={saveSession} variant='glass' disabled={!name.length || !icon} icon='Check'>Save current session</Button>
            <Button variant='destructive' icon='LogOut' onClick={reloadWindow}>Dont save my session</Button>
          </Stack>
        </UIBanner>
      )
    }
  }

  export namespace Delete {
    export namespace Banner {
      export interface Props extends UIBanner.Props { onClose?: () => void; }
    }


    export function Banner({ onClose, ...props }: Session.Delete.Banner.Props) {
      const { Info, app, destroyBanner } = Application.use();
      const [sessions, setSessions] = useState<Internal.Session.Data[]>([]);
      const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
      const [isDataDeleating, setIsDataDeleating] = useState<boolean>(false);
      const [selected, setSelected] = useState<Set<string>>(new Set());


      const reload = async () => {
        setIsDataLoading(true);
        await Info.session_list().then(setSessions);
        setSelected(() => new Set());
        setIsDataLoading(false);
      };

      useEffect(() => {
        reload();
      }, []);

      const deleteSessionButtonClickHandler = async () => {
        setIsDataDeleating(true);
        await Info.sessions_delete([...selected.values()]).then(() => {
          Logger.log(`${selected.size} ${selected.size === 1 ? 'session' : 'sessions'} has been deleted successfully`, 'Session.Delete.Banner.deleteSessionButtonClickHandler', {
            richColors: true,
            icon: <Icon name='Check' />
          });
        });
        setIsDataDeleating(false);
        await reload();
        onClose?.();
        destroyBanner();
      };

      const DeleteButton = useMemo(() => <Button onClick={deleteSessionButtonClickHandler} loading={isDataDeleating || isDataLoading} disabled={!selected.size} icon='Trash' variant='glass' />, [selected, isDataDeleating, isDataLoading, deleteSessionButtonClickHandler]);

      return (
        <UIBanner title='Delete sessions' done={DeleteButton} {...props}>
          <Stack dir='column' gap={6} ai='flex-start' data-input className={cn(s.operation, !!app.general.user && Operation.Entity.selected(app) && sessions.filter(session => session.selected.operations && session.selected.operations === Operation.Entity.selected(app)?.id).length && s.visible)}>
            <Label value='Session' />
            <Stack style={{ width: '100%' }}>
              <Select.Multi.Root value={[...selected.values()]} onValueChange={names => setSelected(() => new Set<string>(names))}>
                <Select.Trigger>
                  <Select.Multi.Value icon='Status' placeholder='Select sessions to be deleted' text={len => typeof len === 'number' ? `Selected ${len} sessions` : len} />
                </Select.Trigger>
                <Select.Content>
                  {sessions.map(session => (
                    <Select.Item key={session.name} value={session.name} style={{ color: session.color }}>
                      <Select.Icon name={session.icon} />
                      {session.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Multi.Root>
            </Stack>
          </Stack>
        </UIBanner>
      )
    }
  }
}
