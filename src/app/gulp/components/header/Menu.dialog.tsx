import { Button, Stack } from '@impactium/components';
import s from '../../Gulp.module.css';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { formatBytes } from '@/ui/utils';
import { Dialog } from '@/ui/Dialog';
import { useEffect, useRef, useState } from 'react';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import ReactDOM from 'react-dom';
import { NotesWindow } from '@/components/NotesWindow';
import { SelectFilesBanner } from '@/banners/SelectFiles.banner';
import { Separator } from '@/ui/Separator';
import { LimitsBanner } from '@/banners/Limits.banner';
import { UploadSigmaRuleBanner } from '@/banners/UploadSigmaRule.banner';
import { QueryExternal } from '@/banners/QueryExternal.banner';
import { StorylineBanner } from '../storyline';
import { SaveSession } from '@/banners/SaveSession';
import { λNote } from '@/dto/Dataset';
import { Note } from '@/class/Info';

export function MenuDialog() {
  const { spawnBanner, app, spawnDialog, Info, destroyDialog } = useApplication();
  const [windowRef, setWindowRef] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const logout = () => {
    window.location.reload()
  }

  const focus = (note: λNote) => {
    const events = Note.events(app, note);

    spawnDialog(events.length > 1
      ? <DisplayGroupDialog events={events} />
      : <DisplayEventDialog event={events[0]} />
    );
  }

  const openWindow = () => {
    if (windowRef) windowRef.close();

    const newWindow = window.open('', '', 'width=600,height=450,left=100,top=100');
    if (!newWindow) return;
  
    const container = document.createElement('div');
    newWindow.document.body.appendChild(container);
    containerRef.current = container;
  
    // Копируем стили
    Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
      if (styleSheet.href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        newWindow.document.head.appendChild(link);
      } else if (styleSheet.cssRules) {
        const style = document.createElement('style');
        Array.from(styleSheet.cssRules).forEach((rule) => {
          style.appendChild(document.createTextNode(rule.cssText));
        });
        newWindow.document.head.appendChild(style);
      }
    });
  
    setWindowRef(newWindow);
  };

  const backToOperations = () => {
    Info.files_unselect(app.target.files);
    destroyDialog();
  }
  
  useEffect(() => {
    if (windowRef) {
      const handleBeforeUnload = () => {
        setWindowRef(null);
      };

      windowRef.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        windowRef.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [windowRef]);

  const closeWindow = () => {
    if (windowRef) {
      windowRef.close();
      setWindowRef(null);
    }
  };

  const exportCanvasAsImage = () => {
    const canvas = document.body.querySelector('#canvas') as HTMLCanvasElement | null;

    if (canvas) {
      const url = canvas.toDataURL('image/png');
    
      const link = document.createElement('a');
      link.href = url;
      link.download = `gulp-canvas_${Date.now()}`;
      
      link.click();
      link.remove();
    }
  }

  const saveSessionAndLogout = () => {
    spawnBanner(<SaveSession />)
  }

  return (
    <Dialog title='Menu' className={s.menu}>
      <Stack className={s.stats}>
        <Button img='Upload' onClick={() => spawnBanner(<UploadBanner />)}>Upload files</Button>
        <Button img='Kv' onClick={() => spawnBanner(<QueryExternal.Banner />)}>Query external source</Button>
        <Button img='Sigma' onClick={() => spawnBanner(<UploadSigmaRuleBanner />)}>Upload sigma rule</Button>
      </Stack>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='Wrench' onClick={() => spawnBanner(<SelectFilesBanner />)}>Select Files</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='PictureInPicture2' onClick={openWindow}>Open notes window</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='Image' onClick={() => spawnBanner(<StorylineBanner />)}>Open story line</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='AlignHorizontalSpaceAround' onClick={() => spawnBanner(<LimitsBanner />)}>Change visible limits</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='AcronymJpg' onClick={exportCanvasAsImage}>Export canvas as JPG</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='AcronymSvg' onClick={exportCanvasAsImage}>Export canvas as SVG</Button>
      <div className={s.separator} />
      <div className={s.stats}>
        <Unit type='downstream' num={app.transfered?.down || 0} />
        <Unit type='upstream' num={app.transfered?.up || 0} />
      </div>
      <Button className={s.logout} variant='outline' img='ChartBarStacked' onClick={backToOperations}>Back to Operations</Button>
      <Button variant='outline' img='FloppyDisk' onClick={saveSessionAndLogout}>Save session and logout</Button>
      <Button className={s.logout} variant='outline' img='LogOut' onClick={logout}>Logout</Button>
      {windowRef && containerRef.current && ReactDOM.createPortal(<NotesWindow focus={focus} onClose={closeWindow} />, containerRef.current)}
    </Dialog>
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