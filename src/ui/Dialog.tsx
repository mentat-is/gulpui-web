import { HTMLAttributes, useEffect, useRef } from 'react';
import s from './styles/Dialog.module.css';
import { cn } from '@impactium/utils';
import { Button, Stack } from '@impactium/components';
import { useApplication } from '@/context/Application.context';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './Resizable';
import { Loading } from './Loading';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { File } from '@/class/Info';

export namespace Dialog {
  export interface Props extends Stack.Props {
    title: string;
    description?: React.ReactNode;
    loading?: boolean;
    icon?: string | React.ReactElement;
    callback?: () => void;
  }
}

export function Dialog({ className, callback, icon, description, title, loading, children, ...props }: Dialog.Props) {
  const { Info, app, spawnDialog } = useApplication();

  const handleDialogClose = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  }

  const close = () => {
    if (callback) {
      callback();
    }
    
    spawnDialog(<DisplayGroupDialog events={[]} />);
  }

  useEffect(() => {
    document.addEventListener('keydown', handleDialogClose)

    return () => {
      document.removeEventListener('keydown', handleDialogClose)
    }
  }, []);

  return (
    <Stack className={cn(s.dialog, className)} dir='column' {...props}>
      <div className={s.wrapper}>
        {typeof icon === 'string' ? <img src={icon} alt='' /> : icon}
        <div className={s.header}>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
          {/* <Button variant='ghost' className={s.close} onClick={close} img='X' size='icon' /> */}
        </div>
      </div>
      <div className={cn(s.content, loading && s.loading)}>
        {loading ? <Loading size={48} variant='white' no_text /> : children}
      </div>
    </Stack>
  )
}
