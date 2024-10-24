import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { cn, formatBytes } from '@/ui/utils';

interface MenuProps {
  active: boolean;
}

export function Menu({ active }: MenuProps) {
  const { spawnBanner, app } = useApplication();

  return (
    <div className={cn(s.menu, active && s.active)}>
      <div className={s.header}>
        <h5>Menu</h5>
        <Button img='X' size='icon' />
      </div>
      <div className={s.content}>
        <Button variant='outline' img='Upload' onClick={() => spawnBanner(<UploadBanner />)}>Upload</Button>
      </div>
      <div className={s.footer}>
        <Unit type='downstream' num={app.transfered?.down || 0} />
        <Unit type='upstream' num={app.transfered?.up || 0} />
      </div>
    </div>
  )
}

interface UnitProps {
  type: 'upstream' | 'downstream',
  num: number
}

function Unit({ type, num }: UnitProps) {
  return (
    <Button variant='outline' img={type === 'upstream' ? 'CloudUpload' : 'CloudDownload'} className={s.unit}>
      {formatBytes(num)}
    </Button>
  )
}