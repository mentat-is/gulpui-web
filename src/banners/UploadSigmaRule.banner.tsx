import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { NodeFile } from '@/ui/utils'
import { ChangeEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Extension } from '@/context/Extension.context'
import { Checkbox } from '@/ui/Checkbox'
import { Label } from '@/ui/Label'
import { Select } from '@/ui/Select'
import { Icon } from '@impactium/icons'
import { Input } from '@/ui/Input'
import { Badge } from '@/ui/Badge'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Source } from '@/entities/Source'
import { Context } from '@/entities/Context'

export namespace Sigma {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      files?: Source.Id[]
    }
  }

  export function Banner({
    files: initFiles = [],
    ...props
  }: Sigma.Banner.Props) {
    const { Info, app, destroyBanner } = useApplication();
    const [rules, setRules] = useState<NodeFile[] | null>();
    const [files, setFiles] = useState(initFiles)
    const [createNotes, setCreateNotes] = useState<boolean>(false);

    const DoneButton = () => {
      const submit = async () => {
        if (!rules) {
          return toast('Select at least one rule or zip file')
        }

        await Info.query_sigma(files, rules, createNotes);

        destroyBanner()
      }

      return (
        <Button
          icon="Check"
          onClick={submit}
          variant="glass"
          disabled={!rules}
        />
      )
    }

    const rulesInputChangeHandler = async (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const { files: rules } = event.target
      if (!rules?.length) {
        toast.warning('No sigma rules selected', {
          richColors: true,
          icon: <Icon name='Warning' />
        });
        return;
      }

      const fileData: NodeFile[] = Array.from(rules);

      setRules(fileData);
    }

    const allFiles = useMemo(() => Source.Entity.selected(app), [app.timeline.filter, ...app.target.files]);

    return (
      <UIBanner title="Apply sigma rules" done={<DoneButton />} {...props}>
        <Select.Multi.Root value={files} onValueChange={values => setFiles(values as typeof files)}>
          <Select.Trigger>
            <Select.Multi.Value icon={['File', 'Files']} placeholder='Select files to apply sigma rules' text={len => typeof len === 'number' ? `Selected ${len} files` : Source.Entity.id(app, len as Source.Id).name} />
          </Select.Trigger>
          <Select.Content>
            {allFiles.map(file => (
              <Select.Item value={file.id}>
                <Icon name={Source.Entity.icon(file)} />
                {file.name}
                <Badge variant='gray-subtle' value={Context.Entity.id(app, file.context_id).name} />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Multi.Root>
        <Input
          type="file"
          icon="Sigma"
          multiple
          variant="highlighted"
          onChange={rulesInputChangeHandler}
        />
        <Stack ai='center' gap={4}>
          <Checkbox id='isCreateNotes' checked={createNotes} onCheckedChange={v => setCreateNotes(!!v)} />
          <Label htmlFor='isCreateNotes' cursor='pointer' value='Create notes' />
        </Stack>
        <Extension.Component name='SigmaZip.banner.tsx' />
      </UIBanner>
    )
  }
}
