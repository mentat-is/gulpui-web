import { Dialog as UIDialog } from "@/ui/Dialog";
import s from './styles/HintDialog.module.css'
import { Stack } from "@impactium/components";

export namespace Hint {
  export namespace Dialog {
    export interface Props extends UIDialog.Props {

    }
  }

  export function Dialog({ ...props }: Hint.Dialog.Props) {
    return (
      <UIDialog title='Some useful hints )'>
        <Stack dir='column'>

        </Stack>
      </UIDialog>

    )
  }
}