import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Dialog } from '@/ui/Dialog'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { Fragment, useEffect, useMemo, useState, useRef, useCallback, memo } from 'react'
import s from './styles/DisplayEventDialog.module.css'
import { copy, download, generateUUID } from '@/ui/utils'
import { Button, Skeleton, Stack } from '@impactium/components'
import { Event, File, λFilter } from '@/class/Info'
import { Navigation } from './components/navigation'
import { Enrichment } from '@/banners/Enrichment.banner'
import { LinkFunctionality, NoteFunctionality } from '@/banners/Collab.functionality'
import { λNote } from '@/dto/Dataset'
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
  if (!event) {
    return null;
  }
  const { Info, app, spawnBanner } = useApplication()
  const [json, setJSON] = useState<Record<string, string> | null>(null)
  const [selection, setSelection] = useState<string>('');
  const notes = useMemo(() => Event.notes(app, event), [app.target.notes, event]);
  const links = useMemo(() => Event.links(app, event), [app.target.links, event]);
  const file = useMemo(() => File.id(app, event['gulp.source_id']), [app.target.files, event]);

  useEffect(() => {
    Info.setTimelineTarget(event)
  }, [event])

  const cutEventOriginal = useCallback((obj: Record<string, any>): Record<string, string> => {
    const entries = Object.entries(obj).filter(([k]) => k !== 'event.original')

    const json = {
      ...Object.fromEntries(entries.slice(0, 1)),
      ...Object.fromEntries(entries.slice(1)),
      // @ts-ignore
      'event.original': obj['event.original'],
    }

    return json
  }, []);

  const loadEvent = useCallback(async () => {
    const detailed = await Info.query_single_id(event._id, event['gulp.operation_id'])
    const parsedEvent = cutEventOriginal(detailed);
    setJSON(parsedEvent);
  }, [Info, event._id, event['gulp.operation_id'], cutEventOriginal]);

  useEffect(() => {
    if (!json || json._id !== event._id) {
      loadEvent();
    }
  }, [event._id, loadEvent, json]);

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

  const toKeyValue = useCallback((raw: string): Record<string, string> => {
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
  }, []);

  const applySelectionAsFileFilter = useCallback(() => {
    if (!selection) {
      return;
    }

    const file = File.id(app, event['gulp.source_id']);

    const { filters } = Info.getQuery(file);

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

    Info.setQuery(file, {
      ...Info.getQuery(file),
      filters: [...filters, ...newFilters]
    });

    toast(`Has been added ${newFilters.length} new filters`)

    spawnBanner(<FilterFileBanner files={[file]} />);
  }, [selection, Info, event, toKeyValue, spawnBanner, file]);

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
              <Table values={Object.entries(json)}></Table>
            </TabsContent>
          </ContextMenuTrigger>
        </Tabs>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={!selection}
            onClick={() => spawnBanner(<NoteFunctionality.Create.Banner event={event} note={{
              text: selection
            } as λNote} />)}
            img='StickyNote'
          >
            Create new note
          </ContextMenuItem>
          <ContextMenuItem disabled={!selection} img='GitPullRequestCreate'>Create new link</ContextMenuItem>
          <ContextMenuItem onClick={applySelectionAsFileFilter} img='Filter'>New filter</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }, [json, selection, spawnBanner, event, applySelectionAsFileFilter]);

  const handleCreateNote = useCallback(() => {
    spawnBanner(<NoteFunctionality.Create.Banner event={event} />)
  }, [spawnBanner, event]);

  const handleCreateLink = useCallback(() => {
    spawnBanner(<LinkFunctionality.Create.Banner event={event} />)
  }, [spawnBanner, event]);

  const handleEnrich = useCallback(() => {
    spawnBanner(
      <Enrichment.Banner
        event={event}
        onEnrichment={e => setJSON(e as unknown as typeof json)}
      />,
    )
  }, [spawnBanner, event, json]);

  const handleConnectLink = useCallback(() => {
    spawnBanner(<LinkFunctionality.Connect.Banner event={event} />)
  }, [spawnBanner, event]);

  const handleCopyJson = useCallback(() => {
    if (json) {
      copy(JSON.stringify(json, null, 2))
    }
  }, [json]);

  const handleDownloadJson = useCallback(() => {
    if (json) {
      download(
        JSON.stringify(json, null, 2),
        'application/json',
        `${event._id}_from_${event['gulp.source_id']}.json`,
      )
    }
  }, [json, event._id, event]);

  const handleFocusTimeline = useCallback(() => {
    // @ts-ignore
    return window.focusCanvasOnEvent(event.timestamp, false, event.file_id)
  }, [event]);

  return (
    <Dialog
      icon={<SymmetricSvg text={event._id} />}
      title='Event'
      description={`From ${file.name}`}
    >
      <Navigation event={event} />
      {json ? (
        <Fragment>
          <Stack className={s.group}>
            <Stack dir="column" flex>
              <Button
                onClick={handleCreateNote}
                variant="secondary"
                img="StickyNote"
              >
                New note
              </Button>
              <Button
                onClick={handleCreateLink}
                variant="secondary"
                img="GitPullRequestCreate"
              >
                Create link
              </Button>
            </Stack>
            <Stack dir="column" flex>
              <Button
                onClick={handleEnrich}
                variant="glass"
                img="PrismColor"
              >
                Enrich
              </Button>
              <Button
                onClick={handleConnectLink}
                variant="secondary"
                img="GitPullRequestCreateArrow"
              >
                Connect link
              </Button>
            </Stack>
          </Stack>
          <Collab.List notes={notes} links={links} />
          {highlights}
          <Stack className={s.actionButtons}>
            <Button variant="secondary" onClick={handleCopyJson} img="Copy">Copy JSON</Button>
            <Button variant="secondary" onClick={handleDownloadJson} img="Download">
              Download JSON
            </Button>
            <Button
              onClick={handleFocusTimeline}
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
