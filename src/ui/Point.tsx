import { Button } from "@impactium/components";
import { Icon } from "@impactium/icons";
import { Color } from "@impactium/types";
import { cn } from "@impactium/utils";
import s from './styles/Point.module.css';

export namespace Point {
  export interface Props extends Button.Props {
    x: number;
    y: number;
    icon: Icon.Name;
    accent: Color;
    name: string;
  }
}

export function Point({ x, y, icon, accent, className, name, ...props }: Point.Props) {
  return (
    <Button size='icon' variant='glass' className={cn(className, s.target)} style={{ ...props.style, x, y }} {...props}>
      <Icon name={icon} color={accent} />
      <hr style={{ background: accent }} />
      <div className={s.backplate} style={{ background: accent + '32' }} />
      <p className={s.desc} style={{ y, x, transform: 'translateY(26px)' }}>{name}</p>
    </Button>
    
  )
}