import { Toaster as Sonner } from 'sonner';
import s from './styles/Toaster.module.css';
type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme='dark'
      className={s.toaster}
      toastOptions={{
        classNames: {
          toast: s.toast,
          description: s.description,
          actionButton: s.actionButton,
          cancelButton: s.cancelButton,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
