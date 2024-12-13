import { ReactNode, useEffect } from 'react';
import { useApplication } from '../context/Application.context';
import { Children } from '../dto';
import s from './styles/Banner.module.css';
import { Button } from './Button';
import { cn } from './utils';
import { Skeleton } from './Skeleton';
import { Cell, Stack } from '@impactium/components';

type BannerProps = Children & {
  className?: string | string[];
  title?: string;
  subtitle?: ReactNode | null;
  done?: ReactNode | null;
  fixed?: boolean;
  loading?: boolean;
  onClose?: () => void
  option?: ReactNode | null;
}

export function Banner({ children, className, title, fixed, option, loading, done, subtitle = null, onClose }: BannerProps) {
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
        <Cell className={s.cell} top left />
        <Cell className={s.cell} top right>
          <Button variant='ghost' onClick={close} img='X' loading={loading} size='icon' />
        </Cell>
        <Cell className={s.cell} bottom left>
          {option}
        </Cell>
        <Cell className={s.cell} bottom right>
          {done}
        </Cell>
        <h6>
          {loading ? <Skeleton variant='button' width='long' height={24} /> : title}
          {subtitle ? (loading ? <Skeleton height={24} /> : subtitle) : null}
        </h6>
        <Stack dir='column' ai='unset' gap={16} className={s.content}>
          {children}
        </Stack>
      </div>
    </div>
  );
}
