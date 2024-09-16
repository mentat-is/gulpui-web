import { useLanguage } from "../context/Language.context";
import s from './styles/Button.module.css';
import { cn } from "./utils";

interface LoadingProps {
  size: "default" | "sm" | "lg" | "icon" | undefined | null;
}

export function Loading({ size }: LoadingProps) {
  const { lang } = useLanguage();
  return (
    <>
      <img className={cn(s.loading)} src='https://cdn.impactium.fun/ui/action/loading.svg' />
      {size !== 'icon' && lang._please_wait}
    </>
  )
}