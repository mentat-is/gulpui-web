import { Toaster as Sonner } from 'sonner'
import s from './styles/Toaster.module.css'
import { useTheme } from 'next-themes'
type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const sonnerTheme: 'light' | 'dark' =
    theme === 'light' || theme === 'light-old' ? 'light' : 'dark';

  return (
    <Sonner
      theme={sonnerTheme}
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
