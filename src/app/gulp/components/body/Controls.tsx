import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';
import { ui } from '@/ui/utils';

export function Controls() {
  const { Info } = useApplication();

  return (
    <div className={s.controls}>
      <Button onClick={() => Info.setTimelineScale(1)} img={ui('action/undo')} />
    </div>
  )
}