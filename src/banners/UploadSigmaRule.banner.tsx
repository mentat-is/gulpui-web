import { File as GulpFileEntity, GulpDataset, Context } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Default, λFile } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select } from '@/ui/Select'
import { Toggle } from '@/ui/Toggle'
import { Button, Stack } from '@impactium/components'
import { Input } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

export namespace SigmaRules {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      file: λFile | null
    }
  }

  export function Banner({
    file,
    ...props
  }: SigmaRules.Banner.Props) {
    const { Info, app, destroyBanner } = useApplication()
    const [rules, setRules] = useState<GulpDataset.SigmaFile | null>(null)
    const [createNotes, setCreateNotes] = useState<boolean>(true)

    const DoneButton = () => {
      const falsy_condition = !rules

      const submit = async () => {
        if (falsy_condition) {
          return
        }

        if (file) {
          await Info.sigma.set(file, rules, createNotes)
        } else {
          for (const file of GulpFileEntity.selected(app)) {
            await Info.sigma.set(file, rules, createNotes)
          }
        }

        destroyBanner()
      }

      return (
        <Button
          img="Check"
          onClick={submit}
          variant="glass"
          disabled={falsy_condition}
        />
      )
    }

    const rulesInputChangeHandler = async (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const { files } = event.target
      if (!files?.length) {
        toast('No sigma rules selected')
        return
      }

      const fileData = await Promise.all(
        Array.from(files).map(async (file) => ({
          name: file.name,
          content: await file.text(),
        })),
      )

      setRules(fileData[0])
    }

    return (
      <UIBanner title="Apply sigma rule" done={<DoneButton />} {...props}>
        {file && (
          <p>{Context.id(app, file.context_id).name + '/' + file.name}</p>
        )}
        <Input
          type="file"
          img="Sigma"
          variant="highlighted"
          onChange={rulesInputChangeHandler}
        />
        <Toggle
          option={['Ignore notes', 'Create notes']}
          checked={createNotes}
          onCheckedChange={setCreateNotes}
        />
      </UIBanner>
    )
  }
}
