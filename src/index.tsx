import ReactDOM from 'react-dom/client';
import './global.css';
import 'react-day-picker/dist/style.css';
import { LanguageProvider } from './context/Language.context';
import { ApplicationProvider, useApplication } from './context/Application.context';
import { GulpPage } from './app/gulp/Gulp';
import { Toaster } from './ui/Toaster';
import { Api } from './class/API';
import { useEffect } from 'react';
import { AuthBanner } from './banners/Auth.banner';

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
    if (Info.User.isAuthorized() === false) {
      setTimeout(() => {
        spawnBanner(<AuthBanner />);
      }, 30);
    }
  }, [app.general]);

  return <GulpPage />
}