import { Application } from "@/context/Application.context";
import { DisplayGroupDialog } from "@/dialogs/Group.dialog";
import { Point as UIPoint } from "./Point";
import { Icon } from "@impactium/icons";
import s from "./styles/Note.module.css";
import { cn } from "@impactium/utils";
import { formatTimestampToReadableString, stringToHexColor } from "./utils";
import { Stack } from "./Stack";
import { Badge } from "./Badge";
import { Banner as UIBanner } from "./Banner";
import { Button } from "./Button";
import { Doc } from "@/entities/Doc";
import { Context } from "@/entities/Context";
import { Source } from "@/entities/Source";
import { DisplayEventDialog } from "@/dialogs/Event.dialog";
import { Note } from "@/entities/Note";
import { DataStore } from "@/store/DataStore";
import { RenderEngine } from "@/class/RenderEngine";
import { useMemo, useState } from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/Tooltip"

export namespace NotePoint {
	export interface Props extends Omit<
		UIPoint.Props,
		"icon" | "accent" | "name"
	> {
		notes: Note.Type[];
	}

	export namespace Combination {
		export interface Props extends Omit<Stack.Props, "onClick"> {
			note: Note.Type;
			onTargetClick?: (note: Note.Type) => void;
		}
	}

	export function FetchEventBanner({ note }: { note: Note.Type }) {
		const { app, Info, spawnDialog, destroyBanner } = Application.use();
		const [loading, setLoading] = useState<boolean>(false);

		const fetch = async () => {
			setLoading(true);
			try {
				const fetched = await Info.query_single_id(
					note.doc._id,
					note.operation_id,
				);
				if (!fetched) {
					toast.error("Event could not be retrieved");
					return;
				}
				const [event] = Doc.Entity.normalize([fetched]);
				Info.events_add([event]);

				const sourceId = event["gulp.source_id"];
				const loadedCount = Doc.Entity.get(app, sourceId).length;
				const updatedFiles = app.target.files.map((f) =>
					f.id === sourceId
						? {
							...f,
							selected: true,
							total: Math.max(f.total ?? 0, loadedCount),
						}
						: f,
				);
				Info.setInfoByKey(updatedFiles, "target", "files");

				Note.Entity.invalidateCache();
				RenderEngine.clearAllCaches();
				DataStore.markDirty();
				Info.render();
				destroyBanner();
				spawnDialog(<DisplayEventDialog event={event} />);
			} finally {
				setLoading(false);
			}
		};

		return (
			<UIBanner
				title="Fetch event"
				done={
					<Button
						loading={loading}
						icon="MagnifyingGlass"
						variant="glass"
						onClick={fetch}
					/>
				}
			>
				<p>
					The event linked to note <code>{note.name}</code> is not currently
					loaded in the timeline (it may have been filtered out). Fetch it
					from the server to view its details?
				</p>
			</UIBanner>
		);
	}

	export function Combination({
		className,
		style,
		note,
		onTargetClick,
		...props
	}: Combination.Props) {
		const { app, Info } = Application.use();


		return (
			<Stack
				className={cn(
					s.combination,
					note.tags.includes("auto") && s.hidden,
					className,
				)}
				style={{
					...style,
					background: "transparent",
				}}
				{...props}
			>
				<p>{formatTimestampToReadableString(note.doc.gulp_timestamp)}</p>
				<Icon name={Note.Entity.icon(note)} style={{ color: note.color }} size={16} />
				<p style={{ color: note.color }}>{note.name}</p>
				<Tooltip>
					<TooltipTrigger asChild>
						<span style={{ cursor: "help", opacity: 0.9 }}>{note.text}</span>
					</TooltipTrigger>
					<TooltipContent>{note.text}</TooltipContent>
				</Tooltip>
				<Stack className={s.badge_wrapper}>
					<Badge
						value={`${Context.Entity.id(app, note.context_id).name} / ${Source.Entity.id(app, note.source_id).name}`}
						style={{
							background: stringToHexColor(note.context_id),
							border: `1px solid ${stringToHexColor(note.context_id)}40`,
						}}
					/>
					{note.tags.map((t) => (
						<Badge
							value={t}
							icon={
								isTagAreSeverityIndicator(t)
									? NotePoint.getIconFromNoteSeverity(note)
									: undefined
							}
							variant={
								(isTagAreSeverityIndicator(t)
									? NotePoint.getColorFromNoteSeverity(note)
									: "gray-subtle") as any
							}
						/>
					))}
				</Stack>

				<Button
					icon="MagnifyingGlassSmall"
					onClick={() => onTargetClick?.(note)}
					variant="glass"
				/>
				<Button
					icon="Trash2"
					onClick={() => Info.note_delete(note)}
					variant="glass"
				/>
			</Stack>
		);
	}

	export function Point({ notes, ...props }: NotePoint.Props) {
		const { app, spawnDialog } = Application.use();

		const handleClick = useCallback(() => {
			const ids = notes.map((n) => n.doc._id);
			const events = Source.Entity.events(app, notes[0].source_id).filter((e) =>
				ids.includes(e._id),
			);
			if (!events.length) {
				return;
			}

			if (events.length === 1) {
				return spawnDialog(<DisplayEventDialog event={events[0]} />);
			}

			return spawnDialog(<DisplayGroupDialog events={events} />);
		}, [notes, app.target.files, app.target.events]);

		return (
			<UIPoint
				onClick={handleClick}
				icon={notes.length > 1 ? "Status" : Note.Entity.icon(notes[0])}
				accent={notes.length > 1 ? "#e8e8e8" : notes[0].color}
				name={(notes.length > 1 ? notes.length : notes[0].name).toString()}
				{...props}
			/>
		);
	}

	export type Severity =
		| "critical"
		| "high"
		| "medium"
		| "low"
		| "informational";

	export const SeverityToColorMap: Record<Severity, string> = {
		critical: "red",
		high: "amber",
		medium: "blue",
		low: "green",
		informational: "gray",
	} as const;

	export type SeverityToColorMap = typeof SeverityToColorMap;

	export const SeverityToIconMap: Record<Severity, Icon.Name> = {
		critical: "Warning",
		high: "DataPoint",
		medium: "DataPointMedium",
		low: "DataPointLow",
		informational: "Information",
	} as const;

	export type SeverityToIconMap = typeof SeverityToIconMap;

	/**
	 * O(1) complexity
	 */
	export const getSeverityFromNote = (note: Note.Type): Severity => {
		const target = note.tags.find((tag) => isTagAreSeverityIndicator(tag));
		if (!target) {
			return "informational";
		}

		const splited = target.split("_");
		if (splited.length !== 2) {
			return "informational";
		}

		const key: Severity =
			splited[1] in SeverityToColorMap
				? (splited[1] as Severity)
				: "informational";

		return key;
	};

	export const getIconFromNoteSeverity = (note: Note.Type) =>
		SeverityToIconMap[getSeverityFromNote(note)];

	export const getColorFromNoteSeverity = (note: Note.Type) =>
		SeverityToColorMap[getSeverityFromNote(note)];

	export const isTagAreSeverityIndicator = (tag: string): boolean =>
		tag.startsWith("severity_");
}
