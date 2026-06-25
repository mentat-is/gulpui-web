import { DisplayEventDialog, EventIndicator } from "./Event.dialog";
import { Application } from "@/context/Application.context";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Doc } from "@/entities/Doc";
import { Icon } from "@/ui/Icon";
import { Note } from "@/entities/Note";
import { Stack } from "@/ui/Stack";
import { format } from "date-fns";
import { Markdown } from "@/ui/Markdown";

import s from "./styles/DisplayGroupDialog.module.css";
import { Internal } from "@/entities/addon/Internal";
import { Locale } from "@/locales";
import { DataStore } from "@/store/DataStore";

// Cache for tooltip event queries
class TooltipEventCache {
	private cache = new Map<string, Doc.Type>();
	private maxSize = 100;

	get(id: string): Doc.Type | undefined {
		return this.cache.get(id);
	}

	set(id: string, event: Doc.Type): void {
		if (this.cache.size >= this.maxSize && !this.cache.has(id)) {
			const firstKey = this.cache.keys().next().value as string | undefined;
			if (firstKey) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(id, event);
	}

	has(id: string): boolean {
		return this.cache.has(id);
	}
}

const tooltipEventCache = new TooltipEventCache();
const VIEWPORT_PADDING = 12;
const EVENT_LIST_WIDTH = 340;
const EVENT_LIST_HEIGHT = 300;
const EVENT_PREVIEW_WIDTH = 420;
const EVENT_PREVIEW_HEIGHT = 330;

interface EventListRow {
	key: string;
	event: Doc.Type;
	note: Note.Type | null;
}

/**
 * Restricts a coordinate to a visible viewport range.
 *
 * @param value Coordinate to clamp.
 * @param min Minimum visible coordinate.
 * @param max Maximum visible coordinate.
 * @returns Coordinate constrained between min and max.
 */
const clampCoordinate = (value: number, min: number, max: number): number => {
	if (max < min) return min;
	return Math.min(Math.max(value, min), max);
};

/**
 * Resolves a fixed-position box that remains visible in the current viewport.
 *
 * @param anchor Anchor coordinate where the floating element should start.
 * @param preferredSize Preferred floating element dimensions.
 * @param viewportSize Current viewport dimensions.
 * @returns CSS positioning and dimensions for the visible floating element.
 */
const resolveAnchoredBoxStyle = (
	anchor: { x: number; y: number },
	preferredSize: { width: number; height: number },
	viewportSize: { width: number; height: number },
): CSSProperties => {
	const width = Math.min(
		preferredSize.width,
		Math.max(0, viewportSize.width - VIEWPORT_PADDING * 2),
	);
	const height = Math.min(
		preferredSize.height,
		Math.max(0, viewportSize.height - VIEWPORT_PADDING * 2),
	);
	const canOpenRight =
		anchor.x + 14 + width <= viewportSize.width - VIEWPORT_PADDING;
	const left = canOpenRight
		? anchor.x + 14
		: anchor.x - width - 14;
	const top = clampCoordinate(
		anchor.y,
		VIEWPORT_PADDING,
		viewportSize.height - height - VIEWPORT_PADDING,
	);

	return {
		position: "fixed",
		left: clampCoordinate(
			left,
			VIEWPORT_PADDING,
			viewportSize.width - width - VIEWPORT_PADDING,
		),
		top,
		width,
		height,
		maxHeight: height,
		maxWidth: width,
		zIndex: 1000,
	};
};

/**
 * Resolves a hover preview position near an event row while keeping it visible.
 *
 * @param eventRect Bounding rectangle of the hovered event row.
 * @param viewportSize Current viewport dimensions.
 * @returns CSS positioning for the preview portal.
 */
const resolvePreviewStyle = (
	eventRect: DOMRect,
	viewportSize: { width: number; height: number },
): CSSProperties => {
	const width = Math.min(
		EVENT_PREVIEW_WIDTH,
		Math.max(0, viewportSize.width - VIEWPORT_PADDING * 2),
	);
	const height = Math.min(
		EVENT_PREVIEW_HEIGHT,
		Math.max(0, viewportSize.height - VIEWPORT_PADDING * 2),
	);
	const canOpenLeft =
		eventRect.left - width - 14 >= VIEWPORT_PADDING;
	const left = canOpenLeft ? eventRect.left - width - 14 : eventRect.right + 14;

	return {
		position: "fixed",
		left: clampCoordinate(
			left,
			VIEWPORT_PADDING,
			viewportSize.width - width - VIEWPORT_PADDING,
		),
		top: clampCoordinate(
			eventRect.top,
			VIEWPORT_PADDING,
			viewportSize.height - height - VIEWPORT_PADDING,
		),
		maxWidth: width,
		maxHeight: height,
	};
};

/**
 * Sorts events by timestamp and removes duplicate documents by ID.
 *
 * @param events - Events passed by canvas, note, or link callers.
 * @returns Timestamp-sorted events with each document represented once.
 */
function sortUniqueEventsByTimestamp(events: Doc.Type[]): Doc.Type[] {
	const seenEventIds = new Set<string>();
	const sortedEvents = events.toSorted(
		(a, b) => a.gulp_timestamp - b.gulp_timestamp,
	);
	const uniqueEvents: Doc.Type[] = [];

	for (const event of sortedEvents) {
		if (seenEventIds.has(event._id)) {
			continue;
		}

		seenEventIds.add(event._id);
		uniqueEvents.push(event);
	}

	return uniqueEvents;
}

/**
 * Expands events into virtualized display rows, duplicating noted events per note.
 *
 * @param events - Timestamp-sorted events to display in the group list.
 * @param notes - Notes available in the current application state.
 * @returns Event rows with one blank-note row for unnoted events.
 */
function buildEventRows(events: Doc.Type[], notes: Note.Type[]): EventListRow[] {
	const eventIds = new Set(events.map((event) => event._id));
	const notesByEventId = new Map<string, Note.Type[]>();

	for (const note of notes) {
		const eventId = note.doc?._id;
		if (!eventId || !eventIds.has(eventId)) {
			continue;
		}

		const eventNotes = notesByEventId.get(eventId);
		if (eventNotes) {
			eventNotes.push(note);
		} else {
			notesByEventId.set(eventId, [note]);
		}
	}

	const rows: EventListRow[] = [];
	for (const event of events) {
		const eventNotes = notesByEventId.get(event._id);
		if (!eventNotes?.length) {
			rows.push({ key: event._id, event, note: null });
			continue;
		}

		for (const note of eventNotes) {
			rows.push({
				key: `${event._id}:${note.id}`,
				event,
				note,
			});
		}
	}

	return rows;
}

interface DisplayGroupDialogProps {
	events: Doc.Type[];
	anchor?: { x: number; y: number } | null;
	onClose?: () => void;
}

/**
 * Displays a sorted group of events either as an anchored popup or full dialog.
 *
 * @param props - Event collection, optional popup anchor, and close callback.
 * @returns Virtualized event list with hover-preview controls.
 */
export function DisplayGroupDialog({ events, anchor, onClose }: DisplayGroupDialogProps) {
	const { spawnDialog, Info, app, currentDocument } = Application.use();
	const { t } = Locale.use();
	const dataStoreVersion = useSyncExternalStore(
		DataStore.subscribe,
		DataStore.getSnapshot,
	);
	const menuShellRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const eventRefsMap = useRef(new Map<string, HTMLDivElement>());
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
	const [hoveredEventData, setHoveredEventData] = useState<Doc.Type | null>(null);
	const [isLoadingHover, setIsLoadingHover] = useState(false);
	const [openTooltipRowKey, setOpenTooltipRowKey] = useState<string | null>(null);
	const [showTooltip, setShowTooltip] = useState(() => app.general.user?.user_data?.show_preview ?? true);
	const sortedEvents = useMemo(
		() => sortUniqueEventsByTimestamp(events),
		[events],
	);
	const eventRows = useMemo(
		() => buildEventRows(sortedEvents, DataStore.notes),
		[dataStoreVersion, sortedEvents],
	);

	useEffect(() => {
		setShowTooltip(app.general.user?.user_data?.show_preview ?? true);
	}, [app.general.user?.user_data?.show_preview]);

	// Close on click outside
	useEffect(() => {
		if (!anchor) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node | null;
			const isInsideTooltip = target instanceof Node && tooltipRef.current?.contains(target);
			if (!isInsideTooltip && menuShellRef.current && !menuShellRef.current.contains(target)) {
				onClose?.();
			}
		};

		currentDocument.addEventListener("mousedown", handleClickOutside);
		return () =>
			currentDocument.removeEventListener("mousedown", handleClickOutside);
	}, [anchor, currentDocument, onClose]);

