import ReactDOM from 'react-dom/client';
import './global.css';
import "react-day-picker/dist/style.css";
import { LanguageProvider } from './context/Language.context';
import { ApplicationProvider, useApplication } from './context/Application.context';
import { GulpPage } from './app/gulp/Gulp';
import { LoginPage } from './app/login/Login';
import { Toaster } from './ui/Toaster';
import { useEffect } from 'react';
import { Index, Operation } from './class/Info';

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

  return (app.general.token && Operation.selected(app) && Index.selected(app)
    // if app has operation and index defined
    ? <GulpPage />
    // if not
    : <LoginPage />
  )
}