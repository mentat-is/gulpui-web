import { useLanguage } from "../context/Language.context";
import { Icon, IconProps } from "./Icon";
import s from './styles/Button.module.css';

interface LoadingProps {
  size: "default" | "sm" | "lg" | "icon" | undefined | null;
  variant?: IconProps['variant']
}

export function Loading({ size, variant = 'black' }: LoadingProps) {
  const { lang } = useLanguage();
  return (
    <>
      <Icon className={s.loading} variant={variant} name='LoaderCircle' />
      {size !== 'icon' && lang._please_wait}
    </>
  )
}