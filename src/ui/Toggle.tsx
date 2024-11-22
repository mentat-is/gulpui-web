import { useState } from 'react';
import { Switch, SwitchProps } from './Switch';
import s from './styles/Toggle.module.css';
import { cn } from './utils';

interface ToggleProps extends SwitchProps {
  option: [string, string];
}

export function Toggle({ option, ...props }: ToggleProps) {
  const [checked, setChecked] = useState<boolean>(Boolean(props.defaultChecked));

  props.checked = props.checked ?? checked;
  props.onCheckedChange = props.onCheckedChange ?? setChecked;

  return (
    <div className={s.toggle}>
      <p className={cn(!checked && s.selected)}>{option[0]}</p>
      <Switch {...props} />
      <p className={cn(checked && s.selected)}>{option[1]}</p>
    </div>
  );
};
