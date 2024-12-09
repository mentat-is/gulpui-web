import SyntaxHighlighter from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from '@/context/Application.context';
import { λEvent, DetailedChunkEvent, RawDetailedChunkEvent } from '@/dto/ChunkEvent.dto';
import { ResponseBase } from '@/dto/ResponseBase.dto';
import { Dialog } from '@/ui/Dialog';
import { SymmetricSvg } from '@/ui/SymmetricSvg';
import { Fragment, useCallback, useEffect, useState } from 'react';
import s from './styles/DisplayEventDialog.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { convertXML } from 'simple-xml-to-json';
import { cn, copy } from '@/ui/utils';
import { Button } from '@/ui/Button';
import { CreateNoteBanner } from '@/banners/CreateNoteBanner';
import { File, Note, Plugin } from '@/class/Info';
import { Notes } from './components/Notes';
import { λNote } from '@/dto/Note.dto';
import { CreateLinkBanner } from '@/banners/CreateLinkBanner';
import { Icon } from '@impactium/icons';
import { Stack } from "@impactium/components";
import { ChadNumber, Skeleton } from '@/ui/Skeleton';
import { Hardcode } from '@/class/Engine.dto';

interface DisplayEventDialogProps {
  event: λEvent;
}

interface PodProps {
  λkey: string;
  value: UnitContent | UnitName | string;
}

interface PropertyProps {
  value: string;
}

interface NodeProps {
  λkey: string
  value: UnitObject
}

type UnitObject = { [key: string]: string }
type UnitContent = { content: string }
type UnitName = UnitContent & { Name: string }

interface Unit {
  [key: string]: UnitObject | UnitContent
}

interface DetailedChunkEventData {
  [key: string]: {
    children: Unit[]
  }
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { api, Info, app, spawnBanner, destroyDialog } = useApplication();
  const [detailedChunkEvent, setDetailedChunkEvent] = useState<DetailedChunkEvent | null>(null);
  const [root, setRoot] = useState<DetailedChunkEventData[] | null>();
  const [notes, setNotes] = useState<λNote[]>(Note.findByEvent(app, event));
  const [rawJSON, setRawJSON] = useState<string>('');

  useEffect(() => {
    setNotes(Note.findByEvent(app, event));
  }, [event, app.target.notes]);

  useEffect(() => Info.setTimelineTarget(event), [event])

  useEffect(() => {
    if (detailedChunkEvent?.event?.original) {
      try {
        setRoot(convertXML(detailedChunkEvent.event.original)?.Event?.children);  
      } catch (_) { }
      return;
    };
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

  const iconsMap: Record<string, Icon.Name> = {
    Provider: 'Link',
    Computer: 'Server',
    TimeCreated: 'AlarmClockPlus',
    Correlation: 'Blend',
    Execution: 'FunctionSquare'
  };

  const SmartView = useCallback(() => {
    if (!root) return <h3>Failed to parse XML. See raw XML data</h3>;

    const Node = ({ λkey, value }: NodeProps) => {
      return (
        <div className={s.node} key={λkey + value}>
          <h6>
            {iconsMap[λkey] && <Icon name={iconsMap[λkey]} />}
            {λkey}
          </h6>
          {Object.keys(value || {}).map(_key => <Pod λkey={_key} value={value[_key]} />)}
        </div>
      );
    };

    const Property = ({ value }: PropertyProps) => <p onClick={() => copy(value)} className={s.property}>{value}</p>;

    const Pod = ({ λkey, value }: PodProps) => {
      const _key = λkey === 'Data' ? (value as UnitName).Name : λkey
      const _value = _key === 'PrivilegeList' && typeof value !== 'string' ? value.content.split('\n').map(f => <Property value={f} />) : <Property value={typeof value === 'string' ? value : value.content} />;

      return (
        <div className={cn(s.pod, _key === 'PrivilegeList' && s.wrap)} key={λkey + value + _key + _value}>
          <Stack ai='center'>
            {iconsMap[λkey] && <Icon name={iconsMap[λkey]} />}
            {_key}
          </Stack>
          {_value}
        </div>
      )
    }

    return (
      <div className={s.root}>
        {root.map((cluster, i) => (
          <div className={s.cluster} key={i}>
            {Object.keys(cluster)?.map(clusterKey =>
              cluster[clusterKey].children?.map(section =>
                Object.keys(section)?.map(sectionKey => (
                  'content' in section[sectionKey]
                    ? <Pod λkey={sectionKey} key={sectionKey} value={section[sectionKey] as UnitContent} />
                    : Object.keys(section[sectionKey]).length
                      ? <Node λkey={sectionKey} key={sectionKey} value={section[sectionKey]} />
                      : null
                  )
                )
              )
            )}
          </div>
        ))}
      </div>
    );
  }, [root]);

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
      {detailedChunkEvent ? (
        <Fragment>
          <div className={s.buttons_group}>
            <Button className={s.createNote} onClick={spawnNoteBanner} img='StickyNote'>New note</Button>
            <Button className={s.createNote} onClick={spawnLinkBanner} img='Link'>New link / Connect link</Button>
          </div>
          <Tabs defaultValue='json' className={s.tabs}>
            <TabsList className={s.tabs_list}>
              <TabsTrigger value='smart'>Smart view</TabsTrigger>
              <TabsTrigger value='raw'>XML</TabsTrigger>
              <TabsTrigger value='json'>JSON</TabsTrigger>
            </TabsList>
            <TabsContent className={s.tabs_content} value='smart'>
              <SmartView />
            </TabsContent>
            <TabsContent className={s.tabs_content} value='raw'> 
              <SyntaxHighlighter customStyle={{ borderRadius: 6 }} language='XML' style={darcula}>
                {detailedChunkEvent.event.original}
              </SyntaxHighlighter>
            </TabsContent>
            <TabsContent className={s.tabs_content} value='json'>
              <Button style={{ marginBottom: '12px', width: '100%' }} onClick={() => copy(rawJSON)} img='Copy'>Copy JSON</Button>
              <SyntaxHighlighter customStyle={{ borderRadius: 6 }} language='JSON' style={darcula}>
                {rawJSON}
              </SyntaxHighlighter>
            </TabsContent>
          </Tabs>
          <Notes notes={notes} />
        </Fragment>
      ) : (
        <Stack flex dir='row' style={{ paddingRight: 8 }}>
          <Stack flex dir='column' gap={16}>
            <Stack ai='flex-start' jc='flex-end' gap={12} dir='row' flex={0}>
              <Skeleton width={120} />
              <Skeleton width={200} />
            </Stack>
            <Stack dir='column' gap={12}>
              <Stack ai='flex-start' gap={12} dir='row' flex={0}>
                <Skeleton width={220} />
              </Stack>
              <Skeleton />
              <Skeleton height='100%' width='full' />
            </Stack>
          </Stack>
          <Skeleton style={{ position: 'absolute', right: 8 }} width={10} height={'calc(100% - 96px)  ' as ChadNumber} />
        </Stack>
      )}
      <Stack>
        <Button onClick={() => Info.setTimelineTarget(1)}>Prev event</Button>
        <hr style={{ flex: 1 }} />
        <Button onClick={() => Info.setTimelineTarget(-1)}>Next event</Button>
      </Stack>
    </Dialog>
  )
};
