import ReactDOM from 'react-dom/client';
import './global.css';
import 'react-day-picker/dist/style.css';
import { LanguageProvider } from './context/Language.context';
import { ApplicationProvider, useApplication } from './context/Application.context';
import { GulpPage } from './app/gulp/Gulp';
import { LoginPage } from './app/login/Login';
import { Toaster } from './ui/Toaster';
import { File, Operation } from './class/Info';
import { Api } from './class/API';
import { useEffect } from 'react';
import { spawn } from 'child_process';
import { AuthBanner } from './banners/Auth.banner';
import { OperationBanner } from './banners/Operation.banner';

ReactDOM.createRoot(document.getElementById('root')!).render(Root());

declare global {
  var api: Api;
  var useOptionStyling: (options: Record<string, any> | undefined, base: Record<string, string>) => string;
}

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
  const { Info, app, spawnBanner } = useApplication();

  useEffect(() => {
    console.log(Info.User.isAuthorized());
    if (Info.User.isAuthorized() === false) {
      setTimeout(() => {
        spawnBanner(<AuthBanner />);
      }, 30);
    }
  }, [app.general]);

  return <GulpPage />
}