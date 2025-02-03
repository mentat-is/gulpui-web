import SyntaxHighlighter from 'react-syntax-highlighter';
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, λExtendedEvent } from '@/dto/ChunkEvent.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useEffect, useMemo, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { copy } from '@/ui/utils';
import { Button, Stack } from '@impactium/components';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { Note, File } from '@/class/Info';
import { CreateLinkBanner } from '@/banners/CreateLinkBanner';
import { Loading } from '@impactium/components';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Navigation } from './components/navigation';
import { Separator } from '@/ui/Separator';
import { λNote } from '@/dto/Dataset';
import { ConnectPopover } from '@/app/gulp/components/Connect.popover';
import { Enrichment } from '@/banners/EnrichmentBanner';


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

  useEffect(() => {
    if (app.timeline.target?.id !== event.id) {
      Info.setTimelineTarget(event); 
    }
  }, [event]);

  useEffect(() => {
    if (!detailedChunkEvent?.event?.original)
      reloadDetailedChunkEvent();
  }, [detailedChunkEvent]);

  useEffect(() => {
    setDetailedChunkEvent(null);
  }, [event]);

  const reloadDetailedChunkEvent = async () => {
    const detailed = await Info.query_single_id(event.id);

    setRawJSON(JSON.stringify(detailed?.raw, null, 2));

    setDetailedChunkEvent(detailed?.normalized || null);
  };  

  const spawnNoteBanner = () => {
    spawnBanner(<CreateNoteBanner event={event} />);
    destroyDialog();
  }

  const spawnLinkBanner = () => {
    const file = File.id(app, event.file_id);

    if (!file) return;

    spawnBanner(<CreateLinkBanner event={event} />);
    destroyDialog();
  }

  const spawnEnrichmentBanner = () => spawnBanner(<Enrichment.Banner event={event} />);

  const links_connect = useMemo(() => {
    return <ConnectPopover event={event} />
  }, [event, open]);

  return (
    <Dialog icon={<SymmetricSvg text={event.id} />} title={`Event: ${event.id}`} description={`From ${event.context_id} with code ${event.code}`}>
      <Navigation event={event} />
      <Separator />
      {detailedChunkEvent ? (
        <Fragment>
          <Stack>
            <Button onClick={spawnNoteBanner} img='StickyNote'>New note</Button>
            <Button onClick={spawnLinkBanner} img='Link'>Create link</Button>
            <Button onClick={spawnEnrichmentBanner} variant='glass' img='PrismColor'>Enrich</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='secondary' img='Link'>Connect link</Button>
              </PopoverTrigger>
              <PopoverContent>
                {links_connect}
              </PopoverContent>
            </Popover>
          </Stack>
          <Tabs defaultValue='json' className={s.tabs}>
            <TabsList className={s.tabs_list}>
              <TabsTrigger value='json'>JSON</TabsTrigger>
              <TabsTrigger value='raw'>XML</TabsTrigger>
            </TabsList>
            <TabsContent className={s.tabs_content} value='raw'>
              <Button style={{ marginBottom: '12px', width: '100%' }} onClick={() => copy(detailedChunkEvent.event.original || '')} img='Copy'>Copy XML</Button>
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
        </Fragment>
      ) : (
        <Stack style={{ width: '100%', height: '100%' }} flex ai='center' jc='center'>
          <Loading variant='default' size='lg' style={{ width: '100%', height: '100%' }} className={s.loading} label='' />
        </Stack>
      )}
    </Dialog>
  )
};
