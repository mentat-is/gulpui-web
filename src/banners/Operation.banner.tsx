import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Input, Skeleton, Stack } from '@impactium/components'
import React, { useState } from 'react'
import { useApplication } from '@/context/Application.context'
import { Operation as GulpOperationEntity } from '@/class/Info'
import { SelectFiles } from './SelectFiles.banner'
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/Select'
import { Icon } from '@impactium/icons'
import { λOperation } from '@/dto'
import { Glyph } from '@/ui/Glyph'
import { λGlyph, Default } from '@/dto/Dataset'
import s from './styles/OperationBanner.module.css'

export namespace Operation {
  export namespace Select {
    export namespace Banner {
      export type Props = UIBanner.Props
    }

    export function Banner({ ...props }: Operation.Select.Banner.Props) {
      const { Info, spawnBanner } = useApplication()

      const InitializeNewOperaion = () => (
        <Button
          variant="ghost"
          onClick={() =>
            spawnBanner(
              <Operation.Create.Banner
                back={() => spawnBanner(<Operation.Select.Banner />)}
              />,
            )
          }
          img="BookPlus"
        />
      )

      const DoneButton = () => (
        <Button
          disabled={!GulpOperationEntity.selected(Info.app)}
          onClick={() =>
            spawnBanner(
              <SelectFiles.Banner
                back={() => spawnBanner(<Operation.Select.Banner />)}
              />,
            )
          }
          size="icon"
          variant="glass"
          img="Check"
        />
      )

      const NoOperations = () => (
        <SelectItem value="X">There is no operations</SelectItem>
      )

      const Trigger = () => {
        const selected = GulpOperationEntity.selected(Info.app)

        return (
          <SelectTrigger>
            <Stack>
              <Icon
                name={GulpOperationEntity.icon((selected || {}) as λOperation)}
              />
              <p>
                {selected
                  ? selected.name
                  : 'Select operation or create new one'}
              </p>
            </Stack>
          </SelectTrigger>
        )
      }

      return (
        <UIBanner
          title="Choose operation"
          option={<InitializeNewOperaion />}
          done={<DoneButton />}
          loading={Info.app.target.operations.length === 0}
          {...props}
        >
          {Info.app.target.operations.length === 0 ? (
            <Skeleton width="full" height="default" />
          ) : (
            <UISelect
              defaultValue={GulpOperationEntity.selected(Info.app)?.id}
              onValueChange={(id) =>
                Info.operations_select(
                  Info.app.target.operations.find((o) => o.id === id)!,
                )
              }
            >
              <Trigger />
              <SelectContent>
                {Info.app.target.operations.length ? (
                  Info.app.target.operations.map((operation) => (
                    <SelectItem value={operation.id}>
                      <Icon name={GulpOperationEntity.icon(operation)} />
                      {operation.name}
                    </SelectItem>
                  ))
                ) : (
                  <NoOperations />
                )}
              </SelectContent>
            </UISelect>
          )}
        </UIBanner>
      )
    }
  }

  export namespace Create {
    export namespace Banner {
      export type Props = UIBanner.Props
    }

    export function Banner({ ...props }: Operation.Create.Banner.Props) {
      const { app, Info, spawnBanner } = useApplication()
      const [name, setName] = useState<string>('')
      const [icon, setIcon] = useState<λGlyph['id'] | null>(
        Glyph.List.keys().next().value || null,
      )
      const [description, setDescription] = useState<string>('')
      const [loading, setLoading] = useState<boolean>(false)

      const createOperation = () => {
        api<any>(
          '/operation_create',
          {
            method: 'POST',
            setLoading,
            query: { name },
            deassign: true,
            body: description.toString(),
          },
          Info.sync,
        ).then(() => {
          spawnBanner(<Operation.Select.Banner />)
        })
      }

      const DoneButton = () => (
        <Button
          variant="glass"
          disabled={!name || !description}
          loading={loading}
          img="Check"
          onClick={createOperation}
        />
      )

      return (
        <UIBanner title="Create an Operation" done={<DoneButton />} {...props}>
          <Stack ai="center">
            <p className={s.paramName}>Operation name:</p>
            <Input
              variant="highlighted"
              className={s.input}
              img={icon ? Glyph.List.get(icon) : Default.Icon.OPERATION}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Operation name"
            />
          </Stack>
          <Stack ai="center">
            <p className={s.paramName}>Operation description:</p>
            <Input
              className={s.input}
              variant="highlighted"
              img="Text"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              placeholder="Operation description"
            />
          </Stack>
          <Stack ai="center">
            <p className={s.paramName}>Operation icon:</p>
            <Glyph.Chooser icon={icon} setIcon={setIcon} />
          </Stack>
        </UIBanner>
      )
    }
  }
}
