import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Button } from "@/ui/Button";
import { SelectContextBanner } from "@/banners/SelectContextBanner";
import s from '../../Gulp.module.css';
import { PluginsViewerBanner } from "@/banners/PluginsViewerBanner";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface FloatingWindowProps {
  onClose: () => void;
}

const FloatingWindow = ({ onClose }: FloatingWindowProps) => {
  return (
    <div>
      <h2>Компонент в новом окне</h2>
      <button onClick={onClose}>Закрыть окно</button>
    </div>
  );
};

export function Logout() {
  const { lang } = useLanguage();
  const { spawnBanner, logout } = useApplication();
  const [windowRef, setWindowRef] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const openWindow = () => {
    const newWindow = window.open(
      '',
      '',
      'width=600,height=450,left=100,top=100'
    );

    setWindowRef(newWindow);
    if (newWindow) {
      const container = document.createElement('div');
      newWindow.document.body.appendChild(container);
      containerRef.current = container;

      setWindowRef(newWindow);
    }
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

  return (
    <div className={s.logout}>
      <Button variant='glass' img='PictureInPicture2' onClick={openWindow}>Open notes</Button>
      {windowRef && containerRef.current
        ? ReactDOM.createPortal(<FloatingWindow onClose={closeWindow} />, containerRef.current)
        : null}
      <Button variant='outline' img='Blocks' onClick={() => spawnBanner(<PluginsViewerBanner />)}>Plugins</Button>
      <Button variant='outline' img='Wrench' onClick={() => spawnBanner(<SelectContextBanner />)}>Select Files</Button>
      <Button style={{width: 'min-content', alignSelf: 'center', justifySelf: 'self-end'}} variant='outline' img='LogOut' onClick={logout}>{lang.logout}</Button>
    </div>
  )
}
