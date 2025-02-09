import { Button, Input, Stack } from "@impactium/components";
import { cn } from "@impactium/utils";
import s from './styles/Navigator.module.css'
import { useApplication } from "@/context/Application.context";
import { Event, File, Note } from "@/class/Info";
import { RefObject, useEffect, useRef, useState } from "react";
import { λFile, λNote } from "@/dto/Dataset";
import { NotePoint } from "@/ui/Note";
import { Resizer } from "@/ui/Resizer";
import { DisplayGroupDialog } from "@/dialogs/Group.dialog";
import { DisplayEventDialog } from "@/dialogs/Event.dialog";
import ReactDOM from "react-dom";
import { NotesWindow } from "@/components/NotesWindow";
import { SetState } from "@/class/API";
import { toast } from "sonner";

export namespace Navigator {
  export interface Props extends Stack.Props {
    setScrollX: SetState<number>;
    timeline: RefObject<HTMLDivElement>;
  }
}

export function Navigator({ setScrollX, timeline, className, ...props }: Navigator.Props) {
  const { Info, app, spawnDialog } = useApplication();
  const [notes, setNotes] = useState<λNote[]>([]);

  useEffect(() => {
    const files = File.selected(app);

    const notes = files.map(file => Note.findByFile(app, file)).flat();

    setNotes(notes);
  }, [app.target.notes]);

  const [windowRef, setWindowRef] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const focus = (note: λNote) => {
    const events = Note.events(app, note);

    spawnDialog(events.length > 1
      ? <DisplayGroupDialog events={events} />
      : <DisplayEventDialog event={events[0]} />
    );
  }

  const openWindow = () => {
    if (windowRef) windowRef.close();

    const newWindow = window.open('', '', 'width=600,height=450,left=100,top=100');
    if (!newWindow) return;
  
    const container = document.createElement('div');
    newWindow.document.body.appendChild(container);
    containerRef.current = container;

    Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
      if (styleSheet.href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        newWindow.document.head.appendChild(link);
      } else if (styleSheet.cssRules) {
        const style = document.createElement('style');
        Array.from(styleSheet.cssRules).forEach((rule) => {
          style.appendChild(document.createTextNode(rule.cssText));
        });
        newWindow.document.head.appendChild(style);
      }
    });
  
    setWindowRef(newWindow);
  };

  
  
  useEffect(() => {
    if (windowRef) {
      const handleBeforeUnload = () => {
        setWindowRef(null);
      };

      windowRef.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        windowRef.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [windowRef]);

  const closeWindow = () => {
    if (windowRef) {
      windowRef.close();
      setWindowRef(null);
    }
  };

  const Content = () => {
    if (notes.length === 0) {
      return (
        <Stack style={{ width: '100%', height: '100%' }} ai='center' jc='center'>
          <Button img='FaceUnhappy' variant='disabled'>There is no any notes or links</Button>
        </Stack>
      )
    }

    return (
      <>
        {notes.map(note => <NotePoint.Combination key={note.id} note={note} />)}
      </>
    )
  }

  const size_plus = useRef<HTMLButtonElement>(null);
  const size_reset = useRef<HTMLButtonElement>(null);
  const size_minus = useRef<HTMLButtonElement>(null);

  const resetScaleAndScroll = () => {
    Info.setTimelineScale(1)
    setScrollX(0);
  }

  const zoom = (out: boolean = false) => {
    const timelineWidth = timeline.current?.clientWidth || 1;
    const currentScale = app.timeline.scale;
  
    const newScale = out
      ? currentScale - currentScale / 4
      : currentScale + currentScale / 4;
  
    const clampedScale = Math.min(Math.max(newScale, 0.01), 9999999);

    const centerOffset = (scrollX + timelineWidth / 2);
    const scaledOffset = (centerOffset * clampedScale) / currentScale;
    const left = scaledOffset - centerOffset;
  
    Info.setTimelineScale(clampedScale);
    setScrollX(Math.round(scrollX + left));
  };
  
  
  const handleControllers = (event: KeyboardEvent) => {
    switch (true) {
      case event.key === '-':
        size_plus.current?.click();
        break;
        
        case event.key === '=':
        size_minus.current?.click();
        break;

      case event.key === '+':
        resetScaleAndScroll();
        break;
    
    default:
        break;
    }
  }

  useEffect(() => {
    window.addEventListener('keypress', handleControllers);

    return () => {
      window.removeEventListener('keypress', handleControllers);
    }
  }, []);

  useEffect(() => {
    resetScaleAndScroll();
  }, [app.timeline.frame])

  return (
    <Stack pos='relative' dir='column' ai='flex-start' className={cn(className, s.navigator)} style={{ height: app.timeline.footerSize }} {...props}>
      <Resizer init={app.timeline.footerSize} set={Info.setFooterSize} horizontal />
      <Stack className={s.heading} flex={0}>
        <Button variant='secondary' size='sm' ref={size_minus} onClick={() => zoom(false)} img='ZoomIn' />  
        <Button variant='secondary' size='sm' ref={size_plus} onClick={() => zoom(true)} img='ZoomOut' />
        <Button variant='secondary' size='sm' ref={size_reset} onClick={resetScaleAndScroll} img='AlignHorizontalSpaceBetween' />
        <Input className={s.filter} value={app.timeline.filter} placeholder='Filter by filenames and context' onChange={(e) => Info.setTimelineFilter(e.target.value)} img='Filter' />
        <Button size='sm' variant='secondary' title='Open notes banner in new window' img='PictureInPicture2' onClick={openWindow} />
        {windowRef && containerRef.current && ReactDOM.createPortal(<NotesWindow focus={focus} onClose={closeWindow} />, containerRef.current)}
      </Stack>
      <Content />
    </Stack>
  )
}
