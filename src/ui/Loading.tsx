import { useLanguage } from "../context/Language.context";
import s from './styles/Button.module.css';

interface LoadingProps {
  size: "default" | "sm" | "lg" | "icon" | undefined | null;
}

export function Loading({ size }: LoadingProps) {
  const { lang } = useLanguage();
  return (
    <>
      <img className={s.loading} src='https://cdn.impactium.fun/ui/action/loading.svg' />
      {size !== 'icon' && lang._please_wait}
    </>
  )
}