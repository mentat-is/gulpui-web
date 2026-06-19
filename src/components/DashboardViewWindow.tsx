import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Application } from "@/context/Application.context";
import { Extension } from "@/context/Extension.context";
import { GulpDataset } from "@/class/Info";
import { Source } from "@/entities/Source";
import { Operation } from "@/entities/Operation";
import { Filter } from "@/entities/Filter";
import { Internal } from "@/entities/addon/Internal";
import { OpenSearchQueryBuilder } from "@/components/QueryBuilder";
import { Bar, Line } from "@/components/DashboardChartAdapter";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Popover } from "@/ui/Popover";
import { Select } from "@/ui/Select";
import { Stack } from "@/ui/Stack";
import { Table } from "@/components/Table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/ui/Tooltip";
import { Locale } from "@/locales";
import { format } from "date-fns";
import s from "./styles/DashboardViewWindow.module.css";
import { Icon } from "@/ui/Icon";

export namespace DashboardViewWindow {
	export interface Props {
		onClose?: () => void;
	}
}

type AggregationFunction = "top_values" | "top_values_by_time" | "rare_values";
type DashboardChartType = "line_chart" | "vertical_chart";
type DashboardSharedObjectType = "fixed" | "operation" | "custom";
type FixedDashboardSharedObjectType = Extract<
	DashboardSharedObjectType,
	"fixed"
>;
type DateHistogramIntervalType = "calendar_interval" | "fixed_interval";

interface DateHistogramInterval {
	type: DateHistogramIntervalType;
	value: string;
}

interface AnalyticsFilterState {
	sourceIds: Source.Id[];
	range: {
		min: string;
		max: string;
	};
	textFilter: string;
	filters: Filter.Item[];
}

interface DashboardDefinition extends Record<string, unknown> {
	id: string;
	name: string;
	type?: DashboardSharedObjectType;
	dashboard: DashboardChartType;
	required_ecs?: string[];
	labels?: Record<string, string>;
	opensearch_query?: {
		aggs?: Record<string, unknown>;
		query?: Record<string, unknown>;
	};
	visible?: boolean;
}

interface FieldInfoRow extends Record<string, string | number> {
	field: string;
	type: string;
	sources: number;
}

interface AggregationTableRow extends Record<string, string | number> {
	value: string;
	count: number;
	percent: number;
}

interface TimeAggregationTableRow extends Record<string, string | number> {
	time: string;
	value: string;
	count: number;
}

interface ChartBucket {
	label: string;
	value: number;
	sourceId?: string;
}

interface ChartPalette {
	accent: string;
	border: string;
	text: string;
	grid: string;
	bars: string[];
}

const LAST_AGGREGATION_STORAGE_KEY = "dashboard.lastAggregationFunction";
const DEFAULT_TOP_VALUES_SIZE = 10;
const DEFAULT_TIME_BUCKET_SIZE = 5;
const DEFAULT_MAX_DOC_COUNT = 5;
const DEFAULT_AGGREGATION_INTERVAL = "15m";
const CALENDAR_INTERVAL_UNITS = new Set([
	"minute",
	"hour",
	"day",
	"week",
	"month",
	"quarter",
	"year",
]);
const CALENDAR_INTERVAL_VALUE_PATTERN = /^1\d*(?:M|q|y)$/;
const FIXED_INTERVAL_VALUE_PATTERN = /^\d+(?:ms|s|m|h|d)$/;

/**
 * Parses a positive integer input value for OpenSearch aggregation options.
 *
 * @param value - Raw numeric input text entered by the analyst.
 * @param fallback - Safe value to use when the input is empty or invalid.
 * @returns Positive integer accepted by aggregation size/count options.
 */
function parsePositiveIntegerInput(value: string, fallback: number): number {
	const parsed = Number.parseInt(value, 10);

	if (!Number.isFinite(parsed) || parsed < 1) {
		return fallback;
	}

	return parsed;
}

/**
 * Resolves whether a date histogram interval should use calendar or fixed mode.
 *
 * @param value - Raw interval text entered by the analyst.
 * @returns OpenSearch date_histogram interval key and sanitized value.
 */
function resolveDateHistogramInterval(value: string): DateHistogramInterval {
	const interval = value.trim();

	if (
		CALENDAR_INTERVAL_UNITS.has(interval) ||
		CALENDAR_INTERVAL_VALUE_PATTERN.test(interval)
	) {
		console.warn(`calendar_interval ${interval}`);
		return { type: "calendar_interval", value: interval };
	}

	if (FIXED_INTERVAL_VALUE_PATTERN.test(interval)) {
		console.warn(`fixed_interval ${interval}`);
		return { type: "fixed_interval", value: interval };
	}

	return { type: "fixed_interval", value: DEFAULT_AGGREGATION_INTERVAL };
}

/**
 * Converts a nanosecond timestamp string into a browser datetime-local value.
 *
 * @param nanos - Nanosecond timestamp accepted by the existing filter model.
 * @returns Date formatted for an input with type datetime-local.
 */
function formatDateTimeLocal(nanos: string): string {
	try {
		return format(
			Internal.Transformator.toTimestamp(nanos),
			"yyyy-MM-dd'T'HH:mm",
		);
	} catch {
		return "";
	}
}

/**
 * Resolves the initial dashboard time range from the currently available sources.
 *
 * @param sources - Sources participating in the current operation view.
 * @returns Min/max nanosecond range as strings.
 */
function resolveInitialRange(
	sources: Source.Type[],
): AnalyticsFilterState["range"] {
	const mins = sources
		.map((source) => source.nanotimestamp?.min)
		.filter(Boolean);
	const maxes = sources
		.map((source) => source.nanotimestamp?.max)
		.filter(Boolean);

	if (mins.length === 0 || maxes.length === 0) {
		const now = Internal.Transformator.toNanos(Date.now()).toString();
		return { min: now, max: now };
	}

	return {
		min: mins
			.reduce((min, value) => (value < min ? value : min), mins[0])
			.toString(),
		max: maxes
			.reduce((max, value) => (value > max ? value : max), maxes[0])
			.toString(),
	};
}

/**
 * Creates the initial filter state used by the Data Explorer.
 *
 * @param sources - Selected operation sources used to derive the default time range.
 * @returns Empty global filters scoped to the operation time range.
 */
