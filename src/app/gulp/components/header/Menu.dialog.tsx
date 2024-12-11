import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { formatBytes } from '@/ui/utils';
import { Dialog } from '@/ui/Dialog';
import { useEffect, useRef, useState } from 'react';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { λNote } from '@/dto/Note.dto';
import ReactDOM from 'react-dom';
import { NotesWindow } from '@/components/NotesWindow';
import { PluginsViewerBanner } from '@/banners/PluginsViewerBanner';
import { SelectFilesBanner } from '@/banners/SelectFiles.banner';
import { Separator } from '@/ui/Separator';
import { LimitsBanner } from '@/banners/Limits.banner';
import { UploadSigmaRuleBanner } from '@/banners/UploadSigmaRule.banner';
import { QueryExternalBanner } from '@/banners/QueryExternal.banner';

export function MenuDialog() {
  const { spawnBanner, app, spawnDialog } = useApplication();
  const [windowRef, setWindowRef] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const logout = () => {
    window.location.reload()
  }

  const focus = (note: λNote) => {
    spawnDialog(note.events.length > 1
      ? <DisplayGroupDialog events={note.events} />
      : <DisplayEventDialog event={note.events[0]} />
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

  return (
    <Dialog title='Menu' className={s.menu}>
      <div className={s.stats}>
        <Button img='Upload' onClick={() => spawnBanner(<UploadBanner />)}>Upload files</Button>
        <Button img='Sigma' onClick={() => spawnBanner(<UploadSigmaRuleBanner />)}>Upload sigma rule</Button>
      </div>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='Wrench' onClick={() => spawnBanner(<SelectFilesBanner />)}>Select Files</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='Blocks' onClick={() => spawnBanner(<PluginsViewerBanner />)}>Plugins list</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='PictureInPicture2' onClick={openWindow}>Open notes window</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='AlignHorizontalSpaceAround' onClick={() => spawnBanner(<LimitsBanner />)}>Change visible limits</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='FunctionPython' onClick={() => spawnBanner(<QueryExternalBanner />)}>Query external resourse</Button>
      <Separator color='var(--accent-5)' />
      <Button variant='outline' img='Image' onClick={exportCanvasAsImage}>Export canvas as image</Button>
      <div className={s.separator} />
      <div className={s.stats}>
        <Unit type='downstream' num={app.transfered?.down || 0} />
        <Unit type='upstream' num={app.transfered?.up || 0} />
      </div>
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