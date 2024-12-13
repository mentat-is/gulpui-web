import SyntaxHighlighter from 'react-syntax-highlighter';
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, DetailedChunkEvent, RawDetailedChunkEvent } from '@/dto/ChunkEvent.dto';
import { ResponseBase } from '@/dto/ResponseBase.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useEffect, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { copy } from '@/ui/utils';
import { Button } from '@/ui/Button';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { File, Note, Plugin } from '@/class/Info';
import { Notes } from './components/Notes';
import { λNote } from '@/dto/Note.dto';
import { CreateLinkBanner } from '@/banners/CreateLinkBanner';
import { Loading } from "@impactium/components";
import { Hardcode } from '@/class/Engine.dto';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Navigation } from './components/navigation';
import { Separator } from '@/ui/Separator';

interface DisplayEventDialogProps {
  event: λEvent;
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { api, Info, app, spawnBanner, destroyDialog } = useApplication();
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
  
    api<ResponseBase<RawDetailedChunkEvent>>('/query_single_event', {
      data: {
        gulp_id: event._id
      }
    }).then(res => {
      const elapsedTime = Date.now() - startTime;
      const delay = Math.max(1500 - elapsedTime, 0);
  
      if (res.isSuccess()) {
        setTimeout(() => {
          setRawJSON(JSON.stringify(res.data, null, 4));
          setDetailedChunkEvent({
            operation: res.data.operation,
            agent: {
              type: res.data['agent.type'],
              id: res.data['agent.id']
            },
            event: {
              code: res.data['event.code'],
              duration: res.data['event.duration'],
              id: res.data['event.id'],
              hash: res.data['event.hash'],
              category: res.data['event.category'],
              original: res.data['event.original']
            },
            level: res.data['log.level'],
            _id: res.data._id,
            operation_id: res.data.operation_id,
            timestamp: res.data['@timestamp'] as Hardcode.Timestamp,
            file: res.data['gulp.source.file'],
            context: res.data['gulp.context'],
            _uuid: event._uuid
          });
        }, delay);
      }
    });
  };  


  const spawnNoteBanner = () => {
    spawnBanner(<CreateNoteBanner
      context={Plugin.uuid(app, File.uuid(app, event._uuid)!._uuid)!.context}
      filename={event.file}
      events={event} />);
    destroyDialog();
  }

  const spawnLinkBanner = () => {
    const file = File.uuid(app, event._uuid);

    if (!file) return;

    spawnBanner(<CreateLinkBanner
      context={Plugin.uuid(app, file._uuid)!.context}
      file={file}
      events={event} />);
    destroyDialog();
  }

  return (
    <Dialog callback={() => Info.setTimelineTarget(destroyDialog() as unknown as null)} icon={<SymmetricSvg loading={!detailedChunkEvent} text={event._id} />} title={`Event: ${event._id}`} description={`From ${event.context} with code ${event.event.code}`}>
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
