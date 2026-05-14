import '@/global.css'
import { AIAssistant } from '@/banners/AIAssistant.banner'
import { Extension } from '@/context/Extension.context'
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
  return (
    <div className={s.main}>
      <div className={s.header}>
        <h2>{mode === 'pro' ? 'AI Assistant Pro' : 'AI Assistant'}</h2>
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
