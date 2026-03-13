import { Default, Selectable } from '@/dto/Dataset'
import { UUID } from 'crypto'
import { Context } from './Context'
import { Operation } from './Operation'
import { Doc } from './Doc'
import { Arrayed, GulpDataset, MinMax } from '@/class/Info'
import { App } from './App'
import { Parser } from './addon/Parser'
import { Note } from './Note'
import { User } from './User'
import { Glyph } from './Glyph'
import { Engine } from '@/class/Engine.dto'
import { generateUUID } from '@/ui/utils'
import { Request } from './Request'
import { Application } from '@/context/Application.context'
import { Button } from '@/ui/Button'
import { useMemo, useState, Fragment, ChangeEvent, useEffect } from 'react'
import { toast } from 'sonner'
import { Banner as UIBanner } from '@/ui/Banner'
import { Internal } from './addon/Internal'
import { Color } from './Color'
import { Select as UISelect } from '@/ui/Select'
import { SetState } from '@/class/API'
import { Icon } from '@impactium/icons'
import { Badge } from '@/ui/Badge'
import { Checkbox } from '@/ui/Checkbox'
import { FilterFileBanner } from '@/banners/FilterFile.banner'
import { Skeleton } from '@/ui/Skeleton'
import { enginesBase } from '@/dto/Engine.dto'
import { ColorPicker, ColorPickerTrigger, ColorPickerPopover } from '@/ui/Color'
import { Input } from '@/ui/Input'
import { Stack } from '@/ui/Stack'
import { Separator } from '@radix-ui/react-select'
import { formatDuration, intervalToDuration } from 'date-fns'
import { Label } from '@/ui/Label'

