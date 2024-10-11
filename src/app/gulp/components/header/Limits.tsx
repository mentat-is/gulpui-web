import { useApplication } from '@/context/Application.context';
import { getReadableDate } from '@/decorator/getReadableDate';
import { LimitsBanner } from '@/banners/Limits.banner';
import s from '../../Gulp.module.css';

export function Limits() {
  const { app, spawnBanner } = useApplication();
  return (
    <div onClick={() => spawnBanner(<LimitsBanner />)} className={s.datelimit}>
      From
      <span>{getReadableDate(app.target.bucket?.selected.min as unknown as Date)}</span>
      to
      <span>{getReadableDate(app.target.bucket?.selected.max as unknown as Date)}</span>
    </div>
  )
}