import { Icon } from '@impactium/icons'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { useState, KeyboardEvent, useRef, useEffect } from 'react'

import s from './styles/SnikerChatBanner.module.css'

export function SnikerChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { from: 'ai', text: `Hi I'm Sniker AI. how can i help you?` }
  ])
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const send = () => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { from: 'user', text }])
    setText('')
  }

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [text])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <Stack ai='start' jc='center' pos='fixed' dir='column' className={s.wrapper}>
      <Stack ai='center' jc='space-between' dir='row' style={{ width: '100%' }}>
        <Stack gap={8} style={{ fontSize: '18px' }}>
          <Icon name='Robot' size={18} />
          AI Assistent
        </Stack>
        <Button icon='X' variant='tertiary' onClick={onClose} />
      </Stack>

      <Stack ai='center' jc='start' dir='column' gap={8} className={s.chat} ref={chatRef}>
        {messages.map((msg, idx) => (
          <Stack key={idx} className={msg.from === 'ai' ? s.aiMessage : s.userMessage}>
            {msg.text}
          </Stack>
        ))}
      </Stack>

      <Stack dir='row' ai='end' gap={8} style={{ width: '100%' }}>
        <textarea
          ref={textareaRef}
          className={s.textarea}
          placeholder='Ask about your investigation...'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          data-virtualkeyboard='true'
        />
      </Stack>
    </Stack>
  )
}
