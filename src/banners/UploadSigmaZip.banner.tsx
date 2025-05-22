import { File as GulpFileEntity, Context, Operation } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Plugin } from '@/context/Plugin.context'
import { λFile, λOperation } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { NodeFile } from '@/ui/utils'
import { Button, Stack } from '@impactium/components'
import { Input } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import ts from 'typescript'

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
    const { app, destroyBanner, spawnBanner } = useApplication()
    const [zip, setZip] = useState<NodeFile | null>()
    const [notes, setNotes] = useState<boolean>(true)

    const DoneButton = () => {
      const submit = async () => {
        if (!zip) {
          return toast('Select at least one zip file')
        }

        const operation = Operation.selected(app);
        if (!operation) {
          return
        }

        await sigma_zip({
          files: file ? [file] : GulpFileEntity.selected(app),
          zip,
          notes,
          operation_id: operation.id,
          ws_id: app.general.ws_id
        })

        destroyBanner()
      }

      return (
        <Button
          img="Check"
          onClick={submit}
          variant="glass"
          disabled={!zip}
        />
      )
    }

    const rulesInputChangeHandler = async (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const { files } = event.target
      if (!files?.length) {
        toast('No sigma zip selected')
        return
      }

      setZip(files.item(0))
    }

    return (
      <UIBanner title="Apply sigma zip" done={<DoneButton />} {...props}>
        {file && (
          <p>{Context.id(app, file.context_id).name + '/' + file.name}</p>
        )}
        <Input
          type="file"
          img="Sigma"
          accept=".zip,application/zip"
          variant="highlighted"
          onChange={rulesInputChangeHandler}
        />
        <Toggle
          option={['Ignore notes', 'Create notes']}
          checked={notes}
          onCheckedChange={setNotes}
        />
      </UIBanner>
    )
  }

  export function sigma_zip({ files, zip, notes, operation_id, ws_id }: {
    files: λFile[],
    zip: File,
    notes: boolean,
    operation_id: λOperation['id'],
    ws_id: string
  }) {
    const body = new FormData();
    body.append('f', zip.slice(0, zip.size));

    body.append('payload', JSON.stringify({
      src_ids: files.map(f => f.id),
      q_options: {
        note_parameters: {
          create_notes: true
        }
      }
    }))

    api('/query_sigma_zip', {
      method: 'POST',
      query: {
        operation_id,
        ws_id,
      },
      body,
      deassign: true,
      headers: {
        size: zip.size.toString(),
        'Content-Disposition': `form-data; name="fieldName"; filename="filename.jpg"`
      }

    })
  }
}
