import { File as GulpFileEntity, GulpDataset } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Default, λFile } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/Select'
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
        <Select
          onValueChange={(id) =>
            setFile(GulpFileEntity.id(app, id as λFile['id']))
          }
          value={file?.name || ''}
        >
          <SelectTrigger>
            <Stack>
              <Icon
                name={file ? GulpFileEntity.icon(file) : Default.Icon.FILE}
              />
              {file ? file.name : 'No file selected'}
            </Stack>
          </SelectTrigger>
          <SelectContent>
            {GulpFileEntity.selected(app).map((file) => {
              return (
                <SelectItem key={file.id} value={file.id}>
                  <Stack>
                    <Icon name={GulpFileEntity.icon(file)} />
                    {file.name}
                  </Stack>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Input
          type="file"
          img="Sigma"
          variant="highlighted"
          onChange={rulesInputChangeHandler}
        />
        <Select onValueChange={setPlugin} value={plugin ?? ''}>
          <SelectTrigger>
            <Stack>
              <Icon name="Puzzle" />
              {plugin ?? 'No plugin selected, select at least one'}
            </Stack>
          </SelectTrigger>
          <SelectContent>
            {plugins.map((plugin) => {
              return (
                <SelectItem value={plugin.filename} key={plugin.filename}>
                  <Stack>
                    <Icon name="Puzzle" />
                    {plugin.filename}
                  </Stack>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Toggle
          option={['Ignore notes', 'Create notes']}
          checked={createNotes}
          onCheckedChange={setCreateNotes}
        />
      </UIBanner>
    )
  }
}
