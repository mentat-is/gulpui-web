import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { FPSCounter } from '@/components/FPSCounter';

export function Controls() {
  const { Info } = useApplication();

  return (
    <div className={s.controls}>
      <Button size='icon' onClick={() => Info.increaseTimelineScale()}><img src='https://cdn.impactium.fun/ui/action/add-plus.svg' alt='' /></Button>
      <Button size='icon' onClick={() => Info.decreaseTimelineScale()}><img src='https://cdn.impactium.fun/ui/action/remove-minus.svg' alt='' /></Button>
      <Button onClick={() => Info.setTimelineScale(1)}><img src='https://cdn.impactium.fun/ui/action/undo.svg' alt='' />Reset scale</Button>
    </div>
  )
}