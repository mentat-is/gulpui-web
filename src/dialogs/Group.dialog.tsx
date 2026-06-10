import { DisplayEventDialog, EventIndicator } from "./Event.dialog";
import { Application } from "@/context/Application.context";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@/ui/Dialog";
import { Doc } from "@/entities/Doc";
import { Stack } from "@/ui/Stack";
import { format } from "date-fns";

import s from "./styles/DisplayGroupDialog.module.css";
import { Internal } from "@/entities/addon/Internal";

interface DisplayGroupDialogProps {
	events: Doc.Type[];
	anchor?: { x: number; y: number } | null;
	onClose?: () => void;
}

export function DisplayGroupDialog({ events, anchor, onClose }: DisplayGroupDialogProps) {
	const sortedEvents = events.toSorted((a, b) => a.gulp_timestamp - b.gulp_timestamp);
	const { spawnDialog, Info } = Application.use();

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

	const renderEvent = useCallback(
		(event: Doc.Type) => {
			if (!event) return null;

			return (
				<Stack
					className={s.event}
					onClick={() => handleSelectEvent(event)}
					key={event._id}
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
			);
		},
		[handleSelectEvent],
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
			<div className={s.menuShell} style={popupStyle}>
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
