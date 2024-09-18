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
import { cn, copy } from "@/ui/utils";
import { Button } from "@/ui/Button";
import { CreateNoteBanner } from "@/banners/CreateNoteBanner";
import { File, Note, Plugin } from '@/class/Info';
import { Separator } from "@/ui/Separator";
import { Notes } from "./components/Notes";
import { λNote } from "@/dto/Note.dto";
import { CreateLinkBanner } from "@/banners/CreateLinkBanner";

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
  const [root, setRoot] = useState<DetailedChunkEventData[]>();
  const [notes, setNotes] = useState<λNote[]>(Note.findByEvent(app, event));

  useEffect(() => {
    setNotes(Note.findByEvent(app, event));
  }, [event, app.target.notes]);

  useEffect(() => {
    if (detailedChunkEvent) {
      setRoot(convertXML(detailedChunkEvent.event.original).Event.children)
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
          timestamp: res.data["@timestamp"],
          file: res.data["gulp.source.file"],
          context: res.data["gulp.context"],
          _uuid: event._uuid
        })
      }
    });
  }

  const iconsMap: Record<string, string> = {
    Provider: 'specific/path.svg',
    Level: 'specific/layer.svg',
    Version: '',
    EventId: 'specific/pod.svg',
    EventID: 'specific/pod.svg',
    Task: 'specific/code.svg',
    Opcode: '',
    Keywords: 'specific/key.svg',
    Channel: '',
    Computer: 'device/desktop-tower.svg',
    TimeCreated: 'timer/add.svg'
  };

  const SmartView = useCallback(() => {
    if (!root) return null;

    const Node = ({ λkey, value }: NodeProps) => {
      return (
        <div className={s.node} key={λkey + value}>
          <h6>
            {iconsMap[λkey] && <img src={`https://cdn.impactium.fun/ui/${iconsMap[λkey]}`} />}
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
          {iconsMap[λkey] && <img src={`https://cdn.impactium.fun/ui/${iconsMap[λkey]}`} />}
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
      context={Plugin.find(app, File.find(app, event._uuid)!._uuid)!.context}
      filename={event.file}
      events={event} />);
    destroyDialog();
  }

  const spawnLinkBanner = () => {
    const file = File.find(app, event._uuid);

    if (!file) return;

    spawnBanner(<CreateLinkBanner
      context={Plugin.find(app, file._uuid)!.context}
      file={file}
      events={event} />);
    destroyDialog();
  }

  return (
    <Dialog callback={() => Info.setTimelineTarget(destroyDialog() as unknown as null)} loading={!detailedChunkEvent} icon={<SymmetricSvg loading={!detailedChunkEvent} text={event._id} />} title={`Event: ${event._id}`} description={`From ${event.context} with code ${event.event.code}`}>
      {detailedChunkEvent && (
        <>
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
          <div className={s.buttons_group}>
            <Button className={s.createNote} onClick={spawnNoteBanner} img='https://cdn.impactium.fun/ui/specific/bookmark.svg'>New note</Button>
            <Button className={s.createNote} onClick={spawnLinkBanner} img='https://cdn.impactium.fun/ui/specific/path.svg'>New link / Connect link</Button>
          </div>
          <Tabs defaultValue="smart" className={s.tabs}>
            <TabsList className={s.tabs_list}>
              <p className={s.hint}>Click on the block to copy the value</p>
              <TabsTrigger value="smart">Smart View</TabsTrigger>
              <TabsTrigger value="raw">Raw XML</TabsTrigger>
            </TabsList>
            <TabsContent className={s.tabs_content} value="smart">
              <SmartView />
            </TabsContent>
            <TabsContent className={s.tabs_content} value="raw">
              <XMLTree className={s.xml} xml={detailedChunkEvent.event.original} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </Dialog>
  )
};
