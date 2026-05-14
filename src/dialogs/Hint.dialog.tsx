import { Application } from "@/context/Application.context";
import { Button } from "@/ui/Button";
import { Stack } from "@/ui/Stack";
import s from './styles/HintDialog.module.css'
import { Keyboard } from "@/ui/Keyboard";
import { useEffect } from "react";

export namespace Hint {
  export namespace Dialog {
    export interface Props {
      onClose?: () => void
    }
  }

  export function Dialog({ onClose }: Hint.Dialog.Props) {
    const { banner, currentDocument } = Application.use()

    useEffect(() => {
      const handleDialogClose = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !banner) {
          onClose?.()
        }
      }

      currentDocument.addEventListener('keydown', handleDialogClose)

      return () => {
        currentDocument.removeEventListener('keydown', handleDialogClose)
      }
    }, [banner, currentDocument, onClose])

    return (
      <div className={s.overlay} onMouseDown={() => onClose?.()}>
        <Stack className={s.modal} dir='column' gap={16} onMouseDown={(event) => event.stopPropagation()}>
          <Stack jc='space-between' ai='center' gap={12}>
            <h2 className={s.title}>GULP usage instructions</h2>
            <Button
              variant='secondary'
              size='sm'
              icon='X'
              title='Close usage instructions'
              onClick={() => onClose?.()}
            />
          </Stack>
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
        </Stack>
      </div>
    )
  }
}