function createInitialFilterState(
	sources: Source.Type[],
): AnalyticsFilterState {
	return {
		sourceIds: [],
		range: resolveInitialRange(sources),
		textFilter: "",
		filters: [],
	};
}

/**
 * Returns a stable string key for filter state changes that should refetch data.
 *
 * @param filterState - Current dashboard filter state.
 * @returns Serialized query-relevant filter values.
 */
function serializeFilterState(filterState: AnalyticsFilterState): string {
	return JSON.stringify({
		sourceIds: filterState.sourceIds,
		range: filterState.range,
		textFilter: filterState.textFilter,
		filters: filterState.filters,
	});
}

/**
 * Builds the OpenSearch bool query shared by dashboards and ad-hoc field aggregations.
 *
 * @param operationId - Selected operation identifier.
 * @param filterState - Global or dashboard-local filter state.
 * @param fieldTypeMap - Field type map used by the query builder conversion helpers.
 * @param defaultSourceIds - Source IDs selected in the main operation view.
 * @returns OpenSearch bool query object.
 */
function buildAnalyticsQuery(
	operationId: Operation.Id,
	filterState: AnalyticsFilterState,
	fieldTypeMap: Record<string, string>,
	defaultSourceIds: Source.Id[] = [],
): Record<string, unknown> {
	const sourceIds =
		filterState.sourceIds.length > 0 ? filterState.sourceIds : defaultSourceIds;
	const bool: Record<
		OpenSearchQueryBuilder.Operator,
		Record<string, unknown>[]
	> = {
		must: [{ term: { "gulp.operation_id": operationId } }],
		should: [],
		must_not: [],
		filter: [
			{
				range: {
					"gulp.timestamp": {
						gte: filterState.range.min,
						lte: filterState.range.max,
					},
				},
			},
		],
	};

	if (sourceIds.length > 0) {
		bool.must.push({ terms: { "gulp.source_id": sourceIds } });
	}

	if (filterState.textFilter.trim()) {
		bool.must.push({
			wildcard: {
				"event.original": {
					value: filterState.textFilter.trim(),
					case_insensitive: true,
				},
			},
		});
	}

	filterState.filters.forEach((item) => {
		if (!item.enabled) return;
		const clause = Filter.Entity.buildItemClause(item, fieldTypeMap);
		if (clause) {
			bool[item.operator].push(clause);
		}
	});

	Object.keys(bool).forEach((key) => {
		const operator = key as OpenSearchQueryBuilder.Operator;
		if (bool[operator].length === 0) {
			delete bool[operator];
		}
	});

	return { bool };
}

/**
 * Resolves the field name to use in terms-like aggregations.
 *
 * @param field - ECS/OpenSearch field selected by the analyst.
 * @param fieldTypeMap - Field type map returned by the backend.
 * @returns Aggregation-safe field name.
 */
function resolveAggregationField(
	field: string,
	fieldTypeMap: Record<string, string>,
): string {
	if (fieldTypeMap[field] === "text") {
		return `${field}.keyword`;
	}

	return field;
}

/**
 * Builds an aggregation body for the selected field and aggregation function.
 *
 * @param query - OpenSearch bool query built from the active filters.
 * @param field - Selected field to aggregate.
 * @param fieldTypeMap - Field type map returned by the backend.
 * @param aggregationFunction - Selected aggregation function.
 * @param options - Function-specific size, interval, and max-doc-count values.
 * @returns Query aggregation body accepted by /query_aggregation.
 */
function buildFieldAggregationBody(
	query: Record<string, unknown>,
	field: string,
	fieldTypeMap: Record<string, string>,
	aggregationFunction: AggregationFunction,
	options: {
		topValuesSize: number;
		timeBucketSize: number;
		interval: string;
		maxDocCount: number;
	},
): GulpDataset.QueryAggregation.Body {
	const aggregationField = resolveAggregationField(field, fieldTypeMap);

	if (aggregationFunction === "top_values_by_time") {
		const histogramInterval = resolveDateHistogramInterval(options.interval);

		return {
			query,
			aggs: {
				timeline_buckets: {
					date_histogram: {
						field: "@timestamp",
						[histogramInterval.type]: histogramInterval.value,
						min_doc_count: 0,
					},
					aggs: {
						top_values_in_bucket: {
							terms: {
								field: aggregationField,
								size: options.timeBucketSize,
							},
						},
					},
				},
			},
		};
	}

	if (aggregationFunction === "rare_values") {
		return {
			query,
			aggs: {
				rare_values: {
					rare_terms: {
						field: aggregationField,
						max_doc_count: options.maxDocCount,
					},
				},
			},
		};
	}

	return {
		query,
		aggs: {
			top_values: {
				terms: {
					field: aggregationField,
					size: options.topValuesSize,
					order: { _count: "desc" },
				},
			},
		},
	};
}

/**
 * Checks whether an unknown value can be safely inspected as an object record.
 *
 * @param value - Value to inspect before reading dynamic properties.
 * @returns True when the value is a non-array object record.
 */
