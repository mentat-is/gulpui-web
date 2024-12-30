import SyntaxHighlighter from 'react-syntax-highlighter';
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, DetailedChunkEvent } from '@/dto/ChunkEvent.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useEffect, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { copy } from '@/ui/utils';
import { Button } from '@impactium/components';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { Note, File } from '@/class/Info';
import { Notes } from './components/Notes';
import { λNote } from '@/dto/Note.dto';
import { CreateLinkBanner } from '@/banners/CreateLinkBanner';
import { Loading } from '@impactium/components';
import { Hardcode } from '@/class/Engine.dto';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Navigation } from './components/navigation';
import { Separator } from '@/ui/Separator';

interface DisplayEventDialogProps {
  event: λEvent;
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner, destroyDialog } = useApplication();
  const [detailedChunkEvent, setDetailedChunkEvent] = useState<DetailedChunkEvent | null>(null);
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
    const startTime = Date.now();
  
    api<any>('/query_single_event', {
      query: {
        gulp_id: event.id
      }
    }).then(data => {
      const elapsedTime = Date.now() - startTime;
      const delay = Math.max(1500 - elapsedTime, 0);

      setTimeout(() => {
        setRawJSON(JSON.stringify(data, null, 4));
        setDetailedChunkEvent({
          operation: data.operation,
          agent: {
            type: data['agent.type'],
            id: data['agent.id']
          },
          event: {
            code: data['event.code'],
            duration: data['event.duration'],
            id: data['event.id'],
            hash: data['event.hash'],
            category: data['event.category'],
            original: data['event.original']
          },
          level: data['log.level'],
          _id: data._id,
          // @ts-ignore
          operation_id: data.operation_id,
          timestamp: data['@timestamp'] as Hardcode.Timestamp,
          // @ts-ignore
          file: data['gulp.file.file'],
          context: data['gulp.context'],
          _uuid: event.file_id
        });
      }, delay);
    });
  };  


  const spawnNoteBanner = () => {
    spawnBanner(<CreateNoteBanner
      context={File.id(app, event.file_id)!.context_id}
      filename={event.file_id}
      events={event} />);
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
