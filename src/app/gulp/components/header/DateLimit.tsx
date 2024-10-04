import { useApplication } from '@/context/Application.context';
import { getReadableDate } from '@/decorator/getReadableDate';
import { ChooseBucket } from '@/banners/ChooseBucket';
import s from '../../Gulp.module.css';

export function DateLimit() {
  const { app, spawnBanner } = useApplication();
  return (
    <div onClick={() => spawnBanner(<ChooseBucket />)} className={s.datelimit}>
      From
      <span>{getReadableDate(app.target.bucket?.selected.min as unknown as Date)}</span>
      to
      <span>{getReadableDate(app.target.bucket?.selected.max as unknown as Date)}</span>
    </div>
  )
}