import { MinMax } from "@/class/Info";
import { Info } from "./Info";
import { format } from "date-fns";
import { RulerDrawer } from "./Ruler.drawer";
import { DefaultEngine } from "../engines/Default.engine";
import { Engine, Hardcode, CacheKey } from "./Engine.dto";
import { HeightEngine } from "../engines/Height.engine";
import { GraphEngine } from "../engines/Graph.engine";
import { getCanvasIcon, CanvasIcon } from "@/ui/CanvasIcon";
import { Logger } from "@/dto/Logger.class";
import { Source } from "@/entities/Source";
import { Doc } from "@/entities/Doc";
import { Link } from "@/entities/Link";
import { Note } from "@/entities/Note";
import { Glyph } from "@/entities/Glyph";
import { Request } from "@/entities/Request";
import { Internal } from "@/entities/addon/Internal";
import { Color } from "@/entities/Color";
import { Operation } from "@/entities/Operation";
import { DataStore } from "@/store/DataStore";
import { Highlight } from "@/entities/Highlight";
import { Context } from "@/entities/Context";
import { stringToHexColor } from "@/ui/utils";
import { translate } from "@/locales/core";


const NOTE_SIZE = 32;
const NOTE_OFFSET = (NOTE_SIZE / 2) * -1;
const ALPHA_HIGHLIGHT = 29

interface RenderEngineConstructor {
	ctx: CanvasRenderingContext2D;
	limits: MinMax;
	info: Info;
	scrollX: number;
	scrollY: number;
	getPixelPosition: (timestamp: number) => number;
	mouseX?: number;
	mouseY?: number;
	visibleSources?: Source.Type[];
}

export interface Status {
	codes: number[];
	timestamp: number;
	heights: number[];
}

export type StatusMap = Map<number, Status> & {
	[Hardcode.Scale]: number;
};
type Engines = {
	[key in Engine.List]: Engine.Interface<any>;
};

export interface Dot {
	x: number;
	y: number;
	color: string;
}

type Group = [index: number, count: number];

export class RenderEngine implements RenderEngineConstructor, Engines {
	ctx!: CanvasRenderingContext2D;
	limits!: MinMax;
	info!: Info;
	getPixelPosition!: (timestamp: number) => number;
	scrollX!: number;
	scrollY!: number;
	mouseX?: number;
	mouseY?: number;
	segmentSize = 500;
	ruler!: RulerDrawer;
	private static instance: RenderEngine | null = null;
	default!: DefaultEngine;
	height!: HeightEngine;
	graph!: GraphEngine;
	shifted: Source.Type[] = [];
	visibleSources: Source.Type[] = [];

	// INTERACTIVE ELEMENTS IN CANVAS saved to manage clicks for notes and links
	public static interactiveNotes: Array<{
		notes: Note.Type[];
		rect: { x: number; y: number; w: number; h: number };
	}> = [];

	public static interactiveLinks: Array<{
		link: Link.Type;
		rect: { x: number; y: number; w: number; h: number };
	}> = [];

	// CACHE
	private static [CacheKey] = {
		notes: new Map() as Map<Source.Id, Group[]> & { [Hardcode.Scale]: number },
		range: new Map() as Map<
			Source.Id,
			MinMax & {
				[Hardcode.Length]: number;
				field: keyof Doc.Type;
			}
		>,
		flags: new Map() as Map<
			Doc.Id,
			{
				// Y coordinate
				y: number;
				// timestamp
				t: number;
				// offset
				o: number;
			}
		>,
	};

