import { CacheKey } from "@/class/Engine.dto";
import { Default } from "@/dto/Dataset";
import { Logger } from "@/dto/Logger.class";
import { UUID } from "crypto";
import { Parser } from "./addon/Parser";
import { App } from "./App";
import { Source } from "./Source";
import { Doc } from "./Doc";
import { Context } from "./Context";
import { Operation } from "./Operation";
import { User } from "./User";
import { Glyph } from "./Glyph";
import { DataStore } from "@/store/DataStore";
import { Banner as UIBanner } from "@/ui/Banner";
import { Toggle } from "@/ui/Toggle";
import { Application } from "@/context/Application.context";
import { Button } from "@/ui/Button";
import { useState } from "react";
import { toast } from "sonner";
import { Internal } from "./addon/Internal";

export namespace Note {
	export const name = "Note";
	const _ = Symbol(Note.name);
	export type Id = UUID & {
		readonly [_]: unique symbol;
	};

	export interface Type {
		id: Note.Id;
		type: "note";
		operation_id: Operation.Id;
		tags: string[];
		name: string;
		context_id: Context.Id;
		color: string;
		source_id: Source.Id;
		doc: Doc.Type;
		time_pin: number;
		owner_user_id: User.Id;
		text: string;
		glyph_id: Glyph.Id;
		edits: Record<string, any>[];
		[key: string]: any;
	}

	export class Entity {
		public static icon = Internal.IconExtractor.activate<Note.Type | null>(
			Default.Icon.NOTE,
		);

		public static id = (_app: App.Type, id: Note.Id) =>
			DataStore.notes.find((n) => n.id === id) as Note.Type;

		public static selected = (app: App.Type): Note.Type[] => {
			const files = Source.Entity.selected(app).map((file) => file.id);

			return DataStore.notes.filter((note) =>
				files.includes(note.doc["gulp.source_id"]),
			);
		};

		public static event = (app: App.Type, note: Note.Type): Doc.Type =>
			Doc.Entity.id(app, note.doc._id);

		public static [CacheKey] = new Map<Source.Id, Note.Type[]>();

		/**
		 * Tracks whether the note-to-source index needs rebuilding.
		 * Set to false by invalidateCache(), checked by ensureIndexing().
		 */
		private static _cacheValid = false;

		public static indexSize = () =>
			[...Note.Entity[CacheKey].values()].flat().length;

		/**
		 * Marks the note index as stale. This is O(1) — the actual rebuild is
		 * deferred to ensureIndexing() which runs lazily at first access.
		 * Call this whenever app.target.notes or app.target.files changes.
		 */
		public static invalidateCache = () => {
			Note.Entity._cacheValid = false;
			Note.Entity[CacheKey].clear();
		};

		public static normalize = (
			app: App.Type,
			notes: Note.Type[],
		): Note.Type[] => {
			for (let i = 0; i < notes.length; i++) {
				notes[i] = this.normalize_note(app, notes[i]);
			}
			return notes;
		};

		public static normalize_note = (
			app: App.Type,
			note: Note.Type,
		): Note.Type => {
			let field = Source.Entity.id(app, note.source_id).settings.field;
			note.doc = Doc.Entity.normalize([note.doc], field)[0];
			return note;
		};

		/**
		 * Rebuilds the note-to-source index if it has been invalidated.
		 * Should be called before any render frame that needs note positions.
		 * Skips rebuild if the cache is already valid (no-op on repeated calls).
		 *
		 * @param app - Current application state containing notes and files
		 */
		public static ensureIndexing = (app: App.Type) => {
			if (Note.Entity._cacheValid) return;

			Note.Entity[CacheKey].clear();
			app.target.files.forEach((file) => {
				Note.Entity[CacheKey].set(
					file.id,
					DataStore.notes.filter((n) => n.source_id === file.id),
				);
			});

			Note.Entity._cacheValid = true;
			Logger.log(`NOTES_INDEXES_REBUILT:${Note.Entity.indexSize()}`, Note);
		};

		/**
		 * @deprecated Use invalidateCache() + ensureIndexing() instead.
		 * Kept for backward compatibility with external callers.
		 */
		public static updateIndexing = (app: App.Type) => {
			Note.Entity._cacheValid = false;
			Note.Entity.ensureIndexing(app);
		};

		public static findByFile = (
			app: App.Type,
			file: Source.Type | Source.Id,
		): Note.Type[] => {
			const id = Parser.useUUID(file) as Source.Id;
			let notes = Note.Entity[CacheKey].get(id);

			if (notes) {
				return notes;
			}

			const fileNotes = DataStore.notes.filter((n) => n.source_id === id);
			Note.Entity[CacheKey].set(id, fileNotes);
			return fileNotes;
		};

		public static timestamp = (note: Note.Type): number => {
			if (!note || !note.doc) {
				return 0;
			}

			const ts = note.doc.gulp_timestamp;
			return ts;
		};
	}

	export namespace Delete {
		export namespace Banner {
			export interface Props extends UIBanner.Props {
				note: Note.Type;
			}
		}
		export function Banner({ note, ...props }: Note.Delete.Banner.Props) {
			const { Info, destroyBanner } = Application.use();
			const [loading, setLoading] = useState<boolean>(false);
			const [isSubmited, setIsSubmited] = useState<boolean>(false);

			const DeleteButton = () => (
				<Button
					loading={loading}
					icon="Trash2"
					variant="glass"
					onClick={deleteFile}
					disabled={!isSubmited}
				/>
			);

			const deleteFile = async () => {
				setLoading(true);
				await Info.note_delete(note);
				setLoading(false);
				if (props.back) {
					props.back();
				} else {
					destroyBanner();
				}
				toast(`Note.Entity ${note.name} has been deleted successfully`);
			};

			return (
				<UIBanner
					title="Delete note"
					done={<DeleteButton />}
					{...props}
				>
					<p>
						Are you sure you want to delete note: <code>{note.name}</code>
					</p>
					<Toggle
						option={["No, don`t delete", "Yes, i`m sure"]}
						checked={isSubmited}
						onCheckedChange={setIsSubmited}
					/>
				</UIBanner>
			);
		}
	}
}
