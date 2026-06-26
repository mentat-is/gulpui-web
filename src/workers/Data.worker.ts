/// <reference lib="webworker" />

import type { Doc } from "@/entities/Doc";
import type { Source } from "@/entities/Source";
import type { HashFunctionName } from "@/ui/utils";
import type {
	DataWorkerRequest,
	NormalizeQueryDocsPayload,
	QueryRawDocument,
	TimestampedWorkerItem,
	TimestampInput,
} from "./DataWorker.types";

const HASH_MOD = 8000;
const DEFAULT_FIELD = "gulp.event_code";
const DEFAULT_HASH_FUNCTION: HashFunctionName = "fnv1a";

const hashAlgorithms: Record<HashFunctionName, (value: string) => number> = {
	fnv1a: (value: string): number => {
		let hash = 0x811c9dc5;
		for (let i = 0; i < value.length; i++) {
			hash ^= value.charCodeAt(i);
			hash = Math.imul(hash, 0x01000193);
		}
		return hash >>> 0;
	},
	djb2: (value: string): number => {
		let hash = 5381;
		for (let i = 0; i < value.length; i++) {
			hash = Math.imul(hash, 33) + value.charCodeAt(i);
		}
		return hash >>> 0;
	},
	sdbm: (value: string): number => {
		let hash = 0;
		for (let i = 0; i < value.length; i++) {
			hash = value.charCodeAt(i) + Math.imul(hash, 65599);
		}
		return hash >>> 0;
	},
};

/**
 * Converts timestamp inputs to nanoseconds with the same rules used on the main thread.
 * @param value Raw timestamp value from a document.
 * @returns Nanosecond timestamp, or zero when conversion fails.
 */
function toNanos(value: TimestampInput | undefined): bigint {
	try {
		if (typeof value === "bigint") return value;

		if (value instanceof Date) return BigInt(value.getTime()) * 1_000_000n;

		if (typeof value === "object" && value !== null && "source" in value) {
			return BigInt(value.source);
		}

		if (typeof value === "number") {
			const str = String(Math.floor(value));
			if (str.length === 19) return BigInt(str);
			if (str.length === 16) return BigInt(str) * 1_000n;
			if (str.length === 13) return BigInt(str) * 1_000_000n;
			if (str.length <= 10) return BigInt(str) * 1_000_000_000n;
			return BigInt(value);
		}

		if (typeof value === "string") {
			if (/^\d+$/.test(value)) return toNanos(Number(value));
			const parsed = Date.parse(value);
			if (!Number.isNaN(parsed)) return BigInt(parsed) * 1_000_000n;
			return 0n;
		}

		return 0n;
	} catch {
		return 0n;
	}
}

/**
 * Converts timestamp inputs to rounded millisecond timestamps.
 * @param timestamp Raw timestamp value from a document.
 * @returns Millisecond timestamp rounded like Internal.Transformator.toTimestamp.
 */
function toTimestamp(timestamp: TimestampInput | undefined): number {
	return new Date(Math.round(Number(toNanos(timestamp)) / 1_000_000)).valueOf();
}

/**
 * Hashes a string into the render-engine numeric range.
 * @param value String value to hash.
 * @param hashFunction Hash function selected in source settings.
 * @returns Stable numeric hash in the render range.
 */
function stringToNumber(
	value: string,
	hashFunction: HashFunctionName = DEFAULT_HASH_FUNCTION,
): number {
	const algorithm = hashAlgorithms[hashFunction] ?? hashAlgorithms.fnv1a;
	return algorithm(value) % HASH_MOD;
}

/**
 * Converts arbitrary field values into render-engine numbers.
 * @param value Raw field value extracted from the document.
 * @param hashFunction Hash function selected in source settings.
 * @returns Numeric representation used by color and height renderers.
 */
function anyToNumber(
	value: unknown,
	hashFunction: HashFunctionName = DEFAULT_HASH_FUNCTION,
): number {
	switch (typeof value) {
		case "string":
			return stringToNumber(value, hashFunction);
		case "number":
			return value;
		case "bigint":
			return toTimestamp(value);
		default: {
			const result = Number(value);
			if (Number.isNaN(result)) {
				return 0;
			}
			return result;
		}
	}
}

