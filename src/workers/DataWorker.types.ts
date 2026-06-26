import type { Doc } from "@/entities/Doc";
import type { Source } from "@/entities/Source";
import type { HashFunctionName } from "@/ui/utils";

export type TimestampInput =
	| string
	| number
	| Date
	| bigint
	| { source: string; parsedValue: number };

export type QueryRawDocument = Record<string, unknown> &
	Partial<Pick<Doc.Type, "_id" | "gulp.source_id" | "gulp.event_code">> & {
		"gulp.timestamp"?: TimestampInput;
	};

export interface NormalizeQuerySourceSettings {
	field: string;
	hash_function: HashFunctionName;
}

export interface NormalizeQueryDocsPayload {
	docs: QueryRawDocument[];
	sourceSettingsById: Record<string, NormalizeQuerySourceSettings>;
	fallbackSourceId?: Source.Id;
}

export interface NormalizeQueryDocsResult {
	batches: Array<{
		sourceId: Source.Id;
		docs: Doc.Type[];
	}>;
}

export interface TimestampedWorkerItem {
	timestamp?: number;
	gulp_timestamp?: number;
}

export interface BinarySearchDescPayload {
	items: TimestampedWorkerItem[];
	timestamp: number;
	findFirst: boolean;
}

export interface DataWorkerPayloadMap {
	SORT_EVENTS: TimestampedWorkerItem[];
	BINARY_SEARCH_DESC: BinarySearchDescPayload;
	NORMALIZE_QUERY_DOCS: NormalizeQueryDocsPayload;
}

export interface DataWorkerResultMap {
	SORT_EVENTS: TimestampedWorkerItem[];
	BINARY_SEARCH_DESC: number;
	NORMALIZE_QUERY_DOCS: NormalizeQueryDocsResult;
}

export type DataWorkerAction = keyof DataWorkerPayloadMap;

export type DataWorkerRequest<TAction extends DataWorkerAction = DataWorkerAction> = {
	[Action in DataWorkerAction]: {
		type: Action;
		payload: DataWorkerPayloadMap[Action];
		id: string;
	};
}[TAction];

export interface DataWorkerResponse {
	id: string;
	result?: unknown;
	error?: string;
}
