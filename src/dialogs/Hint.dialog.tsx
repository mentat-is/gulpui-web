import { Dialog as UIDialog } from "@/ui/Dialog";
import s from './styles/HintDialog.module.css'
import { Stack } from "@impactium/components";
import { Keyboard } from "@/ui/Keyboard";

export namespace Hint {
  export namespace Dialog {
    export interface Props extends Omit<UIDialog.Props, 'title'> {

    }
  }

  export function Dialog({ ...props }: Hint.Dialog.Props) {
    return (
      <UIDialog title='Some useful hints )' {...props}>
        <p>Hold <Keyboard meta /> to reveal magnifier</p>
      </UIDialog>

    )
  }
}