	/**
	 * Creates or updates the singleton RenderEngine instance.
	 *
	 * SINGLETON PATTERN: If an instance already exists, updates its properties
	 * (ctx, limits, scroll, etc.) and calls `updateRenderer()` on each sub-engine
	 * instead of creating new DefaultEngine/HeightEngine/GraphEngine instances.
	 * This avoids 3 constructor calls + singleton checks per frame.
	 *
	 * On first call, initializes the singleton with canvas context settings
	 * (image smoothing, font) and creates the sub-engines.
	 */
	constructor({
		ctx,
		limits,
		info,
		getPixelPosition,
		scrollY,
		scrollX,
		mouseX,
		mouseY,
		visibleSources,
	}: RenderEngineConstructor) {
		if (RenderEngine.instance) {
			RenderEngine.instance.visibleSources = visibleSources || [];
			RenderEngine.instance.ruler = new RulerDrawer({
				ctx,
				getPixelPosition,
				scrollX,
				scale: info.app.timeline.scale,
				selected: info.app.timeline.frame,
				width: info.width,
			});
			RenderEngine.instance.ctx = ctx;
			RenderEngine.instance.limits = limits;
			RenderEngine.instance.info = info;
			RenderEngine.instance.scrollX = scrollX;
			RenderEngine.instance.scrollY = scrollY;
			RenderEngine.instance.mouseX = mouseX;
			RenderEngine.instance.mouseY = mouseY;
			RenderEngine.instance.getPixelPosition = getPixelPosition;
			// Reuse engine singletons — only update their RenderEngine reference.
			// Avoids `new DefaultEngine()` etc. which would enter each constructor,
			// check the singleton, and return the existing instance anyway.
			RenderEngine.instance.default.updateRenderer(RenderEngine.instance);
			RenderEngine.instance.height.updateRenderer(RenderEngine.instance);
			RenderEngine.instance.graph.updateRenderer(RenderEngine.instance);
			return RenderEngine.instance;
		}
		this.mouseX = mouseX;
		this.mouseY = mouseY;
		this.visibleSources = visibleSources || [];
		this.ruler = new RulerDrawer({
			ctx,
			getPixelPosition,
			scrollX,
			scale: info.app.timeline.scale,
			selected: info.app.timeline.frame,
			width: info.width,
		});
		this.ctx = ctx;
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.imageSmoothingQuality = "high";
		this.ctx.font = "10px monospace";
		this.limits = limits;
		this.info = info;
		this.getPixelPosition = getPixelPosition;

		this.default = new DefaultEngine(this);
		this.height = new HeightEngine(this);
		this.graph = new GraphEngine(this);
		RenderEngine.instance = this;
		return this;
	}

	public lines = (file: Source.Type, y?: number) => {
		// Derive a deterministic per-row tint from the context_id hash, but constrained
		// to the current theme accent colour so monochrome themes stay monochrome.
		const tintAlpha = Color.Themer.contextTintAlpha(file.context_id);
		const context = Source.Entity.context(this.info.app, file);		
		const color = context.color ? context.color : stringToHexColor(file.context_id);
		y = typeof y === "number" ? y : Source.Entity.getHeight(this.info.app, file, this.scrollY, this.visibleSources.findIndex(s => s.id === file.id));

		// fill() paints fillRect(0, y-24, width, 48) which extends to y+24 — the exact
		// position of the separator. Draw fill first, then the separator on top so it
		// is not overwritten. Use reduced opacity so the line is lighter than the
		// fully-opaque text labels drawn afterwards by draw_info/locals.
		this.ctx.fillStyle = color;
		this.ctx.fillRect(0, y + 24, window.innerWidth, 1);
		
		this.fill(
			color,
			tintAlpha,
			y,
			!this.shifted.find((shiftedSource) => shiftedSource.id === file.id),
		);
	};

	public primary = (file: Source.Type, y?: number) => {
		y = typeof y === "number" ? y : Source.Entity.getHeight(this.info.app, file, this.scrollY, this.visibleSources.findIndex(s => s.id === file.id));

		// Draw top-edge marker at y-25 with reduced opacity so it is visibly lighter
		// than the fully-opaque text labels drawn below it (topmost text is at ~y-10).
		const savedAlpha = this.ctx.globalAlpha;
		this.ctx.globalAlpha = 0.35;
		this.ctx.fillStyle = Color.Themer.theme.BORDER;
		this.ctx.fillRect(0, y - 25, window.innerWidth, 1);
		this.ctx.globalAlpha = savedAlpha;
	};

	public fill = (color: string, alpha: number, y: number, isShifted: boolean) => {
		const base = isShifted ? alpha * 0.4 : alpha * 0.9;
		this.ctx.globalAlpha = Math.min(base, 0.18);
		this.ctx.fillStyle = color;
		this.ctx.fillRect(0, y - 24, window.innerWidth, 48);
		this.ctx.globalAlpha = 1;
	};

	/* LINK MANAGEMENT */

