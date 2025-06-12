import ReactDOM from 'react-dom/client'
import './global.css'
import {
  ApplicationProvider,
  useApplication,
} from './context/Application.context'
import { Toaster } from './ui/Toaster'
import { Api } from './class/API'
import { useEffect, useState } from 'react'
import { λthrow } from '@impactium/utils'
import { Windows } from './ui/Windows'
import { ExtensionProvider } from './context/Extension.context'
import { Logger } from './dto/Logger.class'
import { Preloader } from './components/Preloader'
import { LoginPage } from './page/Login.page'
import { Operation } from './class/Info'

class NoRootDefinitionInHTMLDocument extends Error {
  constructor() {
    super('There is to element with `root` id in index.html document')
  }
}

const root = document.getElementById('root')

if (!root) {
  λthrow(NoRootDefinitionInHTMLDocument)
}

ReactDOM.createRoot(root).render(Root())

declare global {
  var api: Api
}

function Root() {
  if (window.onerror) {
    window.onerror = function (...props) {
      Logger.error('[Global Error]', props.join('\n'));
    };
  }

  return (
    <ApplicationProvider>
      <ExtensionProvider>
        <Main />
        <Toaster />
      </ExtensionProvider>
    </ApplicationProvider>
  )
}

function Main() {
  const { Info } = useApplication();
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    if (isPreloaded)
      return;

    setTimeout(() => {
      setIsPreloaded(true);
    }, 2500);
  }, [isPreloaded]);

  if (!isPreloaded) {
    return <Preloader />
  }

  return Info.User.isAuthorized() && Operation.selected(Info.app) ? <Windows.Provider /> : <LoginPage />
}
