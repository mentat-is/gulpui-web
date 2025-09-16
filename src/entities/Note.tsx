import { λCache } from '@/class/Engine.dto'
import { Default } from '@/dto/Dataset'
import { Logger } from '@/dto/Logger.class'
import { UUID } from 'crypto'
import { Parser } from './addon/Parser'
import { App } from './App'
import { Source } from './Source'
import { Doc } from './Doc'
import { Context } from './Context'
import { Operation } from './Operation'
import { User } from './User'
import { Glyph } from './Glyph'
import { Banner as UIBanner } from '@/ui/Banner'
import { Toggle } from '@/ui/Toggle'
import { useApplication } from '@/context/Application.context'
import { Button } from '@/ui/Button'
import { useState } from 'react'
import { toast } from 'sonner'
import { Internal } from './addon/Internal'

export namespace Note {
  export const name = 'Note';
  const _ = Symbol(Note.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    id: Note.Id
    type: 'note'
    operation_id: Operation.Id
    tags: string[]
    name: string;
    context_id: Context.Id
    color: string;
    source_id: Source.Id
    doc: Doc.Type
    time_pin: number
    owner_user_id: User.Id
    text: string;
    glyph_id: Glyph.Id;
    edits: Record<string, any>[]
    [key: string]: any;
  }

  export class Entity {
    public static icon = Internal.IconExtractor.activate<Note.Type | null>(Default.Icon.NOTE)

    public static id = (app: App.Type, id: Note.Id) =>
      app.target.notes.find((n) => n.id === id) as Note.Type

    public static selected = (app: App.Type): Note.Type[] => {
      const files = Source.Entity.selected(app).map(file => file.id);

      return app.target.notes.filter((note) => files.includes(note.doc['gulp.source_id']));
    }

    public static event = (app: App.Type, note: Note.Type): Doc.Type => Doc.Entity.id(app, note.doc._id)

    public static [λCache] = new Map<Source.Id, Note.Type[]>();

    public static indexSize = () => [...Note.Entity[λCache].values()].flat().length;

    public static updateIndexing = (app: App.Type) => {
      Note.Entity[λCache].clear();

      app.target.files.forEach(file => {
        Note.Entity[λCache].set(file.id, app.target.notes.filter((n) => n.source_id === file.id));
      })

      Logger.log(`NOTES_INDEXES_HAS_BEEN_CREATED:${Note.Entity.indexSize()}`, Note);
    };

    public static findByFile = (app: App.Type, file: Source.Type | Source.Id): Note.Type[] => {
      const id = Parser.useUUID(file) as Source.Id;
      const notes = Note.Entity[λCache].get(id);
      if (notes) {
        return notes;
      } else {
        this.updateIndexing(app);
        return Note.Entity.findByFile(app, file);
      }
    };

    public static timestamp = (note: Note.Type): number => {
      if (!note || !note.doc) {
        return 0;
      }

      return new Date(note.doc['@timestamp']).getTime();
    }
  }

  export namespace Delete {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        note: Note.Type
      }
    }
    export function Banner({ note, ...props }: Note.Delete.Banner.Props) {
      const { Info, destroyBanner } = useApplication();
      const [loading, setLoading] = useState<boolean>(false);
      const [isSubmited, setIsSubmited] = useState<boolean>(false)

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
        await Info.note_delete(note)
        setLoading(false)
        if (props.back) {
          props.back()
        } else {
          destroyBanner();
        }
        toast(`Note.Entity ${note.name} has been deleted successfully`)
      }

      return (
        <UIBanner title='Delete note' done={<DeleteButton />} {...props}>
          <p>Are you sure you want to delete note: <code>{note.name}</code></p>
          <Toggle
            option={['No, don`t delete', 'Yes, i`m sure']}
            checked={isSubmited}
            onCheckedChange={setIsSubmited}
          />
        </UIBanner>
      )
    }
  }
}