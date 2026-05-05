import { Application } from "@/context/Application.context";
import { Dialog } from "@/ui/Dialog";
import {
	Fragment,
	useEffect,
	useMemo,
	useState,
	useCallback,
	useRef,
} from "react";
import s from "./styles/DisplayEventDialog.module.css";
import { copy, download, generateUUID, Refractor } from "@/ui/utils";
import { Stack } from "@/ui/Stack";
import { Button } from "@/ui/Button";
import { Skeleton } from "@/ui/Skeleton";
import { MinMaxBase } from "@/class/Info";
import { Navigation } from "./components/navigation";
import { Enrichment } from "@/banners/Enrichment.banner";
import {
	LinkFunctionality,
	NoteFunctionality,
} from "@/banners/Collab.functionality";
import { Collab } from "@/components/CollabList";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/ui/ContextMenu";
import { FilterFileBanner } from "@/banners/FilterFile.banner";
import { SendData } from "@/banners/SendData.banner";
import { toast } from "sonner";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { StyleProps } from "react-json-view-lite/dist/DataRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/Tabs";
import { Table } from "@/components/Table";
import { Markdown } from "@/ui/Markdown";
import { Icon } from "@impactium/icons";
import { cn } from "@impactium/utils";
import { CacheKey } from "@/class/Engine.dto";
import { RenderEngine } from "@/class/RenderEngine";
import { Doc } from "@/entities/Doc";
import { Source } from "@/entities/Source";
import { Filter } from "@/entities/Filter";
import { Note } from "@/entities/Note";
import { Color } from "@/entities/Color";
import { Extension } from "@/context/Extension.context";

// --- UTILITIES ---

/**
 * Removes 'event.original' from an object and re-inserts it at the end.
 * @param obj The source object
 * @returns A new object with 'event.original' at the end
 */
const prepareEventJson = (obj: Record<string, any>): Record<string, string> => {
	const entries = Object.entries(obj).filter(([k]) => k !== "event.original");
	return {
		...Object.fromEntries(entries),
		"event.original": obj["event.original"],
	};
};

type OperationType = "ENRICH" | "FILTER";

/**
 * Parses a raw string (e.g., from selection) into a key-value record.
 * @param raw Input string
 * @param operation The type of operation ("ENRICH" or "FILTER")
 * @param isManualSelection Whether the selection was manually made by the user
 * @returns parsed record
 */
