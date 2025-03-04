import ReactDOM from 'react-dom/client'
import './global.css'
import { LanguageProvider } from './context/Language.context'
import {
  ApplicationProvider,
  useApplication,
} from './context/Application.context'
import { GulpPage } from './app/gulp/Gulp'
import { Toaster } from './ui/Toaster'
import { Api } from './class/API'
import { useEffect } from 'react'
import { AuthBanner } from './banners/Auth.banner'
import { λthrow } from '@impactium/utils'

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
    <LanguageProvider>
      <ApplicationProvider>
        <Main />
        <Toaster />
      </ApplicationProvider>
    </LanguageProvider>
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

  return <GulpPage />
}