/**
 * Safely reads nested document fields with support for dotted raw keys.
 * @param obj Document-like object to inspect.
 * @param path Dot-separated or raw field path.
 * @returns Field value, or undefined when absent.
 */
function getFieldValue(obj: QueryRawDocument, path: string): unknown {
	if (!path || !obj) return undefined;
	if (obj[path] !== undefined) return obj[path];

	const parts = path.split(".");
	for (let i = parts.length - 1; i > 0; i--) {
		const head = parts.slice(0, i).join(".");
		const tail = parts.slice(i).join(".");
		const headValue = obj[head];
		if (headValue !== undefined && typeof headValue === "object" && headValue !== null) {
			return getFieldValue(headValue as QueryRawDocument, tail);
		}
	}

	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * Returns the timestamp field used by worker-side sorting helpers.
 * @param item Item with either a note timestamp or document gulp timestamp.
 * @returns Sortable numeric timestamp.
 */
function getSortableTimestamp(item: TimestampedWorkerItem): number {
	return item.timestamp ?? item.gulp_timestamp ?? 0;
}

/**
 * Normalizes raw query documents, groups them by source, and sorts each group newest first.
 * @param payload Worker payload containing raw docs and source render settings.
 * @returns Prepared batches ready for main-thread insertion.
 */
function normalizeQueryDocs(
	payload: NormalizeQueryDocsPayload,
): Array<{ sourceId: Source.Id; docs: Doc.Type[] }> {
	const docsBySource = new Map<Source.Id, Doc.Type[]>();

	for (const raw of payload.docs) {
		const sourceId =
			(raw["gulp.source_id"] as Source.Id | undefined) ?? payload.fallbackSourceId;
		if (!sourceId) continue;

		const settings = payload.sourceSettingsById[sourceId] ?? {
			field: DEFAULT_FIELD,
			hash_function: DEFAULT_HASH_FUNCTION,
		};

		const normalized = {
			_id: raw._id,
			gulp_timestamp: toTimestamp(raw["gulp.timestamp"]),
			"gulp.source_id": sourceId,
			"gulp.event_code": raw["gulp.event_code"],
			number_hash: anyToNumber(
				getFieldValue(raw, settings.field),
				settings.hash_function,
			),
		} as Doc.Type;

		const group = docsBySource.get(sourceId);
		if (group) {
			group.push(normalized);
		} else {
			docsBySource.set(sourceId, [normalized]);
		}
	}

	return Array.from(docsBySource.entries()).map(([sourceId, docs]) => ({
		sourceId,
		docs: docs.sort((a, b) => b.gulp_timestamp - a.gulp_timestamp),
	}));
}

self.onmessage = (event: MessageEvent<DataWorkerRequest>) => {
	const { type, payload, id } = event.data;

	try {
		switch (type) {
			case "SORT_EVENTS": {
				const sorted = payload.sort(
					(a, b) => getSortableTimestamp(b) - getSortableTimestamp(a),
				);
				self.postMessage({ id, result: sorted });
				break;
			}

			case "BINARY_SEARCH_DESC": {
				const { items, timestamp, findFirst } = payload;
				let left = 0;
				let right = items.length - 1;
				let result = -1;

				while (left <= right) {
					const mid = Math.floor((left + right) / 2);
					const noteTime = getSortableTimestamp(items[mid]);

					if (findFirst) {
						if (noteTime <= timestamp) {
							result = mid;
							right = mid - 1;
						} else {
							left = mid + 1;
						}
					} else if (noteTime >= timestamp) {
						result = mid;
						left = mid + 1;
					} else {
						right = mid - 1;
					}
				}

				self.postMessage({ id, result });
				break;
			}

			case "NORMALIZE_QUERY_DOCS": {
				self.postMessage({
					id,
					result: { batches: normalizeQueryDocs(payload) },
				});
				break;
			}

			default:
				self.postMessage({ id, error: "Unknown worker action" });
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		self.postMessage({ id, error: message });
	}
};
