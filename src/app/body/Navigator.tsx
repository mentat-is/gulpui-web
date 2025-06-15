import { Button, Input, Stack } from '@impactium/components'
import { cn } from '@impactium/utils'
import s from './styles/Navigator.module.css'
import { useApplication } from '@/context/Application.context'
import { Context, File, Note } from '@/class/Info'
import { ChangeEvent, RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { λNote } from '@/dto/Dataset'
import { NotePoint } from '@/ui/Note'
import { Resizer } from '@/ui/Resizer'
import { DisplayGroupDialog } from '@/dialogs/Group.dialog'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import ReactDOM from 'react-dom'
import { NotesWindow } from '@/components/NotesWindow'
import { SetState } from '@/class/API'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover'
import { Logger } from '@/dto/Logger.class'
import { Highlights } from '@/overlays/Highlights'

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
  const [notes, setNotes] = useState<λNote[]>([])
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
    const limits = Context.frame(app)
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

  const focus = (note: λNote) => {
    const events = Note.events(app, note)

    spawnDialog(
      events.length > 1 ? (
        <DisplayGroupDialog events={events} />
      ) : (
        <DisplayEventDialog event={events[0]} />
      ),
    )
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

  const Content = useMemo(() => {
    if (notes.length === 0) {
      return (
        <Stack
          style={{ width: '100%', height: '100%' }}
          ai="center"
          jc="center"
        >
          <Button img="FaceUnhappy" variant="disabled">
            There is no any notes or links
          </Button>
        </Stack>
      )
    }

    return (
      <Stack
        style={{ width: '100%', height: '100%', overflow: 'auto' }}
        ai="center"
        jc="flex-start"
        dir='column'
      >
        {notes.map((note) => (
          <NotePoint.Combination key={note.id} note={note} />
        ))}
      </Stack>
    )
  }, [notes, app.timeline.filter]);

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
    setHighlightsOverlay(<Highlights.Create.Overlay />)
  }

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setScrollY(-26)
    Info.setTimelineFilter(e.target.value)
  }

  return (
    <Stack
      pos="relative"
      dir="column"
      ai="flex-start"
      className={cn(className, s.navigator)}
      {...props}
    >
      <Stack className={s.heading} flex={0}>
        <Button
          variant="secondary"
          size="sm"
          title='Zoom in'
          ref={size_minus}
          onClick={() => zoom(false)}
          img="ZoomIn"
        />
        <Button
          variant="secondary"
          size="sm"
          title='Zoom out'
          ref={size_plus}
          onClick={() => zoom(true)}
          img="ZoomOut"
        />
        <Button
          variant="secondary"
          size="sm"
          title='Reset scale'
          ref={size_reset}
          onClick={resetScaleAndScroll}
          img="AlignHorizontalSpaceBetween"
        />
        <Button
          variant="secondary"
          size="sm"
          title='Create highlight'
          img="ChartBarBig"
          onClick={createHighlightButtonClickHandler}
        />
        <Input
          className={s.filter}
          value={app.timeline.filter}
          placeholder="Filter by filenames and context"
          onChange={handleFilterChange}
          img="Filter"
        />
        <Button
          size="sm"
          variant="secondary"
          title="Open notes banner in new window"
          img="PictureInPicture2"
          onClick={openWindow}
        />
        <Button
          size="sm"
          variant="secondary"
          title={app.timeline.hidden_notes ? 'Show notes' : 'Hide notes'}
          img={app.timeline.hidden_notes ? 'ToggleOffAlt' : 'ToggleOnAlt'}
          className={cn(
            s.notes_visibility,
            app.timeline.hidden_notes && s.dimmed,
          )}
          onClick={() => Info.toggle_notes_visibility()}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" img="Crosshair" />
          </PopoverTrigger>
          <PopoverContent className={s.goto}>
            <Stack dir="column" ai="flex-start">
              <p>Go to timestamp:</p>
              <Stack>
                <Input
                  variant="highlighted"
                  img="Crosshair"
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
          </PopoverContent>
        </Popover>
        {windowRef &&
          containerRef.current &&
          ReactDOM.createPortal(
            <NotesWindow focus={focus} onClose={closeWindow} />,
            containerRef.current,
          )}
      </Stack>
    </Stack>
  )
}
