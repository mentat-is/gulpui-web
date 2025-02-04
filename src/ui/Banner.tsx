import { ReactNode, useEffect } from 'react';
import { useApplication } from '../context/Application.context';
import s from './styles/Banner.module.css';
import { cn } from '@impactium/utils';
import { Cell, Stack, Skeleton, Button } from '@impactium/components';

export namespace Banner {
  export interface Props extends Stack.Props {
    title?: string;
    subtitle?: ReactNode | null;
    done?: ReactNode | null;
    fixed?: boolean;
    loading?: boolean;
    onClose?: () => void
    option?: ReactNode | null;
    back?: () => void | null;
  }
}

export function Banner({ children, back, className, title, fixed, option, loading, done, subtitle = null, onClose }: Banner.Props) {
  const { destroyBanner } = useApplication();

  const close = () => {
    if (onClose) onClose();

    destroyBanner()
  }

  useEffect(() => {
    if (fixed) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', close);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', close);
    };
  }, []);

  return (
    <div className={s.wrapper}>
      <div className={cn(s.banner, s.loading, className)} style={{['--gray-400']: 'var(--accent-3)' }}>
        <Cell key='cell-1' className={s.cell} top left>
          {back && <Button variant='ghost' img='CornerUpLeft' onClick={back} />}
        </Cell>
        <Cell key='cell-2' className={s.cell} top right>
          {fixed ? null : <Button variant='ghost' onClick={close} img='X' loading={loading} size='icon' />}
        </Cell>
        <Cell key='cell-3' className={s.cell} bottom left>
          {option}
        </Cell>
        <Cell key='cell-4' className={s.cell} bottom right>
          {done}
        </Cell>
        <h6>
          {loading ? <Skeleton width='long' height={24} /> : title}
          {subtitle ? (loading ? <Skeleton height={24} /> : subtitle) : null}
        </h6>
        <Stack dir='column' ai='unset' gap={16} className={s.content}>
          {children}
        </Stack>
      </div>
    </div>
  );
}
