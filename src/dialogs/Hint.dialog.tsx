import { Dialog as UIDialog } from "@/ui/Dialog";
import s from './styles/HintDialog.module.css'
import { Keyboard } from "@/ui/Keyboard";

export namespace Hint {
  export namespace Dialog {
    export interface Props extends Omit<UIDialog.Props, 'title'> {

    }
  }

  export function Dialog({ ...props }: Hint.Dialog.Props) {
    return (
      <UIDialog title='GULP usage instructions' {...props}>
        <ul className={s.list}>
          <li>Use <Keyboard>Left Mouse Click</Keyboard> on event to see its detailed information</li>
          <li>Use <Keyboard>Right Mouse Click</Keyboard> on source to open menu</li>
          <li>Press <Keyboard>=</Keyboard> to adjust view by time limits</li>
          <li>Press <Keyboard>+</Keyboard> or <Keyboard>-</Keyboard> to zoom-in and zoom-out</li>
          <li>Press <Keyboard meta /> to toggle timeline magnifier</li>
          <li>Hold <Keyboard>Alt</Keyboard> or <Keyboard alt /> and select frame on timeline using mouse</li>
          <li>Press <Keyboard>Esc</Keyboard> when banner is open to close it</li>
          <li>Press <Keyboard>A</Keyboard> or <Keyboard>D</Keyboard> when event is open to go forward or backward</li>
        </ul>
      </UIDialog>

    )
  }
}
