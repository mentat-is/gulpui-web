import { Button, Stack } from '@impactium/components';
import s from '../../Gulp.module.css';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { useEffect, useRef, useState } from 'react';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import ReactDOM from 'react-dom';
import { NotesWindow } from '@/components/NotesWindow';
import { SelectFilesBanner } from '@/banners/SelectFiles.banner';
import { LimitsBanner } from '@/banners/Limits.banner';
import { UploadSigmaRuleBanner } from '@/banners/UploadSigmaRule.banner';
import { QueryExternal } from '@/banners/QueryExternal.banner';
import { StorylineBanner } from '../Storyline';
import { SaveSession } from '@/banners/SaveSession';
import { λNote } from '@/dto/Dataset';
import { Note } from '@/class/Info';
import { OperationBanner } from '@/banners/Operation.banner';
import { useWindows } from '@/ui/Windows';
import { Enrichment } from '@/banners/EnrichmentBanner';

export function Menu() {
  const { spawnBanner, app, spawnDialog, destroyDialog } = useApplication();
  const { setWindows } = useWindows();
  const [windowRef, setWindowRef] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    destroyDialog();
    setWindows([]);
    spawnBanner(<OperationBanner />);
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

  const logout = () => {
    spawnBanner(<SaveSession />)
  }

  const enrichment = () => {
    spawnBanner(<Enrichment.Banner />)
  }

  return (
    <Stack title='Menu' className={s.menu} dir='column' ai='flex-start' gap={12}>
      <Button variant='secondary' title='Upload files' img='Upload' onClick={() => spawnBanner(<UploadBanner />)} />
      <Button variant='secondary' title='Query external source' img='Kv' onClick={() => spawnBanner(<QueryExternal.Banner />)} />
      <Button variant='secondary' title='Upload sigma rule' img='Sigma' onClick={() => spawnBanner(<UploadSigmaRuleBanner />)} />
      <Button variant='secondary' title='Select files and contexts' img='Wrench' onClick={() => spawnBanner(<SelectFilesBanner />)} />
      <Button variant='secondary' title='Open notes in new window' img='PictureInPicture2' onClick={openWindow} />
      <Button variant='secondary' title='Open storyline' img='Image' onClick={() => spawnBanner(<StorylineBanner />)} />
      <Button variant='secondary' title='Change workflow frame' img='AlignHorizontalSpaceAround' onClick={() => spawnBanner(<LimitsBanner />)} />
      <Button variant='secondary' title='Export canvas' img='AcronymJpg' onClick={exportCanvasAsImage} />
      <Button variant='secondary' title='Export canvas' img='AcronymSvg' onClick={exportCanvasAsImage} />
      <Button variant='secondary' title='Data enrichment' img='PrismColor' onClick={enrichment} />
      <Stack flex />
      <Button variant='secondary' title='Back to operations' img='Undo2' onClick={backToOperations} />
      <Button variant='secondary' img='LogOut' onClick={logout} />
      {windowRef && containerRef.current && ReactDOM.createPortal(<NotesWindow focus={focus} onClose={closeWindow} />, containerRef.current)}
    </Stack>
  )
}
