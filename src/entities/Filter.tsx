import { OpenSearchQueryBuilder } from "@/components/QueryBuilder";
import { Acceptable } from "@/dto/ElasticGetMapping.dto";
import { Query } from "./Query";
import { MinMax } from "@/class/Info";
import { Source } from "./Source";
import { App } from "./App";
import { UUID } from "crypto";
import { Internal } from "./addon/Internal";

export namespace Filter {
	export const name = "Filter";
	const _ = Symbol(Filter.name);
	export type Id = UUID & {
		readonly [_]: unique symbol;
	};

	export enum Operator {
		GREATER_OR_EQUAL = ">=",
		EQUAL = "==",
		LESS_OR_EQUAL = "<=",
		NOT_EQUAL = "!=",
		LESS_THAN = "<",
		GREATER_THAN = ">",
	}

	export type Options = Record<string, Acceptable>;

	export interface Type {
		id: Filter.Id;
		type: OpenSearchQueryBuilder.Condition;
		operator: OpenSearchQueryBuilder.Operator;
		field: string;
		value: any;
		enabled: boolean;
		case_insensitive?: boolean;
		min?: string;
		max?: string;
	}

	export class Entity {
		/**
		 * Builds an OpenSearch bool query from a structured Query.Type object.
		 *
		 * Constructs `must`, `should`, `must_not`, and `filter` clauses from:
		 * - `source_config`: generates `term` (operation_id), `terms` (source_ids),
		 *    and `range` (timestamp) clauses for source scoping.
		 * - `text_filter`: generates a `wildcard` clause on `event.original`.
		 * - `filters[]`: each enabled filter produces a clause (match, wildcard, regexp,
		 *    range, etc.) pushed into the appropriate bool bucket based on its operator.
		 *
		 * NOTE: `Query.Type.string` is NEVER used for query construction — it is
		 * a display-only label. See `Filter.Entity.describe()` for label generation.
		 *
		 * @param q - The structured query object containing all filter parameters.
		 * @returns An OpenSearch-compatible query object.
		 */
		static query = (q: Query.Type) => {
			// Manual mode: return raw JSON directly
			if (q.isManual && q.raw) return q.raw;

			const { filters, text_filter, source_config, fieldTypeMap } = q;
			const query: Record<string, any> = {
				bool: {
					must: [],
					should: [],
					must_not: [],
					filter: [],
				},
			};

			// Build source scoping clauses from structured source_config
			if (source_config) {
				query.bool.must.push({
					term: { "gulp.operation_id": source_config.operation_id },
				});
				query.bool.must.push({
					terms: { "gulp.source_id": source_config.source_ids },
				});
				query.bool.must.push({
					range: {
						"gulp.timestamp": {
							gte: source_config.range.min,
							lte: source_config.range.max,
						},
					},
				});
			}

			// Apply wildcard text filter on event.original (case-insensitive)
			if (text_filter) {
				query.bool.must.push({
						wildcard: {
							"event.original": {
								value: text_filter.trim(),
								case_insensitive: true,
							},
						},
					});
			}

			// Process each individual filter condition
			filters.forEach(
				({
					type,
					field,
					value,
					operator,
					enabled,
					case_insensitive = false,
				}) => {
					if (!field || !value || !enabled) return;

					let conditionObj = {};

					// Check field type to handle numeric fields with wildcard/regexp patterns
					const fieldType = fieldTypeMap?.[field];

					if (
						(type === "wildcard" || type === "regexp") &&
						(fieldType === "long" || fieldType === "integer")
					) {
						// Numeric fields don't support wildcard/regexp — fall back to query_string
						conditionObj = { query_string: { query: `${field}:${value}` } };
					} else {
						switch (type) {
							case "regexp":
								conditionObj = { regexp: { [field]: { value, flags: "ALL" } } };
								break;
							case "wildcard":
								conditionObj = {
									wildcard: { [field]: { value, case_insensitive } },
								};
								break;
							case "range":
								conditionObj = {
									range: {
										[field]: {
											gte: value.split(",")[0]?.trim() || 0,
											lte: value.split(",")[1]?.trim() || 0,
										},
									},
								};
								break;
							case "LTE":
								conditionObj = { range: { [field]: { lte: Number(value) } } };
								break;
							case "GTE":
								conditionObj = { range: { [field]: { gte: Number(value) } } };
								break;
							default:
								conditionObj = { match: { [field]: value } };
						}
					}

					// Push the condition into the appropriate bool bucket (must/should/must_not/filter)
					query.bool[operator].push(conditionObj);
				},
			);

			// Clean up empty bool buckets to keep the query compact
			Object.keys(query.bool).forEach((key) => {
				if (query.bool[key].length === 0) {
					delete query.bool[key];
				}
			});

			return query;
		};

