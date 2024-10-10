import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Button } from "@/ui/Button";
import { SelectContextBanner } from "@/banners/SelectContextBanner";
import s from '../../Gulp.module.css';
import { PluginsViewerBanner } from "@/banners/PluginsViewerBanner";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { NotesWindow } from "@/components/NotesWindow";
import { λNote } from "@/dto/Note.dto";
import { DisplayGroupDialog } from "@/dialogs/DisplayGroupDialog";
import { DisplayEventDialog } from "@/dialogs/DisplayEventDialog";

export function Logout() {
  const { lang } = useLanguage();
  const { spawnBanner, spawnDialog } = useApplication();
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

  return (
    <div className={s.logout}>
      <Button variant='glass' img='PictureInPicture2' onClick={openWindow}>Open notes</Button>
      {windowRef && containerRef.current && ReactDOM.createPortal(<NotesWindow focus={focus} onClose={closeWindow} />, containerRef.current)}
      <Button variant='outline' img='Blocks' onClick={() => spawnBanner(<PluginsViewerBanner />)}>Plugins</Button>
      <Button variant='outline' img='Wrench' onClick={() => spawnBanner(<SelectContextBanner />)}>Select Files</Button>
      <Button style={{width: 'min-content', alignSelf: 'center', justifySelf: 'self-end'}} variant='outline' img='LogOut' onClick={logout}>{lang.logout}</Button>
    </div>
  )
}
