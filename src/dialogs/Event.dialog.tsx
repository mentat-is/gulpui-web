import { Application } from '@/context/Application.context'
import { Dialog } from '@/ui/Dialog'
import { Fragment, useEffect, useMemo, useState, useCallback } from 'react'
import s from './styles/DisplayEventDialog.module.css'
import { copy, download, generateUUID, Refractor } from '@/ui/utils'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Skeleton } from '@/ui/Skeleton'
import { MinMaxBase } from '@/class/Info'
import { Navigation } from './components/navigation'
import { Enrichment } from '@/banners/Enrichment.banner'
import { LinkFunctionality, NoteFunctionality } from '@/banners/Collab.functionality'
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
import { cn } from '@impactium/utils'
import { CacheKey } from '@/class/Engine.dto'
import { RenderEngine } from '@/class/RenderEngine'
import { Doc } from '@/entities/Doc'
import { Source } from '@/entities/Source'
import { Filter } from '@/entities/Filter'
import { Note } from '@/entities/Note'
import { Color } from '@/entities/Color'
import { Extension } from '@/context/Extension.context'
import { Link } from '@/entities/Link'

interface DisplayEventDialogProps {
  event: Doc.Type
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  if (!event) {
    return null;
  }
  const { Info, app, spawnBanner } = Application.use()
  const [json, setJSON] = useState<Record<string, string> | null>(null)
  const [selection, setSelection] = useState<string>('');
  const [notes, setNotes] = useState<Note.Type[]>(Doc.Entity.notes(app, event));
  const [links, setLinks] = useState<Link.Type[]>(Doc.Entity.links(app, event));
  const file = useMemo(() => Source.Entity.id(app, event['gulp.source_id']), [app.target.files, event]);

  useEffect(() => {
    setLinks(Doc.Entity.links(app, event));
    setNotes(Doc.Entity.notes(app, event));
  }, [app.target.links, app.target.notes, event]);

