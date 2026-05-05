import { cn } from '@impactium/utils'
import s from './styles/Navigator.module.css'
import { Application } from '@/context/Application.context'
import { useScroll, scrollStore } from '@/store/scroll.store'
import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react'
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
import { AIAssistant } from '@/banners/AIAssistant.banner'
import { FloatingWindow } from '@/ui/FloatingWindow'
import { Extension } from '@/context/Extension.context'
import { Filter } from '@/entities/Filter'
import { Source } from '@/entities/Source'

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
  const { Info, app, spawnDialog, setHighlightsOverlay } = Application.use()
  const { x: scrollX } = useScroll()
  const [timestamp, setTimestamp] = useState<number>(_timestamp)
  const [timestampInputValid, setTimestampInputValid] = useState<boolean>(true)
  const { theme } = useTheme()
  const [chatOpen, setChatOpen] = useState(false)
  const toggleChatOpen = () => setChatOpen(prev => !prev)

  const [filterMode, setFilterMode] = useState<'files' | 'events'>('files');
  const EVENT_FILTER_ID = 'navigator-event-filter' as Filter.Id;

  const [localFilterValue, setLocalFilterValue] = useState(app.timeline.filter);

  // Sync local filter value with global app state
  useEffect(() => {
    setLocalFilterValue(app.timeline.filter);
  }, [app.timeline.filter]);

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
    scrollStore.setScrollX(0)
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
    scrollStore.setScrollX(x => Math.round(x + left))
  }

  const handleControllers = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || target.isContentEditable) return;


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

  /**
   * Triggers the search based on the current mode and value.
   * For 'files' mode, it updates the global timeline filter.
   * For 'events' mode, it updates OpenSearch filters and triggers a refetch.
   * @param value The search term.
   * @param mode The current filter mode ('files' or 'events').
   */
  const triggerSearch = useCallback((value: string, mode: 'files' | 'events') => {
    if (mode === 'files') {
      Info.setTimelineFilter(value);
      scrollStore.setScroll(0, -26);
    } else {
      let hasChanges = false;
      const sources = Source.Entity.selected(app);
      if (sources.length === 0) return;

      sources.forEach((source: Source.Type) => {
        const query = Info.getQuery(source);
        const existingFilterIndex = query.filters.findIndex(f => f.id === EVENT_FILTER_ID);
        const trimmedValue = value.trim();

        if (trimmedValue === '') {
          if (existingFilterIndex !== -1) {
            query.filters.splice(existingFilterIndex, 1);
            Info.setQuery(source, query);
            hasChanges = true;
          }
        } else {
          const newFilter: Filter.Type = {
            id: EVENT_FILTER_ID,
            type: 'wildcard' as any,
            operator: 'must' as any,
            field: 'event.original',
            value: trimmedValue,
            enabled: true,
            case_insensitive: true,
          };

          if (existingFilterIndex !== -1) {
            query.filters[existingFilterIndex] = newFilter;
          } else {
            query.filters.push(newFilter);
          }
          Info.setQuery(source, query);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        Info.refetch({ ids: sources.map((s: Source.Type) => s.id) });
        scrollStore.setScroll(0, -26);
      }
    }
  }, [app, Info, EVENT_FILTER_ID]);

  /**
   * Handles filter input changes.
   * Triggers instant auto-search in 'files' mode, but waits for manual trigger in 'events' mode.
   * @param e Change event from the input.
   */
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalFilterValue(value);
    if (filterMode === 'files') {
      Info.setTimelineFilter(value);
      scrollStore.setScroll(0, -26);
    }
  }

  /**
   * Handles key down events on the search input.
   * Triggers search when 'Enter' is pressed.
   * @param e Keyboard event from the input.
   */
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerSearch(localFilterValue, filterMode);
    }
  }

  /**
   * Toggles between 'files' and 'events' filter modes.
   * When switching back to 'files', it clears any active event filters.
   */
  const handleIconClick = useCallback(() => {
    const nextMode = filterMode === 'files' ? 'events' : 'files';

    // Reset input value when switching modes to provide a clean state for the new mode
    setLocalFilterValue('');
    Info.setTimelineFilter('');

    if (filterMode === 'events') {
      // Cleanup: remove event filters when switching back to file filtering
      let hasChanges = false;
      const sources = Source.Entity.selected(app);
      sources.forEach((source: Source.Type) => {
        const query = Info.getQuery(source);
        const existingFilterIndex = query.filters.findIndex(f => f.id === EVENT_FILTER_ID);
        if (existingFilterIndex !== -1) {
          query.filters.splice(existingFilterIndex, 1);
          Info.setQuery(source, query);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        Info.refetch({ ids: sources.map((s: Source.Type) => s.id) });
      }
    }

    setFilterMode(nextMode);
  }, [filterMode, app, Info, EVENT_FILTER_ID]);

  const toggleView = () => Info.setInfoByKey(!app.timeline.isTabularView, 'timeline', 'isTabularView');

  const { extensions } = Extension.use();
  const hasPro = !!extensions['AIAssistantPro.banner.tsx'];
  const [chatMode, setChatMode] = useState<'free' | 'pro'>('free'); // Default to free, but will be set by selection
  const [selectionOpen, setSelectionOpen] = useState(false);

  const handleChatButtonClick = () => {
    if (chatOpen) {
      setChatOpen(false);
      return;
    }

    if (hasPro) {
      setSelectionOpen(true);
    } else {
      setChatMode('free');
      setChatOpen(true);
    }
  };

  const selectChat = (mode: 'free' | 'pro') => {
    setChatMode(mode);
    setChatOpen(true);
    setSelectionOpen(false);
  };


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
        value={localFilterValue}
        placeholder={filterMode === 'files' ? 'Filter by filenames and context' : 'Filter Events by raw logs'}
        onChange={handleFilterChange}
        onKeyDown={handleKeyDown}
        icon={filterMode === 'files' ? 'Filter' : 'Activity'}
        onIconClick={handleIconClick}
        iconTitle={filterMode === 'files' ? 'Switch to Event Filtering' : 'Switch to File Filtering'}
      />
      <Button
        variant="glass"
        title="Search"
        icon="Search"
        onClick={() => triggerSearch(localFilterValue, filterMode)}
        size='md'
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
      {hasPro ? (
        <Popover.Root open={selectionOpen} onOpenChange={setSelectionOpen}>
          <Popover.Trigger asChild>
            <Button
              variant={chatOpen || selectionOpen ? 'default' : 'secondary'}
              title='Select Chat Version'
              icon='Sparkles'
              onClick={handleChatButtonClick}
              size='md'
            />
          </Popover.Trigger>
          <Popover.Content>
            <Stack dir='column' gap={3}>
              <Label value="Select Chat Version" />
              <Stack>
                <Button
                  variant="glass"
                  onClick={() => selectChat('free')}
                  icon="Sparkle"
                  title="Use Free Version"
                >
                  AIAssistant Chat
                </Button>
                <Button
                  variant="default"
                  onClick={() => selectChat('pro')}
                  icon="Sparkles"
                  title="Use Pro Version"
                >
                  AIAssistant Pro
                </Button>
              </Stack>
            </Stack>
          </Popover.Content>
        </Popover.Root>
      ) : (
        <Button
          variant={chatOpen ? 'default' : 'secondary'}
          title='Open AI Assistant Chat'
          icon='Sparkle'
          onClick={handleChatButtonClick}
          size='md'
        />
      )}

      <FloatingWindow
        title={chatMode === 'pro' ? 'AI Assistant Pro' : 'AI Assistant'}
        icon={chatMode === 'pro' ? 'Sparkles' : 'Sparkle'}
        defaultOpen={chatOpen}
        /* FloatingWindow updates internal state when defaultOpen changes */
        onOpenChange={setChatOpen}
        trigger="i"
        size={[480, 800]}
        position={[120, 120]}
        className={chatMode === 'pro' ? s.chat : undefined}
      >
        {chatMode === 'pro' ? (
          <Extension.Component name='AIAssistantPro.banner.tsx' />
        ) : (
          <AIAssistant.Panel />
        )}
      </FloatingWindow>
      <Button
        variant='secondary'
        title='Toggle view between table and canvas'
        icon={app.timeline.isTabularView ? 'ChartArea' : 'Table'}
        onClick={toggleView}
        size='md'
      />
      {windowRef &&
        containerRef.current &&
        ReactDOM.createPortal(
          <NotesWindow onClose={closeWindow} />,
          containerRef.current,
        )}
    </Stack>
  )
}
