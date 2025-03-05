import { useApplication } from '@/context/Application.context'
import { λContext, λFile } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { Button } from '@impactium/components'
import { useState } from 'react'
import { toast } from 'sonner'

export namespace Delete {
  export namespace Context {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        context: λContext
      }
    }
    export function Banner({ context, ...props }: Delete.Context.Banner.Props) {
      const { Info } = useApplication()
      const [isSubmited, setIsSubmited] = useState<boolean>(false)
      const [isWipe, setIsWipe] = useState<boolean>(true)
      const [loading, setLoading] = useState<boolean>(false)

      const DeleteButton = () => (
        <Button
          loading={loading}
          img="Trash2"
          variant="glass"
          onClick={deleteContext}
          disabled={!isSubmited}
        />
      )

      const deleteContext = async () => {
        setLoading(true)
        await Info.context_delete(context, isWipe)
        setLoading(false)
        if (props.back) {
          props.back()
        }
        toast(`Context ${context.name} deleted successfully`)
      }

      return (
        <UIBanner title="Delete context" done={<DeleteButton />} {...props}>
          <p>
            Are you sure you want to delete context: <code>{context.name}</code>
          </p>
          <Toggle
            option={['No, don`t delete', 'Yes, i`m sure']}
            checked={isSubmited}
            onCheckedChange={setIsSubmited}
          />
          {isSubmited && (
            <Toggle
              option={['Don`t delete data inside', 'Delete data inside']}
              checked={isWipe}
              onCheckedChange={setIsWipe}
            />
          )}
        </UIBanner>
      )
    }
  }

  export namespace File {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        file: λFile
      }
    }
    export function Banner({ file, ...props }: Delete.File.Banner.Props) {
      const { Info } = useApplication()
      const [isSubmited, setIsSubmited] = useState<boolean>(false)
      const [isWipe, setIsWipe] = useState<boolean>(true)
      const [loading, setLoading] = useState<boolean>(false)

      const DeleteButton = () => (
        <Button
          loading={loading}
          img="Trash2"
          variant="glass"
          onClick={deleteFile}
          disabled={!isSubmited}
        />
      )

      const deleteFile = async () => {
        setLoading(true)
        await Info.file_delete(file, isWipe)
        setLoading(false)
        if (props.back) {
          props.back()
        }
        toast(`File ${file.name} deleted successfully`)
      }

      return (
        <UIBanner title="Delete file" done={<DeleteButton />} {...props}>
          <p>
            Are you sure you want to delete file: <code>{file.name}</code>
          </p>
          <Toggle
            option={['No, don`t delete', 'Yes, i`m sure']}
            checked={isSubmited}
            onCheckedChange={setIsSubmited}
          />
          {isSubmited && (
            <Toggle
              option={['Don`t delete data inside', 'Delete data inside']}
              checked={isWipe}
              onCheckedChange={setIsWipe}
            />
          )}
        </UIBanner>
      )
    }
  }
}
