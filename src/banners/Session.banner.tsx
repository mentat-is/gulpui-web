import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Input, Stack } from '@impactium/components'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/Select'
import { Label } from '@radix-ui/react-select'
import { Operation } from '@/class/Info'
import s from './styles/Session.module.css'
import { Icon } from '@impactium/icons'

export namespace Session {
  export namespace Load {
    export namespace Banner {
      export type Props = UIBanner.Props
    }
    export function Banner({ ...props }: Session.Load.Banner.Props) {
      const { destroyBanner, Info } = useApplication()
      const [selectedSession, setSelectedSession] = useState<
        string | undefined
      >()
      const [loading, setLoading] = useState<boolean>(false)
      const done_ref = useRef<HTMLButtonElement>(null)

      const save = () => {
        if (!selectedSession) {
          return
        }

        setLoading(true)
        destroyBanner()
      }

      const DoneButton = useCallback(() => {
        return (
          <Button
            img="Check"
            variant="glass"
            onClick={save}
            disabled={!selectedSession}
            ref={done_ref}
          />
        )
      }, [save, selectedSession, done_ref, loading])

      const sessions = Object.keys(Info.app.general.sessions)

      return (
        <UIBanner title="Choose session" done={<DoneButton />} {...props}>
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger value={selectedSession}>
              <Stack>
                <Icon name="ArchiveRestore" />
                <p>{selectedSession || 'No session selected'}</p>
              </Stack>
            </SelectTrigger>
            <SelectContent>
              {sessions.length ? (
                sessions.map((name) => (
                  <SelectItem
                    key={name}
                    value={name}
                    onClick={() => setSelectedSession(name)}
                  >
                    {name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem disabled value="X">
                  No sessions available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </UIBanner>
      )
    }
  }
  export namespace Save {
    export namespace Banner {
      export type Props = UIBanner.Props
    }
    export function Banner({ ...props }: Session.Load.Banner.Props) {
      const [sessionName, setSessionName] = useState<string>('')
      const { app, Info, logout } = useApplication()
      const [loading, setLoading] = useState<boolean>(false)
      const [isNameValid, setIsNameValid] = useState<boolean>(true)

      const changeSessionNameHandler = (
        event: ChangeEvent<HTMLInputElement>,
      ) => {
        const { value } = event.target

        setIsNameValid(value.length > 0)

        setSessionName(value)
      }

      const saveSession = async () => {
        const operation = Operation.selected(app)

        if (!operation) {
          return
        }

        await api(
          '/user_data_create',
          {
            method: 'POST',
            setLoading,
            headers: {
              'Content-Type': 'application/json',
            },
            query: {
              name: sessionName,
              user_id: app.general.id,
              operation_id: operation.id,
            },
            body: JSON.stringify(Info.getCurrentSessionOptions()),
          },
          (data: any) => {
            if (data.exception.name === 'ObjectAlreadyExists') {
              setIsNameValid(false)
            }

            logout()
          },
        )
      }

      const isButtonClickable = sessionName.length > 0

      const save_button = useRef<HTMLButtonElement>(null)

      const enterKeyPressHandler = (event: KeyboardEvent) => {
        if (!isButtonClickable || !save_button.current) {
          return
        }

        event.preventDefault()

        save_button.current.click()
      }

      useEffect(() => {
        window.addEventListener('keypress', enterKeyPressHandler)

        return () => {
          window.removeEventListener('keypress', enterKeyPressHandler)
        }
      }, [save_button])

      const done = (
        <Button
          ref={save_button}
          img="Check"
          onClick={saveSession}
          variant="glass"
          disabled={!isButtonClickable}
          loading={loading}
        />
      )

      return (
        <UIBanner title="Save session" done={done} {...props}>
          <Stack className={s.param}>
            <Label className={s.nameLabel}>Session name:</Label>
            <Input
              valid={isNameValid}
              img="TextHeading"
              variant="highlighted"
              value={sessionName}
              onChange={changeSessionNameHandler}
            />
          </Stack>
        </UIBanner>
      )
    }
  }
}
