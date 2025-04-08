import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Badge, Button, Input, Stack } from '@impactium/components'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Select } from '@/ui/Select'
import { Context, File, Internal, Operation } from '@/class/Info'
import s from './styles/Session.module.css'
import { Icon } from '@impactium/icons'
import { Label } from '@/ui/Label'
import { Separator } from '@/ui/Separator'
import { toast } from 'sonner'
import { Default, λGlyph } from '@/dto/Dataset'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { Glyph } from '@/ui/Glyph'

export namespace Session {
  export namespace Load {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        sessions?: Internal.Session.Data[] | null
      }
    }
    export function Banner({ sessions: initSessions = null, ...props }: Session.Load.Banner.Props) {
      const { destroyBanner, Info } = useApplication()
      const [selectedSession, setSelectedSession] = useState<Internal.Session.Data | null>(null);
      const [sessions, setSessions] = useState<Internal.Session.Data[] | null>(initSessions);
      const [loading, setLoading] = useState<boolean>(!sessions);

      useEffect(() => {
        if (!sessions) {
          Info.session_list().then((sessions) => {
            setSessions(sessions);
            setLoading(false);
          });
        }
      }, [sessions])

      const save = async () => {
        if (!selectedSession) {
          return
        }

        Info.session_load(selectedSession).then(() => {
          if (props.back) {
            props.back();
          }

          destroyBanner();
        });
      }

      const DoneButton = useCallback(() => {
        return (
          <Button
            img='Check'
            variant='glass'
            onClick={save}
            disabled={!selectedSession}
          />
        )
      }, [selectedSession])

      if (!sessions) {
        return (
          null
        )
      }

      const deleteSessionButtonClickHandler = () => {
        if (!selectedSession) {
          return;
        }

        Info.session_delete(selectedSession.name).then(() => {
          setSessions(s => (s || []).filter(s => s.name !== selectedSession.name));
          setSelectedSession(null);
        });
      }

      return (
        <UIBanner title="Choose session" loading={loading} done={<DoneButton />} {...props}>
          <Stack>
            <Select.Root value={selectedSession?.name} onValueChange={s => setSelectedSession(sessions.find(sx => sx.name === s)!)}>
              <Select.Trigger value={selectedSession?.name} style={{ color: selectedSession?.color! }}>
                <Select.Icon name={selectedSession?.icon || 'SquareDashed'} />
                <p>{selectedSession?.name || 'No session selected'}</p>
              </Select.Trigger>
              <Select.Content>
                {sessions.length ? (
                  sessions.map((session) => (
                    <Select.Item key={session.name} value={session.name}>
                      <Select.Icon name={session.icon || Default.Icon.SESSION} style={{ color: session.color }} />
                      <p style={{ flex: 1 }}>{session.name}</p>
                      <Badge icon={Default.Icon.OPERATION} value={session.selected.operations} variant='gray-subtle' size='sm' />
                    </Select.Item>
                  ))
                ) : (
                  <Select.Item disabled value="X">
                    No sessions available
                  </Select.Item>
                )}
              </Select.Content>
            </Select.Root>
            <Button onClick={deleteSessionButtonClickHandler} disabled={!selectedSession} variant='secondary' img='Trash2' />
          </Stack>
          <Button style={{ width: '100%' }} variant='secondary' onClick={destroyBanner}>Continue with new session</Button>
        </UIBanner>
      )
    }
  }
  export namespace Save {
    export namespace Banner {
      export type Props = UIBanner.Props
    }
    export function Banner({ ...props }: Session.Load.Banner.Props) {
      const [name, setName] = useState<string>('')
      const [color, setColor] = useState<string>(Default.Color.OPERATION)
      const [icon, setIcon] = useState<λGlyph['id'] | null>(null);
      const { Info, app, scrollX, scrollY } = useApplication();
      const [loading, setLoading] = useState<boolean>(false)
      const [isNameValid, setIsNameValid] = useState<boolean>(true)

      const changenameHandler = (
        event: ChangeEvent<HTMLInputElement>,
      ) => {
        const { value } = event.target

        setIsNameValid(value.length > 0)

        setName(value)
      }

      const saveSession = async () => {
        const operation = Operation.selected(app)
        if (!operation) {
          return
        }

        if (name.length < 3) {
          setIsNameValid(false);
          toast.error('Session name should be little bit longer', {
            richColors: true
          })
          return;
        }

        if (!icon) {
          toast.error('Session name should have icon', {
            richColors: true
          })
          return
        }

        setLoading(true);
        await Info.session_create({
          name,
          color,
          icon: Glyph.List.get(icon)!,
          scroll: {
            x: scrollX,
            y: scrollY
          }
        });
        setLoading(false);
      }

      const reloadWindow = () => {
        window.location.reload();
      }

      const DoneButton = () => <Button variant='glass' img='LogOut' onClick={reloadWindow} />;

      return (
        <UIBanner title="Save session" done={<DoneButton />} {...props}>
          <Stack className={s.param} dir='column' ai='stretch' gap={12}>
            <p style={{ fontSize: 14 }}>Session Name</p>
            <Stack ai='stretch' style={{ width: '100%' }}>
              <Input
                valid={isNameValid}
                img="TextTitle"
                placeholder='Enter session name'
                variant="highlighted"
                value={name}
                onChange={changenameHandler}
              />
              <Button loading={loading} onClick={saveSession} variant='secondary' img='Check'>Save session</Button>
            </Stack>
            <Stack>
              <ColorPicker style={{ flex: 1 }} color={color} setColor={setColor}>
                <ColorPickerTrigger />
                <ColorPickerPopover />
              </ColorPicker>
              <Glyph.Chooser style={{ flex: 1 }} icon={icon} setIcon={setIcon} />
            </Stack>
          </Stack>
        </UIBanner>
      )
    }
  }
}