const parseToKeyValue = (
	raw: string,
	operation: OperationType,
	isManualSelection: boolean
): Record<string, string> => {
	const result: Record<string, string> = {};
	for (const line of raw.split("\n")) {
		const cleaned = line.trim();
		if (cleaned.length === 0) continue;

		if (operation === "ENRICH" && isManualSelection) {
			result[`enrich_${cleaned}`] = cleaned;
			continue;
		}

		const index = line.indexOf(":");
		if (index === -1) {
			if (operation === "FILTER") continue;
			result[`key_${cleaned}`] = cleaned;
			continue;
		}

		const key = line
			.slice(0, index)
			.trim()
			.replace(/^"+|"+$/g, "");
		const value =
			line
				.slice(index + 1)
				.trim()
				.replace(/^"+|"+$/g, "")
				.replace(/[,"]+$/, "") || "*";
		result[key] = value;
	}
	return result;
};

/**
 * Checks if a coordinate point is within the current browser selection.
 * @param x Client X
 * @param y Client Y
 * @returns boolean
 */
const isPointInSelection = (x: number, y: number): boolean => {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
		return false;
	const range = selection.getRangeAt(0);
	const rects = range.getClientRects();
	for (let i = 0; i < rects.length; i++) {
		const rect = rects[i];
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
			return true;
	}
	return false;
};

/**
 * Attempts to detect and select the logical "line" (key-value pair) at a specific point.
 * @param x Client X
 * @param y Client Y
 * @param isRawView Whether the current view is Raw (requires specific caret logic)
 * @returns The string content of the detected line or null
 */
const detectSelectionAtPoint = (
	x: number,
	y: number,
	isRawView: boolean,
): string | null => {
	const element = document.elementFromPoint(x, y) as HTMLElement;
	if (!element) return null;

	const selectElementText = (el: HTMLElement) => {
		const selection = window.getSelection();
		if (selection) {
			const range = document.createRange();
			range.selectNodeContents(el);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	};

	// 1. Table Handling
	const tr = element.closest("tr");
	if (tr) {
		const cells = Array.from(tr.querySelectorAll("td"));
		if (cells.length >= 2) {
			selectElementText(tr);
			return `${cells[0].innerText}: ${cells[1].innerText}`;
		}
	}

	if (isRawView) {
		const selection = window.getSelection();
		let range: Range | null = null;
		// @ts-ignore
		if (document.caretRangeFromPoint) {
			// @ts-ignore
			range = document.caretRangeFromPoint(x, y);
		} else if (document.caretPositionFromPoint) {
			// @ts-ignore
			const pos = document.caretPositionFromPoint(x, y);
			if (pos) {
				range = document.createRange();
				range.setStart(pos.offsetNode, pos.offset);
				range.setEnd(pos.offsetNode, pos.offset);
			}
		}

		if (range && selection) {
			selection.removeAllRanges();
			selection.addRange(range);
			try {
				// @ts-ignore
				selection.modify("move", "backward", "lineboundary");
				// @ts-ignore
				selection.modify("extend", "forward", "lineboundary");
				const lineText = selection.toString().trim();
				if (lineText.includes(":")) return lineText;
			} catch (e) {
				console.error("Native selection modify failed", e);
			}
		}

		// Fallback for Raw View
		let current: HTMLElement | null = element;
		while (
			current &&
			current !== document.body &&
			!current.classList.contains(s.highlighter)
		) {
			const text = (current.innerText || current.textContent || "").trim();
			if (text.includes(":") && !text.includes("\n")) {
				selectElementText(current);
				return text;
			}
			current = current.parentElement;
		}
	} else {
		// 2. Tree/JsonView Handling
		let current: HTMLElement | null = element;
		while (
			current &&
			current !== document.body &&
			!current.classList.contains(s.scrollable)
		) {
			if (current.querySelector(`.${s.label}`)) {
				const text = (current.innerText || current.textContent || "").trim();
				if (text.includes(":") && !text.includes("\n")) {
					selectElementText(current);
					return text;
				}
			}
			current = current.parentElement;
		}
	}

	return null;
};

// --- MAIN COMPONENT ---

interface DisplayEventDialogProps {
	event: Doc.Type;
}

/**
 * Main dialog for displaying event details in Tree, Raw, and Table formats.
 */
export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
	if (!event) return null;

	const { Info, app, spawnBanner } = Application.use();
	const { extensions } = Extension.use();

	// --- STATE ---
	const [json, setJSON] = useState<Record<string, string> | null>(null);
	const [selection, setSelection] = useState<string>("");
	const [isFlagged, setIsFlagged] = useState(() => {
		const opId = Doc.Entity.operationId(app, event);
		return opId ? Doc.Entity.flag.isFlagged(event._id, opId) : false;
	});
	const lastAutoSelectionRef = useRef<string | null>(null);
	const prevTargetRef = useRef<Doc.Id | null>(null);

	// --- DERIVED DATA ---
	const notes = useMemo(
		() => Doc.Entity.notes(app, event),
		[app.timeline.renderVersion, event],
	);
	const links = useMemo(
		() => Doc.Entity.links(app, event),
		[app.timeline.renderVersion, event],
	);
	const file = useMemo(
		() => Source.Entity.id(app, event["gulp.source_id"]),
		[app.target.files, event],
	);

	// --- EFFECTS ---

	// Sync with timeline focus
	useEffect(() => {
		if (prevTargetRef.current === event._id) return;
		prevTargetRef.current = event._id;
		Info.setTimelineTarget(file ? event : null);
	}, [event._id, file, Info]);

	// Load detailed event data
	const loadEvent = useCallback(async () => {
		const opId = Doc.Entity.operationId(app, event);
		if (!opId) return;
		const detailed = await Info.query_single_id(
			event._id,
			opId,
		);
		setJSON(prepareEventJson(detailed));
	}, [event, app, Info]);

	useEffect(() => {
		if (!json || json._id !== event._id) loadEvent();
	}, [event._id, loadEvent, json]);

	// Global selection tracker
	useEffect(() => {
		const handleSelectionChange = () => {
			const text = window.getSelection()?.toString().trim();
			if (text) {
				setSelection(text);
				if (text !== lastAutoSelectionRef.current)
					lastAutoSelectionRef.current = null;
			}
		};
		document.addEventListener("selectionchange", handleSelectionChange);
		return () =>
			document.removeEventListener("selectionchange", handleSelectionChange);
	}, []);

	useEffect(() => setSelection(""), [event._id]);


	// --- HANDLERS: Actions ---

	const handleCopyJson = useCallback(() => {
		if (json) copy(JSON.stringify(json, null, 2));
	}, [json]);

	const handleDownloadJson = useCallback(() => {
		if (json) {
			download(
				JSON.stringify(json, null, 2),
				"application/json",
				`${event._id}_from_${event["gulp.source_id"]}.json`,
			);
		}
	}, [json, event._id, event]);

	const handleDownloadLogFile = useCallback(() => {
		const storageId = json?.["gulp.storage_id"];
		const opId = Doc.Entity.operationId(app, event);
		if (storageId && typeof storageId === "string" && storageId.trim() !== "" && opId) {
			Info.download_storage_file(storageId, opId);
		}
	}, [event, app, Info, json]);

	const handleFocusTimeline = useCallback(() => {
		// @ts-ignore
		return window.focusCanvasOnEvent(event.gulp_timestamp + (file?.settings.offset || 0), false, event["gulp.source_id"]);
	}, [event, file]);

	// --- HANDLERS: Banners ---

	const handleEnrich = useCallback(
		(enrichmentField?: { key: string; value: string }) => {
			spawnBanner(
				<Enrichment.Banner
					event={event}
					enrichmentField={enrichmentField}
					onEnrichment={(e) => setJSON(e as unknown as typeof json)}
				/>,
			);
		},
		[spawnBanner, event, json],
	);

	const handleCreateNote = useCallback(() => {
		spawnBanner(<NoteFunctionality.Create.Banner event={event} />);
	}, [spawnBanner, event]);

	const handleCreateLink = useCallback(() => {
		spawnBanner(<LinkFunctionality.Create.Banner event={event} />);
	}, [spawnBanner, event]);

	const handleSendData = useCallback(() => {
		spawnBanner(<SendData.Banner event={event} />);
	}, [spawnBanner, event]);

	const handleConnectLink = useCallback(() => {
		spawnBanner(<LinkFunctionality.Connect.Banner event={event} />);
	}, [spawnBanner, event]);

	const applySelectionAsFileFilter = useCallback(() => {
		if (!selection) return;
		const file = Source.Entity.id(app, event["gulp.source_id"]);
		const { filters } = Info.getQuery(file);

		const isManualSelection = selection !== lastAutoSelectionRef.current;
		const object = parseToKeyValue(selection, "FILTER", isManualSelection);

		if (Object.keys(object).length === 0) {
			toast(`Invalid selection. Unable to add new filters`);
			return;
		}

		const newFilters: Filter.Type[] = Object.keys(object).map((k) => ({
			id: generateUUID<Filter.Id>(),
			type: object[k].includes("*") || k.includes("*") ? "wildcard" : "range",
			operator: "must",
			field: k,
			value: object[k],
			enabled: true,
		}));

		Info.setQuery(file, {
			...Info.getQuery(file),
			filters: [...filters, ...newFilters],
		});

		toast(`Added ${newFilters.length} new filters`);
		spawnBanner(<FilterFileBanner sources={[file]} />);
	}, [selection, Info, app, event, spawnBanner]);

	// --- UI COMPONENTS: Sub-renders ---

	const highlights = useMemo(() => {
		if (!json) return null;

		const storageId = json["gulp.storage_id"];
		const unflattenObject = Object.keys(json).reduce((res, k) => {
			k.split(".").reduce(
				(acc: any, e, i, keys) =>
					acc[e] ||
					(acc[e] = isNaN(Number(keys[i + 1]))
						? keys.length - 1 === i
							? json[k]
							: {}
						: []),
				res,
			);
			return res;
		}, {});

		const jsonStyles: StyleProps = {
			...darkStyles,
			noQuotesForStringValues: true,
			childFieldsContainer: s.basic,
			stringValue: s.string,
			numberValue: s.numeric,
			booleanValue: s.bool,
			nullValue: s.null,
			container: s.container,
			label: s.label,
		};

		return (
			<ContextMenu>
				<Tabs
					defaultValue="raw"
					style={{ overflow: "scroll" }}
					className={s.tabs_wrapper}
				>
					<TabsList className={s.triggers}>
						<TabsTrigger value="tree">
							<Icon
								name="GitFork"
								size={14}
							/>{" "}
							Tree
						</TabsTrigger>
						<TabsTrigger value="raw">
							<Icon
								name="CodeBracket"
								size={14}
							/>{" "}
							Raw
						</TabsTrigger>
						<TabsTrigger value="table">
							<Icon
								name="Table"
								size={14}
							/>{" "}
							Table
						</TabsTrigger>
					</TabsList>

					<ContextMenuTrigger
						onMouseDown={(e) => {
							if (e.button === 2 && !isPointInSelection(e.clientX, e.clientY)) {
								const element = document.elementFromPoint(
									e.clientX,
									e.clientY,
								) as HTMLElement;
								const isInRawView = element?.closest(`.${s.highlighter}`);
								window.getSelection()?.removeAllRanges();
								const detected = detectSelectionAtPoint(
									e.clientX,
									e.clientY,
									!!isInRawView,
								);
								if (detected) {
									lastAutoSelectionRef.current = detected;
									setSelection(detected);
								}
							}
						}}
						onContextMenu={() => {
							const current = window.getSelection()?.toString().trim();
							if (current && current !== selection) setSelection(current);
						}}
					>
						<TabsContent
							value="tree"
							className={s.scrollable}
						>
							<JsonView
								data={unflattenObject}
								clickToExpandNode={true}
								shouldExpandNode={allExpanded}
								style={jsonStyles}
							/>
						</TabsContent>
						<TabsContent value="raw">
							<Markdown
								className={s.highlighter}
								value={`\`\`\`json\n${JSON.stringify(json, null, 2)}`}
							/>
						</TabsContent>
						<TabsContent value="table">
							<Table values={Object.entries(json)} />
						</TabsContent>
					</ContextMenuTrigger>
				</Tabs>

				<ContextMenuContent>
					<ContextMenuItem
						disabled={!selection}
						onClick={() =>
							spawnBanner(
								<NoteFunctionality.Create.Banner
									event={event}
									note={{ text: selection } as Note.Type}
								/>,
							)
						}
						icon="StickyNote"
					>
						Create new note
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!selection}
						icon="GitPullRequestCreate"
					>
						Create new link
					</ContextMenuItem>
					<ContextMenuItem
						onClick={handleCopyJson}
						icon="Copy"
					>
						Copy
					</ContextMenuItem>
					<ContextMenuItem
						onClick={applySelectionAsFileFilter}
						icon="Filter"
					>
						New filter
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!selection}
						onClick={() => {
							const isManualSelection = selection !== lastAutoSelectionRef.current;
							const object = parseToKeyValue(selection, "ENRICH", isManualSelection);
							const keys = Object.keys(object);
							if (keys.length > 0)
								handleEnrich({ key: keys[0], value: object[keys[0]] });
						}}
						icon="PrismColor"
					>
						Enrich
					</ContextMenuItem>
					{storageId &&
						typeof storageId === "string" &&
						storageId.trim() !== "" && (
							<ContextMenuItem
								onClick={handleDownloadLogFile}
								icon="Download"
							>
								Download log file
							</ContextMenuItem>
						)}
				</ContextMenuContent>
			</ContextMenu>
		);
	}, [
		json,
		selection,
		spawnBanner,
		event,
		applySelectionAsFileFilter,
		handleDownloadLogFile,
		handleEnrich,
		handleCopyJson,
	]);

	if (!file) {
		return (
			<Dialog>
				<Stack
					style={{ width: "100%", height: "300px" }}
					flex
					ai="center"
					jc="center"
					dir="column"
					gap={12}
				>
					<Icon name="CircleAlert" size={48} style={{ color: "var(--red-500)" }} />
					<p style={{ color: "var(--red-500)", fontWeight: "bold" }}>Source was deleted</p>
					<p style={{ opacity: 0.6 }}>This event is no longer available.</p>
				</Stack>
			</Dialog>
		);
	}

	return (
		<Dialog>
			<Navigation event={event} />
			{json ? (
				<Fragment>
					<Stack
						dir="column"
						className={s.group}
						gap={12}
						ai="stretch"
					>
						<Stack
							gap={12}
							flex
						>
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
						<Stack
							gap={12}
							flex
						>
							<Button
								onClick={() => handleEnrich()}
								variant="secondary"
								icon="PrismColor"
							>
								Enrich
							</Button>
							{Object.values(extensions).some((ext) =>
								ext.type.includes("send_data"),
							) && (
									<Button
										onClick={handleSendData}
										variant="glass"
										icon="Send"
									>
										Send Data
									</Button>
								)}
							<Button
								onClick={handleConnectLink}
								variant="secondary"
								icon="GitPullRequestCreateArrow"
							>
								Connect link to current event
							</Button>
						</Stack>
						<Extension.Component
							name="Story.popover.tsx"
							props={{ doc: event }}
						/>
					</Stack>

					<Collab.List
						notes={notes}
						links={links}
					/>

					{highlights}

					<Stack
						className={s.actionButtons}
						gap={12}
					>
						<Button
							variant="secondary"
							onClick={handleCopyJson}
							icon="Copy"
						>
							Copy JSON
						</Button>
						<Button
							variant="secondary"
							onClick={handleDownloadJson}
							icon="Download"
							title="Download JSON"
						>
							Download JSON
						</Button>
						<Button
							onClick={handleFocusTimeline}
							variant="secondary"
							icon="Crosshair"
							title="Focus timeline"
						/>
						<Button
							onClick={() => {
								const opId = Doc.Entity.operationId(app, event);
								if (!opId) return;
								setIsFlagged(
									Doc.Entity.flag.toggle(
										event._id,
										opId,
									),
								);
							}}
							variant="secondary"
							icon={isFlagged ? "FlagOff" : "Flag"}
							disabled={
								(() => {
									const opId = Doc.Entity.operationId(app, event);
									return (opId && Doc.Entity.flag.isLimitReached(
										Doc.Entity.flag.getList(opId),
									) && !isFlagged) || !opId;
								})()
							}
							title="Flag event"
						/>
					</Stack>
				</Fragment>
			) : (
				<LoadingSkeleton />
			)}
		</Dialog>
	);
}

