import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Dialog } from '@/ui/Dialog'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { Fragment, useEffect, useMemo, useState } from 'react'
import s from './styles/DisplayEventDialog.module.css'
import { copy, download, generateUUID } from '@/ui/utils'
import { Button, Skeleton, Stack } from '@impactium/components'
import { Event, File, Filter, λFilter } from '@/class/Info'
import { Navigation } from './components/navigation'
import { Enrichment } from '@/banners/Enrichment.banner'
import { LinkComponents } from '@/banners/CreateLinkBanner'
import { LinkFunctionality, NoteFunctionality } from '@/banners/Collab.functionality'
import { λLink, λNote } from '@/dto/Dataset'
import { Collab } from '@/components/CollabList'
import { Markdown } from '@/ui/Markdown'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/ui/ContextMenu'
import { FilterFileBanner } from '@/banners/FilterFile.banner'
import { toast } from 'sonner'


import { JsonView, allExpanded, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface DisplayEventDialogProps {
  event: λEvent
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner } = useApplication()
  const [json, setJSON] = useState<object>({})
  const [rawJSON, setRawJSON] = useState<string>('')
  const [notes, setNotes] = useState<λNote[]>(Event.notes(app, event));
  const [links, setLinks] = useState<λLink[]>(Event.links(app, event));

  useEffect(() => {
    Info.setTimelineTarget(event)
    setNotes(Event.notes(app, event))
    setLinks(Event.links(app, event))
  }, [event, app.target.notes, app.target.links])

  useEffect(() => {
    if (!rawJSON) loadEvent()
  }, [rawJSON])

  useEffect(() => {
    setRawJSON('')
  }, [event])

  const loadEvent = async () => {
    const detailed = await Info.query_single_id(event.id, event.operation_id)


    const entries = Object.entries(detailed).filter(([k]) => k !== 'event.original')

    const json = {
      ...Object.fromEntries(entries.slice(0, 1)),
      ...Object.fromEntries(entries.slice(1)),
      // @ts-ignore
      'event.original': detailed['event.original'],
    }
    setJSON(json)

    setRawJSON(`\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``);
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
    type NestedObject = { [key: string]: any };

    const unflattenObject = (
      obj: { [key: string]: any },
      delimiter: string = '.'
    ): NestedObject =>
      Object.keys(obj).reduce((res: NestedObject, k: string) => {
        k.split(delimiter).reduce(
          (acc: any, e: string, i: number, keys: string[]) =>
            acc[e] ||
            (acc[e] = isNaN(Number(keys[i + 1]))
              ? keys.length - 1 === i
                ? obj[k]
                : {}
              : []),
          res
        );
        return res;
      }, {});

    const newStyles = {
      ...darkStyles,
      stringValue: "jsonview-string",
      numberValue: "jsonview-numeric",
      booleanValue: "jsonview-bool",
      nullValue: "jsonview-null",
      container: "jsonview-container",
      label: "jsonview-label",
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <JsonView data={unflattenObject(json)} clickToExpandNode={true} shouldExpandNode={allExpanded} style={newStyles} />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!selection} onClick={() => spawnBanner(<NoteFunctionality.Create.Banner event={event} note={{
            text: selection
          } as λNote} />)} img='StickyNote'>Create new note</ContextMenuItem>
          <ContextMenuItem disabled={!selection} img='GitPullRequestCreate'>Create new link</ContextMenuItem>
          <ContextMenuItem onClick={applySelectionAsFileFilter} img='Filter'>New filter</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

    )
  }, [rawJSON, selection]);

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
      {rawJSON ? (
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
                      onEnrichment={(e: Record<string, string>) =>
                        setRawJSON(JSON.stringify(e, null, 2))
                      }
                    />,
                  )
                }
                variant="glass"
                img="PrismColor"
              >
                Enrich
              </Button>
              <Button onClick={() => spawnBanner(<LinkComponents.Connect.Banner event={event} />)} variant="secondary" img="GitPullRequestCreateArrow">Connect link</Button>
            </Stack>
          </Stack>
          {collabList}
          {highlights}
          <Stack className={s.actionButtons}  >
            <Button variant="secondary" onClick={() => copy(rawJSON)} img="Copy">Copy JSON</Button>
            <Button variant="secondary" onClick={() =>
              download(
                rawJSON,
                'application/json',
                `${event.id}_from_${event.file_id}.json`,
              )
            }
              img="Download"
            >Download JSON</Button>
            <Button
              onClick={() => {
                // @ts-ignore
                return window.focusCanvasOnTimestamp(event.timestamp)
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