function isRecordValue(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a dashboard definition type belongs to the fixed section.
 *
 * @param type - Dashboard scope/category returned inside the shared object payload.
 * @returns True for fixed dashboard definitions.
 */
function isFixedDashboardType(
	type: unknown,
): type is FixedDashboardSharedObjectType {
	return type === "fixed";
}

/**
 * Checks whether a dashboard object declares a supported chart renderer.
 *
 * @param dashboard - Dashboard chart field returned inside the shared object obj.
 * @returns True when the chart kind can be rendered by this view.
 */
function isDashboardChartType(
	dashboard: unknown,
): dashboard is DashboardChartType {
	return dashboard === "line_chart" || dashboard === "vertical_chart";
}

/**
 * Checks whether a normalized dashboard contains an aggregation definition.
 *
 * @param dashboard - Dashboard candidate to validate.
 * @returns True when the dashboard has OpenSearch aggregations to execute.
 */
function hasDashboardAggregations(
	dashboard: Record<string, unknown>,
): dashboard is DashboardDefinition {
	const opensearchQuery = dashboard.opensearch_query;
	return isRecordValue(opensearchQuery) && isRecordValue(opensearchQuery.aggs);
}

/**
 * Normalizes fixed shared object payloads into dashboard definitions.
 *
 * @param sharedObjects - Shared objects returned by the backend.
 * @returns Visible fixed dashboard definitions returned by the backend.
 */
function normalizeDashboardDefinitions(
	sharedObjects: GulpDataset.SharedObject.Type<Record<string, unknown>>[],
): DashboardDefinition[] {
	return sharedObjects
		.map((sharedObject) => {
			const definition = sharedObject.obj;
			const id =
				typeof definition.id === "string"
					? definition.id
					: (sharedObject.obj_id ?? sharedObject.id);
			const name =
				typeof definition.name === "string"
					? definition.name
					: sharedObject.name;

			const normalizedDefinition: Record<string, unknown> = {
				...definition,
				id,
				name,
			};

			return normalizedDefinition;
		})
		.filter((definition): definition is DashboardDefinition => {
			return (
				isFixedDashboardType(definition.type) &&
				definition.visible !== false &&
				typeof definition.id === "string" &&
				typeof definition.name === "string" &&
				isDashboardChartType(definition.dashboard) &&
				hasDashboardAggregations(definition)
			);
		});
}

/**
 * Builds the aggregation body for a fixed dashboard definition.
 *
 * @param dashboard - Dashboard definition to render.
 * @param query - Active OpenSearch bool query.
 * @returns Aggregation body or null when the definition cannot be queried.
 */
function buildDashboardAggregationBody(
	dashboard: DashboardDefinition,
	query: Record<string, unknown>,
): GulpDataset.QueryAggregation.Body | null {
	if (dashboard.opensearch_query?.aggs) {
		return {
			query,
			aggs: dashboard.opensearch_query.aggs,
		};
	}

	return null;
}

/**
 * Finds the first bucket list in an aggregation response.
 *
 * @param response - Aggregation response returned by the backend.
 * @returns Bucket array and aggregation key when available.
 */
function getFirstBucketAggregation(
	response: GulpDataset.QueryAggregation.Response,
) {
	for (const [name, aggregation] of Object.entries(
		response.aggregations ?? {},
	)) {
		if (Array.isArray(aggregation.buckets)) {
			return { name, buckets: aggregation.buckets };
		}
	}

	return { name: "", buckets: [] as GulpDataset.QueryAggregation.Bucket[] };
}

/**
 * Converts aggregation buckets to chart-ready label/value pairs.
 *
 * @param response - Aggregation response returned by the backend.
 * @returns Chart buckets for Chart.js datasets.
 */
function normalizeChartBuckets(
	response: GulpDataset.QueryAggregation.Response,
): ChartBucket[] {
	const { buckets } = getFirstBucketAggregation(response);

	return buckets.map((bucket) => ({
		label: String(bucket.key_as_string ?? bucket.key),
		value: bucket.doc_count,
		sourceId: typeof bucket.key === "string" ? bucket.key : undefined,
	}));
}

/**
 * Converts top/rare aggregation buckets to table rows.
 *
 * @param response - Aggregation response returned by the backend.
 * @returns Table rows with value, count, and percentage columns.
 */
function normalizeValueRows(
	response: GulpDataset.QueryAggregation.Response,
): AggregationTableRow[] {
	const { buckets } = getFirstBucketAggregation(response);
	const total = Math.max(response.total_hits, 1);

	return buckets.map((bucket) => ({
		value: String(bucket.key_as_string ?? bucket.key),
		count: bucket.doc_count,
		percent: Number(((bucket.doc_count / total) * 100).toFixed(2)),
	}));
}

/**
 * Converts time-bucketed top-value aggregations into flat table rows.
 *
 * @param response - Aggregation response returned by the backend.
 * @returns Table rows with time, value, and count columns.
 */
function normalizeTimeRows(
	response: GulpDataset.QueryAggregation.Response,
): TimeAggregationTableRow[] {
	const { buckets } = getFirstBucketAggregation(response);

	return buckets.flatMap((bucket) => {
		const nested = Object.values(bucket).find(
			(value): value is { buckets: GulpDataset.QueryAggregation.Bucket[] } => {
				return (
					typeof value === "object" &&
					value !== null &&
					"buckets" in value &&
					Array.isArray((value as { buckets?: unknown }).buckets)
				);
			},
		);

		if (!nested) {
			return [
				{
					time: String(bucket.key_as_string ?? bucket.key),
					value: "-",
					count: bucket.doc_count,
				},
			];
		}

		return nested.buckets.map((nestedBucket) => ({
			time: String(bucket.key_as_string ?? bucket.key),
			value: String(nestedBucket.key_as_string ?? nestedBucket.key),
			count: nestedBucket.doc_count,
		}));
	});
}

/**
 * Reads CSS custom properties into concrete colors that Canvas can render.
 *
 * @param documentRef - Document hosting the detached dashboard.
 * @returns Palette values for Chart.js datasets and axes.
 */
function readChartPalette(documentRef: Document): ChartPalette {
	const styles = documentRef.defaultView?.getComputedStyle(
		documentRef.documentElement,
	);
	const read = (name: string, fallback: string) =>
		styles?.getPropertyValue(name).trim() || fallback;

	return {
		accent: read("--accent", "#67e8f9"),
		border: read("--gray-400", "#3f3f46"),
		text: read("--gray-1000", "#e4e4e7"),
		grid: read("--gray-alpha-400", "rgba(128,128,128,0.28)"),
		bars: [
			read("--accent", "#67e8f9"),
			read("--second", "#fda4af"),
			"#a5b4fc",
			"#fcd34d",
			"#86efac",
			"#f0abfc",
		],
	};
}

/**
 * Renders global or card-local dashboard filter fields.
 *
 * @param props - Filter state, available field keys, and optional source selector data.
 */
function DashboardFilterEditor({
	filterState,
	setFilterState,
	fieldKeys,
	container,
	availableSources,
	inheritedSourceIds = [],
	showSourceSelector = true,
}: {
	filterState: AnalyticsFilterState;
	setFilterState: React.Dispatch<React.SetStateAction<AnalyticsFilterState>>;
	fieldKeys: string[];
	container: HTMLDivElement | null;
	availableSources?: Source.Type[];
	inheritedSourceIds?: Source.Id[];
	showSourceSelector?: boolean;
}) {
	const { t } = Locale.use();
	const selectedSourceIds =
		filterState.sourceIds.length > 0
			? filterState.sourceIds
			: inheritedSourceIds;

	const setSelectedSources = useCallback(
		(action: React.SetStateAction<Source.Id[]>) => {
			setFilterState((prev) => ({
				...prev,
				sourceIds:
					typeof action === "function" ? action(prev.sourceIds) : action,
			}));
		},
		[setFilterState],
	);

	const setTextFilter = useCallback(
		(textFilter: string) => {
			setFilterState((prev) => ({ ...prev, textFilter }));
		},
		[setFilterState],
	);

	const setFilters = useCallback(
		(action: Filter.Item[] | ((prev: Filter.Item[]) => Filter.Item[])) => {
			setFilterState((prev) => ({
				...prev,
				filters: typeof action === "function" ? action(prev.filters) : action,
			}));
		},
		[setFilterState],
	);

	const handleRangeChange = useCallback(
		(key: keyof AnalyticsFilterState["range"], value: string) => {
			setFilterState((prev) => ({
				...prev,
				range: {
					...prev.range,
					[key]: Internal.Transformator.toNanos(value).toString(),
				},
			}));
		},
		[setFilterState],
	);

	return (
		<Stack
			dir="column"
			ai="stretch"
			gap={12}
			className={s.filterEditor}
		>
			{showSourceSelector ? (
				<div className={s.filterControl}>
					<Source.Select.Multi
						sources={availableSources}
						selected={selectedSourceIds}
						setSelected={setSelectedSources}
						placeholder={t("dashboard.sourcesPlaceholder")}
					/>
				</div>
			) : null}
			<div className={s.timeGrid}>
				<Input
					label={t("common.from")}
					type="datetime-local"
					icon="Calendar"
					variant="highlighted"
					value={formatDateTimeLocal(filterState.range.min)}
					onChange={(event) => handleRangeChange("min", event.target.value)}
				/>
				<Input
					label={t("common.to")}
					type="datetime-local"
					icon="Calendar"
					variant="highlighted"
					value={formatDateTimeLocal(filterState.range.max)}
					onChange={(event) => handleRangeChange("max", event.target.value)}
				/>
			</div>
			<OpenSearchQueryBuilder.Query.String
				textFilter={filterState.textFilter}
				setTextFilter={setTextFilter}
				reset={() => setTextFilter("")}
			/>
			<OpenSearchQueryBuilder.Query.Add
				filters={filterState.filters}
				setFilters={setFilters}
				container={container}
			/>
			<OpenSearchQueryBuilder.Query.Filters
				filters={filterState.filters}
				setFilters={setFilters}
				keys={fieldKeys}
				container={container}
			/>
		</Stack>
	);
}

/**
 * Opens dashboard filters in a portal banner and applies changes on confirmation.
 *
 * @param props - Banner title, initial draft state, and apply callback.
 */
function DashboardFilterBanner({
	title,
	initialFilterState,
	onApply,
	fieldKeys,
	container,
	availableSources,
	inheritedSourceIds,
	showSourceSelector,
}: {
	title: string;
	initialFilterState: AnalyticsFilterState;
	onApply: (filterState: AnalyticsFilterState) => void;
	fieldKeys: string[];
	container: HTMLDivElement | null;
	availableSources?: Source.Type[];
	inheritedSourceIds?: Source.Id[];
	showSourceSelector: boolean;
}) {
	const { destroyBanner } = Application.use();
	const { t } = Locale.use();
	const [draftFilterState, setDraftFilterState] =
		useState<AnalyticsFilterState>(initialFilterState);

	/**
	 * Applies the draft filters to the owning dashboard scope and closes the banner.
	 *
	 * @returns Nothing.
	 */
	const handleApplyFilters = useCallback(() => {
		onApply(draftFilterState);
		destroyBanner();
	}, [destroyBanner, draftFilterState, onApply]);

	return (
		<Banner
			title={title}
			container={container}
			className={s.filterBanner}
			done={
				<Button
					icon="Check"
					variant="glass"
					onClick={handleApplyFilters}
				>
					{t("common.apply")}
				</Button>
			}
		>
			<DashboardFilterEditor
				filterState={draftFilterState}
				setFilterState={setDraftFilterState}
				fieldKeys={fieldKeys}
				container={container}
				availableSources={availableSources}
				inheritedSourceIds={inheritedSourceIds}
				showSourceSelector={showSourceSelector}
			/>
		</Banner>
	);
}

/**
 * Renders the compact Data Explorer source selector and opens the full filters banner.
 *
 * @param props - Global filter state and data needed by the banner editor.
 */
function DashboardFilterControls({
	filterState,
	setFilterState,
	fieldKeys,
	container,
	availableSources,
	inheritedSourceIds = [],
}: {
	filterState: AnalyticsFilterState;
	setFilterState: React.Dispatch<React.SetStateAction<AnalyticsFilterState>>;
	fieldKeys: string[];
	container: HTMLDivElement | null;
	availableSources?: Source.Type[];
	inheritedSourceIds?: Source.Id[];
}) {
	const { spawnBanner } = Application.use();
	const { t } = Locale.use();
	const selectedSourceIds =
		filterState.sourceIds.length > 0
			? filterState.sourceIds
			: inheritedSourceIds;

	/**
	 * Updates the global source selection while preserving the rest of the filters.
	 *
	 * @param action - New source IDs or updater callback from the source selector.
	 * @returns Nothing.
	 */
	const setSelectedSources = useCallback(
		(action: React.SetStateAction<Source.Id[]>) => {
			setFilterState((prev) => ({
				...prev,
				sourceIds:
					typeof action === "function" ? action(prev.sourceIds) : action,
			}));
		},
		[setFilterState],
	);

	/**
	 * Opens the global filter editor while leaving source selection in the sidebar.
	 *
	 * @returns Nothing.
	 */
	const openGlobalFilterBanner = useCallback(() => {
		spawnBanner(
			<DashboardFilterBanner
				title={t("common.filters")}
				initialFilterState={filterState}
				onApply={(draftFilterState) =>
					setFilterState((prev) => ({
						...draftFilterState,
						sourceIds: prev.sourceIds,
					}))
				}
				fieldKeys={fieldKeys}
				container={container}
				availableSources={availableSources}
				inheritedSourceIds={inheritedSourceIds}
				showSourceSelector={false}
			/>,
			"table",
		);
	}, [
		availableSources,
		container,
		fieldKeys,
		filterState,
		inheritedSourceIds,
		setFilterState,
		spawnBanner,
		t,
	]);

	return (
		<Stack
			dir="column"
			ai="stretch"
			gap={8}
		>
			<div className={s.filterControl}>
				<Source.Select.Multi
					sources={availableSources}
					selected={selectedSourceIds}
					setSelected={setSelectedSources}
					placeholder={t("dashboard.sourcesPlaceholder")}
				/>
			</div>
			<Button
				className={s.filterButton}
				icon="Filter"
				variant="secondary"
				onClick={openGlobalFilterBanner}
			>
				{t("common.filters")}
			</Button>
		</Stack>
	);
}

/**
 * Renders a fixed dashboard card and handles its aggregation lifecycle.
 *
 * @param props - Dashboard definition and query dependencies.
 */
function DashboardCard({
	dashboard,
	globalFilterState,
	fieldTypeMap,
	fieldKeys,
	container,
	palette,
	sourceNameById,
	defaultSourceIds,
	availableSources,
}: {
	dashboard: DashboardDefinition;
	globalFilterState: AnalyticsFilterState;
	fieldTypeMap: Record<string, string>;
	fieldKeys: string[];
	container: HTMLDivElement | null;
	palette: ChartPalette;
	sourceNameById: Map<string, string>;
	defaultSourceIds: Source.Id[];
	availableSources: Source.Type[];
}) {
	const { Info, app, spawnBanner } = Application.use();
	const { t } = Locale.use();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [response, setResponse] =
		useState<GulpDataset.QueryAggregation.Response | null>(null);
	const [settingsPopoverOpen, setSettingsPopoverOpen] = useState(false);
	const [customFiltersEnabled, setCustomFiltersEnabled] = useState(false);
	const [localFilterState, setLocalFilterState] =
		useState<AnalyticsFilterState>(globalFilterState);
	const operation = Operation.Entity.selected(app);
	const activeFilterState = customFiltersEnabled
		? localFilterState
		: globalFilterState;
	const filterSignature = serializeFilterState(activeFilterState);

	/**
	 * Opens the card-local filter editor and enables custom filters when applied.
	 *
	 * @returns Nothing.
	 */
	const openCustomFilterBanner = useCallback(() => {
		spawnBanner(
			<DashboardFilterBanner
				title={dashboard.name}
				initialFilterState={
					customFiltersEnabled ? localFilterState : globalFilterState
				}
				onApply={(draftFilterState) => {
					setLocalFilterState(draftFilterState);
					setCustomFiltersEnabled(true);
				}}
				fieldKeys={fieldKeys}
				container={container}
				availableSources={availableSources}
				inheritedSourceIds={defaultSourceIds}
				showSourceSelector
			/>,
			"table",
		);
	}, [
		availableSources,
		container,
		customFiltersEnabled,
		dashboard.name,
		defaultSourceIds,
		fieldKeys,
		globalFilterState,
		localFilterState,
		spawnBanner,
	]);

	/**
	 * Disables local dashboard filters and copies the current global filters as draft state.
	 *
	 * @returns Nothing.
	 */
	const resetCustomFiltersToGlobal = useCallback(() => {
		setLocalFilterState(globalFilterState);
		setCustomFiltersEnabled(false);
	}, [globalFilterState]);

	/**
	 * Closes the settings popover and opens the custom filter banner.
	 *
	 * @returns Nothing.
	 */
	const handleCustomFiltersAction = useCallback(() => {
		setSettingsPopoverOpen(false);
		openCustomFilterBanner();
	}, [openCustomFilterBanner]);

	/**
	 * Closes the settings popover and resets the dashboard to global filters.
	 *
	 * @returns Nothing.
	 */
	const handleResetCustomFiltersAction = useCallback(() => {
		setSettingsPopoverOpen(false);
		resetCustomFiltersToGlobal();
	}, [resetCustomFiltersToGlobal]);

	useEffect(() => {
		if (!operation) return;
		const query = buildAnalyticsQuery(
			operation.id,
			activeFilterState,
			fieldTypeMap,
			defaultSourceIds,
		);
		const body = buildDashboardAggregationBody(dashboard, query);
		if (!body) return;

		let cancelled = false;
		setLoading(true);
		setError(null);
		Info.query_aggregation(operation.id, body)
			.then((nextResponse) => {
				if (!cancelled) {
					setResponse(nextResponse);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError(t("dashboard.loadFailed"));
					setResponse(null);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		Info,
		dashboard,
		defaultSourceIds,
		fieldTypeMap,
		filterSignature,
		operation?.id,
		t,
	]);

	const buckets = useMemo(
		() =>
			normalizeChartBuckets(response ?? { total_hits: 0, aggregations: {} }),
		[response],
	);
	const labels = buckets.map((bucket) =>
		bucket.sourceId
			? (sourceNameById.get(bucket.sourceId) ?? bucket.label)
			: bucket.label,
	);
	const values = buckets.map((bucket) => bucket.value);
	const chartOptions = useMemo<ChartOptions<"line" | "bar">>(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: { enabled: true },
			},
			scales: {
				x: {
					ticks: { color: palette.text, maxRotation: 0, autoSkip: true },
					grid: { color: palette.grid },
				},
				y: {
					ticks: { color: palette.text },
					grid: { color: palette.grid },
					beginAtZero: true,
				},
			},
		}),
		[palette],
	);

	const lineData = useMemo<ChartData<"line">>(
		() => ({
			labels,
			datasets: [
				{
					label: dashboard.labels?.tooltip ?? dashboard.name,
					data: values,
					borderColor: palette.accent,
					backgroundColor: `${palette.accent}33`,
					fill: true,
					tension: 0.25,
					pointRadius: 2,
				},
			],
		}),
		[dashboard, labels, palette, values],
	);

	const barData = useMemo<ChartData<"bar">>(
		() => ({
			labels,
			datasets: [
				{
					label: dashboard.labels?.value ?? dashboard.name,
					data: values,
					backgroundColor: values.map(
						(_, index) => palette.bars[index % palette.bars.length],
					),
					borderColor: palette.border,
					borderWidth: 1,
				},
			],
		}),
		[dashboard, labels, palette, values],
	);

	return (
		<section className={s.dashboardCard}>
			<div className={s.cardHeader}>
				<h4
					className={s.cardTitle}
					title={dashboard.name}
				>
					{dashboard.name}
				</h4>
				<Popover.Root
					open={settingsPopoverOpen}
					onOpenChange={setSettingsPopoverOpen}
				>
					<Popover.Trigger asChild>
						<Button
							icon="Settings"
							variant="tertiary"
							title={t("dashboard.settings")}
						/>
					</Popover.Trigger>
					<Popover.Content
						align="end"
						container={container}
						className={s.cardSettingsPopover}
					>
						<Button
							className={s.cardSettingsOption}
							variant="secondary"
							icon="Filter"
							onClick={handleCustomFiltersAction}
						>
							{t("dashboard.useCustomFilters")}
						</Button>
						<Button
							className={s.cardSettingsOption}
							variant="tertiary"
							icon="RotateCcw"
							disabled={!customFiltersEnabled}
							onClick={handleResetCustomFiltersAction}
						>
							{t("dashboard.useGlobalFilters")}
						</Button>
					</Popover.Content>
				</Popover.Root>
			</div>
			<div className={s.chartArea}>
				{loading ? (
					<div className={s.placeholder}>{t("dashboard.loading")}</div>
				) : error ? (
					<div className={s.placeholder}>{error}</div>
				) : values.length === 0 ? (
					<div className={s.placeholder}>{t("dashboard.noData")}</div>
				) : dashboard.dashboard === "line_chart" ? (
					<Line
						data={lineData}
						options={chartOptions as ChartOptions<"line">}
						datasetIdKey="label"
					/>
				) : (
					<Bar
						data={barData}
						options={chartOptions as ChartOptions<"bar">}
						datasetIdKey="label"
					/>
				)}
			</div>
		</section>
	);
}

/**
 * Detached analytics window for operation-level dashboards and field aggregations.
 *
 * @param props - Optional close callback supplied by the detached window owner.
 */
export function DashboardViewWindow({ onClose }: DashboardViewWindow.Props) {
	const { app, Info, banner, currentDocument } = Application.use();
	const { extensions } = Extension.use();
	const { t } = Locale.use();
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const operation = Operation.Entity.selected(app);
	const operationSources = useMemo(
		() => Source.Entity.selected(app),
		[
			app.hidden.filesWithNoEvents,
			app.target.files,
			app.timeline.filter,
			app.timeline.renderVersion,
		],
	);
	const [filterState, setFilterState] = useState<AnalyticsFilterState>(() =>
		createInitialFilterState(operationSources),
	);
	const [fieldTypeMap, setFieldTypeMap] = useState<Record<string, string>>({});
	const [fieldSourceCounts, setFieldSourceCounts] = useState<
		Record<string, number>
	>({});
	const [dashboards, setDashboards] = useState<DashboardDefinition[]>([]);
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [aggregationFunction, setAggregationFunction] =
		useState<AggregationFunction>(() => {
			const stored = currentDocument.defaultView?.localStorage.getItem(
				LAST_AGGREGATION_STORAGE_KEY,
			);
			return stored === "top_values_by_time" || stored === "rare_values"
				? stored
				: "top_values";
		});
	const [topValuesSize, setTopValuesSize] = useState(
		String(DEFAULT_TOP_VALUES_SIZE),
	);
	const [timeBucketSize, setTimeBucketSize] = useState(
		String(DEFAULT_TIME_BUCKET_SIZE),
	);
	const [aggregationInterval, setAggregationInterval] = useState(
		DEFAULT_AGGREGATION_INTERVAL,
	);
	const [maxDocCount, setMaxDocCount] = useState(String(DEFAULT_MAX_DOC_COUNT));
	const [aggregationLoading, setAggregationLoading] = useState(false);
	const [aggregationResponse, setAggregationResponse] =
		useState<GulpDataset.QueryAggregation.Response | null>(null);
	const [aggregationError, setAggregationError] = useState<string | null>(null);
	const palette = useMemo(
		() => readChartPalette(currentDocument),
		[currentDocument, app.timeline.renderVersion],
	);
	const fieldKeys = useMemo(
		() => Object.keys(fieldTypeMap).sort((a, b) => a.localeCompare(b)),
		[fieldTypeMap],
	);
	const sourceNameById = useMemo(
		() => new Map(app.target.files.map((source) => [source.id, source.name])),
		[app.target.files],
	);
	const operationSourceIds = useMemo(
		() => operationSources.map((source) => source.id),
		[operationSources],
	);
	const dashboardExtensions = useMemo(
		() => Extension.getBySlot(extensions, Extension.Slot.DashboardView),
		[extensions],
	);

	useEffect(() => {
		setFilterState((prev) => {
			const range = resolveInitialRange(operationSources);
			return {
				...prev,
				range,
				sourceIds: prev.sourceIds.filter((id) =>
					operationSources.some((source) => source.id === id),
				),
			};
		});
	}, [operation?.id, operationSources]);

	useEffect(() => {
		currentDocument.defaultView?.localStorage.setItem(
			LAST_AGGREGATION_STORAGE_KEY,
			aggregationFunction,
		);
	}, [aggregationFunction, currentDocument]);

	useEffect(() => {
		let cancelled = false;
		Info.shared_object_list<Record<string, unknown>>({
			type: "shared_object",
			obj_type: "dashboard",
		})
			.then((sharedObjects) => {
				if (!cancelled) {
					setDashboards(normalizeDashboardDefinitions(sharedObjects));
				}
			})
			.catch(() => {
				if (!cancelled) {
					setDashboards([]);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [Info, operation?.id]);

	useEffect(() => {
		const sources =
			filterState.sourceIds.length > 0
				? filterState.sourceIds
						.map((id) => Source.Entity.id(app, id))
						.filter(Boolean)
				: operationSources;

		let cancelled = false;
		Promise.all(sources.map((source) => Info.event_keys(source))).then(
			(fieldMaps) => {
				if (cancelled) return;
				const nextFieldTypeMap: Record<string, string> = {};
				const nextCounts: Record<string, number> = {};

				fieldMaps.forEach((fieldMap) => {
					Object.entries(fieldMap).forEach(([field, type]) => {
						nextFieldTypeMap[field] = String(type);
						nextCounts[field] = (nextCounts[field] ?? 0) + 1;
					});
				});

				setFieldTypeMap(nextFieldTypeMap);
				setFieldSourceCounts(nextCounts);
			},
		);

		return () => {
			cancelled = true;
		};
	}, [Info, app, filterState.sourceIds, operationSources]);

	const fieldRows = useMemo<FieldInfoRow[]>(
		() =>
			fieldKeys.map((field) => ({
				field,
				type: fieldTypeMap[field] ?? "-",
				sources: fieldSourceCounts[field] ?? 0,
			})),
		[fieldKeys, fieldSourceCounts, fieldTypeMap],
	);

	/**
	 * Reads current aggregation controls and converts them into query-safe values.
	 *
	 * @returns Parsed aggregation option values with defaults for invalid inputs.
	 */
	const getFieldAggregationOptions = useCallback(
		() => ({
			topValuesSize: parsePositiveIntegerInput(
				topValuesSize,
				DEFAULT_TOP_VALUES_SIZE,
			),
			timeBucketSize: parsePositiveIntegerInput(
				timeBucketSize,
				DEFAULT_TIME_BUCKET_SIZE,
			),
			interval: aggregationInterval,
			maxDocCount: parsePositiveIntegerInput(
				maxDocCount,
				DEFAULT_MAX_DOC_COUNT,
			),
		}),
		[aggregationInterval, maxDocCount, timeBucketSize, topValuesSize],
	);

	/**
	 * Executes an aggregation request for a specific field and aggregation function.
	 *
	 * @param field - ECS/OpenSearch field selected from the available field list.
	 * @param nextAggregationFunction - Aggregation function to execute.
	 * @param options - Parsed function-specific aggregation options.
	 * @returns Nothing.
	 */
	const executeFieldAggregation = useCallback(
		(
			field: string,
			nextAggregationFunction: AggregationFunction,
			options: ReturnType<typeof getFieldAggregationOptions>,
		) => {
			if (!operation) return;
			const query = buildAnalyticsQuery(
				operation.id,
				filterState,
				fieldTypeMap,
				operationSourceIds,
			);
			const body = buildFieldAggregationBody(
				query,
				field,
				fieldTypeMap,
				nextAggregationFunction,
				options,
			);

			setAggregationLoading(true);
			setAggregationError(null);
			Info.query_aggregation(operation.id, body)
				.then(setAggregationResponse)
				.catch(() => {
					setAggregationResponse(null);
					setAggregationError(t("dashboard.loadFailed"));
				})
				.finally(() => setAggregationLoading(false));
		},
		[Info, fieldTypeMap, filterState, operation, operationSourceIds, t],
	);

	/**
	 * Runs the selected field aggregation with the current visible control values.
	 *
	 * @returns Nothing.
	 */
	const runFieldAggregation = useCallback(() => {
		if (!selectedField) return;
		executeFieldAggregation(
			selectedField,
			aggregationFunction,
			getFieldAggregationOptions(),
		);
	}, [
		aggregationFunction,
		executeFieldAggregation,
		getFieldAggregationOptions,
		selectedField,
	]);

	/**
	 * Changes the aggregation function and immediately reloads the selected field.
	 *
	 * @param value - Select value emitted by the aggregation function control.
	 * @returns Nothing.
	 */
	const handleAggregationFunctionChange = useCallback(
		(value: string) => {
			const nextAggregationFunction = value as AggregationFunction;
			setAggregationFunction(nextAggregationFunction);

			if (selectedField) {
				executeFieldAggregation(
					selectedField,
					nextAggregationFunction,
					getFieldAggregationOptions(),
				);
			}
		},
		[executeFieldAggregation, getFieldAggregationOptions, selectedField],
	);

	/**
	 * Closes the field aggregation overlay and keeps the last response in memory.
	 *
	 * @returns Nothing.
	 */
	const closeAggregationPanel = useCallback(() => {
		setSelectedField(null);
	}, []);

	const valueRows = useMemo(
		() =>
			normalizeValueRows(
				aggregationResponse ?? { total_hits: 0, aggregations: {} },
			),
		[aggregationResponse],
	);
	const timeRows = useMemo(
		() =>
			normalizeTimeRows(
				aggregationResponse ?? { total_hits: 0, aggregations: {} },
			),
		[aggregationResponse],
	);
	const aggregationChartData = useMemo<ChartData<"bar">>(
		() => ({
			labels: valueRows.map((row) => row.value),
			datasets: [
				{
					label: selectedField ?? "",
					data: valueRows.map((row) => row.count),
					backgroundColor: valueRows.map(
						(_, index) => palette.bars[index % palette.bars.length],
					),
					borderColor: palette.border,
					borderWidth: 1,
				},
			],
		}),
		[palette, selectedField, valueRows],
	);
	const aggregationChartOptions = useMemo<ChartOptions<"bar">>(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
			},
			scales: {
				x: {
					ticks: { color: palette.text, maxRotation: 0, autoSkip: true },
					grid: { color: palette.grid },
				},
				y: {
					ticks: { color: palette.text },
					grid: { color: palette.grid },
					beginAtZero: true,
				},
			},
		}),
		[palette],
	);
	const isAggregationPanelVisible = selectedField !== null;

	/**
	 * Selects a field and opens the aggregation panel in place of the dashboard section.
	 *
	 * @param field - ECS/OpenSearch field selected from the available field list.
	 * @returns Nothing.
	 */
	const openAggregationPanel = useCallback(
		(field: string) => {
			setSelectedField(field);
			executeFieldAggregation(
				field,
				aggregationFunction,
				getFieldAggregationOptions(),
			);
		},
		[aggregationFunction, executeFieldAggregation, getFieldAggregationOptions],
	);

	return (
		<div
			className={s.main}
			ref={setContainer}
		>
			<div className={s.body}>
				<aside className={`${s.column} ${s.explorerColumn}`}>
					<header className={s.columnHeader}>
						<h2>{t("dashboard.dataExplorer")}</h2>
					</header>
					<div className={`${s.columnBody} ${s.explorerBody}`}>
						<div className={s.panel}>
							<h4>{t("common.filters")}</h4>
							<DashboardFilterControls
								filterState={filterState}
								setFilterState={setFilterState}
								fieldKeys={fieldKeys}
								container={container}
								availableSources={operationSources}
								inheritedSourceIds={operationSourceIds}
							/>
						</div>
						<div className={s.panel}>
							<h4>{t("dashboard.availableFields")}</h4>
							{fieldRows.length > 0 ? (
								<div className={s.fieldList}>
									{fieldRows.map((row) => (
										<button
											key={row.field}
											type="button"
											className={
												row.field === selectedField
													? s.fieldRowActive
													: s.fieldRow
											}
											onClick={() => openAggregationPanel(row.field)}
										>
											<span>{row.field}</span>
											<small>
												{t("dashboard.fieldCount", { count: row.sources })}
											</small>
										</button>
									))}
								</div>
							) : (
								<div className={s.placeholder}>{t("dashboard.noFields")}</div>
							)}
						</div>
					</div>
				</aside>
				<main className={`${s.column} ${s.dashboardColumn}`}>
					<header className={s.columnHeader}>
						<h2>{t("dashboard.analyticsDashboard")}</h2>
					</header>
					<div className={`${s.columnBody} ${s.dashboardBody}`}>
						<section
							className={s.section}
							hidden={isAggregationPanelVisible}
						>
							<h3>{t("dashboard.fixedDashboards")}</h3>
							<div className={s.cardGrid}>
								{dashboards.length === 0 ? (
									<div className={s.placeholder}>{t("dashboard.noData")}</div>
								) : (
									dashboards.map((dashboard) => (
										<DashboardCard
											key={dashboard.id}
											dashboard={dashboard}
											globalFilterState={filterState}
											fieldTypeMap={fieldTypeMap}
											fieldKeys={fieldKeys}
											container={container}
											palette={palette}
											sourceNameById={sourceNameById}
											defaultSourceIds={operationSourceIds}
											availableSources={operationSources}
										/>
									))
								)}
								{dashboardExtensions.map((extension) => (
									<div
										key={extension.filename}
										className={s.dashboardCard}
									>
										<Extension.Component
											name={extension.filename}
											props={{
												filterState,
												fieldTypeMap,
												fieldKeys,
											}}
										/>
									</div>
								))}
							</div>
						</section>
						{selectedField ? (
							<section className={s.aggregationPanel}>
								<div className={s.aggregationTitleRow}>
									<h3
										className={s.aggregationTitle}
										title={selectedField}
									>
										{selectedField}
									</h3>
									<Button
										icon="X"
										variant="tertiary"
										title={t("common.closeDialog")}
										onClick={closeAggregationPanel}
									/>
								</div>
								<div className={s.aggregationControls}>
									<Select.Root
										value={aggregationFunction}
										onValueChange={handleAggregationFunctionChange}
									>
										<Select.Trigger>
											<Icon name="ChartGantt" />
											<Select.Value
												placeholder={t("dashboard.aggregationFunction")}
											/>
										</Select.Trigger>
										<Select.Content container={container}>
											<Select.Item value="top_values">
												{t("dashboard.topValues")}
											</Select.Item>
											<Select.Item value="top_values_by_time">
												{t("dashboard.topValuesByTime")}
											</Select.Item>
											<Select.Item value="rare_values">
												{t("dashboard.rareValues")}
											</Select.Item>
										</Select.Content>
									</Select.Root>
									{aggregationFunction === "rare_values" ? (
										<Input
											label={t("dashboard.maxDocCount")}
											type="number"
											min={1}
											value={maxDocCount}
											onChange={(event) => setMaxDocCount(event.target.value)}
										/>
									) : aggregationFunction === "top_values_by_time" ? (
										<Input
											label={t("dashboard.bucketSize")}
											type="number"
											min={1}
											value={timeBucketSize}
											onChange={(event) =>
												setTimeBucketSize(event.target.value)
											}
										/>
									) : (
										<Input
											label={t("dashboard.size")}
											type="number"
											min={1}
											value={topValuesSize}
											onChange={(event) => setTopValuesSize(event.target.value)}
										/>
									)}
									{aggregationFunction === "top_values_by_time" ? (
										<div className={s.intervalControl}>
											<div className={s.intervalLabelRow}>
												<span className={s.intervalLabel}>
													{t("dashboard.interval")}
												</span>
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<button
																type="button"
																className={s.intervalHelpButton}
																aria-label={t("dashboard.intervalHelpLabel")}
															>
																<Icon name="CircleHelp" />
															</button>
														</TooltipTrigger>
														<TooltipContent container={currentDocument.body}>
															{t("dashboard.intervalTooltip")}
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</div>
											<Input
												aria-label={t("dashboard.interval")}
												value={aggregationInterval}
												onChange={(event) =>
													setAggregationInterval(event.target.value)
												}
											/>
										</div>
									) : null}
									<Button
										icon="Play"
										variant="secondary"
										loading={aggregationLoading}
										onClick={runFieldAggregation}
									>
										{t("dashboard.runAggregation")}
									</Button>
								</div>
								{aggregationError ? (
									<div className={s.placeholder}>{aggregationError}</div>
								) : aggregationFunction === "top_values_by_time" ? (
									<div className={s.tablePanel}>
										<Table
											values={timeRows}
											includeIndex={false}
											columns={[
												{ key: "time", label: t("common.timestamp") },
												{ key: "value", label: t("dashboard.value") },
												{ key: "count", label: t("dashboard.count") },
											]}
										/>
									</div>
								) : (
									<div className={s.aggregationResults}>
										<div className={s.smallChart}>
											{valueRows.length > 0 ? (
												<Bar
													data={aggregationChartData}
													options={aggregationChartOptions}
													datasetIdKey="label"
												/>
											) : (
												<div className={s.placeholder}>
													{t("dashboard.noData")}
												</div>
											)}
										</div>
										<div className={s.tablePanel}>
											<Table
												values={valueRows}
												includeIndex={false}
												columns={[
													{ key: "value", label: t("dashboard.value") },
													{ key: "count", label: t("dashboard.count") },
													{ key: "percent", label: t("dashboard.percent") },
												]}
											/>
										</div>
									</div>
								)}
							</section>
						) : null}
					</div>
				</main>
			</div>
			{banner?.target === "table" ? banner.node : null}
		</div>
	);
}
