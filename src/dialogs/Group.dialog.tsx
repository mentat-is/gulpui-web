import { DisplayEventDialog, EventIndicator } from "./Event.dialog";
import { Application } from "@/context/Application.context";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@/ui/Dialog";
import { Doc } from "@/entities/Doc";
import { Stack } from "@/ui/Stack";
import { format } from "date-fns";
import { Markdown } from "@/ui/Markdown";

import s from "./styles/DisplayGroupDialog.module.css";
import { Internal } from "@/entities/addon/Internal";

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

interface DisplayGroupDialogProps {
	events: Doc.Type[];
	anchor?: { x: number; y: number } | null;
	onClose?: () => void;
}

export function DisplayGroupDialog({ events, anchor, onClose }: DisplayGroupDialogProps) {
	const sortedEvents = events.toSorted((a, b) => a.gulp_timestamp - b.gulp_timestamp);
	const { spawnDialog, Info, app } = Application.use();
	const menuShellRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const eventRefsMap = useRef(new Map<string, HTMLDivElement>());
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
	const [hoveredEventData, setHoveredEventData] = useState<Doc.Type | null>(null);
	const [isLoadingHover, setIsLoadingHover] = useState(false);
	const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

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

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [anchor, onClose]);

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
			document.addEventListener("mousedown", handleClickOutside);
		}, 50);

		return () => {
			clearTimeout(timer);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [openTooltipId]);

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
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (tooltipRef.current?.contains(target) || event.currentTarget.contains(target)) {
			return;
		}

		closeTimeoutRef.current = setTimeout(() => {
			setOpenTooltipId(null);
		}, 100);
	}, []);

	const handleMouseLeaveTooltip = useCallback(() => {
		closeTimeoutRef.current = setTimeout(() => {
			setOpenTooltipId(null);
		}, 100);
	}, []);

	const renderEvent = useCallback(
		(event: Doc.Type) => {
			if (!event) return null;

			const showTooltip = openTooltipId === event._id;
			const eventElement = eventRefsMap.current.get(event._id);

			const tooltipContent = hoveredEventData && hoveredEventId === event._id ? (
				<div
					style={{ fontSize: "11px", maxWidth: 400 }}
				>
					<p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
						{event._id}
					</p>
					<p style={{ margin: "0 0 4px 0", color: "var(--second)" }}>
						{event["gulp.event_code"] || "N/A"}
					</p>
					<div
						style={{
							maxHeight: "250px",
							maxWidth: "400px",
							overflow: "auto",
							fontSize: "10px",
						}}
					>
						<Markdown
							value={`\`\`\`json\n${JSON.stringify(hoveredEventData, null, 2)}`}
						/>
					</div>
				</div>
			) : isLoadingHover && hoveredEventId === event._id ? (
				<div style={{ fontSize: "11px" }}>Loading...</div>
			) : null;

			const tooltipPortal = showTooltip && tooltipContent && eventElement ? createPortal(
				<div
					ref={tooltipRef}
					onMouseEnter={clearCloseTimeout}
					onMouseLeave={handleMouseLeaveTooltip}
					style={{
						position: "fixed",
						left: Math.max(12, eventElement.getBoundingClientRect().left - 420),
						top: eventElement.getBoundingClientRect().top,
						background: "var(--background-100)",
						border: "1px solid var(--border)",
						borderRadius: "0",
						padding: "8px",
						boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
						zIndex: 10000,
						pointerEvents: "auto",
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{tooltipContent}
				</div>,
				document.body
			) : null;

			return (
				<>
					<Stack
						ref={(el) => {
							if (el) eventRefsMap.current.set(event._id, el);
						}}
						className={s.event}
						onClick={() => handleSelectEvent(event)}
						onMouseEnter={() => {
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
		[handleSelectEvent, handleEventHover, hoveredEventData, hoveredEventId, isLoadingHover, openTooltipId, clearCloseTimeout, handleMouseLeaveEvent],
	);

	const popupStyle = useMemo(() => {
		if (!anchor) return undefined;

		const width = Math.min(340, window.innerWidth - 24);
		const height = Math.min(300, window.innerHeight - 24);
		const left = anchor.x + 14 + width <= window.innerWidth - 12
			? anchor.x + 14
			: Math.max(12, anchor.x - width - 14);
		const top = Math.min(anchor.y, window.innerHeight - height - 12);

		return {
			position: "fixed" as const,
			left,
			top: Math.max(12, top),
			width,
			height,
			maxHeight: height,
			maxWidth: width,
			zIndex: 1000,
		};
	}, [anchor]);

	if (anchor) {
		return createPortal(
			<div className={s.menuShell} style={popupStyle} ref={menuShellRef}>
				<div className={s.menuHeader}>
					<span className={s.menuTitle}>Events</span>
					<button
						type="button"
						className={s.closeButton}
						onClick={() => onClose?.()}
						aria-label="Close event list"
					>
						×
					</button>
				</div>
				<div className={s.menuBody}>
					{sortedEvents.map((event) => renderEvent(event))}
				</div>
			</div>,
			document.body,
		);
	}

	return (
		<Dialog>
			<div
				ref={parentRef}
				style={{ height: "100%", paddingRight: 12, overflow: "auto" }}
			>
				<div
					style={{
						height: `${virtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative",
					}}
				>
					{virtualizer.getVirtualItems().map((v) => (
						<div
							key={v.key}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: `${v.size}px`,
								transform: `translateY(${v.start}px)`,
							}}
						>
							{renderEvent(sortedEvents[v.index])}
						</div>
					))}
				</div>
			</div>
		</Dialog>
	);
}
