import { HTMLAttributes } from 'react';
import s from './styles/Dialog.module.css';
import { cn } from './utils';
import { Button } from './Button';
import { useApplication } from '@/context/Application.context';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './Resizable';

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description: React.ReactNode;
  loading?: boolean;
  icon?: string | React.ReactElement;
  callback?: () => void;
}

export function Dialog({ className, callback, icon,description, title, loading, children, ...props }: DialogProps) {
  const { destroyDialog } = useApplication();

  return (
    <ResizablePanelGroup className={s.resize} direction="horizontal">
      <ResizablePanel className={s.not} defaultSize={50} />
      <ResizableHandle />
      <ResizablePanel maxSize={50} minSize={20} defaultSize={50}>
        <div className={cn(s.dialog, className)} {...props}>
          <div className={s.wrapper}>
            {typeof icon === 'string' ? <img src={icon} alt='' /> : icon}
            <div className={s.header}>
              <h2>{title}</h2>
              {description && <p>{description}</p>}
              <Button variant='ghost' className={s.close} onClick={callback || destroyDialog} img='X' size='icon' />
            </div>
          </div>
          <div className={cn(s.content, loading && s.loading)}>
            {loading ? <Button variant='disabled' loading size='icon' /> : children}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