  useEffect(() => {
    if (!file) {
      Info.setTimelineTarget(null);
      return;
    }
    Info.setTimelineTarget(event);
  }, [event, file]);

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
  }, [event, cutEventOriginal]);

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

    const file = Source.Entity.id(app, event['gulp.source_id']);

    const { filters } = Info.getQuery(file);

    const object = toKeyValue(selection);

    if (Object.keys(object).length === 0) {
      toast(`Invalid selection. Unnable to add new filters`);
      return;
    }

    const newFilters: Filter.Type[] = Object.keys(object).map(k => ({
      id: generateUUID<Filter.Id>(),
      type: (object[k].includes('*') || k.includes('*')) ? 'wildcard' : 'range',
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

    spawnBanner(<FilterFileBanner sources={[file]} />);
  }, [selection, Info, event, toKeyValue, spawnBanner, file]);

  const handleDownloadLogFile = useCallback(() => {
    const storageId = json?.['gulp.storage_id'] || event['gulp.storage_id'];
    if (storageId && typeof storageId === 'string' && storageId.trim() !== '') {
      Info.download_storage_file(storageId, event['gulp.operation_id']);
    }
  }, [event, Info, json]);

  const highlights = useMemo(() => {
    if (!json) {
      return null;
    }

    const storageId = json['gulp.storage_id'] || event['gulp.storage_id'];

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
              <Markdown className={s.highlighter} value={`\`\`\`json\n${JSON.stringify(json, null, 2)}`} />
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
            } as Note.Type} />)}
            icon='StickyNote'
          >
            Create new note
          </ContextMenuItem>
          <ContextMenuItem disabled={!selection} icon='GitPullRequestCreate'>Create new link</ContextMenuItem>
          <ContextMenuItem onClick={() => copy(JSON.stringify(json, null, 2))} icon='Copy'>Copy</ContextMenuItem>
          <ContextMenuItem onClick={applySelectionAsFileFilter} icon='Filter'>New filter</ContextMenuItem>
          {storageId && typeof storageId === 'string' && storageId.trim() !== '' && (
            <ContextMenuItem onClick={handleDownloadLogFile} icon='Download'>
              Download log file
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    )
  }, [json, selection, spawnBanner, event, applySelectionAsFileFilter, handleDownloadLogFile]);

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

  const [isFlagged, setIsFlagged] = useState(false);

  const updateFlaggedState = useCallback(() => {
    setIsFlagged(Doc.Entity.flag.isFlagged(event._id, event['gulp.operation_id']));
  }, [setIsFlagged, event._id, event]);

  useEffect(() => {
    updateFlaggedState();
  }, [event]);

  const handleFocusTimeline = useCallback(() => {
    // @ts-ignore
    return window.focusCanvasOnEvent(event.timestamp, false, event.file_id)
  }, [event]);

  return (
    <Dialog>
      <Navigation event={event} />
      {json ? (
        <Fragment>
          <Stack dir='column' className={s.group} gap={12} ai='stretch'>
            <Stack gap={12} flex>
              <Button
                onClick={handleCreateNote}
                variant="secondary"
                icon="StickyNote"
              >
                New note
              </Button>
              <Button
                onClick={handleCreateLink}
                variant="secondary"
                icon="GitPullRequestCreate"
              >
                Create link
              </Button>
            </Stack>
            <Stack gap={12} flex>
              <Button
                onClick={handleEnrich}
                variant="glass"
                icon="PrismColor"
              >
                Enrich
              </Button>
              <Button
                onClick={handleConnectLink}
                variant="secondary"
                icon="GitPullRequestCreateArrow"
              >
                Connect link
              </Button>
            </Stack>
            <Extension.Component name='Story.popover.tsx' props={{ doc: event }} />
          </Stack>
          <Collab.List notes={notes} links={links} />
          {highlights}
          <Stack className={s.actionButtons} gap={12}>
            <Button variant="secondary" onClick={handleCopyJson} icon="Copy">Copy JSON</Button>
            <Button variant="secondary" onClick={handleDownloadJson} icon="Download" title='Download JSON'>Download JSON</Button>
            <Button onClick={handleFocusTimeline} variant="secondary" icon="Crosshair" style={{ flex: 0 }} title="Focus timeline on this event" />
            <Button
              onClick={() => setIsFlagged(Doc.Entity.flag.toggle(event._id, event['gulp.operation_id']))}
              variant={isFlagged ? 'tertiary' : 'glass'}
              icon={isFlagged ? 'FlagOff' : 'Flag'}
              disabled={Doc.Entity.flag.isLimitReached(Doc.Entity.flag.getList(event['gulp.operation_id'])) && !isFlagged}
              style={{ flex: 0 }}
              title='Flag event'
            />
          </Stack>
        </Fragment>
      ) : (
        <Stack style={{ width: '100%', height: '100%' }} flex ai="center" jc="center" dir="column" gap={12}>
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

export namespace EventIndicator {
  export interface Props extends Button.Props {
    event: Doc.Type;
  }
}


export function EventIndicator({ event, className, style, ...props }: EventIndicator.Props) {
  const { app } = Application.use();
  const [notes, setNotes] = useState<Note.Type[]>(Doc.Entity.notes(app, event));
  const [links, setLinks] = useState<Link.Type[]>(Doc.Entity.links(app, event));

  if (!event) return null;

  const file = Source.Entity.id(app, event['gulp.source_id']);
  if (!file) return null;

  const background = useMemo(() => {
    const range = RenderEngine[CacheKey].range.get(event['gulp.source_id']) ?? MinMaxBase;
    const code = Refractor.any.toNumber(event[file.settings.field]);
    return Color.Entity.gradient(file.settings.render_color_palette, code, range);
  }, [event, app.target.files]);

  useEffect(() => {
    setNotes(Doc.Entity.notes(app, event));
    setLinks(Doc.Entity.links(app, event));
  }, [app.target.notes, app.target.links, event]);

  const NoteIcon = notes.length > 0 ? (
    <Stack ai='center' jc='center' className={cn(s.marker, s.collab)} pos='absolute'>
      <Icon size={8} name='StickyNote' />
    </Stack>
  ) : null;

  const LinkIcon = links.length > 0 ? (
    <Stack ai='center' jc='center' className={cn(s.marker, s.collab, s.linkMarker)} pos='absolute'>
      <Icon size={8} name='Link' />
    </Stack>
  ) : null;

  const Flag = () => {
    const flagged = Doc.Entity.flag.isFlagged(event._id, event['gulp.operation_id']);
    if (!flagged) return null;
    return (
      <Stack ai='center' jc='center' className={cn(s.marker, s.flagged)} pos='absolute'>
        <Icon size={8} name='Flag' />
      </Stack>
    );
  };

  return (
    <Button
      shape='icon'
      className={cn(className, s.indicator)}
      rounded
      style={{ ...style, background }}
      {...props}
    >
      <hr />
      <p>{String(event['gulp.event_code']).slice(0, 6)}</p>
      <Flag />
      {NoteIcon}
      {LinkIcon}
    </Button>
  );
}
