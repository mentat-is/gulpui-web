import ReactDOM from 'react-dom/client'
import './global.css'
import {
  ApplicationProvider,
  useApplication,
} from './context/Application.context'
import { Toaster } from './ui/Toaster'
import { Api } from './class/API'
import { useEffect, useState } from 'react'
import { cn, λthrow } from '@impactium/utils'
import { ExtensionProvider } from './context/Extension.context'
import { Logger } from './dto/Logger.class'
import { Preloader } from './components/Preloader'
import { File } from './class/Info'
import s from './App.module.css';
import { Stack } from '@impactium/components'
import { Menu } from './components/menu'
import { Timeline } from './app/body/Timeline'
import { Resizer } from './ui/Resizer'
import { Auth } from './page/Auth.page'
import { Banner } from './ui/Banner'

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
  const { Info, app, dialog } = useApplication();
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

  return Info.app.target.files.filter(file => file.selected).length ? (
    <Stack gap={12} className={s.window} ai='stretch'>
      <Menu />
      <Timeline />
      <Stack
        className={cn(s.dialog)}
        style={{ width: app.timeline.dialogSize }}
        pos="relative"
      >
        <Resizer init={app.timeline.dialogSize} set={Info.setDialogSize} />
        {dialog}
      </Stack>
    </Stack>
  ) : <Auth.Page />
}