/**
 * Skeleton loader for the dialog.
 */
function LoadingSkeleton() {
	return (
		<Stack
			style={{ width: "100%", height: "100%" }}
			flex
			ai="center"
			jc="center"
			dir="column"
			gap={12}
		>
			<Stack style={{ width: "100%" }}>
				<Skeleton width="full" />
				<Skeleton width="full" />
			</Stack>
			<Stack style={{ width: "100%" }}>
				<Skeleton width="full" />
				<Skeleton width="full" />
			</Stack>
			<Skeleton
				width="full"
				height="full"
			/>
			<Stack style={{ width: "100%" }}>
				<Skeleton width="full" />
				<Skeleton width="full" />
				<Skeleton width="full" />
			</Stack>
		</Stack>
	);
}

// --- SECONDARY COMPONENTS ---

export namespace EventIndicator {
	export interface Props extends Button.Props {
		event: Doc.Type;
	}
}

const getReadableIndicatorTextColor = (hexColor: string): string => {
	const hex = hexColor.replace("#", "");
	if (hex.length !== 6) {
		return "var(--accent)";
	}

	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);

	if ([r, g, b].some(Number.isNaN)) {
		return "var(--accent)";
	}

	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.55 ? "#111827" : "#f8f8f2";
};

/**
 * Visual indicator button for events in lists or timelines.
 */
