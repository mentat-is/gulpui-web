import { ReactNode, useEffect } from 'react';
import { useApplication } from '../context/Application.context';
import { useClasses } from '../decorator/useClasses';
import { Children } from '../dto';
import s from './styles/Banner.module.css';
import { Button } from './Button';

type BannerProps = Children & {
  className?: string | string[]
  title?: string
  subtitle?: ReactNode | null
  fixed?: boolean
  loading?: boolean
}

export function Banner({ children, className, title, fixed, loading, subtitle = null }: BannerProps) {
  const { destroyBanner } = useApplication();

  useEffect(() => {
    if (fixed) return;
    // Function to handle keydown event for Esc key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        destroyBanner();
      }
    };

    // Add event listeners for keydown and popstate
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', destroyBanner);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', destroyBanner);
    };
  }, []);

  return (
    <div className={s.wrapper}>
      <div className={useClasses(s.banner, className, loading ? s.loading : '')}>
        <h6>
          {title}
          {subtitle}
          {!fixed && <div className={s.button_wrapper}><Button variant='ghost' onClick={destroyBanner} img='X' size='icon' /></div>}
        </h6>
        {children}
      </div>
    </div>
  );
}