		/**
		 * Generates a human-readable description of a Query.Type for display purposes.
		 *
		 * Builds a multi-line label showing:
		 * - Text filter value (if set)
		 * - Source file names (resolved from app state when available, else IDs)
		 * - Each filter condition with field, type, and value
		 * - Manual mode indicator
		 *
		 * @param q - The query to describe.
		 * @param app - Optional app state for resolving source IDs to names.
		 * @returns A human-readable string label.
		 */
		public static describe = (q: Query.Type, app?: App.Type): string => {
			const lines: string[] = [];

			// Show text filter value
			if (q.text_filter) {
				lines.push(`Text: "${q.text_filter}"`);
			}

			// Show source names (resolved from app) or IDs as fallback
			if (q.source_config?.source_ids?.length) {
				const names = q.source_config.source_ids.map(id => {
					if (app) {
						try {
							const file = Source.Entity.id(app, id as Source.Id);
							return file?.name || id;
						} catch { return id; }
					}
					return id;
				});
				lines.push(`Sources: ${names.join(', ')}`);
			}

			// Show each enabled filter condition with field, type, and value
			if (q.filters.length > 0) {
				const enabled = q.filters.filter(f => f.enabled);
				enabled.forEach(f => {
					lines.push(`${f.operator} ${f.type} ${f.field}: ${f.value}`);
				});
			}

			if (q.isManual) {
				lines.push('[manual query]');
			}

			return lines.join('\n') || 'No filters applied';
		};

		/**
		 * Builds a default Query.Type for a single source file.
		 *
		 * Creates a clean query scoped to the given file's operation, source ID,
		 * and timestamp range. Used as the initial/fallback query when no
		 * persisted filter exists.
		 *
		 * @param app - The application state containing source metadata.
		 * @param file - The source file (or its ID) to scope the query to.
		 * @param range - Optional custom time range override.
		 * @returns A default Query.Type with empty filters and source_config set.
		 */
		public static default = (
			app: App.Type,
			file: Source.Type | Source.Id,
			range?: MinMax,
		): Query.Type => {
			const id = typeof file === "object" ? file.id : file;
			const targetFile = Source.Entity.id(app, id);

			return {
				string: "",
				text_filter: "",
				source_config: {
					operation_id: targetFile.operation_id,
					source_ids: [targetFile.id],
					range: {
						min: (range?.min ?? targetFile.nanotimestamp?.min ?? Internal.Transformator.toNanos(targetFile.timestamp.min)).toString(),
						max: (range?.max ?? targetFile.nanotimestamp?.max ?? Internal.Transformator.toNanos(targetFile.timestamp.max)).toString(),
					}
				},
				filters: [],
			};
		};

		/**
		 * Wraps a Query.Type into the body format expected by the /query_raw API.
		 *
		 * @param query - The query to wrap.
		 * @returns An object with `q` (array of query objects) and `q_options` (sort config).
		 */
		static body = (query: Query.Type) => {
			const body: Record<string, any> = {
				q: [{ query: Filter.Entity.query(query) }],
				q_options: {
					sort: {
						"@timestamp": "desc",
					},
				},
			};

			return body;
		};
	}
}
