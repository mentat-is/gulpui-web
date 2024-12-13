import { ReactNode, useEffect } from 'react';
import { useApplication } from '../context/Application.context';
import { Children } from '../dto';
import s from './styles/Banner.module.css';
import { Button } from './Button';
import { cn } from './utils';
import { Skeleton } from './Skeleton';

type BannerProps = Children & {
  className?: string | string[];
  title?: string;
  subtitle?: ReactNode | null;
  fixed?: boolean;
  loading?: boolean;
  onClose?: () => void
}

export function Banner({ children, className, title, fixed, loading, subtitle = null, onClose }: BannerProps) {
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
      <div className={cn(s.banner, s.loading, className)}>
        <h6>
          {loading ? <Skeleton variant='button' width='long' height={24} /> : title}
          {subtitle ? (loading ? <Skeleton height={24} /> : subtitle) : null}
          {!fixed && <div className={s.button_wrapper}><Button variant='ghost' onClick={close} img='X' loading={loading} size='icon' /></div>}
        </h6>
        {children}
      </div>
    </div>
  );
}
