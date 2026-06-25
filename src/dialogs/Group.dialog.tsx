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
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Doc } from "@/entities/Doc";
import { Stack } from "@/ui/Stack";
import { format } from "date-fns";
import { Markdown } from "@/ui/Markdown";

import s from "./styles/DisplayGroupDialog.module.css";
import { Internal } from "@/entities/addon/Internal";
import { Locale } from "@/locales";

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
	const menuShellRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const eventRefsMap = useRef(new Map<string, HTMLDivElement>());
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
	const [hoveredEventData, setHoveredEventData] = useState<Doc.Type | null>(null);
	const [isLoadingHover, setIsLoadingHover] = useState(false);
	const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
	const [showTooltip, setShowTooltip] = useState(() => app.general.user?.user_data?.show_preview ?? true);
	const sortedEvents = useMemo(
		() => events.toSorted((a, b) => a.gulp_timestamp - b.gulp_timestamp),
		[events],
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
		if (!openTooltipId) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node | null;
			if (!tooltipRef.current || !target) return;

			const isClickInside =
				e.composedPath().includes(tooltipRef.current) ||
				tooltipRef.current.contains(target);

			if (!isClickInside) {
				setOpenTooltipId(null);
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
	}, [currentDocument, openTooltipId]);

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
		count: sortedEvents.length,
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

	const handleMouseLeaveEvent = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
			const target = currentDocument.elementFromPoint(
				event.clientX,
				event.clientY,
			);
			if (tooltipRef.current?.contains(target) || event.currentTarget.contains(target)) {
				return;
			}

		closeTimeoutRef.current = setTimeout(() => {
			setOpenTooltipId(null);
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
			setOpenTooltipId(null);
		}, 100);
	}, []);

	/**
	 * Stores the current event row element so hover previews can anchor to it.
	 *
	 * @param eventId - Event identifier associated with the rendered row.
	 * @param element - Rendered row element, or null when React unmounts it.
	 */
	const setEventElementRef = useCallback(
		(eventId: string, element: HTMLDivElement | null) => {
			if (element) {
				eventRefsMap.current.set(eventId, element);
				return;
			}

			eventRefsMap.current.delete(eventId);
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
				setOpenTooltipId(null);
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
	 * Renders a single event row and its optional hover preview portal.
	 *
	 * @param event - Event document to show in the list.
	 * @returns Event row with preview portal when preview data is available.
	 */
	const renderEvent = useCallback(
		(event: Doc.Type) => {
			if (!event) return null;

			const isTooltipOpen = showTooltip && openTooltipId === event._id;
			const eventElement = eventRefsMap.current.get(event._id);

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
							setEventElementRef(event._id, el);
						}}
						className={s.event}
						onClick={() => handleSelectEvent(event)}
						onMouseEnter={() => {
							if (!showTooltip) return;
							clearCloseTimeout();
							handleEventHover(event);
							setOpenTooltipId(event._id);
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
					</Stack>
					{tooltipPortal}
				</>
			);
		},
		[handleSelectEvent, handleEventHover, hoveredEventData, hoveredEventId, isLoadingHover, openTooltipId, clearCloseTimeout, handleMouseLeaveEvent, handleMouseLeaveTooltip, setEventElementRef, showTooltip, t, viewportSize, currentDocument],
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
							const event = sortedEvents[virtualItem.index];

							return (
								<div
									key={virtualItem.key}
									className={s.virtualRow}
									style={{
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`,
									}}
								>
									{event ? renderEvent(event) : null}
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
		[renderEvent, renderPreviewToggle, sortedEvents, virtualizer],
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
