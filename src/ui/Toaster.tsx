import { Toaster as Sonner } from 'sonner'
import s from './styles/Toaster.module.css'
import { useTheme } from 'next-themes'
type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme as 'light' | 'dark'}
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
