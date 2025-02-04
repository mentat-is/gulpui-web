import SyntaxHighlighter from 'react-syntax-highlighter';
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, λExtendedEvent } from '@/dto/ChunkEvent.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useEffect, useMemo, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { copy } from '@/ui/utils';
import { Button, Stack } from '@impactium/components';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { Event, Note } from '@/class/Info';
import { Loading } from '@impactium/components';
import { Navigation } from './components/navigation';
import { λNote } from '@/dto/Dataset';
import { Enrichment } from '@/banners/Enrichment.banner';
import { LinkComponents } from '@/banners/CreateLinkBanner';
import { Maps } from '@/banners/Maps.banner';


interface DisplayEventDialogProps {
  event: λEvent;
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner, destroyDialog } = useApplication();
  const [detailedChunkEvent, setDetailedChunkEvent] = useState<λExtendedEvent | null>(null);
  const [notes, setNotes] = useState<λNote[]>(Event.notes(app, event));
  const [rawJSON, setRawJSON] = useState<string>('');

  useEffect(() => {
    setNotes(Event.notes(app, event));
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

  const defaultJSON = useMemo(() => {
    return rawJSON ? JSON.parse(rawJSON) : {};
  }, [rawJSON]);

  const Locations = () => {
    const source = defaultJSON?.['source.ip'];
    const destination = defaultJSON?.['destination.ip'];
    return (
      <Stack style={{ flexWrap: 'wrap' }}>
        {source && <Button style={{ flex: 1 }} variant='glass' onClick={() => spawnBanner(<Maps.Banner lat={41.7593026} lng={12.6005981} ip={source} />)} img='Location'>Visualize source ip address {source} on map</Button>}
        {destination ? <Button style={{ flex: 1 }} variant='glass' onClick={() => spawnBanner(<Maps.Banner lat={81.7593026} lng={43.6005981} ip={destination} />)} img='Target'>See {source} location on map</Button> : (source ? <Button img='Robot' variant='disabled' style={{ flex: 1 }} >There is no destination address</Button> : null)}
      </Stack>
    )
  }

  return (
    <Dialog icon={<SymmetricSvg text={event.id} />} title={`Event: ${event.id}`} description={`From ${event.context_id} with code ${event.code}`}>
      <Navigation event={event} />
      {detailedChunkEvent ? (
        <Fragment>
          <Stack className={s.group}>
            <Stack dir='column' flex>
            <Button onClick={() => spawnBanner(<CreateNoteBanner event={event} />)} variant='secondary' img='StickyNote'>New note</Button>
            <Button onClick={() => spawnBanner(<LinkComponents.Create.Banner event={event} />)} variant='secondary' img='Link'>Create link</Button>
            </Stack>
            <Stack dir='column' flex>
              <Button onClick={() => spawnBanner(<Enrichment.Banner event={event} />)} variant='glass' img='PrismColor'>Enrich</Button>
              <Button onClick={() => spawnBanner(<LinkComponents.Connect.Banner event={event} />)} variant='secondary' img='Link'>Connect link</Button>
            </Stack>
          </Stack>
          <SyntaxHighlighter className={s.highlighter} customStyle={{ maxWidth: '100%', borderRadius: 6 }} language='JSON' style={highlight.androidstudio}>
            {rawJSON}
          </SyntaxHighlighter>
          <Button variant='ghost' style={{ width: '100%' }} onClick={() => copy(rawJSON)} img='Copy'>Copy JSON</Button>
          <Locations />
        </Fragment>
      ) : (
        <Stack style={{ width: '100%', height: '100%' }} flex ai='center' jc='center'>
          <Loading variant='default' size='lg' style={{ width: '100%', height: '100%' }} className={s.loading} label='' />
        </Stack>
      )}
    </Dialog>
  )
};
