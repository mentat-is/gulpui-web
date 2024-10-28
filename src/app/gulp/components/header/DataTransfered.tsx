import { useApplication } from '@/context/Application.context'
import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { UploadBanner } from '@/banners/Upload.banner';
import { formatBytes } from '@/ui/utils';

export function DataTransfered() {
  const { app, spawnBanner } = useApplication();

  return (
    <div className={s.transfered}>
      
      
    </div>
  )
}