	// Close tooltip on click outside
	useEffect(() => {
		if (!openTooltipRowKey) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node | null;
			if (!tooltipRef.current || !target) return;

			const isClickInside =
				e.composedPath().includes(tooltipRef.current) ||
				tooltipRef.current.contains(target);

			if (!isClickInside) {
				setOpenTooltipRowKey(null);
			}
		};

		// Use a small delay to avoid immediate closure
		const timer = setTimeout(() => {
			currentDocument.addEventListener("mousedown", handleClickOutside);
		}, 50);

		return () => {
			clearTimeout(timer);
			currentDocument.removeEventListener("mousedown", handleClickOutside);
		};
	}, [currentDocument, openTooltipRowKey]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
		};
	}, []);

	useEffect(() => {
		Info.setTimelineTarget(null);
	}, [Info]);

	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: eventRows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 44,
		overscan: 5,
	});

	const handleSelectEvent = useCallback(
		(event: Doc.Type) => {
			onClose?.();
			spawnDialog(null);
			spawnDialog(<DisplayEventDialog event={event} />);
		},
		[onClose, spawnDialog],
	);

	const handleEventHover = useCallback(
		async (event: Doc.Type) => {
			setHoveredEventId(event._id);

			// Check cache first
			if (tooltipEventCache.has(event._id)) {
				setHoveredEventData(tooltipEventCache.get(event._id) || null);
				return;
			}

			// Query gulp for the event
			setIsLoadingHover(true);
			try {
				const opId = Doc.Entity.operationId(app, event);
				if (!opId) {
					console.warn("No opId found for event", event._id);
					return;
				}
				const fetchedEvent = await Info.query_single_id(event._id, opId);
				if (fetchedEvent) {
					tooltipEventCache.set(fetchedEvent._id, fetchedEvent);
					setHoveredEventData(fetchedEvent);
				} else {
					console.warn("No event returned from query");
				}
			} catch (error) {
				console.error("Failed to fetch event on hover:", error);
			} finally {
				setIsLoadingHover(false);
			}
		},
		[Info, app],
	);

	const clearCloseTimeout = useCallback(() => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	}, []);

	/**
	 * Schedules the row preview to close when the pointer leaves both row and preview.
	 *
	 * @param event - Mouse leave event emitted by the event row.
	 */
	const handleMouseLeaveEvent = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const target = currentDocument.elementFromPoint(
			event.clientX,
			event.clientY,
		);
		if (tooltipRef.current?.contains(target) || event.currentTarget.contains(target)) {
			return;
		}

		closeTimeoutRef.current = setTimeout(() => {
			setOpenTooltipRowKey(null);
		}, 100);
	}, [currentDocument]);

	const viewportSize = useMemo(() => {
		const activeWindow = currentDocument.defaultView ?? window;
		return {
			width: activeWindow.innerWidth,
			height: activeWindow.innerHeight,
		};
	}, [currentDocument]);

	const handleMouseLeaveTooltip = useCallback(() => {
		closeTimeoutRef.current = setTimeout(() => {
			setOpenTooltipRowKey(null);
		}, 100);
	}, []);

	/**
	 * Stores the current event row element so hover previews can anchor to it.
	 *
	 * @param rowKey - Unique virtual row key associated with the rendered row.
	 * @param element - Rendered row element, or null when React unmounts it.
	 */
	const setEventElementRef = useCallback(
		(rowKey: string, element: HTMLDivElement | null) => {
			if (element) {
				eventRefsMap.current.set(rowKey, element);
				return;
			}

			eventRefsMap.current.delete(rowKey);
		},
		[],
	);

	/**
	 * Updates the persisted hover-preview preference for the current user.
	 *
	 * @param checked - Whether hover previews should be enabled.
	 */
	const handleShowPreviewChange = useCallback(
		(checked: boolean) => {
			setShowTooltip(checked);
			if (!checked) {
				setOpenTooltipRowKey(null);
			}
			if (app.general.user) {
				void Info.user_set_data("show_preview", checked);
			}
		},
		[Info, app.general.user],
	);

	/**
	 * Renders the preview toggle as a compact icon control shared by every list shell.
	 *
	 * @returns Icon button that toggles event hover previews.
	 */
	const renderPreviewToggle = useCallback(
		() => (
			<Button
				variant="secondary"
				size="sm"
				icon={showTooltip ? "PreviewEye" : "EyeOff"}
				title={t("common.showPreview")}
				aria-label={t("common.showPreview")}
				aria-pressed={showTooltip}
				onClick={() => handleShowPreviewChange(!showTooltip)}
			/>
		),
		[handleShowPreviewChange, showTooltip, t],
	);

	/**
	 * Renders the note metadata cell for a virtualized event row.
	 *
	 * @param note - Note attached to the row, or null for unnoted events.
	 * @returns Note icon and title when present, otherwise an empty stable cell.
	 */
	const renderNoteInfo = useCallback((note: Note.Type | null) => {
		if (!note) {
			return (
				<div
					className={s.noteInfo}
					aria-hidden="true"
				/>
			);
		}

		return (
			<div
				className={s.noteInfo}
				title={note.name}
				style={{ "--note-color": note.color } as CSSProperties}
			>
				<Icon
					name={Note.Entity.icon(note)}
					size={16}
				/>
				<span>{note.name}</span>
			</div>
		);
	}, []);

	/**
	 * Renders a single event row and its optional hover preview portal.
	 *
	 * @param row - Event and note metadata to show in the list.
	 * @returns Event row with preview portal when preview data is available.
	 */
	const renderEvent = useCallback(
		(row: EventListRow) => {
			const { event, note } = row;
			if (!event) return null;

			const isTooltipOpen = showTooltip && openTooltipRowKey === row.key;
			const eventElement = eventRefsMap.current.get(row.key);

			const tooltipContent = isTooltipOpen && hoveredEventData && hoveredEventId === event._id ? (
				<div className={s.previewContent}>
					<p className={s.previewTitle}>
						{event._id}
					</p>
					<p className={s.previewCode}>
						{event["gulp.event_code"] || "N/A"}
					</p>
					<div className={s.previewMarkdown}>
						<Markdown
							scrollable={false}
							value={`\`\`\`json\n${JSON.stringify(hoveredEventData, null, 2)}`}
						/>
					</div>
				</div>
			) : isTooltipOpen && isLoadingHover && hoveredEventId === event._id ? (
				<div className={s.previewLoading}>{t("common.loading")}</div>
			) : null;

			const tooltipPortal = tooltipContent && eventElement ? (
				createPortal(
					<div
						ref={tooltipRef}
						className={s.previewPortal}
						onMouseEnter={clearCloseTimeout}
						onMouseLeave={handleMouseLeaveTooltip}
						style={resolvePreviewStyle(
							eventElement.getBoundingClientRect(),
							viewportSize,
						)}
						onClick={(e) => e.stopPropagation()}
					>
						{tooltipContent}
					</div>,
					currentDocument.body,
				)
			) : null;

			return (
				<>
					<Stack
						ref={(el) => {
							setEventElementRef(row.key, el);
						}}
						className={s.event}
						onClick={() => handleSelectEvent(event)}
						onMouseEnter={() => {
							if (!showTooltip) return;
							clearCloseTimeout();
							handleEventHover(event);
							setOpenTooltipRowKey(row.key);
						}}
						onMouseLeave={handleMouseLeaveEvent}
					>
						<EventIndicator event={event} />
						<Stack
							dir="column"
							jc="space-evenly"
							ai="flex-start"
							flex
							className={s.info}
							gap={2}
						>
							<p className={s.id}>
								{`${format(new Date(event.gulp_timestamp), "yyyy-MM-dd HH:mm:ss")}.${String(Internal.Transformator.toNanos(event.gulp_timestamp) % 1_000_000n).padStart(6, "0")}`}{" "}
								| {event["gulp.event_code"]}
							</p>
							<span className={s.description}>{event._id}</span>
						</Stack>
						{renderNoteInfo(note)}
					</Stack>
					{tooltipPortal}
				</>
			);
		},
		[handleSelectEvent, handleEventHover, hoveredEventData, hoveredEventId, isLoadingHover, openTooltipRowKey, clearCloseTimeout, handleMouseLeaveEvent, handleMouseLeaveTooltip, renderNoteInfo, setEventElementRef, showTooltip, t, viewportSize, currentDocument],
	);

	/**
	 * Renders the sorted events through the virtualizer and appends shared list controls.
	 *
	 * @param listClassName - CSS class applied to the scroll container for the current shell.
	 * @returns Virtualized sorted event list with the preview toggle control.
	 */
	const renderSortedEventsList = useCallback(
		(listClassName: string) => (
			<>
				<div
					ref={parentRef}
					className={listClassName}
				>
					<div
						className={s.virtualSpacer}
						style={{ height: `${virtualizer.getTotalSize()}px` }}
					>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const row = eventRows[virtualItem.index];

							return (
								<div
									key={row?.key ?? virtualItem.key}
									className={s.virtualRow}
									style={{
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`,
									}}
								>
									{row ? renderEvent(row) : null}
								</div>
							);
						})}
					</div>
				</div>
				<div className={s.dialogToolbar}>
					{renderPreviewToggle()}
				</div>
			</>
		),
		[eventRows, renderEvent, renderPreviewToggle, virtualizer],
	);

	const popupStyle = useMemo(() => {
		if (!anchor) return undefined;

		return resolveAnchoredBoxStyle(
			anchor,
			{ width: EVENT_LIST_WIDTH, height: EVENT_LIST_HEIGHT },
			viewportSize,
		);
	}, [anchor, viewportSize]);

	if (anchor) {
		return createPortal(
			<div
				className={s.menuShell}
				style={popupStyle}
				ref={menuShellRef}
			>
				<div className={s.menuHeader}>
					<span className={s.menuTitle}>{t("common.events")}</span>
					<button
						type="button"
						className={s.closeButton}
						onClick={() => onClose?.()}
						aria-label={t("group.closeEventList")}
					>
						×
					</button>
				</div>
				{renderSortedEventsList(s.menuBody)}
			</div>,
			currentDocument.body,
		);
	}

	return (
		<Dialog>
			{renderSortedEventsList(s.dialogEventList)}
		</Dialog>
	);
}