export namespace Source {
  export const name = 'Source'
  const _ = Symbol(Source.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type extends Selectable {
    operation_id: Operation.Id,
    context_id: Context.Id,
    plugin: string,
    id: Source.Id,
    type: 'source',
    owner_user_id: User.Id,
    granted_user_ids: string[],
    granted_user_group_ids: User.Id[],
    time_created: number,
    time_updated: number,
    glyph_id: Glyph.Id,
    name: string
    // Client-only params
    settings: {
      offset: number;
      field: keyof Doc.Type;
      render_color_palette: Color.Gradient;
      render_engine: Engine.List;
    }
    pinned: boolean // (false)
    // Enriched  using /query_operation
    timestamp: MinMax
    nanotimestamp: MinMax<bigint>
    total: number
  }

  export class Entity {
    // @ts-ignore
    public static icon = Internal.IconExtractor.activate<Source.Type | null>(Default.Icon.FILE)

    /**
     * Memorization cache for `selected()`. Stores the result keyed by `app.target.files` reference.
     *
     * ARCHITECTURAL DECISION: `selected()` is called 5+ times per render frame (from Canvas rendering,
     * click handlers, context menus, link calculations, etc.). Each call performs a filter → sort → filter
     * chain on all sources. By caching the intermediate result (pinned + selected sources) and only
     * re-filtering by search text, we avoid redundant computation. The cache invalidates automatically
     * when `app.target.files` is reassigned (new reference = new selection state).
     */
    private static _selectedCache: { 
      ref: Source.Type[] | null; 
      filterText: string; 
      filesWithNoEvents: boolean;
      renderVersion: number;
      result: Source.Type[] 
    } = { 
      ref: null, 
      filterText: '', 
      filesWithNoEvents: false,
      renderVersion: 0,
      result: [] 
    };

    /**
     * Returns the list of currently selected and visible sources, sorted by pin status.
     * Results are memoized by `app.target.files` reference — only the search text filter
     * is re-applied on cache hit, since it depends on dynamic `app.timeline.filter` state.
     */
    public static selected = (app: App.Type): Source.Type[] => {
      const currentFilter = (app.timeline.filter || '').toLowerCase();
      const filesWithNoEvents = app.hidden.filesWithNoEvents;
      const renderVersion = app.timeline.renderVersion;

      if (
        app.target.files === Source.Entity._selectedCache.ref && 
        currentFilter === Source.Entity._selectedCache.filterText &&
        filesWithNoEvents === Source.Entity._selectedCache.filesWithNoEvents &&
        renderVersion === Source.Entity._selectedCache.renderVersion
      ) {
        return Source.Entity._selectedCache.result;
      }
      const pins = Source.Entity.pins(app.target.files.filter((s) => s.selected && (filesWithNoEvents ? s.total > 0 : true)));
      
      const result = pins.filter(s => 
        s.name?.toLowerCase().includes(currentFilter) || 
        Context.Entity.id(app, s.context_id).name?.toLowerCase().includes(currentFilter)
      );
      
      Source.Entity._selectedCache = { 
        ref: app.target.files, 
        filterText: currentFilter, 
        filesWithNoEvents,
        renderVersion,
        result 
      };
      
      return result;
    }

    public static select = (app: App.Type, selected: Source.Type[] | Source.Id[]): Source.Type[] =>
      app.target.files.map((f) =>
        selected.map(s => Parser.useUUID(s)).find(id => id === f.id) ? Source.Entity._select(f) : f,
      )

    public static pins = (use: App.Type | Source.Type[]) =>
      Parser.use(use, 'files').sort((a, b) =>
        a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1,
      )

    public static pin = (file: Source.Type): Source.Type => ({ ...file, pinned: true })
    public static unpin = (file: Source.Type): Source.Type => ({ ...file, pinned: false })
    public static togglePin = (file: Source.Type): Source.Type =>
      file.pinned ? Source.Entity.unpin(file) : Source.Entity.pin(file)

    public static isEventKeyFetched = (app: App.Type, id: Source.Type | Source.Id, keys: Array<keyof Doc.Type> = []) => {
      const file = Source.Entity.id(app, id);
      return Source.Entity.events(app, file).slice(0, 100).every(e => [...keys, file.settings.field].every(k => typeof e[k] !== 'undefined'));
    };

    public static context = (app: App.Type, file: Source.Type) =>
      Context.Entity.id(app, file.context_id)

    public static id = (use: App.Type | Source.Type[], file: Source.Type | Source.Id) =>
      typeof file === 'string'
        ? (Parser.use(use, 'files').find(
          (s) => s.id === Parser.useUUID(file),
        ) as Source.Type)
        : file

    public static getRequestType = (app: App.Type, file: Source.Type | Source.Id): Request.Prefix | null | undefined => {
      const id = Parser.useUUID(file) as Source.Id;

      const request = app.general.loadings.byFileId.get(id);
      if (!request) {
        // Source.Entity is not requesting
        return null;
      }

      const parts = request.split('-');
      if (parts.length === 1) {
        // Type not defined
        return void 0;
      }

      const type = parts[0];
      if (Object.values(Request.Prefix).includes(type as Request.Prefix)) {
        return type as Request.Prefix;
      }

      // Type defined, but unknown
      return null;
    }

    public static unselect = (app: App.Type, unselected: Source.Type[]): Source.Type[] =>
      app.target.files.map((f) =>
        unselected.find((u) => u.id === f.id) ? Source.Entity._unselect(f) : f,
      )

    public static check = (
      use: App.Type | Source.Type[],
      selected: Arrayed<Source.Type | string>,
      check: boolean,
    ): Source.Type[] =>
      Parser.use(use, 'files').map((s) =>
        Parser.array(selected).find((f) => s.id === Parser.useUUID(f) && check)
          ? Source.Entity._select(s)
          : Source.Entity._unselect(s),
      )

    public static isVirtual = (file: Source.Type) => file.id.startsWith('temp');

    public static virtualize = (app: App.Type, {
      name,
      total,
      context_id,
      operation_id,
    }: {
      name: string;
      total: number;
      context_id: Context.Id;
      operation_id: Operation.Id;
    }): Source.Type => ({
      name,
      id: generateUUID(),
      timestamp: app.timeline.frame,
      nanotimestamp: {
        min: BigInt(Math.round(app.timeline.frame.min)),
        max: BigInt(Math.round(app.timeline.frame.max)),
      },
      settings: Internal.Settings.default,
      selected: true,
      operation_id,
      context_id,
      total,
      type: 'source',
      glyph_id: null as unknown as Glyph.Id,
      granted_user_group_ids: [],
      granted_user_ids: [],
      time_created: Date.now(),
      time_updated: Date.now(),
      plugin: '',
      owner_user_id: app.general.user?.id!,
      pinned: false
    })

    public static devirtualize = (app: App.Type, file: Source.Type): Source.Type[] => file.id.split('-').slice(1).map(id => Source.Entity.id(app, id as Source.Id)).filter(f => f);

    public static normalize = (app: App.Type, file: Source.Type, details?: GulpDataset.QueryOperations.Source): Source.Type => {
      // @ts-ignore
      delete file.mapping_parameters;
      // @ts-ignore
      delete file.color;

      const exist = Source.Entity.id(app, file.id) ?? {};
      const min = details?.['min_gulp.timestamp'] ?? Internal.Transformator.toNanos(Date.now() - 1);
      const max = details?.['max_gulp.timestamp'] ?? Internal.Transformator.toNanos(Date.now());

      return Object.assign(file, {
        selected: file.selected ?? exist.selected ?? false,
        pinned: file.pinned ?? exist.pinned ?? false,
        settings: file.settings ?? exist.settings ?? Internal.Settings.default,
        total: file.total ?? details?.doc_count ?? 0,
        // @ts-ignore
        nanotimestamp: { min, max, ...file.nanotimestamp },
        timestamp: {
          min: Internal.Transformator.toTimestamp(file.nanotimestamp?.min ?? min, 'floor'),
          max: Internal.Transformator.toTimestamp(file.nanotimestamp?.max ?? max, 'ceil')
        }
      });
    }

    public static events = (app: App.Type, file: Source.Type | Source.Id): Doc.Type[] =>
      Doc.Entity.get(app, Parser.useUUID(file) as Source.Id)

    public static notes = (app: App.Type, files: Arrayed<Source.Type>): Note.Type[] => Parser.array(files).map((s) => Note.Entity.findByFile(app, s)).flat();

    public static index = (app: App.Type, file: Source.Type | Source.Id) => Source.Entity.selected(app).findIndex((s) => s.id === Parser.useUUID(file))

    public static getHeight = (app: App.Type, file: Source.Type | Source.Id, scrollY: number, index?: number) => 48 * (typeof index === 'number' ? index : this.index(app, file)) - scrollY + 24

    private static _select = (p: Source.Type): Source.Type => ({ ...p, selected: true })

    private static _unselect = (p: Source.Type): Source.Type => ({ ...p, selected: false })
  }

  export namespace Delete {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        source: Source.Type
      }
    }
    export function Banner({ source, ...props }: Source.Delete.Banner.Props) {
      const { Info, destroyBanner } = Application.use()
      const [loading, setLoading] = useState<boolean>(false)

      const deleteFile = async () => {
        setLoading(true)
        await Info.file_delete(source)
        setLoading(false)
        if (props.back) {
          props.back()
        } else {
          destroyBanner()
        }
        toast(`Source.Entity ${source.name} deleted successfully`)
      }

      return (
        <UIBanner title='Delete file' {...props}>
          <p>Are you going to delete file <code>{source.name}</code>. Are you sure?</p>
          <Button loading={loading} icon='Trash2' style={{ width: '100' }} onClick={deleteFile}>Yes, delete file</Button>
        </UIBanner>
      )
    }
  }

  export namespace Select {
    export namespace Multi {
      export interface Props {
        sources?: Source.Type[];
        selected: Source.Id[];
        setSelected: SetState<Source.Id[]>;
        placeholder?: string;
      }
    }
    export function Multi({ sources, selected, setSelected, placeholder }: Select.Multi.Props) {
      const { app } = Application.use();

      const all = useMemo(() => sources ?? Source.Entity.selected(app), [sources, app.timeline.filter, app.target.files]);
      const availableContexts = useMemo(() => {
        const contextIds = new Set(all.map(s => s.context_id));
        return Context.Entity.selected(app).filter(c => contextIds.has(c.id));
      }, [all, app]);

      const isAllSelected = useMemo(() => all.length > 0 && all.every(s => selected.includes(s.id)), [all, selected]);

      const toggleContext = (contextId: Context.Id, currentSelectedContextSources: Source.Type[], allContextSources: Source.Type[]) => {
        const allContextSourceIds = allContextSources.map(s => s.id);
        const isAllContextSelected = currentSelectedContextSources.length === allContextSources.length;

        let newSelected = [...selected];

        if (isAllContextSelected) {
          // Deselect all in context
          newSelected = newSelected.filter(id => !allContextSourceIds.includes(id));
        } else {
          // Select all in context
          // Add ones that are not already present
          allContextSourceIds.forEach(id => {
            if (!newSelected.includes(id)) {
              newSelected.push(id);
            }
          });
        }
        setSelected(newSelected);
      };

      const ContextGroup = ({ context, all, selected, toggleContext, isAllContextSelected, isIndeterminate, selectedContextSources, contextSources }: any) => {
        const { app } = Application.use();
        const [isCollapsed, setIsCollapsed] = useState(false);

        return (
          <UISelect.Group>
            <UISelect.Label style={{ display: 'flex', justifyContent: 'flex-start', textAlign: 'left', gap: 8, paddingLeft: 25 }}>
              <Icon
                name={isCollapsed ? "ChevronRight" : "ChevronDown"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                style={{ cursor: 'pointer', width: 16, height: 16, position: 'absolute', left: 4 }}
              />
              <Checkbox
                style={{ width: 'calc(100% - 20px)', opacity: 0, position: 'absolute', left: 20 }}
                checked={isAllContextSelected ? true : isIndeterminate ? 'indeterminate' : false}
                onCheckedChange={() => toggleContext(context.id, selectedContextSources, contextSources)}
              />
              {context.name}
            </UISelect.Label>
            {!isCollapsed && contextSources.map((source: Source.Type) => (
              <UISelect.Item key={source.id} value={source.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon
                  name={Source.Entity.icon(source) || 'File'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // @ts-ignore
                    const updated = Source.Entity.togglePin(source);
                    // @ts-ignore
                    app.target.files = app.target.files.map(f => f.id === updated.id ? updated : f);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {source.name}
                {source.pinned && <Icon name="Pin" style={{ color: '#f5a623' }} />}
              </UISelect.Item>
            ))}
          </UISelect.Group>
        );
      }

      return (
        <UISelect.Multi.Root value={selected} onValueChange={selected => setSelected(selected as Source.Id[])}>
          <UISelect.Trigger>
            <UISelect.Multi.Value icon={['File', 'Files']} placeholder={placeholder ?? 'Select Sources'} text={len => typeof len === 'number' ? `Selected ${len} files` : Source.Entity.id(app, len as Source.Id).name} />
          </UISelect.Trigger>
          <UISelect.Content>
            <UISelect.Multi.ToggleAll
              label={isAllSelected ? "Deselect all" : "Select all"}
              checked={isAllSelected}
              onToggle={(val) => setSelected(val ? all.map(s => s.id) : [])}
            />
            {availableContexts.map((context, index) => {
              const contextSources = all.filter(s => s.context_id === context.id);
              const selectedContextSources = contextSources.filter(s => selected.includes(s.id));
              const isAllContextSelected = selectedContextSources.length === contextSources.length;
              const isIndeterminate = selectedContextSources.length > 0 && !isAllContextSelected;

              return (
                <Fragment key={context.id}>
                  <ContextGroup
                    context={context}
                    all={all}
                    selected={selected}
                    toggleContext={toggleContext}
                    isAllContextSelected={isAllContextSelected}
                    isIndeterminate={isIndeterminate}
                    selectedContextSources={selectedContextSources}
                    contextSources={contextSources}
                  />
                  {index < availableContexts.length - 1 && <UISelect.Separator />}
                </Fragment>
              )
            })}
          </UISelect.Content>
        </UISelect.Multi.Root>
      )
    }
  }

  export namespace Settings {
    export namespace Banner {
      export interface Props {
        source: Source.Type
      }
    }

    export function Banner({ source }: Settings.Banner.Props) {
      const { Info, app, spawnBanner } = Application.use()
      const [render_color_palette, setRenderColorPalette] = useState<Color.Gradient>(source.settings.render_color_palette)
      const [offset, setOffset] = useState<number>(source.settings.offset)
      const [render_engine, setEngine] = useState<Engine.List>(source.settings.render_engine)

      const save = () => Info.file_set_settings(source.id, {
        render_color_palette,
        render_engine,
        offset,
        field,
      })

      const [eventKeys, setEventKeys] = useState<string[] | null>(null);

      useEffect(() => {
        Info.event_keys(source).then(Object.keys).then(keys => keys.sort((a, b) => a.localeCompare(b))).then(setEventKeys);
      }, []);

      const [field, setField] = useState<keyof Doc.Type>(source.settings.field);

      const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => setOffset(event.target.valueAsNumber || 0);

      const done = (
        <Button variant="glass" onClick={save} icon="Check" />
      )

      const option = (
        <Button
          onClick={() => spawnBanner(<FilterFileBanner sources={[source]} />)}
          variant="tertiary"
          icon="Filter"
        />
      )

      const EventFieldsSelection = useMemo(() => {
        if (!eventKeys) {
          return (
            <Skeleton width='full' />
          )
        }

        return (
          <UISelect.Root onValueChange={(field: keyof Doc.Type) => setField(field)} defaultValue={field.toString()}>
            <UISelect.Trigger data-no-icon value={field}>
              {field}
            </UISelect.Trigger>
            <UISelect.Content>
              {eventKeys.map((field) => (
                <UISelect.Item key={field} value={field}>
                  {field}
                </UISelect.Item>
              ))}
            </UISelect.Content>
          </UISelect.Root>
        )
      }, [eventKeys, field]);

      return (
        <UIBanner title="Source settings" done={done} option={option}>
          <h4>
            {source.name} in {Context.Entity.id(app, source.context_id)?.name}
          </h4>
          <Input
            variant='highlighted'
            icon="AlarmClockPlus"
            accept="number"
            label={`Offset: ${formatDuration(intervalToDuration({ start: 0, end: offset }), { format: ['years', 'months', 'days', 'hours', 'minutes', 'seconds'], zero: false })} ${parseInt(offset.toString().slice(-3))} milliseconds`}
            value={offset}
            placeholder="Offset time in ms"
            onChange={handleInputChange}
          />
          <Stack dir='column' gap={6} ai='flex-start'>
            <Label value='Render engine' />
            <UISelect.Root onValueChange={(v: Engine.List) => setEngine(v)} value={render_engine}>
              <UISelect.Trigger>
                <Icon name={enginesBase.find((e) => e.plugin === render_engine)?.img ?? 'CircleDashed'} />
                {enginesBase.find((e) => e.plugin === render_engine)?.title ?? render_engine}
              </UISelect.Trigger>
              <UISelect.Content>
                {enginesBase.map((i) => (
                  <UISelect.Item value={i.plugin} key={i.plugin}>
                    <Icon name={i.img} />
                    {i.title}
                  </UISelect.Item>
                ))}
              </UISelect.Content>
            </UISelect.Root>
          </Stack>
          <Stack dir='column' gap={6} ai='flex-start'>
            <Label value='Color scheme' />
            <ColorPicker color={render_color_palette} setColor={c => setRenderColorPalette(c as Color.Gradient)}>
              <ColorPickerTrigger />
              <ColorPickerPopover gradients={Color.GRADIENT} solids={[]} />
            </ColorPicker>
          </Stack>
          <Stack dir='column' gap={6} ai='flex-start'>
            <Label value='Color scheme based on field' />
            {EventFieldsSelection}
          </Stack>
        </UIBanner>
      )
    }

    export namespace RenderRules {
      export namespace Banner {
        export interface Props extends UIBanner.Props {

        }
      }

      export function Banner({ ...props }: Banner.Props) {
        return (
          <UIBanner title='Manage render rules' {...props}>

          </UIBanner>
        )
      }
    }

  }
}
