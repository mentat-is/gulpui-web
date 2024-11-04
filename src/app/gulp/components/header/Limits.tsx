import { useApplication } from '@/context/Application.context';
import { getReadableDate } from '@/decorator/getReadableDate';
import { LimitsBanner } from '@/banners/Limits.banner';
import s from '../../Gulp.module.css';
import { Button } from '@/ui/Button';

export function Limits() {
  const { app, spawnBanner } = useApplication();
  return (
    <Button variant='secondary' onClick={() => spawnBanner(<LimitsBanner />)} className={s.datelimit}>
      From
      <span>{getReadableDate(app.target.bucket.selected ? app.target.bucket.selected.min : app.target.bucket.timestamp.min)}</span>
      to
      <span>{getReadableDate(app.target.bucket.selected ? app.target.bucket.selected.max : app.target.bucket.timestamp.max)}</span>
    </Button>
  )
}