import SyntaxHighlighter from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useApplication } from "@/context/Application.context";
import { λEvent, DetailedChunkEvent, RawDetailedChunkEvent } from "@/dto/ChunkEvent.dto";
import { ResponseBase } from "@/dto/ResponseBase.dto";
import { Dialog } from "@/ui/Dialog";
import { SymmetricSvg } from "@/ui/SymmetricSvg";
import { useCallback, useEffect, useState } from "react";
import s from './styles/DisplayEventDialog.module.css';
import { XMLTree } from "@/ui/XMLTree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/Tabs";
import { convertXML } from 'simple-xml-to-json';
import { cn, copy, λIcon } from "@/ui/utils";
import { Button } from "@/ui/Button";
import { CreateNoteBanner } from "@/banners/CreateNoteBanner";
import { File, Note, Plugin, λ } from '@/class/Info';
import { Separator } from "@/ui/Separator";
import { Notes } from "./components/Notes";
import { λNote } from "@/dto/Note.dto";
import { CreateLinkBanner } from "@/banners/CreateLinkBanner";
import { Icon } from "@/ui/Icon";

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
    api<ResponseBase<RawDetailedChunkEvent>>('/query_single_event', {
      data: {
        gulp_id: event._id
      }
    }).then(res => {
      if (res.isSuccess()) {
        setRawJSON(JSON.stringify(res.data, null, 4));
        setDetailedChunkEvent({
          operation: res.data.operation,
          agent: {
            type: res.data["agent.type"],
            id: res.data["agent.id"]
          },
          event: {
            code: res.data["event.code"],
            duration: res.data["event.duration"],
            id: res.data["event.id"],
            hash: res.data["event.hash"],
            category: res.data["event.category"],
            original: res.data["event.original"]
          },
          level: res.data["log.level"],
          _id: res.data._id,
          operation_id: res.data.operation_id,
          timestamp: res.data["@timestamp"] as λ.Timestamp,
          file: res.data["gulp.source.file"],
          context: res.data["gulp.context"],
          _uuid: event._uuid
        })
      }
    });
  }

  const iconsMap: Record<string, λIcon> = {
    Provider: 'Waypoints',
    Level: 'Layers2',
    Version: 'GitBranch',
    EventId: 'Hexagon',
    EventID: 'Hexagon',
    Task: 'StickyNote',
    Opcode: 'Binary',
    Keywords: 'Key',
    Channel: 'RailSymbol',
    Computer: 'HardDrive',
    TimeCreated: 'AlarmClockPlus'
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
          {iconsMap[λkey] && <Icon name={iconsMap[λkey]} />}
          {_key}
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
    <Dialog callback={() => Info.setTimelineTarget(destroyDialog() as unknown as null)} loading={!detailedChunkEvent} icon={<SymmetricSvg loading={!detailedChunkEvent} text={event._id} />} title={`Event: ${event._id}`} description={`From ${event.context} with code ${event.event.code}`}>
      {detailedChunkEvent && (
        <>
          <div className={s.buttons_group}>
            <Button className={s.createNote} onClick={spawnNoteBanner} img='Bookmark'>New note</Button>
            <Button className={s.createNote} onClick={spawnLinkBanner} img='Waypoints'>New link / Connect link</Button>
          </div>
          <Tabs defaultValue='json' className={s.tabs}>
            <TabsList className={s.tabs_list}>
              <TabsTrigger value='smart'>Smart view</TabsTrigger>
              <TabsTrigger value='raw'>Raw</TabsTrigger>
              <TabsTrigger value='json'>JSON</TabsTrigger>
            </TabsList>
            <p className={s.hint}>Click on the block to copy the value</p>
            <TabsContent className={s.tabs_content} value='smart'>
              <SmartView />
            </TabsContent>
            <TabsContent className={s.tabs_content} value='raw'>
              <XMLTree className={s.xml} xml={detailedChunkEvent.event.original} />
            </TabsContent>
            <TabsContent className={s.tabs_content} value='json'>
              <Button style={{ marginBottom: '12px', width: '100%' }} onClick={() => copy(rawJSON)} img='Copy'>Copy JSON</Button>
              <SyntaxHighlighter language='JSON' style={darcula}>
                {rawJSON}
              </SyntaxHighlighter>
            </TabsContent>
          </Tabs>
          <Tabs defaultValue={notes.length ? 'notes' : 'layers'} className={s.tabs}>
            <TabsList className={s.tabs_list}>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>
            <TabsContent value="notes">
              <Notes notes={notes} />
            </TabsContent>
            <TabsContent value="layers">
              <div className={s.layers}>
                <div>{detailedChunkEvent.context}</div>
                <Separator />
                <div>{detailedChunkEvent.agent.type}</div>
                <Separator />
                <div>{detailedChunkEvent.file}</div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </Dialog>
  )
};
