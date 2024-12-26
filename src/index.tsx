import ReactDOM from 'react-dom/client';
import './global.css';
import "react-day-picker/dist/style.css";
import { LanguageProvider } from './context/Language.context';
import { ApplicationProvider, useApplication } from './context/Application.context';
import { GulpPage } from './app/gulp/Gulp';
import { LoginPage } from './app/login/Login';
import { Toaster } from './ui/Toaster';
import { Source } from './class/Info';
import { Api } from './class/API';

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
  const { app } = useApplication();

  console.log(app);


  return (Source.selected(app).length
    // if app has operation and index defined
    ? <GulpPage />
    // if not
    : <LoginPage />
  )
}