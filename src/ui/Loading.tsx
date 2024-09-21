import { useLanguage } from "../context/Language.context";
import { Icon } from "./Icon";
import s from './styles/Button.module.css';
import { cn } from "./utils";

interface LoadingProps {
  size: "default" | "sm" | "lg" | "icon" | undefined | null;
}

export function Loading({ size }: LoadingProps) {
  const { lang } = useLanguage();
  return (
    <>
      <Icon className={s.loading} name='LoaderCircle' />
      {size !== 'icon' && lang._please_wait}
    </>
  )
}