export function EventIndicator({
	event,
	className,
	style,
	...props
}: EventIndicator.Props) {
	const { app } = Application.use();
	if (!event) return null;

	const file = Source.Entity.id(app, event["gulp.source_id"]);
	if (!file) return null;

	const notes = useMemo(
		() => Doc.Entity.notes(app, event),
		[app.timeline.renderVersion, event._id],
	);
	const links = useMemo(
		() => Doc.Entity.links(app, event),
		[app.timeline.renderVersion, event._id],
	);

	const background = useMemo(() => {
		const range =
			RenderEngine[CacheKey].range.get(event["gulp.source_id"]) ?? MinMaxBase;
		const code = Refractor.any.toNumber(
			Refractor.get(event, file.settings.field),
		);
		return Color.Entity.gradient(
			file.settings.render_color_palette,
			code,
			range,
		);
	}, [event, app.target.files, file]);

	const indicatorTextColor = useMemo(
		() => getReadableIndicatorTextColor(background),
		[background],
	);
	const indicatorLabel = useMemo(
		() => String(event["gulp.event_code"]).slice(0, 4),
		[event],
	);
	const indicatorTooltip = useMemo(
		() => String(event["gulp.event_code"]),
		[event],
	);
	const indicatorFontSize = useMemo(() => {
		return 8;
	}, [indicatorLabel]);

	return (
		<Button
			shape="icon"
			className={cn(className, s.indicator)}
			rounded
			title={indicatorTooltip}
			aria-label={indicatorTooltip}
			style={{ ...style, background }}
			{...props}
		>
			<hr />
			<p style={{ color: indicatorTextColor, fontSize: `${indicatorFontSize}px` }}>
				{indicatorLabel}
			</p>
			{Doc.Entity.flag.isFlagged(
				event._id,
				Doc.Entity.operationId(app, event),
			) && (
					<Stack
						ai="center"
						jc="center"
						className={cn(s.marker, s.flagged)}
						pos="absolute"
					>
						<Icon
							size={8}
							name="Flag"
						/>
					</Stack>
				)}
			{notes.length > 0 && (
				<Stack
					ai="center"
					jc="center"
					className={cn(s.marker, s.collab)}
					pos="absolute"
				>
					<Icon
						size={8}
						name="StickyNote"
					/>
				</Stack>
			)}
			{links.length > 0 && (
				<Stack
					ai="center"
					jc="center"
					className={cn(s.marker, s.collab, s.linkMarker)}
					pos="absolute"
				>
					<Icon
						size={8}
						name="Link"
					/>
				</Stack>
			)}
		</Button>
	);
}
