import ReactDOM from 'react-dom/client'
import './global.css'
import {
  ApplicationProvider,
  useApplication,
} from './context/Application.context'
import { Toaster } from './ui/Toaster'
import { Api } from './class/API'
import { useEffect } from 'react'
import { AuthBanner } from './banners/Auth.banner'
import { λthrow } from '@impactium/utils'
import { Windows } from './ui/Windows'
import { PluginProvider } from './context/Plugin.context'

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
  return (
    <ApplicationProvider>
      <PluginProvider>
        <Main />
        <Toaster />
      </PluginProvider>
    </ApplicationProvider>
  )
}

function Main() {
  const { Info, app, spawnBanner } = useApplication()

  useEffect(() => {
    if (Info.User.isAuthorized() === false) {
      setTimeout(() => {
        spawnBanner(<AuthBanner />)
      }, 30)
    }
  }, [app.general])

  return <Windows.Provider />
}
