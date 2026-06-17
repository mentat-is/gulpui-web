import { debounce, Dictionary } from "lodash";
import { scrollStore } from "@/store/scroll.store";
import { Default } from "@/dto/Dataset";
import {
	generateUUID,
	NodeFile,
	Refractor,
	stringToHexColor,
} from "@/ui/utils";
import { Logger } from "@/dto/Logger.class";
import { SetState } from "./API";
import { Icon } from "@impactium/icons";
import { toast } from "sonner";
import { Pointers } from "@/components/Pointers";
import { CustomParameters } from "@/components/CustomParameters";
import { Highlights } from "@/overlays/Highlights";
import { RenderEngine } from "./RenderEngine";
import { SmartSocket } from "./SmartSocket";
import { OpenSearchQueryBuilder } from "@/components/QueryBuilder";
import { DataStore } from "@/store/DataStore";
import { Spinner } from "@/ui/Spinner";
import { Badge } from "@/ui/Badge";
import { Source } from "@/entities/Source";
import { Parser } from "@/entities/addon/Parser";
import { App } from "@/entities/App";
import { Doc } from "@/entities/Doc";
import { Glyph } from "@/entities/Glyph";
import { Operation } from "@/entities/Operation";
import { Context } from "@/entities/Context";
import { User } from "@/entities/User";
import { Request } from "@/entities/Request";
import { FileEntity } from "@/banners/Upload.banner";
import { Note } from "@/entities/Note";
import { Link } from "@/entities/Link";
import { CacheKey } from "./Engine.dto";
import { Filter } from "@/entities/Filter";
import { Query } from "@/entities/Query";
import { Highlight } from "@/entities/Highlight";
import { Mapping } from "@/entities/Mapping";
import { Internal } from "@/entities/addon/Internal";
import { ingestWorkerManager } from "@/workers/IngestWorker.manager";
import { translate } from "@/locales/core";

export namespace GulpDataset {
	export namespace GetAvailableLoginApi {
		export type Response = Method[];

		export interface Method {
			name: string;
			login: Struct;
			logout: Struct;
		}

		export interface Struct {
			method: string;
			url: string;
			params: Param[];
		}

		export interface Param {
			name: string;
			type: "str";
			location: "body";
			description: string;
			required?: boolean;
			default_value?: null;
		}
	}
	export namespace QueryGulp {
		export interface Options {
			preview?: boolean;
			id?: Source.Id | Source.Id[];
			refetchKeys?: Array<keyof Doc.Type>;
			addToHistory?: boolean;
			create_notes?: boolean;
			notes_color?: string;
			notes_tags?: string[];
			notes_glyph_id?: Glyph.Id;
			name?: string;
			offset?: number;
			limit?: number;
			sort?: Record<string, "desc" | "asc">;
		}
	}
	export namespace QueryOperations {
		interface Operation {
			name: string;
			id: string;
			index?: string;
			glyph_id?: Glyph.Id;
			contexts: Context[];
			description?: string;
		}

		interface Context {
			name: string;
			id: string;
			glyph_id?: Glyph.Id;
			doc_count: number;
			plugins: Plugin[];
		}

		interface Plugin {
			name: string;
			sources: Source[];
		}

		export interface Source {
			name: string;
			id: Source.Id;
			glyph_id?: Glyph.Id;
			doc_count: number;
			"max_event.code": number;
			"min_event.code": number;
			"min_gulp.timestamp": bigint | { source: string; parsedValue: number };
			"max_gulp.timestamp": bigint | { source: string; parsedValue: number };
		}

		export type Summary = Operation[];
	}
	export namespace PluginList {
		export type Type = "ingestion" | "enrichment" | "external" | "extension";

		export namespace SigmaSupport {
			export type Type = "backends" | "pipelines" | "output_formats";

			export interface Interface {
				name: string;
				description: string;
			}

			export type Summary = Record<SigmaSupport.Type, SigmaSupport.Interface>[];
		}

		export type DependsOn = "eml";

		export interface Interface {
			display_name: string;
			type: Type[];
			desc: string;
			path: string;
			data: {};
			filename: string;
			sigma_support: SigmaSupport.Summary;
			custom_parameters: CustomParameters.Interface[];
			depends_on: DependsOn[];
			tags: (string | "extension")[];
			version: string;
		}
	}
	export namespace QueryHistoryGet {
		export interface Interface {
			q: {
				query: {
					bool: Record<
						OpenSearchQueryBuilder.Operator,
						Record<OpenSearchQueryBuilder.Condition, any>[]
					>;
				};
			};
			external: boolean;
			query_options: {
				loop: boolean;
				name: string;
				sort: {
					"@timestamp": "desc" | "asc";
				};
				limit: number;
				preview_mode: boolean;
				note_parameters: {
					note_tags: string[];
				};
				ensure_default_fields: boolean;
			};
			timestamp_msec: number;
		}
		export type Response = Interface[];
	}
	export interface SigmaFile {
		name: string;
		content: string;
	}

	export namespace OperationGetById {
		export interface Response {
			id: string;
			name: string;
			tags: string[];
			time_created: number;
			user_id: string;
			doc_count: number;
			granted_user_ids: string[];
			granted_user_group_ids: string[];
			description?: string;
		}
	}

	export namespace MappingFileUpload {
		export interface Payload {
			metadata: {
				plugin: string[];
			};
			mappings: Record<string, Record<string, unknown>>;
		}
	}
}

interface RefetchOptions {
	ids?: Arrayed<Source.Id>;
	refetchKeys?: Record<Source.Id, Array<keyof Doc.Type>>;
	addToHistory?: boolean;
	create_notes?: boolean;
	notes_color?: string;
	notes_tags?: string[];
	notes_glyph_id?: Glyph.Id;
	name?: string;
	frame?: MinMax;
}

interface InfoProps {
	app: App.Type;
	setInfo: React.Dispatch<React.SetStateAction<App.Type>>;
	timeline: React.RefObject<HTMLDivElement>;
}

export class Info implements InfoProps {
	app: App.Type;
	setInfo: SetState<App.Type>;
	timeline: React.RefObject<HTMLDivElement>;

	public readonly MIN_MS_PER_PIXEL = 1;
	private static _latestInstance: Info | null = null;
	public ingestionProgress = new Map<Source.Id, number>();
	public activeUploads = new Map<
		Request.Id,
		{ filename: string; percent: number }
	>();
	private _resyncPollTimer: ReturnType<typeof setInterval> | null = null;
	private static _eventKeysCache = new Map<Source.Id, Filter.Options>();

	constructor({ app, setInfo, timeline }: InfoProps) {
		this.app = app;
		this.setInfo = setInfo;
		this.timeline = timeline;
		Info._latestInstance = this;
	}

	/**
	 * Refetches documents and updates associated state for the selected source files.
	 *
	 * @param options - Configuration options for the refetch.
	 * @param options.ids - Optional list of source IDs to refetch (defaults to selected sources).
	 * @param options.refetchKeys - Optional mapping of source IDs to specific document fields to fetch.
	 * @param options.addToHistory - Whether to append this query to the server-side queries history.
	 * @param options.create_notes - Whether to automatically create notes for matched documents.
	 * @param options.notes_color - Color to apply to any auto-created notes.
	 * @param options.notes_tags - Tags to apply to any auto-created notes.
	 * @param options.notes_glyph_id - Icon glyph ID for any auto-created notes.
	 * @param options.name - Optional name label for this search action.
	 * @param options.frame - Optional custom timeframe to apply to the timeline.
	 * @returns A promise that resolves when all queries are initiated.
	 */
	refetch = async ({
		ids: _ids = Source.Entity.selected(this.app).map((f) => f.id),
		refetchKeys,
		addToHistory,
		create_notes,
		notes_color,
		notes_tags,
		notes_glyph_id,
		name,
		frame,
	}: RefetchOptions = {}) => {
		const files: Source.Type[] = Parser.array(_ids).map((id) =>
			Source.Entity.id(this.app, id),
		);
		if (frame) {
			this.setTimelineFrame(frame);
		} else if (
			this.app.timeline.frame.min === 0 &&
			this.app.timeline.frame.max === 0
		) {
			this.setTimelineFrame({
				min: Math.min(...files.map((f) => f.timestamp.min)),
				max: Math.max(...files.map((f) => f.timestamp.max)),
			});
		}

		this.notes_reload();
		this.links_reload();
		this.highlights_reload();

		files.forEach((file) => {
			this.events_reset_in_file(file);
			const query = this.getQuery(file);

			// Ensure that each query is strictly filtered by its specific source_id to avoid duplicate results
			// and ensure correct loading state mapping (1 req_id = 1 source_id)
			const dedicatedQuery = {
				...query,
				source_config: query.source_config
					? {
							...query.source_config,
							source_ids: [file.id],
						}
					: undefined,
			};

			this.query_file(dedicatedQuery, {
				id: file.id,
				preview: false,
				refetchKeys: refetchKeys ? refetchKeys[file.id] : undefined,
				addToHistory,
				create_notes,
				notes_color,
				notes_tags,
				notes_glyph_id,
				name,
			});
		});
	};

	private static _realtimeTimer: ReturnType<typeof setInterval> | null = null;

	setRealtime = (enabled: boolean, seconds: number) => {
		if (Info._realtimeTimer) {
			clearInterval(Info._realtimeTimer);
			Info._realtimeTimer = null;
		}

		this.setInfoByKey(enabled, "settings", "realtimeEnabled");
		this.setInfoByKey(seconds, "settings", "realtimeTimeoff");

		if (enabled && seconds >= 10) {
			Info._realtimeTimer = setInterval(() => {
				Info._latestInstance?.realtimePoll();
			}, seconds * 1000);
		}
	};

	realtimePoll = async () => {
		const files = Source.Entity.selected(this.app);
		if (files.length === 0) return;

		const now = Date.now();
		const nowNanos = Internal.Transformator.toNanos(now);
		let filesUpdated = false;

		files.forEach((file) => {
			const events = Doc.Entity.get(this.app, file.id);

			let fromNanos: bigint;
			if (events.length > 0) {
				fromNanos =
					Internal.Transformator.toNanos(events[0].gulp_timestamp) + 1n;
			} else {
				fromNanos =
					file.nanotimestamp?.max ??
					Internal.Transformator.toNanos(file.timestamp.max);
			}

			if (fromNanos >= nowNanos) return;

			// Extend source timestamp bounds so render engines can draw events beyond the original range
			if (file.timestamp.max < now) {
				file.timestamp.max = now;
				file.nanotimestamp.max = nowNanos;
				filesUpdated = true;
			}

			// Build a source_config-based query for real-time polling.
			// Uses the forward-shifted time range [fromNanos, nowNanos] to fetch
			// only events newer than the latest known event.
			const query: Query.Type = {
				string: "",
				source_config: {
					operation_id: file.operation_id,
					source_ids: [file.id],
					range: {
						min: fromNanos.toString(),
						max: nowNanos.toString(),
					},
				},
				filters: [],
			};

			this.query_file(query, {
				id: file.id,
				preview: false,
			});
		});

		if (filesUpdated) {
			this.setInfoByKey([...this.app.target.files], "target", "files");
		}

		this.realtimePollExtendFrame();
	};

	realtimePollExtendFrame = () => {
		const now = Date.now();
		if (this.app.timeline.frame.max < now) {
			this.setTimelineFrame({
				min: this.app.timeline.frame.min,
				max: now,
			});
		}
	};

