import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { NodeFile } from '@/ui/utils'
import { ChangeEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Extension } from '@/context/Extension.context'
import { Checkbox } from '@/ui/Checkbox'
import { Label } from '@/ui/Label'
import { Icon } from '@impactium/icons'
import { Input } from '@/ui/Input'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Source } from '@/entities/Source'
import { Toggle } from '@/ui/Toggle'

export namespace Sigma {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      sources: Source.Id[]
    }
  }

  export function Banner({
    sources: initialSources = [],
    ...props
  }: Sigma.Banner.Props) {
    const { Info, app, destroyBanner, spawnBanner } = Application.use();
    const [rules, setRules] = useState<NodeFile[] | null>();
    const [sources, setSources] = useState(initialSources)
    const [createNotes, setCreateNotes] = useState<boolean>(false);

    const DoneButton = () => {
      const submit = async () => {
        if (!rules) {
          return toast('Select at least one rule or zip file')
        }

        await Info.query_sigma(sources, rules, createNotes);

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

    return (
      <UIBanner title="Apply sigma rules" done={<DoneButton />} {...props}>
        <Extension.Optional name='SigmaZip.banner.tsx'>
          <Toggle option={['File', 'Zip']} checked={false} onClick={() => spawnBanner(<Extension.Component name='SigmaZip.banner.tsx' props={{ sources }} />)} />
        </Extension.Optional>
        <Source.Select.Multi selected={sources} setSelected={setSources} placeholder='Select sources to apply sigma rules for them' />
        <Input
          type="file"
          icon="Sigma"
          multiple
          variant="highlighted"
          onChange={rulesInputChangeHandler}
        />
        <Stack ai='center' gap={6}>
          <Checkbox id='isCreateNotes' checked={createNotes} onCheckedChange={v => setCreateNotes(!!v)} />
          <Label htmlFor='isCreateNotes' cursor='pointer' value='Create notes' />
        </Stack>
      </UIBanner>
    )
  }
}
