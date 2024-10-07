import ReactDOM from 'react-dom/client';
import './global.css';
import "react-day-picker/dist/style.css";
import { LanguageProvider } from './context/Language.context';
import { ApplicationProvider, useApplication } from './context/Application.context';
import { GulpPage } from './app/gulp/Gulp';
import { LoginPage } from './app/login/Login';
import { Toaster } from './ui/Toaster';
import { File, Index, Operation } from './class/Info';
import { useEffect, useState } from 'react';

ReactDOM.createRoot(document.getElementById('root')!).render(Root());

function Root() {
  return (
    <LanguageProvider>
      <ApplicationProvider>
        <Main />
        <Toaster />
      </ApplicationProvider>
    </LanguageProvider>
  );
};

function Main() {
  const { app } = useApplication();
  const [preflighted, setPreflighted] = useState<boolean>(false);

  useEffect(() => {
    if (File.selected(app).length) setPreflighted(true);
  }, [app.target.files]);

  return (preflighted
    // if app has operation and index defined
    ? <GulpPage />
    // if not
    : <LoginPage />
  )
}