import '@/global.css'
import { AIAssistant } from '@/banners/AIAssistant.banner'
import { Extension } from '@/context/Extension.context'
import { Locale } from '@/locales'
import s from './styles/AIAssistantWindow.module.css'

interface AIAssistantWindowProps {
  mode: 'free' | 'pro'
  onClose: () => void
}

/**
 * AIAssistantWindow component for detached AI Assistant windows.
 * Renders a standalone layout with a header and the AI Assistant Panel.
 */
export function AIAssistantWindow({ mode, onClose }: AIAssistantWindowProps) {
  const { t } = Locale.use()

  return (
    <div className={s.main}>
      <div className={s.header}>
        <h2>{mode === 'pro' ? t('aiAssistant.proTitle') : t('aiAssistant.title')}</h2>
      </div>
      <div className={s.content}>
        {mode === 'pro' ? (
          <Extension.Component name='AIAssistantPro.banner.tsx' />
        ) : (
          <AIAssistant.Panel />
        )}
      </div>
    </div>
  )
}
