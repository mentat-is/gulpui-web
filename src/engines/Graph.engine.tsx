import { Source } from "@/entities/Source";
import { Engine, Hardcode } from "../class/Engine.dto";
import { Dot, RenderEngine } from "../class/RenderEngine";
import { throwableByTimestamp } from "@/ui/utils";
import { Color } from "@/entities/Color";

/**
 * Graph render engine: draws connected line graphs for event density over time.
 * Caches per-source graph points (Map<timestamp, height>) with scale/range metadata.
 * Singleton pattern — reused across frames.
 */
export class GraphEngine implements Engine.Interface<
	typeof GraphEngine.target
> {
	/** Reference to the parent RenderEngine. */
	private renderer!: RenderEngine;
	/** Singleton instance. */
	/** Singleton instance, accessible for cache clearing in clearAllCaches(). */
	public static instance: GraphEngine | null = null;
	/** Type definition for the per-source graph map with metadata symbols. */
	private static target: Map<number, number> & {
		[Hardcode.Scale]: number;
		[Hardcode.MaxHeight]: number;
		[Hardcode.Start]: number;
		[Hardcode.End]: number;
	};
	/** Per-source cache of graph data. Key: source ID, Value: graph point map. */
	map = new Map<Source.Id, typeof GraphEngine.target>();

	constructor(renderer: Engine.Constructor) {
		if (GraphEngine.instance) {
			GraphEngine.instance.renderer = renderer;
			return GraphEngine.instance;
		}
		this.renderer = renderer;
		GraphEngine.instance = this;
	}

	/** Updates the renderer reference without constructor overhead. Called per frame. */
	updateRenderer(renderer: Engine.Constructor) {
		this.renderer = renderer;
	}

	render(file: Source.Type, y: number, forcr?: boolean) {
		const sampleData =
			Source.Entity.samples(this.renderer.info.app, file) ?? [];
		if (sampleData.length === 0) return;

		const freq = file.settings.frequency_sample;
		const frame = this.renderer.info.app.timeline.frame;
		const timePer10Px =
			(10 * (frame.max - frame.min)) / this.renderer.info.width;

		const dynamicFrequency = Math.max(freq, timePer10Px);

		const dynamicBuckets = new Map<number, number>();
		let maxHeight = 0;

		const offset = file.timestamp.min;

		for (let i = 0; i < sampleData.length; i++) {
			const relativeTs = sampleData[i].min_timestamp - offset;
			const bucketIndex = Math.floor(relativeTs / dynamicFrequency);
			const newCount =
				(dynamicBuckets.get(bucketIndex) || 0) + sampleData[i].sample;
			dynamicBuckets.set(bucketIndex, newCount);
			if (newCount > maxHeight) maxHeight = newCount;
		}

		if (maxHeight === 0) return;

		const logMaxHeigh = Math.log1p(maxHeight);
		const minLimit = this.renderer.limits.min;
		const maxLimit = this.renderer.limits.max;

		const startBucketIdx =
			Math.floor((minLimit - offset) / dynamicFrequency) - 1;
		const endBucketIdx = Math.floor((maxLimit - offset) / dynamicFrequency) + 1;

		// Strict bounds to file's timeline
		const fileStartBucketIdx = 0; // Relative to offset, the file starts at bucket 0
		// Use Math.ceil(x) - 1 to find the precise ending bucket index and avoid an extra trailing zero-bucket if max lands perfectly on a boundary
		const fileEndBucketIdx = Math.max(
			0,
			Math.ceil((file.timestamp.max - offset) / dynamicFrequency) - 1,
		);

		const actualStartBucketIdx = Math.max(startBucketIdx, fileStartBucketIdx);
		const actualEndBucketIdx = Math.min(endBucketIdx, fileEndBucketIdx);

		let prevDot: Dot | null = null;

		for (let i = actualStartBucketIdx; i <= actualEndBucketIdx; i++) {
			let centerTimestamp =
				offset + i * dynamicFrequency + dynamicFrequency / 2;

			// Strictly clamp the rendered dot to the file's absolute boundaries so it never spills over the file's start/end
			if (centerTimestamp < file.timestamp.min)
				centerTimestamp = file.timestamp.min;
			if (centerTimestamp > file.timestamp.max)
				centerTimestamp = file.timestamp.max;

			const x = this.renderer.getPixelPosition(centerTimestamp);

			//X-AXIS VIEWPORT CULLING
			if (
				x < 0 - dynamicFrequency ||
				x > this.renderer.ctx.canvas.width + dynamicFrequency
			)
				continue;
			//Y-AXIS VIEWPORT CULLING
			if (y < -48 || y > this.renderer.ctx.canvas.height + 48) continue;

			const count = dynamicBuckets.get(i) || 0;

			// DRAW line bucket
			this.renderer.ctx.strokeStyle = Color.Themer.theme.BORDER;
			let startLine = this.renderer.getPixelPosition(
				offset + i * dynamicFrequency,
			);
			this.renderer.ctx.beginPath();
			this.renderer.ctx.moveTo(startLine, y);
			this.renderer.ctx.lineTo(startLine, y + 48);
			this.renderer.ctx.stroke();

			const currentDot = this.drawDot(y, count, logMaxHeigh, file, x);
			if (prevDot) {
				this.renderer.connection([prevDot, currentDot]);
			}
			prevDot = currentDot;
		}
	}

	private drawDot(
		y: number,
		count: number,
		logMaxHeight: number,
		file: Source.Type,
		x: number,
	) {
		const logCount = Math.log1p(count);
		const heightRatio = logMaxHeight > 0 ? logCount / logMaxHeight : 0;
		const dotY = y + 47 - Math.floor(heightRatio * 47);
		const color = Color.Entity.gradient(
			file.settings.render_color_palette,
			count,
			{
				min: 0,
				max: logMaxHeight,
			},
		);

		const currentDot = { x, y: dotY, color };

		this.renderer.ctx.font = "8px Arial";
		this.renderer.ctx.fillStyle = Color.Themer.theme.FONT_ACCENT;
		this.renderer.ctx.fillText(count.toString(), x - 3.5, dotY - 8);
		this.renderer.dot(currentDot);

		return currentDot;
	}

	get(file: Source.Type): typeof GraphEngine.target {
		const heightData = this.renderer.height.get(file);
		const result = new Map() as typeof GraphEngine.target;

		const entries = Array.from(heightData.entries());
		let lastRenderedX = -Infinity;
		let lastKey: number | undefined = undefined;

		for (let i = 0; i < entries.length; i++) {
			const [timestamp, height] = entries[i];
			const x = this.renderer.getPixelPosition(timestamp);

			if (x - lastRenderedX < 8) {
				if (lastKey !== undefined) {
					const prevHeight = result.get(lastKey) || 0;
					result.set(lastKey, prevHeight + height);
				}
				continue;
			}

			const prevEntry = i > 0 ? entries[i - 1] : null;

			if (prevEntry) {
				const [prevTimestamp] = prevEntry;
				const prevX = this.renderer.getPixelPosition(prevTimestamp);
				const gap = Math.abs(x - prevX);

				if (gap > 16) {
					const steps = Math.floor(gap / 16);
					const timestampStep = (timestamp - prevTimestamp) / (steps + 1);

					for (let step = 1; step <= steps; step++) {
						const fillTimestamp = prevTimestamp + timestampStep * step;
						const fillX = this.renderer.getPixelPosition(fillTimestamp);

						if (fillX - lastRenderedX >= 8) {
							result.set(fillTimestamp, 0);
							lastKey = fillTimestamp;
							lastRenderedX = fillX;
						}
					}
				}
			}

			result.set(timestamp, height);
			lastKey = timestamp;
			lastRenderedX = x;
		}

		const heights = Array.from(result.values());
		const timestamps = Array.from(result.keys());

		result[Hardcode.Scale] = this.renderer.info.app.timeline.scale;
		result[Hardcode.MaxHeight] = Math.max(...heights, 0);
		result[Hardcode.Start] = timestamps[0] ?? 0;
		result[Hardcode.End] = timestamps[timestamps.length - 1] ?? 0;

		this.map.set(file.id, result);

		return result;
	}

	is(file: Source.Type): boolean {
		return this.map.has(file.id);
	}
}
