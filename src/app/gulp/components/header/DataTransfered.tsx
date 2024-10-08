import { useApplication } from '@/context/Application.context'
import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { IngestBanner } from '@/banners/IngestBanner';

export function DataTransfered() {
  const { app, spawnBanner } = useApplication();

  return (
    <div className={s.transfered}>
      <Unit type='downstream' num={app.transfered?.down || 0} />
      <Unit type='upstream' num={app.transfered?.up || 0} />
      <Button variant='outline' img='Upload' onClick={() => spawnBanner(<IngestBanner />)}>Upload</Button>
    </div>
  )
}

interface UnitProps {
  type: 'upstream' | 'downstream',
  num: number
}

function Unit({ type, num }: UnitProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
  };

  return (
    <Button variant='outline' img={type === 'upstream' ? 'CloudUpload' : 'CloudDownload'} className={s.unit}>
      {formatBytes(num)}
    </Button>
  )
}