	public links = () => {
		RenderEngine.interactiveLinks = [];
		const canvasWidth = this.ctx.canvas.width;

		DataStore.links.forEach((link) => {
			const linkedDocIds = [link.doc_id_from, ...link.doc_ids];
			if (
				linkedDocIds.some(
					(id) =>
						!Source.Entity.selected(this.info.app).find(
							(s) =>
								s.id === Doc.Entity.id(this.info.app, id)?.["gulp.source_id"],
						),
				)
			)
				return;

			const { dots } = this.calcDots(link);

			const allOutsideLeft = dots.every((d) => d.x < -50);
			const allOutsideRight = dots.every((d) => d.x > canvasWidth + 50);
			if (allOutsideLeft || allOutsideRight) return;

			this.connection(dots);
			dots.forEach((dot) => this.dot(dot));

			// NUOVO: Calcoliamo i punti centrali tra i dot e disegniamo il badge del Link
			if (dots.length >= 2) {
				for (let i = 0; i < dots.length - 1; i++) {
					const start = dots[i];
					const end = dots[i + 1];

					const midX = (start.x + end.x) / 2;
					const midY = (start.y + end.y) / 2;

					this.renderLinkBadge(link, midX, midY);
				}
			}
		});
	};

	public renderLinkBadge = (link: Link.Type, x: number, y: number) => {
		const size = 24;
		const rectX = x - size / 2;
		const rectY = y - size / 2;
		const color = link.color || Color.Themer.theme.FONT_ACCENT;

		const isHovered =
			this.mouseX !== undefined &&
			this.mouseY !== undefined &&
			this.mouseX >= rectX &&
			this.mouseX <= rectX + size &&
			this.mouseY >= rectY &&
			this.mouseY <= rectY + size;

		this.ctx.save();

		// EFFETTO HOVER
		if (isHovered) {
			this.ctx.shadowColor = color;
			this.ctx.shadowBlur = 12;
			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = Color.Themer.theme.FONT_ACCENT;
		}

		this.drawRect(
			rectX,
			rectY,
			size,
			size,
			4,
			color,
			Color.Themer.theme.BACKGROUND_SECOND,
		);
		if (isHovered) this.ctx.stroke();

		const iconName = Link.Entity.icon(link);
		const icon = getCanvasIcon({ name: iconName, color });
		const iconSize = 16;
		this.ctx.drawImage(
			icon,
			x - iconSize / 2,
			y - iconSize / 2,
			iconSize,
			iconSize,
		);
		this.ctx.restore();

		RenderEngine.interactiveLinks.push({
			link,
			rect: { x: rectX, y: rectY, w: size, h: size },
		});
	};

	public connection = (dots: Dot[]) => {
		try {
			if (dots.length < 2) return;

			for (let i = 0; i < dots.length - 1; i++) {
				this.ctx.lineWidth = 2;
				const start = dots[i];
				const end = dots[i + 1] || dots[0];

				const gradient = this.ctx.createLinearGradient(
					start.x,
					start.y,
					end.x,
					end.y,
				);
				gradient.addColorStop(0, start.color);
				gradient.addColorStop(1, end.color);

				this.ctx.strokeStyle = gradient;

				this.ctx.beginPath();
				this.ctx.moveTo(start.x, start.y);
				this.ctx.lineTo(end.x, end.y);
				this.ctx.stroke();
			}
		} catch (_) { }
	};

	/* HIGHLIGHT MANAGEMENT */
	public highlight = (
		x: number,
		width: number,
		index: number,
		color: string,
	) => {
		
		if (color.startsWith("#")) {
			// Add 16% alpha (hex 29) if it's a 6-digit hex
			this.ctx.fillStyle = color.length === 7 ? color + ALPHA_HIGHLIGHT : color;
		} else {
			this.ctx.fillStyle = color;
		}
		const y = 32 * (index + 1);

		const height = this.ctx.canvas.height - 20 * 2 * (index + 1);

		this.ctx.fillRect(x, y, width, height);
	};

	public drawHighlights = () => {
		const highlights = Highlight.Entity.selected(this.info.app);
		const depths = Highlight.Entity.computeDepths(highlights);

		highlights.forEach((highlight, i) => {
			const xStart = this.getPixelPosition(highlight.time_range[0]);
			const xEnd = this.getPixelPosition(highlight.time_range[1]);
			const width = xEnd - xStart;

			this.highlight(xStart, width, depths[i], highlight.color);
		});
	};

