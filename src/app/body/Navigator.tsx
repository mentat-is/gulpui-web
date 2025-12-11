import { cn } from '@impactium/utils'
import s from './styles/Navigator.module.css'
import { Application } from '@/context/Application.context'
import { ChangeEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import ReactDOM from 'react-dom'
import { NotesWindow } from '@/components/NotesWindow'
import { Popover } from '@/ui/Popover'
import { Logger } from '@/dto/Logger.class'
import { Highlights } from '@/overlays/Highlights'
import { Switch } from '@/ui/Switch'
import { Label } from '@/ui/Label'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Context } from '@/entities/Context'
import { Note } from '@/entities/Note'
import { App } from '@/entities/App'
import { Theme } from '@/context/Theme.context'
import { useTheme } from 'next-themes'
import { SnikerChatPanel } from '@/banners/SnikerChat.banner'

export namespace Navigator {
  export interface Props extends Stack.Props {
    timeline: RefObject<HTMLDivElement>
    timestamp: number
  }
}

export function Navigator({
  timeline,
  className,
  timestamp: _timestamp,
  ...props
}: Navigator.Props) {
  const { Info, app, spawnDialog, setScrollX, scrollX, setHighlightsOverlay, setScrollY } = Application.use()
  const [timestamp, setTimestamp] = useState<number>(_timestamp)
  const [timestampInputValid, setTimestampInputValid] = useState<boolean>(true)
  const { theme } = useTheme()
  const [chatOpen, setChatOpen] = useState(false)

  const toggleChat = () => setChatOpen(prev => !prev)

  useEffect(() => {
    setTimestamp(_timestamp)
  }, [_timestamp])

  const resetTimestamp = () => {
    setTimestampInputValid(false)
    setTimestamp(0)
  }

  function applyThemeToWindow(sourceDoc: Document, targetDoc: Document, theme: string | undefined) {
    const sourceRoot = sourceDoc.documentElement
    const targetRoot = targetDoc.documentElement

    // use data-theme
    targetRoot.setAttribute('data-theme', theme ?? 'dark')

    // copy css style
    const styles = getComputedStyle(sourceRoot)
    for (let i = 0; i < styles.length; i++) {
      const key = styles[i]
      if (key.startsWith('--')) {
        targetRoot.style.setProperty(key, styles.getPropertyValue(key))
      }
    }
  }

  const handleTimestampChangeHandler = (ev: ChangeEvent<HTMLInputElement>) => {
    const { value } = ev.target
    const limits = Context.Entity.frame(app)
    if (!value) {
      Logger.error(`Expected number, got ${value}`, 'Navigator.handleTimestampChangeHandler');
      resetTimestamp();
      return;
    }

    const num = parseInt(value)
    if (isNaN(num) || num < 0) {
      Logger.error(
        `Expected number, got ${num}`,
        'Navigator.handleTimestampChangeHandler',
      )
      resetTimestamp()
      return
    }

    setTimestampInputValid(num < limits.max && num > limits.min)
    setTimestamp(num)
  }

  const resetTimestampToInitialValue = () => {
    setTimestamp(_timestamp)
    setTimestampInputValid(true)
  }

  const goToTimestamp = () => {
    // @ts-ignore
    return window.focusCanvasOnEvent(timestamp, true)
  }

  const [windowRef, setWindowRef] = useState<Window | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const focus = (note: Note.Type) => {
    const event = Note.Entity.event(app, note)

    spawnDialog(<DisplayEventDialog event={event} />);
  }

  const openWindow = () => {
    if (windowRef) windowRef.close()

    const newWindow = window.open(
      '',
      '',
      'width=600,height=450,left=100,top=100',
    )
    if (!newWindow) return

    const container = document.createElement('div')
    newWindow.document.body.appendChild(container)
    containerRef.current = container

    applyThemeToWindow(document, newWindow.document, theme)

    // copy style from css
    Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
      try {
        if (styleSheet.href) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = styleSheet.href
          newWindow.document.head.appendChild(link)
        } else if (styleSheet.cssRules) {
          const style = document.createElement('style')
          Array.from(styleSheet.cssRules).forEach((rule) => {
            style.appendChild(document.createTextNode(rule.cssText))
          })
          newWindow.document.head.appendChild(style)
        }
      } catch (err) {
        console.warn('error copyng style', err)
      }
    })

    setWindowRef(newWindow)
  }

  useEffect(() => {
    if (windowRef) {
      const handleBeforeUnload = () => {
        setWindowRef(null)
      }

      windowRef.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        windowRef.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [windowRef])

  // sync thems for window
  useEffect(() => {
    if (!windowRef) return
    applyThemeToWindow(document, windowRef.document, theme)
  }, [theme, windowRef])

  const closeWindow = () => {
    if (windowRef) {
      windowRef.close()
      setWindowRef(null)
    }
  }

  const size_plus = useRef<HTMLButtonElement>(null)
  const size_reset = useRef<HTMLButtonElement>(null)
  const size_minus = useRef<HTMLButtonElement>(null)

  const resetScaleAndScroll = () => {
    Info.setTimelineScale(1)
    setScrollX(0)
  }

  const zoom = (out = false) => {
    const timelineWidth = timeline.current?.clientWidth || 1
    const currentScale = app.timeline.scale

    const newScale = out
      ? currentScale - currentScale / 4
      : currentScale + currentScale / 4

    const clampedScale = Math.min(Math.max(newScale, 0.01), 9999999)

    const centerOffset = scrollX + timelineWidth / 2
    const scaledOffset = (centerOffset * clampedScale) / currentScale
    const left = scaledOffset - centerOffset

    Info.setTimelineScale(clampedScale)
    setScrollX(x => Math.round(x + left))
  }

  const handleControllers = (event: KeyboardEvent) => {
    switch (true) {
      case event.key === '-':
        size_plus.current?.click()
        break

      case event.key === '=':
        size_minus.current?.click()
        break

      case event.key === '+':
        resetScaleAndScroll()
        break

      default:
        break
    }
  }

  useEffect(() => {
    window.addEventListener('keypress', handleControllers)

    return () => {
      window.removeEventListener('keypress', handleControllers)
    }
  }, [])

  const createHighlightButtonClickHandler = () => {
    setHighlightsOverlay(prev => prev ? null : <Highlights.Create.Overlay />)
  }

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setScrollY(-26)
    Info.setTimelineFilter(e.target.value)
  }

  const toggleView = () => Info.setInfoByKey(!app.timeline.isTabularView, 'timeline', 'isTabularView');

  return (
    <Stack
      pos="relative"
      gap={5}
      flex={0}
      className={cn(className, s.navigator)}
      {...props}
    >
      <Button
        variant="secondary"
        title='Zoom in'
        ref={size_minus}
        onClick={() => zoom(false)}
        icon="ZoomIn"
        size='md'
      />
      <Button
        variant="secondary"
        title='Zoom out'
        ref={size_plus}
        onClick={() => zoom(true)}
        icon="ZoomOut"
        size='md'
      />
      <Button
        variant="secondary"
        title='Reset scale'
        ref={size_reset}
        onClick={resetScaleAndScroll}
        icon="AlignHorizontalSpaceBetween"
        size='md'
      />
      <Button
        variant="secondary"
        title='Create highlight'
        icon="ChartBarBig"
        onClick={createHighlightButtonClickHandler}
        size='md'
      />
      <Input
        className={s.filter}
        variant='highlighted'
        value={app.timeline.filter}
        placeholder='Filter by filenames and context'
        onChange={handleFilterChange}
        icon="Filter"
      />
      <Button
        variant="secondary"
        title="Open notes banner in new window"
        icon="PictureInPicture2"
        onClick={openWindow}
        size='md'
      />
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            size='md'
            variant="secondary"
            title='Toggle visibility of notes or links'
            icon={app.hidden.notes || app.hidden.links ? 'ToggleOffAlt' : 'ToggleOnAlt'}
            className={cn(s.notes_visibility)}
          />
        </Popover.Trigger>
        <Popover.Content>
          <Stack dir='column' gap={4} ai='stretch'>
            {(Object.keys(app.hidden) as unknown as Array<keyof App.Type['hidden']>).map((key) => {
              return (
                <Stack key={key} jc='space-between'>
                  <Label value={`Show ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`} />
                  <Switch checked={!app.hidden[key]} onCheckedChange={() => Info.toggle_visibility(key)} />
                </Stack>
              )
            })}
            <Stack jc='space-between'>
              <Label value='Theme' />
              <Theme.Switcher />
            </Stack>
          </Stack>
        </Popover.Content>
      </Popover.Root>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button size='md' variant="secondary" icon="Crosshair" />
        </Popover.Trigger>
        <Popover.Content className={s.goto}>
          <Stack dir="column" ai="flex-start">
            <p>Go to timestamp:</p>
            <Stack>
              <Input
                variant="highlighted"
                icon="Crosshair"
                value={timestamp}
                valid={timestampInputValid}
                onChange={handleTimestampChangeHandler}
              />
              <Button
                icon="Undo2"
                variant="secondary"
                onClick={resetTimestampToInitialValue}
              />
              <Button icon="Check" variant="glass" onClick={goToTimestamp} />
            </Stack>
          </Stack>
        </Popover.Content>
      </Popover.Root>
      <Button
        variant='secondary'
        title='Open Sniker chat'
        icon='MessageCircleCode'
        onClick={toggleChat}
        size='md'
      />
      {chatOpen && (
        <SnikerChatPanel onClose={() => setChatOpen(false)} />
      )}
      <Button
        variant='secondary'
        title='Toggle view between table and canvas'
        icon={app.timeline.isTabularView ? 'ChartArea' : 'Table'}
        onClick={toggleView}
        size='md'
      />
      {chatOpen && (
        <SnikerChatPanel onClose={() => setChatOpen(false)} />
      )}
      {windowRef &&
        containerRef.current &&
        ReactDOM.createPortal(
          <NotesWindow focus={focus} onClose={closeWindow} />,
          containerRef.current,
        )}
    </Stack>
  )
}
