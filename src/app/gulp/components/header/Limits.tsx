import { useApplication } from '@/context/Application.context';
import { getReadableDate } from '@/decorator/getReadableDate';
import { LimitsBanner } from '@/banners/Limits.banner';
import s from '../../Gulp.module.css';
import { Button } from '@impactium/components';

export function Limits() {
  const { app, spawnBanner } = useApplication();

  return (
    <Button variant='secondary' onClick={() => spawnBanner(<LimitsBanner />)} className={s.datelimit}>
      From
      <span>{getReadableDate(app.timeline.frame.min)}</span>
      to
      <span>{getReadableDate(app.timeline.frame.max)}</span>
    </Button>
  )
}