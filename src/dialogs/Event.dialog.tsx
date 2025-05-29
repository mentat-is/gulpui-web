import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Dialog } from '@/ui/Dialog'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { Fragment, useEffect, useMemo, useState, useRef } from 'react'
import s from './styles/DisplayEventDialog.module.css'
import { copy, download, generateUUID } from '@/ui/utils'
import { Button, Skeleton, Stack } from '@impactium/components'
import { Event, File, Filter, λFilter } from '@/class/Info'
import { Navigation } from './components/navigation'
import { Enrichment } from '@/banners/Enrichment.banner'
import { LinkFunctionality, NoteFunctionality } from '@/banners/Collab.functionality'
import { λLink, λNote } from '@/dto/Dataset'
import { Collab } from '@/components/CollabList'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/ui/ContextMenu'
import { FilterFileBanner } from '@/banners/FilterFile.banner'
import { toast } from 'sonner'
import { JsonView, allExpanded, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { StyleProps } from 'react-json-view-lite/dist/DataRenderer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs'
import { Table } from '@/components/Table'
import { Markdown } from '@/ui/Markdown'
import { Icon } from '@impactium/icons'

interface DisplayEventDialogProps {
  event: λEvent
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner } = useApplication()
  const [json, setJSON] = useState<Record<string, string> | null>(null)
  const [notes, setNotes] = useState<λNote[]>(Event.notes(app, event));
  const [links, setLinks] = useState<λLink[]>(Event.links(app, event));

  useEffect(() => {
    Info.setTimelineTarget(event)
    setNotes(Event.notes(app, event))
    setLinks(Event.links(app, event))
  }, [event, app.target.notes, app.target.links])

  useEffect(() => {
    if (!json) {
      loadEvent();
      return
    }

    if (json._id !== event.id) {
      return setJSON(null);
    }

  }, [event.id, json]);

  const loadEvent = async () => {
    const detailed = await Info.query_single_id(event.id, event.operation_id)

    const parsedEvent = cutEventOriginal(detailed);

    setJSON(parsedEvent);
  }

  const cutEventOriginal = (obj: Record<string, any>): Record<string, string> => {
    const entries = Object.entries(obj).filter(([k]) => k !== 'event.original')

    const json = {
      ...Object.fromEntries(entries.slice(0, 1)),
      ...Object.fromEntries(entries.slice(1)),
      // @ts-ignore
      'event.original': obj['event.original'],
    }

    return json
  }

  const [selection, setSelection] = useState<string>('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection) {
        return;
      }

      setSelection(selection.toString().trim());
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  function toKeyValue(raw: string): Record<string, string> {
    const result: Record<string, string> = {}

    for (const line of raw.split("\n")) {
      const [rawKey, rawValue] = line.split(":")
      if (!rawKey) continue

      const key = rawKey.trim().replace(/^"+|"+$/g, "")
      const value = rawValue
        ?.trim()
        .replace(/^"+|"+$/g, "")
        .replace(/[,"]+$/, "")
        || "*"

      result[key] = value
    }

    return result
  }

  const applySelectionAsFileFilter = () => {
    if (!selection) {
      return;
    }

    const { filters } = Info.getQuery(event.file_id);

    const object = toKeyValue(selection);

    if (Object.keys(object).length === 0) {
      toast(`Invalid selection. Unnable to add new filters`);
      return;
    }

    const newFilters: λFilter[] = Object.keys(object).map(k => ({
      id: generateUUID<λFilter['id']>(),
      type: (object[k].includes('*') || k.includes('*')) ? 'regexp' : 'match',
      operator: 'must',
      field: k,
      value: object[k],
      enabled: true
    }));

    Info.setFilters(event.file_id, [...filters, ...newFilters]);

    toast(`Has been added ${newFilters.length} new filters`)

    spawnBanner(<FilterFileBanner file={File.id(app, event.file_id)} />);
  };

  const highlights = useMemo(() => {
    if (!json) {
      return null;
    }

    const unflattenObject = Object.keys(json).reduce((res, k) => {
      k.split('.').reduce(
        (acc: any, e, i, keys) => acc[e] || (acc[e] = isNaN(Number(keys[i + 1]))
          ? keys.length - 1 === i
            ? json[k]
            : {}
          : []),
        res
      );
      return res;
    }, {});

    const newStyles: StyleProps = {
      ...darkStyles,
      noQuotesForStringValues: true,
      childFieldsContainer: s.basic,
      stringValue: s.string,
      numberValue: s.numeric,
      booleanValue: s.bool,
      nullValue: s.null,
      container: s.container,
      label: s.label,
    }

    return (
      <ContextMenu>
        <Tabs defaultValue="raw" style={{ overflow: 'scroll' }} className={s.tabs_wrapper}>
          <TabsList className={s.triggers}>
            <TabsTrigger value="tree">
              <Icon name='GitFork' size={14} />
              Tree
            </TabsTrigger>
            <TabsTrigger value="raw">
              <Icon name='CodeBracket' size={14} />
              Raw
            </TabsTrigger>
            <TabsTrigger value="table">
              <Icon name='Table' size={14} />
              Table
            </TabsTrigger>
          </TabsList>
          <ContextMenuTrigger>
            <TabsContent value="tree" className={s.scrollable}>
              <JsonView data={unflattenObject} clickToExpandNode={true} shouldExpandNode={allExpanded} style={newStyles} />
            </TabsContent>
            <TabsContent value="raw">
              <Markdown className={s.highlighter} value={`\`\`\`json\n${JSON.stringify(json, null, 2)}\`\`\``} />
            </TabsContent>
            <TabsContent value="table">
              <Table values={[json]}></Table>
            </TabsContent>
          </ContextMenuTrigger>
        </Tabs>
        <ContextMenuContent>
          <ContextMenuItem disabled={!selection} onClick={() => spawnBanner(<NoteFunctionality.Create.Banner event={event} note={{
            text: selection
          } as λNote} />)} img='StickyNote'>Create new note</ContextMenuItem>
          <ContextMenuItem disabled={!selection} img='GitPullRequestCreate'>Create new link</ContextMenuItem>
          <ContextMenuItem onClick={applySelectionAsFileFilter} img='Filter'>New filter</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

    )
  }, [json, selection]);

  const collabList = useMemo(() => {
    return (
      <Collab.List notes={notes} links={links} />
    )
  }, [notes, links])

  return (
    <Dialog
      icon={<SymmetricSvg text={event.id} />}
      title='Event'
      description={`From ${File.id(app, event.file_id).name}`}
    >
      <Navigation event={event} />
      {json ? (
        <Fragment>
          <Stack className={s.group}>
            <Stack dir="column" flex>
              <Button
                onClick={() =>
                  spawnBanner(<NoteFunctionality.Create.Banner event={event} />)
                }
                variant="secondary"
                img="StickyNote"
              >
                New note
              </Button>
              <Button
                onClick={() =>
                  spawnBanner(<LinkFunctionality.Create.Banner event={event} />)
                }
                variant="secondary"
                img="GitPullRequestCreate"
              >
                Create link
              </Button>
            </Stack>
            <Stack dir="column" flex>
              <Button
                onClick={() =>
                  spawnBanner(
                    <Enrichment.Banner
                      event={event}
                      onEnrichment={e => setJSON(e as unknown as typeof json)}
                    />,
                  )
                }
                variant="glass"
                img="PrismColor"
              >
                Enrich
              </Button>
              <Button onClick={() => spawnBanner(<LinkFunctionality.Connect.Banner event={event} />)} variant="secondary" img="GitPullRequestCreateArrow">Connect link</Button>
            </Stack>
          </Stack>
          {collabList}
          {highlights}
          <Stack className={s.actionButtons}  >
            <Button variant="secondary" onClick={() => copy(JSON.stringify(json, null, 2))} img="Copy">Copy JSON</Button>
            <Button variant="secondary" onClick={() =>
              download(
                JSON.stringify(json, null, 2),
                'application/json',
                `${event.id}_from_${event.file_id}.json`,
              )
            }
              img="Download"
            >Download JSON</Button>
            <Button
              onClick={() => {
                // @ts-ignore
                return window.focusCanvasOnEvent(event.timestamp, false, event.file_id)
              }}
              variant="secondary"
              img="Crosshair"
              style={{ flex: 0 }}
              title="Focus timeline on this event"
            />
          </Stack>
        </Fragment>
      ) : (
        <Stack
          style={{ width: '100%', height: '100%' }}
          flex
          ai="center"
          jc="center"
          dir="column"
          gap={12}
        >
          <Stack style={{ width: '100%' }}>
            <Skeleton width="full" />
            <Skeleton width="full" />
          </Stack>
          <Stack style={{ width: '100%' }}>
            <Skeleton width="full" />
            <Skeleton width="full" />
          </Stack>
          <Skeleton width="full" height="full" />
          <Stack style={{ width: '100%' }}>
            <Skeleton width="full" />
            <Skeleton width="full" />
            <Skeleton width="full" />
          </Stack>
        </Stack>
      )}
    </Dialog>
  )
}