import { Icon } from '@impactium/icons'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Application } from '@/context/Application.context'

import s from './styles/SnikerChatBanner.module.css'

export function SnikerChatPanel({ onClose }: { onClose: () => void }) {
  const { Info } = Application.use()

  const chat = Info.app.general.ai_chat
  const [text, setText] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const send = () => {
    if (!text.trim()) return

    Info.ai_chat_addMessage('user', text)
    Info.ai_chat_addMessage('ai', '')
    setText('')

    Info.ai_analyze_flagged_events()
  }

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chat.messages.length])

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + 'px'
  }, [text])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <Stack ai="start" jc="center" pos="fixed" dir="column" className={s.wrapper}>
      <Stack ai="center" jc="space-between" dir="row" style={{ width: '100%' }}>
        <Stack gap={8} style={{ fontSize: '18px' }}>
          <Icon name="Robot" size={18} />
          AI Assistant
        </Stack>
        <Button icon="X" variant="tertiary" onClick={onClose} />
      </Stack>

      <Stack ai="center" jc="start" dir="column" gap={8} className={s.chat} ref={chatRef}>
        {chat.messages.map((msg, idx) => (
          <Stack
            key={idx}
            className={msg.from === 'ai' ? s.aiMessage : s.userMessage}
          >
            {msg.text}
          </Stack>
        ))}
      </Stack>

      <Stack dir="row" ai="end" gap={8} style={{ width: '100%' }}>
        <textarea
          ref={textareaRef}
          className={s.textarea}
          placeholder="Ask about your investigation..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          data-virtualkeyboard="true"
        />
        <Button
          icon="Send"
          variant="secondary"
          onClick={send}
          disabled={chat.streaming}
        />
      </Stack>
    </Stack>
  )
}
