import { cn } from '@impactium/utils'
import s from './styles/Navigator.module.css'
import { useApplication } from '@/context/Application.context'
import { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react'
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
  const { Info, app, spawnDialog, setScrollX, scrollX, setHighlightsOverlay, setScrollY } = useApplication()
  const [timestamp, setTimestamp] = useState<number>(_timestamp)
  const [timestampInputValid, setTimestampInputValid] = useState<boolean>(true)

  useEffect(() => {
    setTimestamp(_timestamp)
  }, [_timestamp])

  const resetTimestamp = () => {
    setTimestampInputValid(false)
    setTimestamp(0)
  }

  const handleTimestampChangeHandler = (ev: ChangeEvent<HTMLInputElement>) => {
    const { value } = ev.target
    const limits = Context.Entity.frame(app)
    if (!value) {
      Logger.error(
        `Expected number, got ${value}`,
        'Navigator.handleTimestampChangeHandler',
      )
      resetTimestamp()
      return
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

    Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
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

  useEffect(() => {
    resetScaleAndScroll();
  }, [app.timeline.frame]);

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
    setHighlightsOverlay(<Highlights.Create.Overlay />)
  }

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setScrollY(-26)
    Info.setTimelineFilter(e.target.value)
  }

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
        img="ZoomIn"
        size='md'
      />
      <Button
        variant="secondary"
        title='Zoom out'
        ref={size_plus}
        onClick={() => zoom(true)}
        img="ZoomOut"
        size='md'
      />
      <Button
        variant="secondary"
        title='Reset scale'
        ref={size_reset}
        onClick={resetScaleAndScroll}
        img="AlignHorizontalSpaceBetween"
        size='md'
      />
      <Button
        variant="secondary"
        title='Create highlight'
        img="ChartBarBig"
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
        img="PictureInPicture2"
        onClick={openWindow}
        size='md'
      />
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            size='md'
            variant="secondary"
            title='Toggle visibility of notes or links'
            img={app.hidden.notes || app.hidden.links ? 'ToggleOffAlt' : 'ToggleOnAlt'}
            className={cn(s.notes_visibility)}
          />
        </Popover.Trigger>
        <Popover.Content>
          <Stack dir='column' gap={4}>
            {(Object.keys(app.hidden) as unknown as Array<keyof App.Type['hidden']>).map((key) => {
              return (
                <Stack jc='space-between'>
                  <Label value={`Show ${key}`} />
                  <Switch checked={!app.hidden[key]} onCheckedChange={() => Info.toggle_visibility(key)} />
                </Stack>
              )
            })}
          </Stack>
        </Popover.Content>
      </Popover.Root>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button size='md' variant="secondary" img="Crosshair" />
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
                img="Undo2"
                variant="secondary"
                onClick={resetTimestampToInitialValue}
              />
              <Button img="Check" variant="glass" onClick={goToTimestamp} />
            </Stack>
          </Stack>
        </Popover.Content>
      </Popover.Root>
      {windowRef &&
        containerRef.current &&
        ReactDOM.createPortal(
          <NotesWindow focus={focus} onClose={closeWindow} />,
          containerRef.current,
        )}
    </Stack>
  )
}
