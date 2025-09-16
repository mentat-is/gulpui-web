import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { ChangeEvent, useState } from 'react'
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

export namespace Session {
  export namespace Save {
    export namespace Banner {
      export type Props = UIBanner.Props
    }
    export function Banner({ ...props }: Session.Save.Banner.Props) {
      const [name, setName] = useState<string>('')
      const [color, setColor] = useState<string>(Default.Color.OPERATION)
      const [icon, setIcon] = useState<Glyph.Id | null>(null);
      const { Info, app, scrollX, scrollY } = useApplication();
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
          icon: Glyph.List.get(icon)!,
          scroll: {
            x: scrollX,
            y: scrollY
          }
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
            <Button loading={loading} onClick={saveSession} variant='glass' disabled={!name.length || !icon} img='Check'>Save current session</Button>
            <Button variant='destructive' img='LogOut' onClick={reloadWindow}>Dont save my session</Button>
          </Stack>
        </UIBanner>
      )
    }
  }
}
