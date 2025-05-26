import { File as GulpFileEntity, Context } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λFile } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { NodeFile } from '@/ui/utils'
import { Button, Stack } from '@impactium/components'
import { Input } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SigmaZip } from '../plugins/SigmaZip.banner'
import { Extension } from '@/context/Extension.context'

export namespace Sigma {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      file: λFile | null
    }
  }

  export function Banner({
    file,
    ...props
  }: Sigma.Banner.Props) {
    const { Info, app, destroyBanner, spawnBanner } = useApplication()
    const [rules, setRules] = useState<NodeFile[] | null>()
    const [createNotes, setCreateNotes] = useState<boolean>(true)

    const DoneButton = () => {
      const submit = async () => {
        if (!rules) {
          return toast('Select at least one rule or zip file')
        }

        await Info.sigma_file(file
          ? [file]
          : GulpFileEntity.selected(app), rules, createNotes
        )

        destroyBanner()
      }

      return (
        <Button
          img="Check"
          onClick={submit}
          variant="glass"
          disabled={!rules}
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

      const fileData: NodeFile[] = await Promise.all(
        Array.from(files).map(async (file) => file),
      )

      setRules(fileData)
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
        <Extension.Component name='SigmaZip.banner' />
      </UIBanner>
    )
  }
}
