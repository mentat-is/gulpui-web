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
import { useApplication } from '@/context/Application.context'
import { Button } from '@/ui/Button'
import { Toggle } from '@/ui/Toggle'
import { useState } from 'react'
import { toast } from 'sonner'
import { Banner as UIBanner } from '@/ui/Banner'
import { Internal } from './addon/Internal'
import { Color } from './Color'

export namespace Source {
  const _ = Symbol('Source')
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

    // ⚠️ UNTOUCHABLE
    public static selected = (app: App.Type): Source.Type[] =>
      Source.Entity.pins(app.target.files.filter((s) => s.selected)).filter(
        (s) =>
          s.name?.toLowerCase().includes(app.timeline.filter.toLowerCase()) ||
          Context.Entity.id(app, s.context_id)
            .name?.toLowerCase()
            .includes(app.timeline.filter.toLowerCase()),
      )

    public static select = (app: App.Type, selected: Source.Type[] | Source.Id[]): Source.Type[] =>
      app.target.files.map((f) =>
        selected.map(s => Parser.useUUID(s)).find(id => id === f.id) ? Source.Entity._select(f) : f,
      )

    public static pins = (use: App.Type | Source.Type[]) =>
      Parser.use(use, 'files').sort((a, b) =>
        a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1,
      )

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

    public static getHeight = (app: App.Type, file: Source.Type | Source.Id, scrollY: number) => 48 * this.index(app, file) - scrollY + 24

    private static _select = (p: Source.Type): Source.Type => ({ ...p, selected: true })

    private static _unselect = (p: Source.Type): Source.Type => ({ ...p, selected: false })
  }

  export namespace Delete {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        file: Source.Type
      }
    }
    export function Banner({ file, ...props }: Source.Delete.Banner.Props) {
      const { Info, destroyBanner } = useApplication()
      const [isSubmited, setIsSubmited] = useState<boolean>(false)
      const [isWipe, setIsWipe] = useState<boolean>(true)
      const [loading, setLoading] = useState<boolean>(false)

      const DeleteButton = () => (
        <Button
          loading={loading}
          img='Trash2'
          variant='glass'
          onClick={deleteFile}
          disabled={!isSubmited}
        />
      )

      const deleteFile = async () => {
        setLoading(true)
        await Info.file_delete(file, isWipe)
        setLoading(false)
        if (props.back) {
          props.back()
        } else {
          destroyBanner()
        }
        toast(`Source.Entity ${file.name} deleted successfully`)
      }

      return (
        <UIBanner title='Delete file' done={<DeleteButton />} {...props}>
          <p>
            Are you sure you want to delete file: <code>{file.name}</code>
          </p>
          <Toggle
            option={['No, don`t delete', 'Yes, i`m sure']}
            checked={isSubmited}
            onCheckedChange={setIsSubmited}
          />
          {isSubmited && (
            <Toggle
              option={['Don`t delete data inside', 'Delete data inside']}
              checked={isWipe}
              onCheckedChange={setIsWipe}
            />
          )}
        </UIBanner>
      )
    }
  }
}