	enrichment = (
		plugin: string,
		file: Source.Type,
		range: MinMax,
		custom_parameters: Record<string, any>,
		isShowOnlyEnriched: boolean,
		fields: Record<string, string | null>,
	) => {
		return api("/enrich_documents", {
			method: "POST",
			query: {
				operation_id: file.operation_id,
				plugin,
				ws_id: this.app.general.ws_id,
			},
			raw: true,
			body: {
				flt: {
					source_ids: [file.id],
					time_range: [
						Internal.Transformator.toNanos(range.min).toString(),
						Internal.Transformator.toNanos(range.max).toString(),
					],
				},
				plugin_params: {
					custom_parameters,
				},
				fields,
			},
		}).then(({ req_id }) => {
			if (isShowOnlyEnriched) {
				this.events_reset_in_file(file);
				this.setLoading(req_id, file.id);
			}
			const bufferedEvents: Doc.Type[] = [];
			let lastFlushTime = 0;
			let flushChain: Promise<void> = Promise.resolve();
			const FLUSH_INTERVAL_MS = 300;

			const sid = SmartSocket.Class.instance.con(
				SmartSocket.Message.Type.DOCUMENTS_CHUNK,
				(m) =>
					m.req_id === req_id &&
					this.app.general.loadings.byRequestId.has(req_id),
				(m) => {
					const events = Doc.Entity.normalize(
						m.payload.docs ?? [],
						file.settings.field,
						file.settings.hash_function,
					);
					bufferedEvents.push(...events);
					if (
						(Date.now() - lastFlushTime >= FLUSH_INTERVAL_MS ||
							m.payload.last) &&
						bufferedEvents.length > 0
					) {
						const toFlush = bufferedEvents.splice(0);
						lastFlushTime = Date.now();
						flushChain = flushChain.then(() => this.events_add_async(toFlush));
					}
					if (m.payload.last) {
						flushChain.then(() => {
							this.delLoading(req_id);
							SmartSocket.Class.instance.coff(
								SmartSocket.Message.Type.DOCUMENTS_CHUNK,
								sid,
							);
						});
					}
				},
			);
			SmartSocket.Class.instance.conce(
				SmartSocket.Message.Type.ENRICH_DONE,
				(m) => m.req_id === req_id,
				(m) => {
					if (m.payload.obj.status !== "done") {
						toast.error(translate("enrichment.failed"), {
							icon: <Icon name="Stop" />,
							richColors: true,
						});
					} else {
						toast.success(translate("info.enrichmentFinished"), {
							description: translate("info.totalProcessedDocuments", {
								count: m.payload.obj.data.total_hits ?? 0,
							}),
							icon: <Icon name="Check" />,
						});
					}
				},
			);
		});
	};

	enrich_single_id = (
		plugin: string,
		event: Doc.Type,
		custom_parameters: Record<string, any>,
		fields: Record<string, string | null>,
	): Promise<Doc.Type> | undefined =>
		api<Doc.Type>("/enrich_single_id", {
			method: "POST",
			query: {
				plugin,
				operation_id: Doc.Entity.operationId(this.app, event),
				ws_id: this.app.general.ws_id,
				doc_id: event._id,
			},
			body: {
				plugin_params: {
					custom_parameters,
				},
				fields,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("doc.enriched"), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
			},
		});

	download_storage_file = async (
		storage_id: string,
		operation_id: string,
	): Promise<void> => {
		const req_id = generateUUID<string>(Request.Prefix.QUERY);
		const query = new URLSearchParams({
			operation_id,
			storage_id,
			req_id,
		});

		const response = await fetch(
			`${Internal.Settings.server}/storage_get_file_by_id?${query}`,
			{
				method: "GET",
				headers: {
					token: Internal.Settings.token,
				},
			},
		);

		if (!response.ok) {
			toast.error(translate("source.downloadLogFailed"), { richColors: true });
			return;
		}

		const disposition = response.headers.get("Content-Disposition");
		let filename = `${storage_id}`;
		if (disposition) {
			const match = disposition.match(/filename="?(.+?)"?$/);
			if (match) {
				filename = match[1];
			}
		}

		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Bridge Manager APIs
	list_bridges = (flt?: any, req_id?: string, options?: any) =>
		api<any>("/list_bridges", {
			method: "POST",
			query: { req_id },
			body: { flt },
			...options,
		});

	list_ingestion_tasks = (flt?: any, req_id?: string, options?: any) =>
		api<any>("/list_ingestion_tasks", {
			method: "POST",
			query: { req_id },
			body: flt,
			...options,
		});

	resync_ingestion_state = async (
		_operationId: Operation.Id,
	): Promise<void> => {
		// INGEST_SOURCE_DONE is broadcast — all connected clients receive it.
		// Register cleanup FIRST so it fires even if the source is marked loading after this point.
		SmartSocket.Class.instance.con(
			SmartSocket.Message.Type.INGEST_SOURCE_DONE,
			(m) => {
				const sourceId = m.payload?.["gulp.source_id"] as Source.Id | undefined;
				return !!(sourceId && this.app.general.loadings.byFileId.has(sourceId));
			},
			(m) => {
				const sourceId = m.payload?.["gulp.source_id"] as Source.Id;

				// Delete only this source's loading state
				this.app.general.loadings.byFileId.delete(sourceId);

				const loadings = {
					byRequestId: new Map(this.app.general.loadings.byRequestId),
					byFileId: new Map(this.app.general.loadings.byFileId),
				};
				this.setInfoByKey(loadings, "general", "loadings");

				this.ingestionProgress.delete(sourceId);
				this.sync().catch(() => {});
			},
		);

		SmartSocket.Class.instance.con(
			SmartSocket.Message.Type.STATS_UPDATE,
			(m) =>
				m.payload?.obj?.req_type === "ingest" &&
				m.payload?.obj?.status === "done",
			(m) => {
				const reqId = m.req_id;
				if (reqId) {
					this.app.general.loadings.byRequestId.delete(reqId);
					const loadings = {
						byRequestId: new Map(this.app.general.loadings.byRequestId),
						byFileId: new Map(this.app.general.loadings.byFileId),
					};
					this.setInfoByKey(loadings, "general", "loadings");
				}
			},
		);

		try {
			const requests = (await this.request_list()) as any[] | undefined;
			const ongoing = (requests || []).filter(
				(r) => r.status === Request.Status.ONGOING,
			);

			// Track whether we're a reconnecting watcher (not the original uploader)
			let watcherSources = 0;

			for (const req of ongoing) {
				const sources: [string, string][] | undefined = req.data?.sources;
				const sourceId = sources?.[0]?.[1] as Source.Id | undefined;
				if (!sourceId) continue;

				if (!this.app.general.loadings.byFileId.has(sourceId)) {
					this.setLoading(req.id as Request.Id, sourceId);
					watcherSources++;
				}
			}

			// Only poll if we had to register loading state ourselves (reconnect scenario)
			if (watcherSources === 0) return;

			// sync() fetches live source totals from OpenSearch — the same thing Reload does
			if (this._resyncPollTimer) clearInterval(this._resyncPollTimer);
			this._resyncPollTimer = setInterval(async () => {
				if (this.app.general.loadings.byFileId.size === 0) {
					clearInterval(this._resyncPollTimer!);
					this._resyncPollTimer = null;
					return;
				}
				try {
					await this.sync();
				} catch {
					/* best-effort */
				}
			}, 5000);
		} catch (_) {
			// Best-effort — failure is non-fatal
		}
	};

	create_start_ingestion = (
		bridge_id: string,
		operation_id: string,
		plugin_params: any,
		req_id?: string,
		options?: any,
	) =>
		api<any>("/create_start_ingestion", {
			method: "POST",
			query: { bridge_id, operation_id, req_id },
			body: plugin_params,
			...options,
		});

	stop_ingestion = (bridge_task_id: string, req_id?: string, options?: any) =>
		api<any>("/stop_ingestion", {
			method: "POST",
			query: { req_id },
			body: `"${bridge_task_id}"`,
			...options,
		});
	check_bridge_status = (bridge_id: string, req_id?: string, options?: any) =>
		api<any>("/get_bridge_status", {
			method: "GET",
			query: { req_id, bridge_id },
			...options,
		});

	delete_ingestion = (bridge_task_id: string, req_id?: string, options?: any) =>
		api<any>("/delete_ingestion", {
			method: "DELETE",
			query: { req_id, bridge_task_id },
			...options,
		});

	query_global = async ({
		filename,
		context,
		query,
		total,
		separately,
	}: {
		context?: string;
		filename?: string;
		query: Query.Type;
		total: number;
		separately?: boolean;
	}) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		if (!filename || !context) {
			separately = true;
		}

		if (!separately) {
			this.query_file(query, {
				id: this.virtualize(filename!, total, context!),
				preview: false,
			});
		} else {
			this.query_file(query, {
				preview: false,
			});
		}
	};

