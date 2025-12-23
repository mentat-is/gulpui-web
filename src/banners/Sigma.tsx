import { Application } from '@/context/Application.context'
import { Extension } from '@/context/Extension.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { ChangeEvent, useCallback, useState, useMemo } from 'react'
import { Source } from '@/entities/Source'
import { Checkbox } from '@/ui/Checkbox'
import { Icon } from '@impactium/icons'
import { NodeFile } from '@/ui/utils'
import { Button } from '@/ui/Button'
import { Toggle } from '@/ui/Toggle'
import { Label } from '@/ui/Label'
import { Input } from '@/ui/Input'
import { Stack } from '@/ui/Stack'
import { toast } from 'sonner'

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
    const [createNotes, setCreateNotes] = useState<boolean>(false);
    const [sources, setSources] = useState(initialSources)
    const [rules, setRules] = useState<NodeFile[]>([]);
    const [isZip, setIsZip] = useState<boolean>(false);
    const { Info, destroyBanner } = Application.use();

    const [zipSubmit, setZipSubmit] = useState<{ run: () => Promise<void> }>();

    const DoneButton = () => {
      const submit = async () => {
        if (isZip) {
          if (zipSubmit) {
            await zipSubmit.run();
          }
          return;
        }

        if (!rules.length) {
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
        />
      )
    }

    const rulesInputChangeHandler = async (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const { files } = event.target
      if (!files?.length) {
        toast.warning('No sigma rules selected', {
          richColors: true,
          icon: <Icon name='Warning' />
        });
        return;
      }

      const fileData: NodeFile[] = Array.from(files);
      setRules(fileData);
    }

    const onRegisterSubmit = useCallback((callback: () => Promise<void>) => setZipSubmit({ run: callback }), []);

    const sourcePlaceholder = useMemo(() => {
      if (isZip) {
        return 'Select sources to apply sigma zip for them'
      }
      return 'Select sources to apply sigma rules for them'
    }, [isZip])

    return (
      <UIBanner title="Apply sigma rules" done={<DoneButton />} {...props}>
        <Extension.Optional name='SigmaZip.banner.tsx'>
          <Toggle option={['File', 'Zip']} checked={isZip} onClick={() => setIsZip(!isZip)} />
        </Extension.Optional>       

        <Source.Select.Multi selected={sources} setSelected={setSources} placeholder={sourcePlaceholder} />
        {isZip ? (
          <Extension.Component
            name='SigmaZip.banner.tsx'
            props={{
              sources,
              createNotes,
              onRegisterSubmit
            }}
          />
        ) : (
          <Input type="file" icon="Sigma" accept='.yml' multiple variant="highlighted" onChange={rulesInputChangeHandler} />
        )}
        <Stack ai='center' gap={6}>
          <Checkbox id='isCreateNotes' checked={createNotes} onCheckedChange={v => setCreateNotes(!!v)} />
          <Label htmlFor='isCreateNotes' cursor='pointer' value='Create notes' />
        </Stack>
      </UIBanner>
    )
  }
}
