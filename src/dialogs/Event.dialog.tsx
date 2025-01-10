import SyntaxHighlighter from 'react-syntax-highlighter';
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, λExtendedEvent, ΞxtendedEvent } from '@/dto/ChunkEvent.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useEffect, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { copy } from '@/ui/utils';
import { Button } from '@impactium/components';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { Note, File, Index, Internal, Event } from '@/class/Info';
import { Notes } from './components/Notes';
import { CreateLinkBanner } from '@/banners/CreateLinkBanner';
import { Loading } from '@impactium/components';
import { Hardcode } from '@/class/Engine.dto';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Navigation } from './components/navigation';
import { Separator } from '@/ui/Separator';
import { λNote } from '@/dto/Dataset';


interface DisplayEventDialogProps {
  event: λEvent;
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner, destroyDialog } = useApplication();
  const [detailedChunkEvent, setDetailedChunkEvent] = useState<λExtendedEvent | null>(null);
  const [notes, setNotes] = useState<λNote[]>(Note.findByEvent(app, event));
  const [rawJSON, setRawJSON] = useState<string>('');

  useEffect(() => {
    setNotes(Note.findByEvent(app, event));
  }, [event, app.target.notes]);

  useEffect(() => Info.setTimelineTarget(event), [event])

  useEffect(() => {
    if (!detailedChunkEvent?.event?.original)
      reloadDetailedChunkEvent();
  }, [detailedChunkEvent]);

  useEffect(() => {
    setDetailedChunkEvent(null);
  }, [event]);

  const reloadDetailedChunkEvent = () => {
    const index = Index.selected(app);

    if (!index) {
      return;
    }
  
    api<ΞxtendedEvent>('/query_single_id', {
      method: 'POST',
      query: {
        doc_id: event.id,
        index: index.name
      }
    }, e => setDetailedChunkEvent(Event.normalizeFromDetailed(e))).then(data => {
      setRawJSON(JSON.stringify(data, null, 4));
    });
  };  

  const spawnNoteBanner = () => {
    spawnBanner(<CreateNoteBanner event={event} />);
    destroyDialog();
  }

  const spawnLinkBanner = () => {
    const file = File.id(app, event.file_id);

    if (!file) return;

    spawnBanner(<CreateLinkBanner
      context={file.context_id}
      file={file}
      events={event} />);
    destroyDialog();
  }

  return (
    <Dialog callback={() => Info.setTimelineTarget(destroyDialog() as unknown as null)} icon={<SymmetricSvg loading={!detailedChunkEvent} text={event.id} />} title={`Event: ${event.id}`} description={`From ${event.context_id} with code ${event.code}`}>
      <Separator />
      <Navigation event={event} />
      <Separator />
      {detailedChunkEvent ? (
        <Fragment>
          <div className={s.buttons_group}>
            <Button className={s.createNote} onClick={spawnNoteBanner} img='StickyNote'>New note</Button>
            <Button className={s.createNote} onClick={spawnLinkBanner} img='Link'>Create link</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='secondary' img='Link'>Connect link</Button>
              </PopoverTrigger>
              <PopoverContent>
                
              </PopoverContent>
            </Popover>
            
          </div>
          <Tabs defaultValue='json' className={s.tabs}>
            <TabsList className={s.tabs_list}>
              <TabsTrigger value='json'>JSON</TabsTrigger>
              <TabsTrigger value='raw'>XML</TabsTrigger>
            </TabsList>
            <TabsContent className={s.tabs_content} value='raw'>
              <Button style={{ marginBottom: '12px', width: '100%' }} onClick={() => copy(detailedChunkEvent.event.original)} img='Copy'>Copy XML</Button>
              <SyntaxHighlighter customStyle={{ borderRadius: 6 }} language='XML' style={highlight.androidstudio}>
                {detailedChunkEvent.event.original}
              </SyntaxHighlighter>
            </TabsContent>
            <TabsContent className={s.tabs_content} value='json'>
              <Button style={{ marginBottom: '12px', width: '100%' }} onClick={() => copy(rawJSON)} img='Copy'>Copy JSON</Button>
              <SyntaxHighlighter customStyle={{ borderRadius: 6 }} language='JSON' style={highlight.androidstudio}>
                {rawJSON}
              </SyntaxHighlighter>
            </TabsContent>
          </Tabs>
          <Notes notes={notes} />
        </Fragment>
      ) : (
        <Loading variant='default' size='icon' style={{ width: '100%', height: '100%' }} jc='center' className={s.loading} />
      )}
    </Dialog>
  )
};