	private getYForDoc = (id: Doc.Id): { y: number; t: number; o: number } => {
		const e = RenderEngine[CacheKey].flags.get(id);
		if (!e) {
			const operation = Operation.Entity.selected(this.info.app);
			const docs = Doc.Entity.flag.getDocs(this.info.app, operation?.id);

			let result = {
				y: 0,
				t: 0,
				o: 0,
			};

			docs.forEach((doc) => {
				const p = {
					y: Source.Entity.getHeight(this.info.app, doc["gulp.source_id"], 0, this.visibleSources.findIndex(s => s.id === doc["gulp.source_id"])),
					t: doc.gulp_timestamp,
					o:
						Source.Entity.id(this.info.app, doc["gulp.source_id"]).settings
							.offset ?? 0,
				};
				if (doc._id === id) {
					result = p;
				}
				RenderEngine[CacheKey].flags.set(doc._id, p);
			});

			return result;
		}
		return e;
	};
	/**
	 * Draws green line on position of every flagged event for the current operation
	 */
	public highlightFlaggedDocuments = () => {
		const operation = Operation.Entity.selected(this.info.app);
		const flagged = Doc.Entity.flag.getList(operation?.id);
		const canvasWidth = this.ctx.canvas.width;

		for (const id of flagged) {
			const doc = Doc.Entity.id(this.info.app, id);
			if (!doc) continue;
			const source = this.visibleSources.find(
				(s) => s.id === doc["gulp.source_id"],
			);
			if (!source) continue;

			const { y, t, o } = this.getYForDoc(id);

			const x = this.getPixelPosition(t + o);
			//if event is outside canvas, skip it
			if (x < -10 || x > canvasWidth + 10) continue;
			const dy = y - 24 - this.scrollY;

			this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
			this.ctx.fillRect(x - 1, dy - 2, 1, 51);
			this.ctx.fillRect(x, dy - 4, 1, 55);
			this.ctx.fillRect(x + 1, dy - 2, 1, 51);
		}
	};

	/* NOTE MANAGEMENT */
	public renderNote = (note: Note.Type, groupNotes: Note.Type[] = [note]) => {
		const timestamp = Note.Entity.timestamp(note);
		const x = this.getPixelPosition(timestamp) + NOTE_OFFSET;
		const y =
			Source.Entity.getHeight(this.info.app, note.source_id, this.scrollY, this.visibleSources.findIndex(s => s.id === note.source_id)) +
			NOTE_OFFSET;

		// Hit detection per l'Hover
		const isHovered =
			this.mouseX !== undefined &&
			this.mouseY !== undefined &&
			this.mouseX >= x &&
			this.mouseX <= x + NOTE_SIZE &&
			this.mouseY >= y &&
			this.mouseY <= y + NOTE_SIZE;

		this.ctx.save();

		const noteBorder = Color.Themer.theme.BORDER;
		const noteFill = Color.Themer.theme.BACKGROUND_SECOND;
		const noteAccent = note.color ?? Color.Themer.theme.BACKGROUND_ACCENT;
		const noteIcon = Color.Themer.theme.FONT_ACCENT;

		// EFFETTO HOVER
		if (isHovered) {
			this.ctx.shadowColor = noteBorder;
			this.ctx.shadowBlur = 12; // Effetto Glow
			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = noteBorder;
		}

		// Main
		this.drawRect(x, y, NOTE_SIZE, NOTE_SIZE, 5, noteBorder, noteFill);
		// Accent
		this.drawRect(
			x,
			y + NOTE_SIZE - 4,
			NOTE_SIZE,
			4,
			4,
			noteBorder,
			noteAccent,
		);

		if (isHovered) this.ctx.stroke();

		const icon = getCanvasIcon({
			name: Note.Entity.icon(note),
			color: noteIcon,
		});
		const iconSize = 16;
		const iconX = x + (NOTE_SIZE - iconSize) / 2;
		const iconY = y + (NOTE_SIZE - iconSize) / 2 - 1;

		this.ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);

