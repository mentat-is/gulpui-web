import SyntaxHighlighter from 'react-syntax-highlighter';
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, λExtendedEvent } from '@/dto/ChunkEvent.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useEffect, useMemo, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { copy, download } from '@/ui/utils';
import { Button, Skeleton, Stack } from '@impactium/components';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { Event, File } from '@/class/Info';
import { Navigation } from './components/navigation';
import { λNote } from '@/dto/Dataset';
import { Enrichment } from '@/banners/Enrichment.banner';
import { LinkComponents } from '@/banners/CreateLinkBanner';
import { Maps } from '@/banners/Maps.banner';

interface DisplayEventDialogProps {
  event: λEvent;
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner } = useApplication();
  const [detailedChunkEvent, setDetailedChunkEvent] = useState<λExtendedEvent | null>(null);
  const [notes, setNotes] = useState<λNote[]>([]);
  const [rawJSON, setRawJSON] = useState<string>('');

  useEffect(() => {
    setNotes(Event.notes(app, event));
  }, [event, app.target.notes]);

  useEffect(() => {
    const notes = Event.notes(app, event);
    setNotes(notes);
    Info.setTimelineTarget(event); 
  }, [event]);

  useEffect(() => {
    if (!detailedChunkEvent)
      reloadDetailedChunkEvent();
  }, [detailedChunkEvent]);

  useEffect(() => {
    setDetailedChunkEvent(null);
  }, [event]);

  const reloadDetailedChunkEvent = async () => {
    const detailed = await Info.query_single_id(event.id, event.operation_id);

    setRawJSON(JSON.stringify(detailed?.raw, null, 2));

    setDetailedChunkEvent(detailed?.normalized || null);
  };

  const defaultJSON = useMemo(() => {
    return rawJSON ? JSON.parse(rawJSON) : {};
  }, [rawJSON]);

  const Locations = useMemo(() => {
    const source = defaultJSON?.['source.ip'];
    const destination = defaultJSON?.['destination.ip'];

    if (!source && !destination) {
      return null;
    }
    
    return (
      <Stack style={{ flexWrap: 'wrap' }}>
        {source && <Button style={{ flex: 1 }} variant='glass' onClick={() => spawnBanner(<Maps.Banner lat={41.7593026} lng={12.6005981} ip={source} />)} img='Location'>Visualize source ip address {source} on map</Button>}
        {destination ? <Button style={{ flex: 1 }} variant='glass' onClick={() => spawnBanner(<Maps.Banner lat={81.7593026} lng={43.6005981} ip={destination} />)} img='Target'>See {source} location on map</Button> : (source ? <Button img='Robot' variant='disabled' style={{ flex: 1 }} >There is no destination address</Button> : null)}
      </Stack>
    )
  }, [defaultJSON]);

  const index = useMemo(() => {
    const events = File.events(app, event.file_id);
    const index = events.findIndex(e => e.id === event.id);
    return events.length - index
  }, [event]);

  const highlights = useMemo(() => {
    return (
      <SyntaxHighlighter className={s.highlighter} customStyle={{ maxWidth: '100%', borderRadius: 6 }} language='JSON' style={highlight.vs2015}>
        {rawJSON}
      </SyntaxHighlighter>
    )
  }, [rawJSON]);

  return (
    <Dialog icon={<SymmetricSvg text={event.id} />} title={`Event №${index}`} description={File.id(app, event.file_id).name}>
      <Navigation event={event} />
      {detailedChunkEvent ? (
        <Fragment>
          <Stack className={s.group}>
            <Stack dir='column' flex>
              <Button onClick={() => spawnBanner(<CreateNoteBanner event={event} />)} variant='secondary' img='StickyNote'>New note</Button>
              <Button onClick={() => spawnBanner(<LinkComponents.Create.Banner event={event} />)} variant='secondary' img='Link'>Create link</Button>
            </Stack>
            <Stack dir='column' flex>
              <Button onClick={() => spawnBanner(<Enrichment.Banner event={event} onEnrichment={(e: Record<string, string>) => setRawJSON(JSON.stringify(e, null, 2))} />)} variant='glass' img='PrismColor'>Enrich</Button>
              <Button onClick={() => spawnBanner(<LinkComponents.Connect.Banner event={event} />)} variant='secondary' img='Link'>Connect link</Button>
            </Stack>
          </Stack>
          {highlights}
          <Stack>
            <Button variant='secondary' style={{ width: '100%' }} onClick={() => copy(rawJSON)} img='Copy'>Copy JSON</Button>
            <Button variant='secondary' style={{ width: '100%' }} onClick={() => download(rawJSON, 'application/json', `${event.id}_from_${event.file_id}.json`)} img='Download'>Download JSON</Button>
            {/* @ts-ignore */}
            <Button onClick={() => window.focusCanvasOnTimestamp(event.timestamp)} variant='secondary' img='Crosshair' title='Focus timeline on this event' />
          </Stack>
          {Locations}
        </Fragment>
      ) : (
        <Stack style={{ width: '100%', height: '100%' }} flex ai='center' jc='center' dir='column' gap={12}>
          <Stack style={{ width: '100%' }}>
            <Skeleton width='full' />
            <Skeleton width='full' />
          </Stack>
          <Stack style={{ width: '100%' }}>
            <Skeleton width='full' />
            <Skeleton width='full' />
          </Stack>
          <Skeleton width='full' height='full' />
          <Stack style={{ width: '100%' }}>
            <Skeleton width='full' />
            <Skeleton width='full' />
            <Skeleton width='full' />
          </Stack>
        </Stack>
      )}
    </Dialog>
  )
};
