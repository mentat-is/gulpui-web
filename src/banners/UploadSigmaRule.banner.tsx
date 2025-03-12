import { File as GulpFileEntity, GulpDataset } from '@/class/Info'
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
      file?: λFile
    }
  }

  export function Banner({
    file: initFile,
    ...props
  }: SigmaRules.Banner.Props) {
    const { Info, app, destroyBanner } = useApplication()
    const [rules, setRules] = useState<GulpDataset.SigmaFile | null>(null)
    const [file, setFile] = useState<λFile | null>(initFile ?? null)
    const [plugins, setPlugins] = useState<GulpDataset.PluginList.Summary>([])
    const [plugin, setPlugin] = useState<string | null>(null)
    const [createNotes, setCreateNotes] = useState<boolean>(true)

    useEffect(() => {
      Info.plugin_list().then((plugins) => {
        setPlugins(
          plugins.filter((plugin) => plugin.type.includes('ingestion')),
        )
      })
    }, [])

    const DoneButton = () => {
      const falsy_condition = !file || !plugin || !rules

      const submit = async () => {
        if (falsy_condition) {
          return
        }

        await Info.sigma.set(file, plugin, rules, createNotes)

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
        <Select.Root
          onValueChange={(id) =>
            setFile(GulpFileEntity.id(app, id as λFile['id']))
          }
          value={file?.name || ''}
        >
          <Select.Trigger>
            <Stack>
              <Icon
                name={file ? GulpFileEntity.icon(file) : Default.Icon.FILE}
              />
              {file ? file.name : 'No file selected'}
            </Stack>
          </Select.Trigger>
          <Select.Content>
            {GulpFileEntity.selected(app).map((file) => {
              return (
                <Select.Item key={file.id} value={file.id}>
                  <Stack>
                    <Icon name={GulpFileEntity.icon(file)} />
                    {file.name}
                  </Stack>
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Root>
        <Input
          type="file"
          img="Sigma"
          variant="highlighted"
          onChange={rulesInputChangeHandler}
        />
        <Select.Root onValueChange={setPlugin} value={plugin ?? ''}>
          <Select.Trigger>
            <Stack>
              <Icon name="Puzzle" />
              {plugin ?? 'No plugin selected, select at least one'}
            </Stack>
          </Select.Trigger>
          <Select.Content>
            {plugins.map((plugin) => {
              return (
                <Select.Item value={plugin.filename} key={plugin.filename}>
                  <Stack>
                    <Icon name="Puzzle" />
                    {plugin.filename}
                  </Stack>
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Root>
        <Toggle
          option={['Ignore notes', 'Create notes']}
          checked={createNotes}
          onCheckedChange={setCreateNotes}
        />
      </UIBanner>
    )
  }
}