		this.drawTextLabel(note.name, x + NOTE_SIZE / 2, y + 26, 120, noteBorder);
		this.ctx.restore();

		RenderEngine.interactiveNotes.push({
			notes: groupNotes,
			rect: { x, y, w: NOTE_SIZE, h: NOTE_SIZE },
		});
	};

	private getVisibleNotes = (file: Source.Id) => {
		const notes = Note.Entity.findByFile(this.info.app, file);
		const min = this.getTimestamp(-128);
		const max = this.getTimestamp(this.ctx.canvas.width + 128);

		// Since notes are sorted in descending order, we need to find:
		// - first note <= max (leftmost visible note)
		// - last note >= min (rightmost visible note)
		const start = this.binarySearchDesc(notes, max, true); // Find first note <= max
		const end = this.binarySearchDesc(notes, min, false); // Find last note >= min

		if (start === -1 || end === -1 || start > end) return [];

		return notes.slice(start, end + 1);
	};

	private calculateNotesGroups(file: Source.Id): {
		notes: Note.Type[];
		groups: Group[];
	} {
		const notes = this.getVisibleNotes(file);
		if (notes.length === 0) {
			RenderEngine[CacheKey].notes.set(file, []);
			RenderEngine[CacheKey].notes[Hardcode.Scale] =
				this.info.app.timeline.scale;
			return {
				notes: [],
				groups: [],
			};
		}

		if (
			RenderEngine[CacheKey].notes[Hardcode.Scale] ===
			this.info.app.timeline.scale &&
			RenderEngine[CacheKey].notes.has(file)
		) {
			return {
				notes,
				groups: RenderEngine[CacheKey].notes.get(file)!,
			};
		}

		const groups: Group[] = [];

		for (let i = 0; i < notes.length;) {
			const groupEndIdx = this.findGroupEndIndexDirect(notes, i);
			groups.push([i, groupEndIdx - i + 1]);
			i = groupEndIdx + 1;
		}

		RenderEngine[CacheKey].notes.set(file, groups);
		RenderEngine[CacheKey].notes[Hardcode.Scale] = this.info.app.timeline.scale;
		return { notes, groups };
	}

	private findGroupEndIndexDirect(
		notes: Note.Type[],
		startIdx: number,
	): number {
		const startTimestamp = Note.Entity.timestamp(notes[startIdx]);
		const startX = this.getPixelPosition(startTimestamp);

		// Since notes are in descending order, we search forward (higher indices = earlier timestamps)
		// but we want to group notes that are close in pixel position
		let endIdx = startIdx;

		// Linear search forward to find all notes within 24 pixels
		for (let i = startIdx + 1; i < notes.length; i++) {
			const currentX = this.getPixelPosition(Note.Entity.timestamp(notes[i]));
			const distance = Math.abs(currentX - startX);

			if (distance <= 32) {
				endIdx = i;
			} else {
				break; // Since we're going in timestamp order, if this one is too far, the rest will be too
			}
		}

		return endIdx;
	}

	// Fixed binary search for descending order
	private binarySearchDesc(
		notes: Note.Type[],
		timestamp: number,
		findFirst: boolean,
	): number {
		let left = 0,
			right = notes.length - 1,
			result = -1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const noteTime = Note.Entity.timestamp(notes[mid]);

			if (findFirst) {
				// Finding first note <= timestamp (leftmost)
				if (noteTime <= timestamp) {
					result = mid;
					right = mid - 1; // Look for earlier index (smaller timestamp)
				} else {
					left = mid + 1; // Current note too large, go right
				}
			} else {
				// Finding last note >= timestamp (rightmost)
				if (noteTime >= timestamp) {
					result = mid;
					left = mid + 1; // Look for later index (larger timestamp)
				} else {
					right = mid - 1; // Current note too small, go left
				}
			}
		}

		return result;
	}

	public notes = (files: Source.Type[]) => {
		RenderEngine.interactiveNotes = [];
		if (!files || !files.length) return;
		files.forEach((file) => {
			const { notes, groups } = this.calculateNotesGroups(file.id);
			if (!notes.length) {
				return;
			}

			groups.forEach((group) => {
				if (!group || group.length < 2 || !notes[group[0]]) return;

				const groupNotes = notes
					.slice(group[0], group[0] + group[1])
					.filter((n) => Doc.Entity.id(this.info.app, n.doc._id));
				if (groupNotes.length === 0) return;

				if (groupNotes.length === 1) {
					this.renderNote(groupNotes[0]);
				} else {
					this.renderNote(
						{
							...groupNotes[0],
							name: `${groupNotes.length}`,
							color: Color.Themer.theme.FONT_ACCENT,
							glyph_id: Glyph.getIdByName("Status"),
						},
						groupNotes,
					);
				}
			});
		});
	};

	/* CANVAS DRAW Utility*/

	public dot = ({ x, y, color }: Dot) => {
		this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
		this.ctx.beginPath();
		if (typeof this.ctx.roundRect == "function") {
			this.ctx.roundRect(x - 4, y - 4, 8, 8, [999]);
		}

		this.ctx.fill();
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		if (typeof this.ctx.roundRect == "function") {
			this.ctx.roundRect(x - 3, y - 3, 6, 6, [999]);
		}

		this.ctx.fill();
	};

	public calcDots = (
		link: Link.Type,
	): {
		dots: Dot[];
	} => {
		const dots: Dot[] = [];
		const linkedDocIds = [link.doc_id_from, ...link.doc_ids];

		linkedDocIds.forEach((id) => {
			const e = Doc.Entity.id(this.info.app, id);
			if (!e) {
				return;
			}
			const index = this.visibleSources.findIndex(
				(f) => f.id === e["gulp.source_id"],
			);

			const x = this.getPixelPosition(
				e.gulp_timestamp +
				(Source.Entity.id(this.info.app, e["gulp.source_id"])?.settings
					.offset || 0),
			);
			const y = index * 48 + 20 - this.scrollY || 0;
			const color = link.color || Color.Themer.theme.FONT_ACCENT;

			dots.push({
				x,
				y,
				color: color.endsWith("48") ? color.slice(-2) : color,
			});
		});

		return { dots };
	};

	public locals = (file: Source.Type, y?: number) => {
		y = typeof y === "number" ? y : Source.Entity.getHeight(this.info.app, file, this.scrollY, this.visibleSources.findIndex(s => s.id === file.id));

		const right =
			this.getPixelPosition(file.timestamp.max + file.settings.offset) + 12;
		const left =
			this.getPixelPosition(file.timestamp.min + file.settings.offset) - 12;
		const line = {
			one: y - 6,
			two: y + 4,
			three: y + 14,
		};

		this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
		this.ctx.fillRect(
			this.getPixelPosition(file.timestamp.max + file.settings.offset) + 1,
			y - 24,
			1,
			48 - 1,
		);
		this.ctx.fillRect(
			this.getPixelPosition(file.timestamp.min + file.settings.offset) - 1,
			y - 24,
			1,
			48 - 1,
		);

		const events = Doc.Entity.get(this.info.app, file.id).length.toString();

		this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;

		this.ctx.textAlign = "left";
		this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
		this.ctx.fillText(file.total.toString(), right, line.one);
		this.ctx.fillStyle = Color.Themer.theme.FONT_SECOND;
		this.ctx.fillText(
			format(file.timestamp.max + file.settings.offset, "dd.MM.yyyy"),
			right,
			line.two,
		);
		this.ctx.fillStyle = Color.Themer.theme.FONT_SECOND;
		this.ctx.fillText(events, right, line.three);

		this.ctx.textAlign = "right";
		this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
		this.ctx.fillText(file.total.toString(), left, line.one);
		this.ctx.fillStyle = Color.Themer.theme.FONT_SECOND;
		this.ctx.fillText(
			format(file.timestamp.min + file.settings.offset, "dd.MM.yyyy"),
			left,
			line.two,
		);
		this.ctx.fillStyle = Color.Themer.theme.FONT_SECOND;
		this.ctx.fillText(events, left, line.three);

		if (this.info.app.general.loadings.byFileId.has(file.id)) {
			this.loading(file);
		}
	};

	private drawRect(
		x: number,
		y: number,
		w: number,
		h: number,
		r: number,
		accent: string,
		color = Color.Themer.theme.BACKGROUND_SECOND,
	) {
		this.ctx.fillStyle = color;
		this.ctx.strokeStyle = accent;
		this.ctx.lineWidth = 1;

		this.ctx.beginPath();
		if (typeof this.ctx.roundRect === "function") {
			this.ctx.roundRect(x, y, w, h, r);
		} else {
			this.ctx.rect(x, y, w, h);
		}
		this.ctx.fill();
		this.ctx.stroke();
	}

	private drawTextLabel(
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		accent: string,
	) {
		this.ctx.font = '10px "GeistMono", sans-serif';
		const textWidth = this.ctx.measureText(text).width;
		const padding = 5;
		const labelWidth = Math.min(
			Math.max(textWidth + padding * 2, NOTE_SIZE),
			maxWidth,
		);
		const labelHeight = 20;

		const labelX = x - labelWidth / 2;

		this.drawRect(
			labelX,
			y + NOTE_SIZE - labelHeight - 2,
			labelWidth,
			labelHeight,
			5,
			accent,
		);

		this.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";

		let displayText = text;
		if (textWidth > maxWidth - padding * 2) {
			while (
				this.ctx.measureText(displayText + "...").width >
				maxWidth - padding * 2 &&
				displayText.length > 0
			) {
				displayText = displayText.slice(0, -1);
			}
			displayText += "...";
		}

		this.ctx.fillText(displayText, x, y + NOTE_SIZE - labelHeight / 2 - 2);
	}

	public getTimestamp = (x: number): number => {
		const visibleWidth = this.ctx.canvas.width * this.info.app.timeline.scale;
		const pixelOffset = x + this.scrollX;
		return (
			this.info.app.timeline.frame.min +
			(pixelOffset / visibleWidth) *
			(this.info.app.timeline.frame.max - this.info.app.timeline.frame.min)
		);
	};

	// TO BE REMOVE USED ONLY IN NOTE.Displayer not used
	public static getNotesByX = (
		file: Source.Type,
		x: number,
		padding = 16,
	): Note.Type[] => {
		if (!RenderEngine.instance) {
			return [];
		}

		const { notes, groups } = RenderEngine.instance.calculateNotesGroups(
			file.id,
		);
		if (groups.length === 0) {
			return [];
		}

		let bestGroup: [number, number] | null = null;
		let bestDistance = Infinity;

		for (const [groupIndex, groupCount] of groups) {
			const startNote = notes[groupIndex];
			const endNote = notes[groupIndex + groupCount - 1];

			const startX = RenderEngine.instance.getPixelPosition(
				Note.Entity.timestamp(startNote),
			);
			const endX = RenderEngine.instance.getPixelPosition(
				Note.Entity.timestamp(endNote),
			);

			const avgX = (startX + endX) / 2;
			const distance = Math.abs(avgX - x + 16);

			if (distance < bestDistance) {
				bestDistance = distance;
				bestGroup = [groupIndex, groupCount];
			} else {
				break;
			}
		}

		if (bestGroup) {
			const [groupIndex, groupCount] = bestGroup;
			return notes.slice(groupIndex, groupIndex + groupCount);
		}

		return [];
	};

	public loading = (file: Source.Type, y?: number) => {
		this.ctx.beginPath();
		this.ctx.strokeStyle = Color.Themer.theme.FONT_ACCENT;
		if (this.ctx.setLineDash) {
			this.ctx.setLineDash([5, 5]);
		}

		const height = typeof y === "number" ? y : Source.Entity.getHeight(this.info.app, file, this.scrollY, this.visibleSources.findIndex(s => s.id === file.id));
		this.ctx.moveTo(0, height);
		this.ctx.lineTo(2000, height);
		this.ctx.stroke();
		if (this.ctx.setLineDash) {
			this.ctx.setLineDash([]);
		}
	};

	public draw_info = (file: Source.Type, y?: number) => {
		y = (typeof y === "number" ? y : Source.Entity.getHeight(this.info.app, file, this.scrollY, this.visibleSources.findIndex(s => s.id === file.id))) + 4;
		const x = 10;
		const lineHeight = 14;

		const requestType = Source.Entity.getRequestType(this.info.app, file);
		const suffix = !requestType
			? ""
			: requestType === Request.Prefix.INGESTION
				? translate("renderEngine.ingestingSuffix")
				: translate("renderEngine.loadingSuffix");

		const context = Source.Entity.context(this.info.app, file);
		const lines: Array<{ text: string; dy: number; color: string }> = [
			{
				text: file.name + suffix,
				dy: 0,
				color: Color.Themer.theme.FONT_ACCENT,
			},
			{
				text: Source.Entity.events(this.info.app, file).length.toString(),
				dy: lineHeight,
				color: Color.Themer.theme.FONT_ACCENT,
			},
			{
				text:
					`${file.total.toString()} | ${context?.name || "Unknown"}` + suffix,
				dy: -lineHeight,
				color: Color.Themer.theme.FONT_SECOND,
			},
		];

		this.ctx.font = "12px sans-serif";

		this.ctx.textAlign = "left";
		for (const { text, dy, color } of lines) {
			this.ctx.fillStyle = color;
			this.ctx.fillText(text, x, y + dy);
		}
	};

	public target = (targetFile?: Source.Type, targetY?: number) => {
		if (!this.info.app.timeline.target) return;

		const file = Source.Entity.id(
			this.info.app,
			this.info.app.timeline.target["gulp.source_id"],
		);

		if (!file) return;
		if (targetFile && targetFile.id !== file.id) return;

		const selected = this.visibleSources;
		const index = selected.findIndex((f) => f.id === file.id);

		if (index === -1) return;

		const rowY =
			typeof targetY === "number"
				? targetY - 1
				: Source.Entity.getHeight(this.info.app, file, this.scrollY, index) - 1;

		this.ctx.save();
		this.ctx.globalAlpha = 0.7;
		this.ctx.strokeStyle = Color.Themer.getTargetGuideColor();
		this.ctx.lineWidth = 1;
		this.ctx.lineCap = "round";
		if (this.ctx.setLineDash) {
			this.ctx.setLineDash([1, 3]);
		}
		this.ctx.beginPath();
		this.ctx.moveTo(0, rowY + 0.5);
		this.ctx.lineTo(window.innerWidth, rowY + 0.5);
		this.ctx.stroke();
		this.ctx.restore();
	};

	public targetMarker = () => {
		if (!this.info.app.timeline.target) return;

		const file = Source.Entity.id(
			this.info.app,
			this.info.app.timeline.target["gulp.source_id"],
		);

		if (!file) return;

		const selected = this.visibleSources;
		const index = selected.findIndex((f) => f.id === file.id);

		if (index === -1) return;

		const targetX = this.getPixelPosition(
			this.info.app.timeline.target.gulp_timestamp + file.settings.offset,
		);

		this.ctx.save();
		this.ctx.globalAlpha = 0.7;
		this.ctx.strokeStyle = Color.Themer.getTargetGuideColor();
		this.ctx.lineWidth = 1;
		this.ctx.lineCap = "round";
		if (this.ctx.setLineDash) {
			this.ctx.setLineDash([1, 3]);
		}
		this.ctx.beginPath();
		this.ctx.moveTo(targetX + 0.5, 0);
		this.ctx.lineTo(targetX + 0.5, this.ctx.canvas.height);
		this.ctx.stroke();
		this.ctx.restore();
	};

	/* MEMORY MANAGEMENT */

	/** Clears a specific render cache (notes, range, or flags). Used to force recalculation. */
	public static reset = (key: keyof (typeof RenderEngine)[typeof CacheKey]) => {
		RenderEngine[CacheKey][key].clear();
	};

	/**
	 * Comprehensive memory cleanup — clears ALL render-related caches.
	 * Must be called when switching operations to prevent memory leaks.
	 *
	 * Clears:
	 * - RenderEngine's notes, range, and flags caches
	 * - DefaultEngine and HeightEngine per-source pixel maps (can hold 320k+ entries)
	 * - CanvasIcon SVG-to-bitmap cache
	 */
	public static clearAllCaches = () => {
		RenderEngine[CacheKey].notes.clear();
		RenderEngine[CacheKey].range.clear();
		RenderEngine[CacheKey].flags.clear();

		if (DefaultEngine.instance) {
			DefaultEngine.instance.map.clear();
		}
		if (HeightEngine.instance) {
			HeightEngine.instance.map.clear();
			HeightEngine.instance.cacheKeys.clear();
		}
		if (GraphEngine.instance) {
			GraphEngine.instance.map.clear();
		}
	};
}