	virtualize = (fileName: string, total: number, contextName: string) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return null!;
		}

		const context_id = `temp-${contextName}` as Context.Id;

		const file: Source.Type = Source.Entity.virtualize(this.app, {
			name: fileName,
			context_id,
			operation_id: operation.id,
			total: 999999,
		});

		const context: Context.Type = {
			id: context_id,
			color: "",
			glyph_id: null as unknown as Glyph.Id,
			granted_user_group_ids: [],
			granted_user_ids: [],
			name: contextName,
			operation_id: operation.id,
			time_created: Date.now(),
			time_updated: Date.now(),
			type: "context",
			selected: true,
			owner_user_id: this.app.general.user?.id!,
		};

		this.setInfo((info) => ({
			...info,
			target: {
				...info.target,
				files: [...info.target.files, file],
				contexts: [...info.target.contexts, context],
			},
		}));

		return file.id;
	};

	query_gulp = async (docIds: Doc.Id[], fields: string[], preview: boolean) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		const body: Record<any, any> = {
			flt: {
				doc_ids: docIds,
			},
			q_options: {
				limit: 10000,
			},
		};

		if (fields.length > 0) {
			body.q_options.fields = fields;
		}

		if (preview) {
			body.q_options.preview_mode = true;
		}

		const request_query: Record<string, string> = {
			ws_id: this.app.general.ws_id,
			operation_id: operation.id,
			req_id: generateUUID(Request.Prefix.QUERY),
		};

		const resp = await api<any>(
			"/query_gulp",
			{
				method: "POST",
				query: request_query,
				body,
				raw: true,
			},
			({ req_id, status }) => {
				if (status !== "pending") {
					return;
				}

				const bufferedEvents: Doc.Type[] = [];
				let lastFlushTime = 0;
				let flushChain: Promise<void> = Promise.resolve();
				const FLUSH_INTERVAL_MS = 300;

				const sid = SmartSocket.Class.instance.con(
					SmartSocket.Message.Type.DOCUMENTS_CHUNK,
					(m) =>
						m.req_id === req_id &&
						this.app.general.loadings.byRequestId.has(req_id),
					(m) => {
						const events = Doc.Entity.normalize(
							m.payload.docs ?? [],
							"gulp.event_code",
							"fnv1a",
						);
						bufferedEvents.push(...events);
						if (
							(Date.now() - lastFlushTime >= FLUSH_INTERVAL_MS ||
								m.payload.last) &&
							bufferedEvents.length > 0
						) {
							const toFlush = bufferedEvents.splice(0);
							lastFlushTime = Date.now();
							flushChain = flushChain.then(() =>
								this.events_add_async(toFlush),
							);
						}

						if (m.payload.last) {
							flushChain.then(() => {
								this.delLoading(req_id);
								SmartSocket.Class.instance.coff(
									SmartSocket.Message.Type.DOCUMENTS_CHUNK,
									sid,
								);
							});
						}
					},
				);
				SmartSocket.Class.instance.conce(
					SmartSocket.Message.Type.STATS_UPDATE,
					(m) => m.req_id === req_id,
					(m) => {
						// if (m.payload.obj.status !== 'done') {
						//   toast.error(`Query ${req_id} failed`, {
						//     icon: <Icon name='Stop' />,
						//     description: `Has been failed ${m.payload.obj.data.failed_queries} queries from total amount of ${m.payload.obj.data.num_queries}. \n\nWhich is ${(m.payload.obj.data.num_queries / m.payload.obj.data.failed_queries) * 100}% of total amount of queries. \n\nTraces: \n${m.payload.obj.errors.map((error: string, index: number) => `Error number ${index + 1} is ${error}`).join('\n')}. \nQuery has been executed on server with id ${m.payload.obj.server_id}`,
						//     duration: 1000 * 2,
						//     // description: `Has been failed ${m.payload.obj.data.failed_queries} queries from total amount of ${m.payload.obj.data.num_queries}. \n\nWhich is ${(m.payload.obj.data.num_queries / m.payload.obj.data.failed_queries) * 100}% of total amount of queries. \n\nTraces: \n${m.payload.obj.errors.map((error: string, index: number) => `Error number ${index + 1} is ${error}`).join('\n')}. \nQuery has been executed on server with id ${m.payload.obj.server_id}`,
						//     // duration: 1000 * 60 * 10,
						//     richColors: true
						//   })
						// } else {
						//   console.log(m);
						//   toast.success('Query finished', {
						//     description: `Total processed documents: ${m.payload.obj.data.total_hits}`,
						//     icon: <Icon name='Check' />
						//   })
						// }
					},
				);
			},
		);

		if (preview) {
			if (!resp || (resp || {})?.data?.total_hits === 0) {
				toast.error(translate("filter.noResults"), {
					icon: <Icon name="FaceUnhappy" />,
					richColors: true,
				});
			} else {
				toast(translate("filter.totalHits", { count: resp.data?.total_hits }));
			}
		}

		return resp
			? resp.data
			: {
					docs: [],
					total_hits: 0,
				};
	};

	query_file = async (
		query: Query.Type,
		{
			preview = false,
			id,
			refetchKeys,
			addToHistory,
			create_notes,
			notes_color,
			notes_tags,
			notes_glyph_id,
			name,
			operationId,
		}: GulpDataset.QueryGulp.Options & { operationId?: Operation.Id },
	) => {
		const operation = operationId
			? Operation.Entity.id(this.app, operationId)
			: Operation.Entity.selected(this.app);
		if (!operation) {
			return {
				docs: [],
				total_hits: 0,
			};
		}

		if (id) {
			const ids = Array.isArray(id) ? id : [id];
			ids.forEach((i) => {
				const request = this.app.general.loadings.byFileId.get(i);
				if (request) {
					this.delLoading(request);
					this.request_cancel(request);
				}
			});
		}

		const body = Filter.Entity.body(query);

		if (preview) {
			body.q_options.preview_mode = preview;
		}

		body.q_options.limit = 10000;

		const request_query: Record<string, string> = {
			ws_id: this.app.general.ws_id,
			operation_id: operation.id,
			req_id: generateUUID(Request.Prefix.QUERY),
		};

		if (id) {
			const ids = Array.isArray(id) ? id : [id];
			body.q_options.fields =
				refetchKeys ??
				Array.from(
					new Set(ids.map((i) => Source.Entity.id(this.app, i).settings.field)),
				);
		}

		if (addToHistory) {
			body.q_options.add_to_history = true;
		}
		if (create_notes && !preview) {
			body.q_options.create_notes = true;

			body.q_options.notes_color = notes_color ?? Default.Color.NOTE;
			body.q_options.notes_tags = notes_tags;
			body.q_options.notes_glyph_id = notes_glyph_id;
			body.q_options.name = name;
		}

		const req_id = request_query.req_id as Request.Id;

		// 1. Set loading state synchronously
		if (id) {
			const ids = Array.isArray(id) ? id : [id];
			ids.forEach((i) => this.setLoading(req_id, i as Source.Id));
		}

		// 2. Define cleanup logic for listeners and loading state
		let sid: string | undefined;
		let sidCollab: string | undefined;

		const cleanup = () => {
			this.delLoading(req_id);
			if (sid) {
				SmartSocket.Class.instance.coff(
					SmartSocket.Message.Type.DOCUMENTS_CHUNK,
					sid,
				);
			}
			if (sidCollab) {
				SmartSocket.Class.instance.coff(
					SmartSocket.Message.Type.COLLAB_CREATE,
					sidCollab,
				);
			}
		};

		const bufferedEvents: Doc.Type[] = [];
		let lastFlushTime = 0;
		let flushChain: Promise<void> = Promise.resolve();
		const FLUSH_INTERVAL_MS = 300;

		sid = SmartSocket.Class.instance.con(
			SmartSocket.Message.Type.DOCUMENTS_CHUNK,
			(m) =>
				m.req_id === req_id &&
				this.app.general.loadings.byRequestId.has(req_id),
			(m) => {
				// let source = Source.Entity.id(this.app, i).settings.field)
				let source = this.app.general.loadings.byRequestId.get(req_id);
				const sourceSettings = Source.Entity.id(
					this.app,
					source as Source.Id,
				).settings;
				const events = Doc.Entity.normalize(
					m.payload.docs ?? [],
					sourceSettings.field,
					sourceSettings.hash_function,
				);
				bufferedEvents.push(...events);

				if (
					(Date.now() - lastFlushTime >= FLUSH_INTERVAL_MS || m.payload.last) &&
					bufferedEvents.length > 0
				) {
					const toFlush = bufferedEvents.splice(0);
					lastFlushTime = Date.now();
					flushChain = flushChain.then(() => this.events_add_async(toFlush));
				}
				if (m.payload.last) {
					flushChain.then(() => {
						cleanup();
						if (id) {
							const ids = Array.isArray(id) ? id : [id];
							ids.forEach((i) => {
								const file = Source.Entity.id(this.app, i as Source.Id);
								const loadedCount = Doc.Entity.get(
									this.app,
									i as Source.Id,
								).length;
								if (file && loadedCount > file.total) {
									file.total = loadedCount;
								}
							});
							this.setInfoByKey([...this.app.target.files], "target", "files");
						}
						this.render();
					});
				}
			},
		);

		SmartSocket.Class.instance.conce(
			SmartSocket.Message.Type.STATS_UPDATE,
			(m) => m.req_id === req_id,
			(m) => {
				// empty logic from before
			},
		);

		if (create_notes) {
			sidCollab = SmartSocket.Class.instance.con(
				SmartSocket.Message.Type.COLLAB_CREATE,
				(m) => m.req_id === req_id,
				(m) => {
					if (Array.isArray(m.payload.obj) && m.payload.obj.length > 0) {
						const newItems = m.payload.obj.filter(
							(item: any) => item.type === "note",
						) as Note.Type[];
						if (newItems.length > 0) {
							newItems.forEach((note) => this.AddNoteToDataStore(note));
							toast.success(
								translate("notes.fetchedCount", { count: newItems.length }),
								{
									richColors: true,
								},
							);
						}
					}
				},
			);
		}

		const resp = await api<any>("/query_raw", {
			method: "POST",
			query: request_query,
			body,
			raw: true,
		});

		// 5. If the API request failed or the job wasn't pending, clean up immediately
		if (!resp || resp.status !== "pending") {
			cleanup();
		}

		if (preview) {
			if (!resp || (resp || {})?.data?.total_hits === 0) {
				toast.error(translate("filter.noResults"), {
					icon: <Icon name="FaceUnhappy" />,
					richColors: true,
				});
			} else {
				toast(translate("filter.totalHits", { count: resp.data?.total_hits }));
			}
		}

		return resp
			? resp.data
			: {
					docs: [],
					total_hits: 0,
				};
	};

	query_paginate = async (
		query: Query.Type,
		{
			limit = 100,
			offset = 0,
			sort = { "@timestamp": "asc" },
		}: GulpDataset.QueryGulp.Options,
	) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}
		const body: Record<string, any> = {
			q: { query: Filter.Entity.query(query) },
			q_options: {
				limit: limit,
				offset: offset,
				sort,
			},
		};

		const request_query: Record<string, string> = {
			operation_id: operation.id,
			req_id: generateUUID(Request.Prefix.QUERY),
		};

		const resp = await api<any>("/query_raw_paginate", {
			method: "POST",
			body,
			query: request_query,
			raw: true,
		});

		return resp
			? resp.data
			: {
					docs: [],
					total_hits: 0,
				};
	};

	/**
	 * Retrieves the list of previously applied queries from the server history.
	 *
	 * Reconstructs full Query.Type objects from the raw OpenSearch bool queries
	 * stored in history. Extracts source_config from term/terms/range clauses,
	 * text_filter from wildcard on event.original, and individual filter conditions.
	 * Generates a human-readable label via Filter.Entity.describe().
	 *
	 * @returns A promise resolving to an array of reconstructed Query.Type objects.
	 */
	getLastQueries = (): Promise<Query.Type[]> =>
		api<GulpDataset.QueryHistoryGet.Response>("/query_history_get").then(
			(list) => {
				const queries: Query.Type[] = [];

				/**
				 * Recursively walks an OpenSearch bool body `{ must: [...], should: [...], ... }`
				 * and returns the items belonging to it. Nested `bool` clauses become
				 * `Filter.Group` items; everything else becomes a leaf `Filter.Type`.
				 *
				 * `infra` is mutated to capture source_config / text_filter clauses found at the
				 * top level — those are extracted into `Query.Type` instead of becoming filters.
				 */
				const walkBool = (
					boolBody: Record<string, any[]>,
					infra: {
						topLevel: boolean;
						operationId: string;
						sourceIds: string[];
						rangeMin: string | number;
						rangeMax: string | number;
						textFilter: string;
					},
				): Filter.Item[] => {
					const items: Filter.Item[] = [];

					Object.entries(boolBody).forEach(([bucket, arr]) => {
						const operator = bucket as OpenSearchQueryBuilder.Operator;
						if (!Array.isArray(arr)) return;

						arr.forEach((obj) => {
							Object.entries(obj).forEach(([type, v]: [string, any]) => {
								// Nested bool → Filter.Group (recurse)
								if (type === "bool" && v && typeof v === "object") {
									const groupChildren = walkBool(v, {
										...infra,
										topLevel: false,
									});
									items.push({
										id: generateUUID() as Filter.Id,
										type: "group",
										operator,
										children: groupChildren,
										enabled: true,
									});
									return;
								}

								// Skip legacy query_string — not reconstructable as a builder row
								if (type === "query_string") return;

								// Top-level infrastructure clauses → source_config / text_filter
								if (infra.topLevel) {
									if (type === "term" && v["gulp.operation_id"] !== undefined) {
										infra.operationId = v["gulp.operation_id"];
										return;
									}
									if (type === "terms" && v["gulp.source_id"] !== undefined) {
										infra.sourceIds = v["gulp.source_id"];
										return;
									}
									if (type === "range" && v["gulp.timestamp"] !== undefined) {
										infra.rangeMin = v["gulp.timestamp"].gte ?? "";
										infra.rangeMax = v["gulp.timestamp"].lte ?? "";
										return;
									}
									if (
										type === "wildcard" &&
										v["event.original"] !== undefined
									) {
										infra.textFilter = v["event.original"].value ?? "";
										return;
									}
								}

								// Leaf condition: clause shape is `{ [fieldName]: value | { value, ... } }`.
								// In practice there is exactly one field key per clause object.
								Object.keys(v).forEach((fieldKey) => {
									items.push({
										operator,
										type: type as OpenSearchQueryBuilder.Condition,
										id: generateUUID(),
										field: fieldKey,
										value:
											typeof v[fieldKey] === "object"
												? v[fieldKey].value
												: v[fieldKey],
										enabled: true,
									});
								});
							});
						});
					});

					return items;
				};

				list.forEach((payload) => {
					const root = payload.q.query;
					if (!root || !root.bool) return;

					const infra = {
						topLevel: true,
						operationId: "",
						sourceIds: [] as string[],
						rangeMin: "" as string | number,
						rangeMax: "" as string | number,
						textFilter: "",
					};

					const filters = walkBool(root.bool, infra);

					const source_config: Query.Type["source_config"] | undefined =
						infra.operationId && infra.sourceIds.length > 0
							? {
									operation_id: infra.operationId,
									source_ids: infra.sourceIds,
									range: { min: infra.rangeMin, max: infra.rangeMax },
								}
							: undefined;

					const queryObj: Query.Type = {
						string: "",
						text_filter: infra.textFilter,
						filters,
						source_config,
					};

					queryObj.string = Filter.Entity.describe(queryObj, this.app);
					queries.push(queryObj);
				});

				return queries;
			},
		);

	preview_file = (file: Source.Type, query = this.getQuery(file)) =>
		this.query_file(query, { preview: true, operationId: file.operation_id });

	preview_query = (query: Query.Type) =>
		this.query_file(query, { preview: true });

	request_add = (req: Request.Type) => {
		const exist = this.app.general.requests.findIndex((r) => r.id === req.id);
		if (exist >= 0) {
			this.app.general.requests[exist] = req;
		} else {
			this.app.general.requests = [...this.app.general.requests, req];
		}

		this.setInfoByKey(
			this.app.general.requests.sort((a, b) => b.time_created - a.time_created),
			"general",
			"requests",
		);
	};

	request_list = () => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		return api<Request.Type[]>(
			"/request_list",
			{
				method: "GET",
				query: {
					operation_id: operation.id,
				},
			},
			(requests) => this.setInfoByKey(requests, "general", "requests"),
		);
	};

	request_cancel = (req_id_to_cancel: Request.Id) =>
		api("/request_cancel", {
			method: "PATCH",
			query: { req_id_to_cancel },
		});

	filters_cache = (files: Array<Source.Type | Source.Id>) => {
		files.forEach((file) => {
			const id = Parser.useUUID(file) as Source.Id;

			Logger.log(
				`Caching has been requested for files ${Source.Entity.id(this.app, file).name}`,
				Info,
			);

			this.app.timeline.cache.data.set(
				id,
				this.app.target.events.get(id) || [],
			);
			this.app.timeline.cache.filters[id] = this.app.target.filters[id];
		});

		this.setInfoByKey(this.app.timeline.cache, "timeline", "cache");
		this.render();
	};

	filters_undo = (files: Array<Source.Type | Source.Id>) => {
		files.forEach((file) => {
			const id = Parser.useUUID(file) as Source.Id;

			this.app.target.filters = {
				...this.app.target.filters,
				[id]: this.app.timeline.cache.filters[id],
			};

			this.app.target.events.delete(id);
			this.app.target.events.set(
				id,
				this.app.timeline.cache.data.get(id) || [],
			);

			this.filters_delete_cache(file);
		});

		this.setInfoByKey(this.app.target.filters, "target", "filters");
		this.setInfoByKey(this.app.target.events, "target", "events");
		this.render();
	};

	filters_delete_cache = (file: Source.Type | Source.Id) => {
		const id = Parser.useUUID(file) as Source.Id;

		this.app.timeline.cache.data.delete(id);

		this.setInfoByKey(
			{
				data: this.app.timeline.cache.data,
				filters: { ...this.app.timeline.cache.filters, [id]: undefined },
			},
			"timeline",
			"cache",
		);
	};

	render = () => {
		Logger.log(`Render requested`, Info);
		this.setInfoByKey(
			this.app.timeline.renderVersion + 1,
			"timeline",
			"renderVersion",
		);
	};

	private _mappingFileListPromise: Promise<Mapping.Type.Plugin[]> | null = null;
	mapping_file_list = async (): Promise<Mapping.Type.Plugin[]> => {
		if (this._mappingFileListPromise) return this._mappingFileListPromise;

		this._mappingFileListPromise = (async () => {
			const shit = await api<Mapping.Raw[]>("/mapping_file_list");

			const parsed_shit = Mapping.Entity.parse(shit);

			const another_parsed_shit = await this.plugin_list().then((p) =>
				p.filter((p) => p.type.includes("ingestion")),
			);

			another_parsed_shit.forEach((shit) => {
				const found_shit = parsed_shit.find((ps) => ps.name === shit.filename);
				if (found_shit) {
					return;
				} else {
					parsed_shit.push({
						name: shit.filename,
						methods: [],
					});
				}
			});

			const sorted_parsed_shit = parsed_shit.sort((a, b) =>
				a.name.localeCompare(b.name),
			);

			this.setInfoByKey(sorted_parsed_shit, "target", "mappings");

			return sorted_parsed_shit;
		})();

		const result = await this._mappingFileListPromise;
		this._mappingFileListPromise = null;
		return result;
	};

	/**
	 * Uploads or updates a mapping JSON file on the backend.
	 *
	 * @param payload - Mapping file JSON body containing metadata.plugin and mappings.
	 * @param failIfExists - Whether the backend should reject an existing mapping file.
	 * @returns A promise that resolves after the backend upload and mapping list refresh.
	 */
	mapping_file_upload = async (
		payload: GulpDataset.MappingFileUpload.Payload,
		failIfExists = false,
	): Promise<void> => {
		const pluginName = payload.metadata.plugin[0] || "mapping";
		const mappingId = Object.keys(payload.mappings)[0] || "custom";
		const fileName = `${pluginName.replace(/\.[^.]+$/, "")}_${mappingId}.json`;
		const formData = new FormData();

		formData.append(
			"file",
			new Blob([JSON.stringify(payload, null, 2)], {
				type: "application/json",
			}),
			fileName,
		);

		const response = await api("/mapping_file_upload", {
			method: "POST",
			query: {
				fail_if_exists: failIfExists,
			},
			body: formData,
			deassign: true,
			raw: true,
		});

		if (!response || response.status === "error") {
			throw new Error("Mapping file upload failed");
		}

		await this.mapping_file_list();
	};

	/**
	 * Switches to a different operation and performs comprehensive memory cleanup.
	 *
	 * MEMORY MANAGEMENT: Clears all caches (render engines, notes, doc index, timeline,
	 * canvas icons) and resets event data before selecting the new operation.
	 * This prevents memory leaks when switching between operations with large datasets
	 * (e.g., 320k events = ~150MB of cached pixel maps, note groups, and doc references).
	 *
	 * PERFORMANCE: Uses batchUpdate to consolidate all state changes into a single
	 * React setState call, preventing 8+ intermediate re-renders.
	 */
	operations_select = (id: Operation.Id) => {
		// External cache cleanup (not part of React state)
		RenderEngine.clearAllCaches();
		Note.Entity.invalidateCache();
		Doc.Entity.clearIndex();

		// Reset viewport to default position (like first render)
		scrollStore.setScrollX(0);
		scrollStore.setScrollY(-26);

		// Single batched state update instead of 8 separate setInfoByKey calls
		this.batchUpdate((draft) => {
			// Timeline reset
			draft.timeline.scale = 1;
			draft.timeline.target = null;
			draft.timeline.cache.data.clear();
			draft.timeline.cache.filters = {};

			// Clear event data
			draft.target.events.clear();
			draft.target.events = new Map(draft.target.events);

			// Clear notes and links
			draft.target.notes = [];
			draft.target.links = [];

			// Select operation, deselect contexts and files
			draft.target.operations = Operation.Entity.select(draft, id);
			draft.target.contexts = draft.target.contexts.map((context) => ({
				...context,
				selected: false,
			}));
			draft.target.files = draft.target.files.map((file) => ({
				...file,
				selected: false,
			}));
		});
	};

	operations_set = (operations: Operation.Type[]) =>
		this.setInfoByKey(
			Operation.Entity.reload(operations, this.app),
			"target",
			"operations",
		);

	/**
	 * Deletes one or more operations sequentially, shows a consolidated toast summary,
	 * and syncs the application state exactly once at the end.
	 *
	 * @param operations - A single operation object or an array of operation objects to delete.
	 * @param setLoading - State setter to control the loading indicator.
	 * @returns A promise that resolves to an array of successfully deleted operation IDs.
	 */
	deleteOperation = async (
		operations: Operation.Type | Operation.Type[],
		setLoading: SetState<boolean>,
	): Promise<Operation.Id[]> => {
		const list = Array.isArray(operations) ? operations : [operations];
		if (list.length === 0) return [];

		setLoading(true);
		const succeeded: Operation.Type[] = [];
		const failed: Operation.Type[] = [];

		for (const op of list) {
			const res = await api<any>("/operation_delete", {
				method: "DELETE",
				query: {
					operation_id: op.id,
				},
			});

			if (res !== undefined) {
				succeeded.push(op);
			} else {
				failed.push(op);
			}
		}

		setLoading(false);

		// Show single toast based on the consolidated outcomes
		if (succeeded.length > 0 && failed.length === 0) {
			if (succeeded.length === 1) {
				toast.success(
					translate("operation.deleted", { name: succeeded[0].name }),
					{
						icon: <Icon name="Check" />,
						richColors: true,
					},
				);
			} else {
				toast.success(
					translate("operation.deletedCount", { count: succeeded.length }),
					{
						icon: <Icon name="Check" />,
						richColors: true,
					},
				);
			}
		} else if (succeeded.length > 0 && failed.length > 0) {
			toast.warning(
				translate("operation.deletePartialFailed", {
					succeeded: succeeded.length,
					failed: failed.length,
				}),
				{
					description: translate("operation.deleteFailedList", {
						names: failed.map((f) => f.name).join(", "),
					}),
					icon: <Icon name="Warning" />,
					richColors: true,
				},
			);
		} else if (failed.length > 0) {
			if (failed.length === 1) {
				toast.error(
					translate("operation.deleteFailed", { name: failed[0].name }),
					{
						icon: <Icon name="Stop" />,
						richColors: true,
					},
				);
			} else {
				toast.error(
					translate("operation.deleteFailedCount", { count: failed.length }),
					{
						icon: <Icon name="Stop" />,
						richColors: true,
					},
				);
			}
		}

		// Perform state sync exactly once at the end of the batch
		await this.sync();

		return succeeded.map((op) => op.id);
	};

	/**
	 * Fetches detailed information about a specific operation by its ID.
	 *
	 * @param operation_id - The unique identifier of the operation to fetch.
	 * @returns A promise that resolves to the detailed operation information.
	 */
	operation_get_by_id = (
		operation_id: string,
	): Promise<GulpDataset.OperationGetById.Response> => {
		return api<GulpDataset.OperationGetById.Response>("/operation_get_by_id", {
			method: "GET",
			query: { operation_id },
		});
	};

	fetch_gulp_parameters = async () => {
		const res = await fetch("http://localhost:8080/openapi.json");
		const json = await res.json();
		const pluginParamsSchema = json.components?.schemas?.GulpPluginParameters;
		const example = pluginParamsSchema?.examples?.[0];
		return example;
	};

	file_delete = (source: Source.Type) => {
		return api(
			"/source_delete",
			{
				method: "DELETE",
				query: {
					source_id: source.id,
					ws_id: this.app.general.ws_id,
				},
				toast: {
					onSuccess: () =>
						toast.success(translate("source.deleted", { name: source.name }), {
							icon: <Icon name="Check" />,
							richColors: true,
						}),
					onError: () =>
						toast.error(
							translate("source.deleteFailed", { name: source.name }),
							{
								icon: <Icon name="Stop" />,
								richColors: true,
							},
						),
				},
			},
			this.sync,
		);
	};

	/**
	 * Orchestrates ingestion lifecycle and shared worker callbacks.
	 * [Tech-Note] Centralizes upload state and error handling.
	 */
	private _ingest_orchestrator = (
		id: Request.Id,
		file: File,
		context: string,
		onProgress?: (num: number) => void,
	) => {
		this.activeUploads.set(id, { filename: file.name, percent: 0 });

		// SmartSocket.Class.instance.conce(
		// 	SmartSocket.Message.Type.COLLAB_CREATE,
		// 	(m) =>
		// 		m.payload.obj.type === "context" &&
		// 		(m.req_id === id || m.payload.obj.name === context),
		// 	(m) => console.log(m.payload, "Context verification complete", id),
		// );

		let isCompletedOrError = false;

		return {
			onProgress: (progress: number) => {
				if (isCompletedOrError) return;
				this.activeUploads.set(id, { filename: file.name, percent: progress });
				if (progress % 5 === 0 || progress === 100) this.render();
				if (onProgress) onProgress(progress);
			},
			onDone: () => {
				this.activeUploads.delete(id);
				this.render();
			},
			onError: (err: string) => {
				isCompletedOrError = true;
				toast.error(
					translate("source.ingestionFailed", { name: file.name, error: err }),
				);
				this.activeUploads.delete(id);
				this.delLoading(id);
				this.render();
			},
		};
	};

	/**
	 * Registers listeners for incoming source entities generated by the server.
	 * Supports asynchronous source registration during ingest.
	 */
	private _register_source_listeners = (id: Request.Id, filename?: string) => {
		return SmartSocket.Class.instance.con(
			SmartSocket.Message.Type.COLLAB_CREATE,
			(m) => {
				if (m.payload.obj.type !== "source") return false;
				if (m.req_id === id) return true;
				if (filename) {
					const mName = m.payload.obj.name || "";
					if (mName === filename) return true;
					try {
						return decodeURIComponent(mName) === decodeURIComponent(filename);
					} catch (e) {
						return false;
					}
				}
				return false;
			},
			(m) => this.setLoading(m.req_id || id, m.payload.obj.id as Source.Id),
		);
	};

	/**
	 * Registers streaming event listeners for real-time document ingestion.
	 * [Tech-Note] Uses promise-chaining to ensure ordered event insertion.
	 */
	private _register_streaming_listeners = (
		id: Request.Id,
		sidSource: string,
	) => {
		const bufferedEvents: Doc.Type[] = [];
		let accumulatedCount = 0;
		let lastFlushTime = 0;
		let flushChain: Promise<void> = Promise.resolve();
		const FLUSH_INTERVAL_MS = 300;

		const sid = SmartSocket.Class.instance.con(
			SmartSocket.Message.Type.DOCUMENTS_CHUNK,
			(m) => m.req_id === id,
			(m) => {
				const fileId = ((m.payload.docs as any)[0]?.["gulp.source_id"] ||
					(m.payload as any).source_id ||
					(m.payload as any).gulp_source_id) as Source.Id;
				if (!fileId) return;

				const events = Doc.Entity.normalize(
					m.payload.docs || [],
					"gulp.event_code",
					"fnv1a",
				);
				bufferedEvents.push(...events);
				accumulatedCount += events.length;

				this.ingestionProgress.set(
					fileId,
					(this.ingestionProgress.get(fileId) || 0) + events.length,
				);

				if (
					(Date.now() - lastFlushTime >= FLUSH_INTERVAL_MS || m.payload.last) &&
					bufferedEvents.length > 0
				) {
					const toFlush = bufferedEvents.splice(0);
					lastFlushTime = Date.now();
					flushChain = flushChain.then(() => this.events_add_async(toFlush));
				}

				if (m.payload.last) {
					flushChain.then(() => {
						const finalFileId = fileId;
						const all = Source.Entity.events(this.app, finalFileId);

						this.ingestionProgress.delete(finalFileId);
						this.batchUpdate((draft) => {
							const files = Refractor.array(...draft.target.files);
							const exist = files.findIndex((f) => f.id === finalFileId);
							const file = files[exist];

							if (exist !== -1 && file) {
								const timestamp =
									all.length > 0
										? {
												min: all[all.length - 1].gulp_timestamp,
												max: all[0].gulp_timestamp,
											}
										: { min: Date.now(), max: Date.now() };

								files[exist] = Source.Entity.normalize(draft, {
									...file,
									timestamp,
									nanotimestamp: {
										min: Internal.Transformator.toNanos(timestamp.min),
										max: Internal.Transformator.toNanos(timestamp.max),
									},
									total: all.length,
									selected: true,
								});
								draft.target.files = files;

								draft.timeline.frame = {
									min: Math.min(...files.map((f) => f.timestamp.min)),
									max: Math.max(...files.map((f) => f.timestamp.max)),
								};
							}
							draft.general.loadings.byFileId.delete(finalFileId);
						});

						const finalFile = Source.Entity.id(this.app, finalFileId);
						if (finalFile) {
							toast.success(
								translate("source.ingested", { name: finalFile.name }),
								{
									description: translate("source.totalDocuments", {
										count: all.length,
									}),
									richColors: true,
									icon: <Icon name="Check" />,
								},
							);
						}
					});
				}
			},
		);

		SmartSocket.Class.instance.conce(
			SmartSocket.Message.Type.STATS_UPDATE,
			(m) =>
				m.req_id === id &&
				m.payload?.obj?.req_type === "ingest" &&
				m.payload?.obj?.status === "done",
			() => {
				SmartSocket.Class.instance.coff(
					SmartSocket.Message.Type.DOCUMENTS_CHUNK,
					sid,
				);
				SmartSocket.Class.instance.coff(
					SmartSocket.Message.Type.COLLAB_CREATE,
					sidSource,
				);
				this.delLoading(id);
			},
		);
	};

	/**
	 * Initiates standard data ingestion for a single file.
	 * Registers worker task and real-time streaming listeners.
	 */
	file_ingest = async ({
		context,
		file,
		settings,
		setProgress,
		frame,
	}: {
		context: FileEntity.IngestOptions["context"];
		file: File;
		settings: FileEntity.Settings;
		setProgress?: (num: number) => void;
		frame?: FileEntity.IngestOptions["frame"];
	}) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) return;

		const id = generateUUID<Request.Id>(Request.Prefix.INGESTION);
		const callbacks = this._ingest_orchestrator(
			id,
			file,
			context as string,
			setProgress,
		);

		ingestWorkerManager.enqueue({
			req_id: id,
			file,
			operation_id: operation.id,
			context_name: context as string,
			ws_id: this.app.general.ws_id,
			settings,
			server: Internal.Settings.server,
			token: Internal.Settings.token,
			frame,
			...callbacks,
		});

		const sidSource = this._register_source_listeners(id, file.name);
		this._register_streaming_listeners(id, sidSource);
	};

	/**
	 * Initiates package-based ingestion for ZIP archives.
	 * Supports multi-source generation from a single upload.
	 */
	file_ingest_zip = async ({
		context,
		file,
		setProgress,
		frame,
	}: {
		context: FileEntity.IngestOptions["context"];
		file: File;
		setProgress?: (num: number) => void;
		frame?: { min: number; max: number };
	}) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) return;

		const id = generateUUID<Request.Id>(Request.Prefix.INGESTION);
		const callbacks = this._ingest_orchestrator(
			id,
			file,
			context as string,
			setProgress,
		);

		ingestWorkerManager.enqueue({
			req_id: id,
			file,
			operation_id: operation.id,
			context_name: context as string,
			ws_id: this.app.general.ws_id,
			settings: {},
			server: Internal.Settings.server,
			token: Internal.Settings.token,
			endpoint: "ingest_zip",
			frame,
			...callbacks,
		});

		const sidSource = this._register_source_listeners(id);
		this._register_streaming_listeners(id, sidSource);
	};

	/**
	 * Uploads a file in preview mode and returns the parsed preview documents.
	 *
	 * @param options - File ingest options used to build the preview request payload.
	 * @returns A promise that resolves with preview documents, or an empty array when preview loading fails.
	 */
	file_ingest_preview = async (
		options: FileEntity.IngestOptions,
	): Promise<Doc.Type[]> => {
		const { file, settings } = options;
		const operation = Operation.Entity.selected(this.app);
		if (!operation) return [];

		const formData = new FormData();
		const ingestPayload: any = {
			original_file_path: file.name,
			offset: settings.offset ?? 0,
		};

		const pluginParams: any = {
			preview_mode: true,
		};
		if (settings.custom_parameters)
			pluginParams.custom_parameters = settings.custom_parameters;

		const mappingParameters: any = {};
		if (settings.method) mappingParameters.mapping_file = settings.method;
		if (settings.mapping) mappingParameters.mapping_id = settings.mapping;
		if (settings.additional_mapping_files)
			mappingParameters.additional_mapping_files =
				settings.additional_mapping_files;

		if (Object.keys(mappingParameters).length > 0) {
			pluginParams.mapping_parameters = mappingParameters;
		}

		if (settings.store_file !== undefined)
			pluginParams.store_file = settings.store_file;
		ingestPayload.plugin_params = pluginParams;

		formData.append(
			"payload",
			new Blob([JSON.stringify(ingestPayload)], { type: "application/json" }),
		);
		formData.append(
			"f",
			new File([file], file.name, { type: "application/octet-stream" }),
			file.name,
		);
		formData.append(
			"f",
			new File([file], file.name, { type: "application/octet-stream" }),
			file.name,
		);

		const query = {
			plugin: settings.plugin?.split(".")[0],
			operation_id: operation.id,
			context_name: "preview",
			ws_id: this.app.general.ws_id,
		};

		const response = await api<any>("/ingest_file", {
			method: "POST",
			body: formData,
			deassign: true,
			raw: true,
			query,
			headers: {
				size: file.size.toString(),
			},
		});

		if (!response?.data) {
			Logger.error(
				`Failed to load preview for ${file.name}: API returned no data`,
				"Info.file_ingest_preview",
			);
			return [];
		}

		return Array.isArray(response.data) ? (response.data as Doc.Type[]) : [];
	};

	file_set_settings = (
		id: Source.Id,
		settings: Partial<Source.Type["settings"]>,
	) => {
		const file = Source.Entity.id(this.app, id);
		const newSettings = {
			...file.settings,
			...settings,
		} satisfies Source.Type["settings"];

		if (
			newSettings.hash_function !== file.settings.hash_function ||
			!Source.Entity.isEventKeyFetched(this.app, id, [newSettings.field])
		) {
			this.refetch({ ids: id, refetchKeys: { [id]: [newSettings.field] } });
		}

		return this.setInfoByKey(
			this.app.target.files.map((file) =>
				id === file.id ? { ...file, settings: newSettings } : file,
			),
			"target",
			"files",
		);
	};

	file_set_total = (id: Source.Id, total = 0) =>
		this.setInfoByKey(
			this.app.target.files.map((file) =>
				file.id === id ? { ...file, total } : file,
			),
			"target",
			"files",
		);

	context_delete = (context: Context.Type, delete_data: boolean) =>
		api<any>(
			"/context_delete",
			{
				method: "DELETE",
				query: {
					context_id: context.id,
					delete_data,
					ws_id: this.app.general.ws_id,
				},
			},
			this.sync,
		);

	context_update = (id: Context.Id, color: string) => {
		return api<any>("/context_update", {
			method: "PATCH",
			query: {
				context_id: id,
				color,
				ws_id: this.app.general.ws_id,
			},
		}).then(() => {
			this.setInfoByKey(
				this.app.target.contexts.map((c) =>
					c.id === id ? { ...c, color } : c,
				),
				"target",
				"contexts",
			);
			this.render();
		});
	};

	events_add = (newEvents: Doc.Type[]) => Doc.Entity.add(this.app, newEvents);

	events_add_async = async (newEvents: Doc.Type[]) => {
		await Doc.Entity.addAsync(this.app, newEvents);
	};

	event_keys = async (file: Source.Type): Promise<Filter.Options> => {
		if (!file) {
			return Internal.Transformator.toAsync({});
		}

		if (Info._eventKeysCache.has(file.id)) {
			return Info._eventKeysCache.get(file.id)!;
		}

		if (Source.Entity.isVirtual(file)) {
			const ids = file.id.split("-").slice(1) as Source.Id[];

			const filterOptionsStack = await Promise.all(
				ids.map((id) => this.event_keys(Source.Entity.id(this.app, id))),
			);

			const result = filterOptionsStack
				.flat()
				.reduce<Filter.Options>((acc, cur) => {
					Object.keys(cur).forEach((c) => {
						if (!acc[c]) {
							acc[c] = cur[c];
						}
					});

					return acc;
				}, {});

			Info._eventKeysCache.set(file.id, result);
			return result;
		}

		const result = await api<Filter.Options>("/query_fields_by_source", {
			query: {
				operation_id: file.operation_id,
				context_id: file.context_id,
				source_id: file.id,
				ws_id: this.app.general.ws_id,
			},
		});

		Info._eventKeysCache.set(file.id, result);
		return result;
	};

	events_reset_in_file = (file: Source.Type) => {
		Doc.Entity.delete(this.app, file);
	};

	setDialogSize = (number: number) => {
		this.setInfoByKey(number, "timeline", "dialogSize");
	};

	notes_reload = async () => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		const files = Source.Entity.selected(this.app).map((f) => f.id);
		if (files.length === 0) {
			Logger.warn(
				"Tried to fetch all notes from all operations. Ignoring",
				"Info.notes_reload",
			);
			return;
		}
		let notes: Note.Type[] = [];
		const fetch = async (offset = 0) => {
			const fetched = Note.Entity.normalize(
				this.app,
				await api<Note.Type[]>("/note_list", {
					method: "POST",
					query: {
						operation_id: operation.id,
					},
					body: {
						source_ids: files,
						offset,
						limit: 500,
					},
				}),
			);

			if (fetched.length) {
				notes = [...notes, ...fetched].sort(
					(a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a),
				);
				if (notes.length % 2500 === 0) {
					toast(translate("notes.fetchedCount", { count: notes.length }), {
						description: translate("notes.fetchContinuing"),
						icon: <Spinner />,
					});
				}

				DataStore.notes = [...notes];
				Note.Entity.invalidateCache();
				RenderEngine.clearAllCaches();
				DataStore.markDirty();

				return new Promise((res) => {
					setTimeout(() => {
						res(fetch(offset + 500));
					});
				});
			} else {
				const message = translate("notes.fetchedInRounds", {
					count: notes.length,
					rounds: offset / 500,
				});
				Logger.log(message, Info);
				DataStore.notes = [...notes];
				Note.Entity.invalidateCache();
				RenderEngine.clearAllCaches();
				DataStore.markDirty();
				if (notes.length >= 2500) {
					toast.success(message, {
						icon: <Icon name="Check" />,
						richColors: true,
					});
				}
			}
		};

		await fetch();

		Note.Entity[CacheKey].clear();

		return notes;
	};

	/**
	 *
	 * @param key Key of settings object
	 * @param value Value to save. Be carreful, it can save any shit
	 */
	setSettings = (key: string, value: any) =>
		this.setInfoByKey(value, "settings", key);

	setLoading(req_id: Request.Id, file_id: Source.Id) {
		this.app.general.loadings.byRequestId.set(req_id, file_id);
		this.app.general.loadings.byFileId.set(file_id, req_id);

		const loadings = {
			byRequestId: new Map(this.app.general.loadings.byRequestId),
			byFileId: new Map(this.app.general.loadings.byFileId),
		};
		this.setInfoByKey(loadings, "general", "loadings");
	}

	delLoading(req_id: Request.Id) {
		this.app.general.loadings.byRequestId.delete(req_id);
		const file_id = [...this.app.general.loadings.byFileId.entries()].find(
			(e) => e[1] === req_id,
		)?.[0];
		if (file_id) {
			this.app.general.loadings.byFileId.delete(file_id);
		}

		const loadings = {
			byRequestId: new Map(this.app.general.loadings.byRequestId),
			byFileId: new Map(this.app.general.loadings.byFileId),
		};
		this.setInfoByKey(loadings, "general", "loadings");
	}

	note_delete = (note: Note.Type) =>
		api("/note_delete", {
			method: "DELETE",
			query: {
				obj_id: note.id,
				ws_id: this.app.general.ws_id,
			},
		}).then(() => {
			const index = DataStore.notes.findIndex((n) => n.id === note.id);
			if (index !== -1) {
				DataStore.notes.splice(index, 1);
				Note.Entity.invalidateCache();
				RenderEngine.clearAllCaches();
				DataStore.markDirty();
				this.render();
			}
		});

	/**
	 * Deletes multiple notes in a single API call.
	 * Synchronizes the DataStore and invalidates caches upon success.
	 *
	 * @param ids - Array of Note identifiers to delete.
	 */
	notes_delete_bulk = (ids: Note.Id[]) =>
		api("/object_delete_bulk", {
			method: "DELETE",
			query: {
				obj_type: "note",
				operation_id: Operation.Entity.selected(this.app)?.id,
				ws_id: this.app.general.ws_id,
			},
			body: { ids },
		}).then(() => {
			ids.forEach((id) => {
				const index = DataStore.notes.findIndex((n) => n.id === id);
				if (index !== -1) {
					DataStore.notes.splice(index, 1);
				}
			});
			Note.Entity.invalidateCache();
			RenderEngine.clearAllCaches();
			DataStore.markDirty();
			this.render();
		});

	/* GRANTED PERMISSIONS */
	add_granted_group = (obj_type: string, obj_id: string, group_id: string) => {
		return api("/object_add_granted_group", {
			method: "PATCH",
			query: {
				obj_type,
				obj_id,
				group_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("permissions.groupAdded"), {
						icon: <Icon name="Check" />,
						richColors: true,
					}),
				onError: (response) =>
					toast.error(translate("permissions.groupAddFailed"), {
						description: translate("common.reason", {
							reason: response.data.__error.msg,
						}),
						icon: <Icon name="Stop" />,
						richColors: true,
					}),
			},
		});
	};

	add_granted_user = (obj_type: string, obj_id: string, user_id: string) => {
		return api("/object_add_granted_user", {
			method: "PATCH",
			query: {
				obj_type,
				obj_id,
				user_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("permissions.userAdded"), {
						icon: <Icon name="Check" />,
						richColors: true,
					}),
				onError: (response) =>
					toast.error(translate("permissions.userAddFailed"), {
						description: translate("common.reason", {
							reason: response.data.__error.msg,
						}),
						icon: <Icon name="Stop" />,
						richColors: true,
					}),
			},
		});
	};

	remove_granted_group = (
		obj_type: string,
		obj_id: string,
		group_id: string,
	) => {
		return api("/object_remove_granted_group", {
			method: "PATCH",
			query: {
				obj_type,
				obj_id,
				group_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("permissions.groupRemoved"), {
						icon: <Icon name="Check" />,
						richColors: true,
					}),
				onError: (response) =>
					toast.error(translate("permissions.groupRemoveFailed"), {
						description: translate("common.reason", {
							reason: response.data.__error.msg,
						}),
						icon: <Icon name="Stop" />,
						richColors: true,
					}),
			},
		});
	};

	remove_granted_user = (obj_type: string, obj_id: string, user_id: string) => {
		return api("/object_remove_granted_user", {
			method: "PATCH",
			query: {
				obj_type,
				obj_id,
				user_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("permissions.userRemoved"), {
						icon: <Icon name="Check" />,
						richColors: true,
					}),
				onError: (response) =>
					toast.error(translate("permissions.userRemoveFailed"), {
						description: translate("common.reason", {
							reason: response.data.__error.msg,
						}),
						icon: <Icon name="Stop" />,
						richColors: true,
					}),
			},
		});
	};

	note_create = ({
		name,
		text,
		color = Default.Color.NOTE,
		glyph_id = Glyph.List.entries().find(
			(e) => e[1] === Default.Icon.NOTE,
		)![0]!,
		event,
		isPrivate,
		tags,
	}: {
		name: string;
		text: string;
		color: string;
		event: Doc.Type;
		glyph_id: Glyph.Id;
		isPrivate: boolean;
		tags: string[];
	}) =>
		api<Note.Type>("/note_create", {
			method: "POST",
			query: {
				operation_id: Doc.Entity.operationId(this.app, event),
				context_id: Doc.Entity.contextId(this.app, event),
				source_id: event["gulp.source_id"],
				ws_id: this.app.general.ws_id,
				name,
				color,
				glyph_id,
				private: isPrivate,
			},

			toast: {
				onSuccess: () =>
					toast.success(translate("note.created", { name }), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
			},
			body: {
				text,
				tags,
				doc: Doc.Entity.toDoc(this.app, event),
			},
		}).then((note) => {
			note = this.AddNoteToDataStore(note);
		});

	note_edit = ({
		id: obj_id,
		name,
		text,
		color,
		glyph_id = Glyph.List.entries().find(
			(e) => e[1] === Default.Icon.NOTE,
		)![0]!,
		event,
		tags,
	}: {
		id: Note.Id;
		name: string;
		text: string;
		color: string;
		event: Doc.Type;
		glyph_id: Glyph.Id;
		tags: string[];
	}) =>
		api<Note.Type>("/note_update", {
			method: "PATCH",
			query: {
				obj_id,
				ws_id: this.app.general.ws_id,
				name,
				glyph_id,
				color,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("note.updated", { name }), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
			},
			body: {
				text,
				tags,
				doc: Doc.Entity.toDoc(this.app, event),
			},
		}).then((note) => {
			this.AddNoteToDataStore(note);
		});

	links_reload = async () => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		return api<Link.Type[]>(
			"/link_list",
			{
				method: "POST",
				query: {
					operation_id: operation.id,
				},
				body: {
					source_ids: Source.Entity.selected(this.app).map((f) => f.id),
				},
			},
			(links) => {
				DataStore.links = links;
				RenderEngine.clearAllCaches();
				DataStore.markDirty();
				this.render();
			},
		);
	};

	link_delete = (link: Link.Type) =>
		api(
			"/link_delete",
			{
				method: "DELETE",
				query: {
					obj_id: link.id,
					ws_id: this.app.general.ws_id,
				},
			},
			this.links_reload,
		);

	link_create = ({
		name,
		event,
		doc_ids,
		glyph_id = Glyph.List.entries().find(
			(e) => e[1] === Default.Icon.LINK,
		)![0]!,
		color = Default.Color.LINK,
		description,
	}: {
		name: string;
		event: Doc.Type;
		doc_ids?: Doc.Type["_id"][];
		glyph_id: Glyph.Id;
		color: string;
		description: string;
	}) => {
		return api<Link.Type>("/link_create", {
			method: "POST",
			query: {
				doc_id_from: event._id,
				operation_id: Doc.Entity.operationId(this.app, event),
				ws_id: this.app.general.ws_id,
				name,
				glyph_id,
				color,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("link.created", { name }), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
			},
			body: {
				// FIXME: this creates a link without destination documents, which is wrong. the backend allows it
				// just to support this ui ....
				doc_ids: [],
				description: description,
			},
		}).then(this.links_reload);
	};

	link_edit = ({
		id: obj_id,
		name,
		color = Default.Color.LINK,
		glyph_id,
		events,
		description,
	}: {
		id: Link.Id;
		name: string;
		glyph_id: Glyph.Id;
		color: string;
		events: Doc.Type["_id"][];
		description: string;
	}) =>
		api("/link_update", {
			method: "PATCH",
			query: {
				obj_id,
				name,
				color,
				glyph_id,
				ws_id: this.app.general.ws_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("link.updated", { name }), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
			},
			body: {
				doc_ids: events,
				description: description,
			},
		}).then(this.links_reload);

	links_connect = (link: Link.Type, event: Doc.Type) =>
		api<Link.Type>("/link_update", {
			method: "PATCH",
			query: {
				obj_id: link.id,
				ws_id: this.app.general.ws_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(
						translate("link.eventConnected", {
							event: event._id,
							link: link.name,
						}),
						{
							richColors: true,
							icon: <Icon name="Check" />,
						},
					),
			},
			body: {
				doc_ids: Refractor.array(...link.doc_ids, event._id),
			},
		}).then(this.links_reload);

	links_disconnect = (link: Link.Type, event: Doc.Type) =>
		api<Link.Type>("/link_update", {
			method: "PATCH",
			query: {
				obj_id: link.id,
				ws_id: this.app.general.ws_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(
						translate("link.eventDisconnected", {
							event: event._id,
							link: link.name,
						}),
						{
							richColors: true,
							icon: <Icon name="Check" />,
						},
					),
			},
			body: {
				doc_ids: Refractor.array(
					...link.doc_ids.filter((id) => id !== event._id),
				),
			},
		}).then(this.links_reload);

	highlights_reload = debounce(() => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}
		return api<Highlight.Type[]>(
			"/highlight_list",
			{
				method: "POST",
				query: {
					operation_id: operation.id,
				},
			},
			(h) => {
				DataStore.highlights = h;
				RenderEngine.clearAllCaches();
				DataStore.markDirty();
				this.render();
			},
		);
	}, 500);

	highlight_create = async ({
		time_range,
		name,
		icon: glyph_id = Glyph.List.entries().find(
			(e) => e[1] === Default.Icon.HIGHLIGHT,
		)![0]!,
		color = Default.Color.HIGHLIGHT,
		tags = [],
	}: {
		time_range: Range;
		name: string;
		icon: Glyph.Id | null;
		color: string;
		tags?: string[];
	}) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		const files = Source.Entity.selected(this.app);
		if (!files.length) {
			return;
		}

		const source_id = files[0].id;

		return api("/highlight_create", {
			method: "POST",
			query: {
				operation_id: operation.id,
				ws_id: this.app.general.ws_id,
				source_id,
				name,
				color,
				glyph_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("highlights.created", { name }), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
			},
			body: {
				time_range,
				tags,
			},
		}).then(this.highlights_reload);
	};

	highlight_delete = (obj_id: Highlight.Id) =>
		api("highlight_delete", {
			method: "DELETE",
			query: {
				obj_id,
				ws_id: this.app.general.ws_id,
			},
		}).then(() => {
			Highlights.remove(obj_id);
			this.highlights_reload();
		});

	private _glyphsReloadPromise: Promise<void> | null = null;
	glyphs_reload = async () => {
		if (this._glyphsReloadPromise) return this._glyphsReloadPromise;

		this._glyphsReloadPromise = (async () => {
			Glyph.List.clear();

			const glyphs = await api<Glyph.Type[]>("/glyph_list", {
				method: "POST",
			});

			if (!glyphs) {
				return Logger.error("Failed to sync glyphs", "Info.glyphs_reload");
			}

			const queue: (() => Promise<void>)[] = [];

			const synced = new Map<string, Glyph.Id>();

			glyphs.forEach((g) => {
				synced.set(g.name, g.id);
				Glyph.List.set(g.id, g.name);
			});

			const notSynced = Glyph.Raw.filter((glyph) => !synced.has(glyph));

			notSynced.forEach((name) => {
				queue.push(async () => {
					const formData = new FormData();
					formData.append("img", new Blob());

					await api<Glyph.Type>(
						"/glyph_create",
						{
							method: "POST",
							deassign: true,
							query: { name },
							body: formData,
						},
						(glyph) => {
							Glyph.List.set(glyph.id, glyph.name);
						},
					);
				});
			});

			const runQueue = async () => {
				const tasks = queue.splice(0, 10).map((task) => task());
				await Promise.all(tasks);
				if (queue.length > 0) {
					await runQueue();
				}
			};

			await runQueue();

			Logger.log(`Glyphs has been syncronized with gulp-backend`, Info);

			while (Glyph.Entries.length) {
				Glyph.Entries.pop();
			}
			Glyph.Entries.push(...Array.from(Glyph.List.entries()));

			this.setInfoByKey(true, "general", "glyphs_syncronized");
		})();

		await this._glyphsReloadPromise;
		this._glyphsReloadPromise = null;
	};

	setPointers = (pointer: Pointers.Pointer) => {
		const pointers = this.app.timeline.pointers;

		const target = pointers.find((p) => p.id === pointer.id);

		if (target) {
			Object.assign(target, pointer);
		} else {
			pointers.push(pointer);
		}

		this.setInfoByKey(pointers, "timeline", "pointers");
	};

	private getSourceSettings = (): Internal.Session.SourceSettings => ({
		source_settings: Object.fromEntries(
			this.app.target.files.map((file) => [
				file.id,
				{
					hash_function: file.settings.hash_function,
				},
			]),
		) as Internal.Session.SourceSettings["source_settings"],
	});

	session_create = async ({
		name,
		icon = Default.Icon.SESSION,
		color = Default.Color.SESSION,
		scroll,
		scale,
	}: {
		name: string;
		icon: Icon.Name;
		color: string;
		scroll?: { x: number; y: number };
		scale?: number;
	}) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		const sessions = await this.session_list();
		if (sessions.some((s) => s.name === name)) {
			toast.error(translate("session.nameExists"), {
				richColors: true,
			});
			return;
		}

		sessions.push({
			name,
			icon,
			color,
			selected: {
				files: Source.Entity.selected(this.app).map((f) => f.id),
				contexts: Context.Entity.selected(this.app).map((c) => c.id),
				operations: operation.id,
			},
			timeline: {
				scale: this.app.timeline.scale,
				frame: {
					min: this.app.timeline.frame.min,
					max: this.app.timeline.frame.max,
				},
				filter: this.app.timeline.filter,
				target: this.app.timeline.target,
				scroll: scroll ?? { x: scrollStore.getX(), y: scrollStore.getY() },
			},
			filters: this.app.target.filters,
			hidden: this.app.hidden,
			source_settings: this.getSourceSettings(),
		});

		if (!this.app.general.user) {
			Logger.warn("Tried to create session before user has been defined");
			return;
		}

		return api<undefined>("/user_update", {
			method: "PATCH",
			query: {
				user_id: this.app.general.user?.id,
			},
			raw: true,
			body: {
				user_data: {
					sessions,
				},
			},
		});
	};

	session_autosave = async () => {
		const prefix = "Autosaved session ";
		const sessions = await this.session_list();
		const prev = sessions.filter((session) => session.name.startsWith(prefix));
		if (prev.length) {
			await this.sessions_delete(prev.map((s) => s.name));
		}

		await this.session_create({
			name: prefix + new Date().toUTCString(),
			color: "var(--green-700)",
			icon: "RefreshClockwise",
		});
	};

	sessions_delete = async (names: string[]) => {
		for (const name of names) {
			try {
				await this.session_delete(name);
			} catch (err) {
				Logger.log(
					`Failed to delete session ${name}`,
					"Session.Delete.Banner.deleteSessionButtonClickHandler",
					{ richColors: true, icon: <Icon name="Warning" /> },
				);
			}
		}
	};

	session_delete = async (name: string) => {
		if (!this.app.general.user) {
			Logger.error(
				"Tried to delete session but there is no user",
				this.session_delete,
			);
			return;
		}

		const sessions = await this.session_list();

		return api<undefined>("/user_update", {
			method: "PATCH",
			query: {
				user_id: this.app.general.user.id,
			},
			raw: true,
			body: {
				user_data: {
					sessions: sessions.filter((s) => s.name !== name),
				},
			},
		});
	};

	/**
	 * Loads a specific saved session, restoring its selected sources, contexts, filters, hidden items,
	 * scroll positions, and timeline timeframe range.
	 *
	 * @param session - The session data object to restore.
	 * @returns A promise that resolves when the session load action has completed.
	 */
	session_load = async (session: Internal.Session.Data) => {
		this.batchUpdate((draft) => {
			draft.timeline.target = session.timeline.target;
			draft.timeline.frame = session.timeline.frame;
			draft.timeline.filter = session.timeline.filter;
			draft.timeline.scale = session.timeline.scale;
			draft.target.operations = Operation.Entity.select(
				draft.target.operations,
				session.selected.operations,
			);
			draft.target.contexts = Context.Entity.select(
				draft.target.contexts,
				session.selected.contexts,
			);
			draft.target.files = Source.Entity.select(draft, session.selected.files);
			draft.target.filters = session.filters;

			if (session.hidden && typeof session.hidden === "object") {
				Object.keys(session.hidden).forEach((k) => {
					const key = k as keyof App.Type["hidden"];
					draft.hidden[key] = session.hidden[key];
				});
			}
		});

		scrollStore.setScrollX(session.timeline.scroll.x);
		scrollStore.setScrollY(session.timeline.scroll.y);

		setTimeout(() => {
			this.refetch({
				ids: session.selected.files,
				frame: session.timeline.frame,
			});
		}, 0);
	};

	private AddNoteToDataStore(note: Note.Type) {
		note = Note.Entity.normalize_note(this.app, note);
		const idx = DataStore.notes.findIndex((n) => n.id === note.id);
		if (idx !== -1) {
			DataStore.notes[idx] = note;
		} else {
			DataStore.notes.push(note);
			DataStore.notes.sort(
				(a, b) => Note.Entity.timestamp(b) - Note.Entity.timestamp(a),
			);
		}
		Note.Entity.invalidateCache();
		RenderEngine.clearAllCaches();
		DataStore.markDirty();
		this.render();
		return note;
	}

	async session_list(
		user = this.app.general.user,
	): Promise<Internal.Session.Data[]> {
		if (!user) {
			return Internal.Transformator.toAsync([]);
		}

		return api<any>("/user_get_by_id", {
			method: "GET",
			query: { user_id: user.id },
		})
			.then((data) => {
				const sessions = data ? data.user_data.sessions : [];

				return sessions || [];
			})
			.catch((error) => {
				toast.error(translate("session.loadFailed"), {
					description: translate("common.errorMessage", {
						message: JSON.stringify(error),
					}),
					icon: <Icon name="FaceSad" />,
				});
			});
	}

	private _syncPromise: Promise<
		| {
				operations: Operation.Type[];
				contexts: Context.Type[];
				files: Source.Type[];
		  }
		| undefined
	> | null = null;
	sync = async () => {
		if (this._syncPromise) return this._syncPromise;

		this._syncPromise = (async () => {
			await this.mapping_file_list();

			const operationsData =
				await api<GulpDataset.QueryOperations.Summary>("/query_operations");
			if (!operationsData || !Array.isArray(operationsData)) return undefined;

			const operations: Operation.Type[] = [];
			const contexts: Context.Type[] = [];
			const files: Source.Type[] = [];

			operationsData.forEach((opData) => {
				const opId = opData.id as Operation.Id;
				const existOp = Operation.Entity.id(this.app, opId) ?? {};

				operations.push({
					id: opId,
					name: opData.name,
					index: opData.index ?? opData.id,
					glyph_id: opData.glyph_id ?? Default.Icon.OPERATION,
					description: opData.description,
					selected: existOp.selected ?? false,
				} as Operation.Type);

				opData.contexts?.forEach((ctxData) => {
					const ctxId = ctxData.id as Context.Id;
					const existCtx = Context.Entity.id(this.app, ctxId) ?? {};

					contexts.push({
						id: ctxId,
						name: ctxData.name,
						operation_id: opId,
						glyph_id: ctxData.glyph_id ?? Default.Icon.CONTEXT,
						color: existCtx.color ?? stringToHexColor(ctxData.name ?? ""),
						type: "context",
						selected: existCtx.selected ?? false,
						owner_user_id: this.app.general.user?.id!,
						time_created: Date.now(),
						time_updated: Date.now(),
						granted_user_group_ids: [],
						granted_user_ids: [],
					} as Context.Type);

					ctxData.plugins?.forEach((pluginData) => {
						pluginData.sources?.forEach((srcData) => {
							const src = Source.Entity.normalize(
								this.app,
								{
									id: (srcData as any).id,
									name: srcData.name,
									operation_id: opId,
									context_id: ctxId,
									plugin: pluginData.name,
									glyph_id: srcData.glyph_id ?? Default.Icon.SOURCE,
									type: "source",
									owner_user_id: this.app.general.user?.id!,
									time_created: Date.now(),
									time_updated: Date.now(),
								} as Source.Type,
								srcData,
							);
							if (src) files.push(src);
						});
					});
				});
			});

			Logger.log(
				`${operations.length} operations has been added to application data`,
				this.sync,
			);

			Logger.log(
				`${files.length} files has been added to application data`,
				this.sync,
			);

			RenderEngine.reset("range");

			this.setInfoByKey(operations, "target", "operations");
			this.setInfoByKey(contexts, "target", "contexts");
			this.setInfoByKey(files, "target", "files");

			return { operations, contexts, files };
		})();

		const result = await this._syncPromise;
		this._syncPromise = null;
		return result;
	};

	syncFile = (id: Source.Id) =>
		api<Source.Type>("/source_get_by_id", {
			query: { obj_id: id },
		}).then(async (file) => {
			const details = await this.getDetails().then((d) =>
				d.find((f) => f.id === id),
			);
			if (!details) {
				Logger.fatal("No detailed information for file has been provided");
			}

			const normalized = Source.Entity.normalize(this.app, file, details);

			const exist = this.app.target.files.findIndex((f) => f.id === file.id);
			if (exist >= 0) {
				this.app.target.files[exist] = normalized;
			} else {
				this.app.target.files = [...this.app.target.files, normalized];
			}

			this.setInfoByKey(this.app.target.files, "target", "files");
		});

	getDetails = () =>
		api<GulpDataset.QueryOperations.Summary>("/query_operations")
			.then((operations) => {
				if (!operations || !Array.isArray(operations)) return [];
				return operations
					.map(
						(operation) =>
							operation.contexts?.map(
								(context) =>
									context.plugins?.map((plugin) => plugin.sources ?? []) ?? [],
							) ?? [],
					)
					.flat(3);
			})
			.catch((err) => {
				Logger.error("Failed to fetch /query_operations", err);
				return [];
			});

	query_single_id = (doc_id: Doc.Type["_id"], operation_id: Operation.Id) => {
		return api<Doc.Type>("/query_single_id", {
			method: "POST",
			query: {
				doc_id,
				operation_id,
			},
		});
	};

	private _pluginListPromise: Promise<
		GulpDataset.PluginList.Interface[]
	> | null = null;
	plugin_list = async (): Promise<GulpDataset.PluginList.Interface[]> => {
		const plugins = this.app.target.plugins;
		if (plugins.length) {
			return Internal.Transformator.toAsync(plugins);
		}

		if (this._pluginListPromise) return this._pluginListPromise;

		this._pluginListPromise = (async () => {
			Logger.warn("No plugins found in application data", "plugin_list");
			Logger.log("Fetching plugins...", "plugin_list");

			const list = await api<GulpDataset.PluginList.Interface[]>(
				"/plugin_list",
				(list) => list.sort((a, b) => a.filename.localeCompare(b.filename)),
			);
			if (!list) {
				return [];
			}

			this.setInfoByKey(list, "target", "plugins");

			Logger.log(
				`Fetched and sorted ${list.length} plugins. Names:`,
				"plugin_list",
			);
			Logger.log(
				list.map((l) => l.filename),
				"plugin_list",
			);

			return list;
		})();

		const result = await this._pluginListPromise;
		this._pluginListPromise = null;
		return result;
	};

	setTimelineFrame = (frame: MinMax) =>
		this.setInfoByKey(frame, "timeline", "frame");

	private _userGetByIdPromises = new Map<string, Promise<User.Type>>();

	/**
	 * Fetches all users available to the current session.
	 *
	 * @returns A promise resolving to the user list returned by the API.
	 */
	user_list = (): Promise<User.Type[]> => {
		return api<User.Type[]>("/user_list", {
			method: "GET",
		});
	};

	/**
	 * Deletes a user by its unique identifier.
	 *
	 * @param userId - The unique identifier of the user to delete.
	 * @returns A promise resolving to true when the API confirms deletion.
	 */
	user_delete = async (userId: string): Promise<boolean> => {
		const response = await api<undefined>("/user_delete", {
			method: "DELETE",
			query: { user_id: userId },
			raw: true,
		});

		return response.status === "success";
	};

	/**
	 * Fetches detailed information about a specific user by its ID.
	 *
	 * @param userId - The unique identifier of the user to fetch.
	 * @returns A promise resolving to the detailed user information.
	 */
	user_get_by_id = (userId: string): Promise<User.Type> => {
		if (this._userGetByIdPromises.has(userId)) {
			return this._userGetByIdPromises.get(userId)!;
		}
		const p = api<User.Type>("/user_get_by_id", {
			method: "GET",
			query: { user_id: userId },
		}).finally(() => {
			this._userGetByIdPromises.delete(userId);
		});
		this._userGetByIdPromises.set(userId, p);
		return p;
	};

	login = async (credentials: Pick<User.Minified, "id" | "password">) => {
		const user = await api<User.Type>("/login", {
			method: "POST",
			query: {
				ws_id: this.app.general.ws_id,
			},
			toast: {
				onSuccess: () =>
					toast.success(translate("auth.accessGranted"), {
						richColors: true,
						icon: <Icon name="Check" />,
					}),
				onError: (response) =>
					toast.error(translate("auth.loginFailed"), {
						richColors: true,
						description: translate("common.reason", {
							reason: response.data.__error.msg,
						}),
						icon: <Icon name="Warning" />,
					}),
			},
			body: {
				user_id: credentials.id,
				password: credentials.password,
			},
		});

		if (!user) {
			return null;
		}

		Internal.Settings.token = user.token;
		localStorage.setItem("__user_id", user.id);

		await this.plugin_list();
		await this.glyphs_reload();
		await this.sync();

		this.setInfoByKey(Object.assign(credentials, user), "general", "user");

		return user;
	};

	user_set_data = async (
		key: string,
		value: any,
	): Promise<User.Type | null> => {
		if (!this.app.general.user) {
			Logger.warn(`Tried to set user data ${key} without a logged-in user`);
			return null;
		}

		const user = await api<User.Type>("/user_update", {
			method: "PATCH",
			query: {
				user_id: this.app.general.user.id,
			},
			body: {
				user_data: {
					[key]: value,
				},
			},
		});

		if (user) {
			this.setInfoByKey(user, "general", "user");
		}

		return user;
	};

	/**
	 * Logs out the current user session by calling the POST /logout API.
	 * Clears the stored session token and resets the user context.
	 *
	 * @returns Promise that resolves when logout cleanup is completed
	 */
	logout = async (): Promise<void> => {
		try {
			await api<undefined>("/logout", {
				method: "POST",
				query: {
					ws_id: this.app.general.ws_id,
				},
			});
		} catch (error) {
			Logger.error(error, "Info.logout");
		}

		Internal.Settings.token = "";
		localStorage.removeItem("__user_id");
		this.setInfo({
			...App.Base,
			general: {
				...App.Base.general,
				server: this.app.general.server,
				ws_id: this.app.general.ws_id,
			},
		});
	};

	setTimelineScale = (scale: number) => {
		const timeRange = this.app.timeline.frame.max - this.app.timeline.frame.min;
		const canvasWidth = document.getElementById("canvas")?.clientWidth || 1000;
		const maxScale =
			timeRange > 0
				? timeRange / (this.MIN_MS_PER_PIXEL * canvasWidth)
				: 9999999;
		return this.setInfoByKey(
			Math.max(0.01, Math.min(maxScale, scale)),
			"timeline",
			"scale",
		);
	};

	setTimelineTarget = (event?: Doc.Type | null | 1 | -1): Doc.Type => {
		const { target } = this.app.timeline;
		const previousTargetId = target?._id;

		if (typeof event === "number" && target) {
			const events = Source.Entity.events(this.app, target["gulp.source_id"]);
			const index =
				events.findIndex((event) => event._id === target._id) + event;
			event = events[index];
		}

		if (typeof event !== "undefined") {
			this.setInfoByKey(event as Doc.Type, "timeline", "target");
			if ((event as Doc.Type | null | undefined)?._id !== previousTargetId) {
				DataStore.markDirty();
			}
		}

		return event as Doc.Type;
	};

	setTimelineFilter = (filter: string) =>
		this.setInfoByKey(filter, "timeline", "filter");

	increasedTimelineScale = (current: number = this.app.timeline.scale) =>
		current + current / 8;

	decreasedTimelineScale = () =>
		this.app.timeline.scale - this.app.timeline.scale / 8;

	query_external = async (
		plugin: string,
		plugin_params?: Record<string, any>,
		preview_mode = false,
		q?: string,
		q_options?: Record<string, any>,
	): Promise<{
		total_hits: number;
		docs: Doc.Type[];
	} | null> => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return { total_hits: 0, docs: [] };
		}

		return api<{
			total_hits: number;
			docs: Doc.Type[];
		}>("/query_external", {
			method: "POST",
			raw: true,
			query: {
				ws_id: this.app.general.ws_id,
				operation_id: operation.id,
				plugin,
			},
			body: {
				q: q,
				plugin_params,
				q_options: {
					...q_options,
					preview_mode,
				},
			},
		}).then((response) => {
			if (response.data) {
				return response.data;
			}

			return new Promise((resolve, reject) => {
				SmartSocket.Class.instance.conce(
					SmartSocket.Message.Type.INGEST_SOURCE_DONE,
					(m) => m.req_id === response.req_id,
					(m) => {
						if (m.payload.status === "failed") {
							return reject();
						}

						// Trust me bro, this is masterpieceofshit
						// well well well
						resolve(null);
					},
				);
			});
		});
	};

	/**
	 * Persists a Query.Type into the application filter cache for one or more source files.
	 *
	 * Before persisting, auto-generates the human-readable `string` label via
	 * `Filter.Entity.describe()` so it always reflects the actual applied state.
	 * Also preserves `fieldTypeMap` for correct clause generation on re-open.
	 *
	 * @param file - One or more source files to associate the query with.
	 * @param query - The structured query to persist.
	 */
	setQuery = (file: Arrayed<Source.Type>, query: Query.Type): void => {
		const files = Parser.array(file);

		// Auto-generate the display label from the current query state
		const displayLabel = Filter.Entity.describe(query, this.app);

		files.forEach((file) => {
			this.app.target.filters[file.id] = {
				string: displayLabel,
				text_filter: query.text_filter,
				source_config: query.source_config,
				// Always use the incoming filters array directly.
				// An empty array is a valid "cleared" state and must NOT fall back
				// to the previously stored filters.
				filters: Array.isArray(query.filters) ? query.filters : [],
				raw: query.raw,
				isManual: query.isManual,
				fieldTypeMap: query.fieldTypeMap,
			};
		});

		this.setInfoByKey(
			Refractor.object(this.app.target.filters),
			"target",
			"filters",
		);
	};

	getQuery = (file: Source.Type): Query.Type => {
		const query = this.app.target.filters[file.id];

		if (!query) {
			const q = Filter.Entity.default(this.app, file.id);

			this.setQuery(file, q);

			return q;
		}

		return query;
	};

	filters_remove = (file: Source.Type | Source.Id) => {
		const id = Parser.useUUID(file) as Source.Id;
		const filters = Refractor.object({
			...this.app.target.filters,
			[id]: Filter.Entity.default(this.app, file),
		});

		return this.setInfoByKey(filters, "target", "filters");
	};

	useReverseScroll = (bool: boolean) => {
		localStorage.setItem("settings.__isScrollReversed", String(bool));
		this.setInfoByKey(bool, "timeline", "isScrollReversed");
	};

	files_reorder_upper = (id: Source.Id) => {
		const files = this.app.target.files;
		const index = files.findIndex((file) => file.id === id);

		if (index === 0) return;

		const file = files[index];
		files[index] = files[index - 1];
		files[index - 1] = file;

		this.setInfoByKey(files, "target", "files");
		this.render();
	};

	files_reorder_lower = (id: Source.Id) => {
		const files = this.app.target.files;
		const index = files.findIndex((file) => file.id === id);

		if (index === files.length - 1) return;

		const file = files[index];
		files[index] = files[index + 1];
		files[index + 1] = file;

		this.setInfoByKey(files, "target", "files");
		this.render();
	};

	query_sigma = async (
		src_ids: Source.Id[],
		sigmas: NodeFile[],
		notes: boolean,
	) => {
		const operation = Operation.Entity.selected(this.app);
		if (!operation) {
			return;
		}

		return api(
			"/query_sigma",
			{
				method: "POST",
				query: {
					ws_id: this.app.general.ws_id,
					operation_id: operation.id,
				},
				raw: true,
				body: {
					sigmas: await Promise.all(sigmas.map((s) => s.text())),
					q_options: {
						create_notes: notes,
					},
					src_ids,
				},
				toast: {
					onSuccess: () =>
						toast.success(translate("sigma.applied"), {
							richColors: true,
							icon: <Icon name="Check" />,
						}),
					onError: (response) =>
						toast.error(translate("sigma.notApplied"), {
							richColors: true,
							icon: <Icon name="Warning" />,
						}),
				},
			},
			({ req_id }) => {
				SmartSocket.Class.instance.conce(
					SmartSocket.Message.Type.STATS_UPDATE,
					(m) => m.req_id === req_id,
					(m) => {
						if (m.payload.obj.status !== "done") {
							toast.error(translate("sigma.queryFailed"), {
								icon: <Icon name="Stop" />,
								richColors: true,
							});
						} else {
							toast.success(
								translate("sigma.queryFinished", { name: m.payload.obj.name }),
								{
									description: translate("sigma.totalMatches", {
										count: m.payload.obj.data.total_hits ?? 0,
									}),
									icon: <Icon name="Sigma" />,
								},
							);
						}
					},
				);
				SmartSocket.Class.instance.con(
					SmartSocket.Message.Type.COLLAB_CREATE,
					(m) => m.req_id === req_id,
					(m) => {
						if (Array.isArray(m.payload.obj) && m.payload.obj.length > 0) {
							const newItems = m.payload.obj.filter(
								(item) => item.type === "note",
							) as Note.Type[];
							newItems.forEach((note) => this.AddNoteToDataStore(note));
							toast.success(
								translate("notes.fetchedCount", { count: newItems.length }),
								{
									richColors: true,
								},
							);
						}
					},
				);
			},
		);
	};

	toggle_visibility = (key: keyof App.Type["hidden"]) => {
		this.setInfoByKey(!this.app.hidden[key], "hidden", key);
		this.render();
	};

	files_repin = (id: Source.Id) => {
		const files = this.app.target.files;
		const index = files.findIndex((file) => file.id === id);

		files[index].pinned = !files[index].pinned;

		this.setInfoByKey(files, "target", "files");
		this.render();
	};

	get width(): number {
		return (
			this.app.timeline.scale *
			(document.getElementById("canvas")?.clientWidth || 1)
		);
	}

	setInfoByKey = <K extends keyof App.Type, S extends keyof App.Type[K]>(
		value: App.Type[K][S] | ((prev: App.Type[K][S]) => App.Type[K][S]),
		section: K,
		key: S,
	) => {
		this.setInfo((_info) => {
			const resolvedValue =
				typeof value === "function"
					? (value as any)(_info[section][key])
					: value;
			this.app = {
				..._info,
				[section]: {
					..._info[section],
					[key]: resolvedValue,
				},
			};

			return this.app;
		});
	};

	/**
	 * Batches multiple state updates into a single React setState call.
	 * Use this instead of calling setInfoByKey N times in sequence,
	 * which would create N intermediate state objects and potentially N re-renders.
	 *
	 * The updater receives a shallow-cloned draft of the app state with all
	 * top-level sections pre-cloned. Modifications to the draft are applied
	 * as a single immutable update.
	 *
	 * @param updater - Function receiving a mutable draft of the current app state.
	 *                  Modify the draft's sections directly (e.g., draft.target.notes = []).
	 */
	batchUpdate = (updater: (draft: App.Type) => void) => {
		this.setInfo((prev) => {
			// Shallow-clone top-level sections so the updater can safely mutate them
			const next: App.Type = {
				...prev,
				target: { ...prev.target },
				timeline: { ...prev.timeline },
				general: { ...prev.general },
				settings: { ...prev.settings },
				hidden: { ...prev.hidden },
			};
			updater(next);
			this.app = next;
			return next;
		});
	};
}

export type Arrayed<K> = K | K[];

export type UUIDED<
	K extends Context.Type | Source.Type | Source.Type | Filter.Type,
> = K | K["id"];

export const Pattern = {
	Server: new RegExp(
		/https?:\/\/(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})?(:\d+)?(\/[^\s]*)?/,
	),
	Username: /^[\s\S]{3,48}$/,
	Password: /^[\s\S]{3,48}$/,
};

export interface MinMax<T extends number | bigint = number> {
	min: T;
	max: T;
}

export type Range = [number, number];

export const MinMaxBase = {
	min: 0,
	max: 0,
};
