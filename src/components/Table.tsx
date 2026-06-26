import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import s from "./styles/Table.module.css";
import { cn } from "@/ui/utils";
import { Icon } from "@/ui/Icon";
import { Stack } from "@/ui/Stack";
import { Checkbox } from "@/ui/Checkbox";
import { Glyph } from "@/entities/Glyph";
import { Button } from "@/ui/Button";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from "@/ui/Tooltip";
import { Color } from "@/entities/Color";
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuCheckboxItem,
	ContextMenuLabel,
	ContextMenuSeparator,
} from "@/ui/ContextMenu";
import { useTableConfig } from "@/hooks/useTableConfig";
import { Locale } from "@/locales";

export type Object = Record<string, any>;

export namespace Table {
	/**
	 * Describes a single action button rendered per row.
	 * The parent component manages the callback logic.
	 */
	export interface Action<T extends Object> {
		/** Icon name from the icon library. */
		icon: Icon.Name;
		/** Accessible label, rendered as a tooltip on hover. */
		label: string;
		/** Callback executed when this action is triggered. */
		onClick: (
			value: T,
			index: number,
			event: React.MouseEvent<HTMLButtonElement>,
		) => void;
		/** Optional variant for the action button. Defaults to 'tertiary'. */
		variant?: "secondary" | "tertiary";
	}

	/**
	 * Custom render function signature for individual cells.
	 * Returns a React node to override the default stringified fallback.
	 */
	export type CellRenderer<T extends Object> = (
		value: unknown,
		row: T,
		columnKey: string,
		rowIndex: number,
	) => React.ReactNode;

	/** Map column keys to custom cell renderers. */
	export type RenderMap<T extends Object> = Record<string, CellRenderer<T>>;

	/**
	 * Describes the configuration of a single column inside the Table.
	 */
	export interface ColumnDefinition<T extends Object> {
		/** The unique key identifying the field in data rows. */
		key: string;
		/** Custom display label for the column header. */
		label?: string;
		/** Custom width for this column. Can be a number (pixels) or string (e.g. 'auto', '100%'). */
		width?: number | string;
		/** Custom render function specifically for cells in this column. */
		render?: CellRenderer<T>;
	}

	export interface Props<T extends Object> extends Stack.Props {
		/** The array of data objects to display in the table. */
		values: T[];
		/** Whether to include a virtual index column ('i'). Defaults to true. */
		includeIndex?: boolean;
		/** List of fields to explicitly hide from the table columns. */
		notshow?: string[];

		// --- Checkbox Selection ---
		/** Whether rows are selectable via checkboxes. */
		selectable?: boolean;
		/** Set of indices representing currently selected rows (checkbox-based). */
		selectedrows?: Set<number>;
		/** Callback triggered when a row's checkbox selection state changes. */
		onrowselect?: (index: number, selected: boolean) => void;
		/** Callback triggered when the select-all header checkbox is toggled. */
		onSelectAll?: (selected: boolean) => void;

		// --- Row Click Selection ---
		/** Callback fired when a row is clicked. Parent manages the active state. When provided, enables row hover effect. */
		onRowClick?: (value: T, index: number) => void;
		/** Index of the currently active/selected row. Receives distinct visual styling. */
		activeRowIndex?: number;

		// --- Actions ---
		/** Array of action configurations for per-row action buttons. */
		actions?: Action<T>[];

		/** @deprecated Use `actions` prop instead. */
		onrowaction?: (value: T, index: number) => void;
		/** @deprecated Use `actions` prop instead. */
		iconAction?: string;

		// --- Rendering ---
		/** Global custom cell renderer, applied to all columns without a specific renderMap entry. */
		renderCell?: CellRenderer<T>;
		/** Per-column custom renderers keyed by column name. Takes priority over renderCell. */
		renderMap?: RenderMap<T>;

		// --- Columns & Sorting ---
		/** Optional explicit list of columns to display. If omitted, columns are derived from data. */
		columns?: (string | ColumnDefinition<T>)[];
		/** The field currently being used for sorting. */
		sortField?: string;
		/** The current sorting direction. */
		sortDirection?: "asc" | "desc";
		/** Callback triggered when a column header is clicked to change sorting. */
		onSort?: (field: string) => void;

		// --- Highlighting ---
		/** The ID of the row to highlight (matches _id field). */
		highlightedId?: string;

		// --- Column Visibility (Phase 4) ---
		/** Enables the right-click context menu for toggling column visibility. */
		columnVisibility?: boolean;
		/** Unique ID for this table, used to persist column visibility config in IndexedDB. */
		persistId?: string;

		// --- Virtualization ---
		/** Enables viewport row rendering for large tables. Set to false to render all rows. */
		virtualization?:
			| false
			| {
					/** Row count above which virtualization is enabled. Defaults to 40. */
					threshold?: number;
					/** Number of extra rows rendered above and below the viewport. Defaults to 8. */
					overscan?: number;
					/** Estimated row height in pixels. Defaults to 28. */
					estimatedRowHeight?: number;
			  };
	}
}

interface ColumnModel<T extends Object> {
	/** Source rows used by the table body. Explicit-column tables keep raw rows. */
	rows: T[];
	/** Visible column keys before user column-visibility filtering. */
	columns: string[];
	/** Renderers declared on column definitions. */
	renderMapFromColumns: Record<string, Table.CellRenderer<T>>;
	/** Header labels declared on column definitions. */
	columnLabels: Record<string, string>;
	/** Explicit widths declared on column definitions. */
	columnWidthsFromDefinitions: Record<string, number | string>;
	/** Whether the caller supplied a fixed column schema. */
	hasExplicitColumns: boolean;
}

interface VirtualizationConfig {
	/** Row count above which virtualization is enabled. */
	threshold: number;
	/** Number of additional rows rendered outside the viewport. */
	overscan: number;
	/** Estimated row height in pixels. */
	estimatedRowHeight: number;
}

interface RowDescriptor {
	/** Row index in the full table result set. */
	index: number;
}

const DEFAULT_VIRTUALIZATION_CONFIG: VirtualizationConfig = {
	threshold: 40,
	overscan: 8,
	estimatedRowHeight: 28,
};

/**
 * Resolves row virtualization settings from the public Table prop.
 * @param virtualization Optional virtualization configuration or false.
 * @returns Concrete virtualization settings.
 */
function resolveVirtualizationConfig(
	virtualization: Table.Props<Object>["virtualization"],
): VirtualizationConfig {
	if (!virtualization) {
		return DEFAULT_VIRTUALIZATION_CONFIG;
	}

	return {
		threshold:
			virtualization.threshold ?? DEFAULT_VIRTUALIZATION_CONFIG.threshold,
		overscan: virtualization.overscan ?? DEFAULT_VIRTUALIZATION_CONFIG.overscan,
		estimatedRowHeight:
			virtualization.estimatedRowHeight ??
			DEFAULT_VIRTUALIZATION_CONFIG.estimatedRowHeight,
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function flattenRow(
	value: Record<string, any>,
	parentKey = "",
): Record<string, any> {
	return Object.entries(value).reduce<Record<string, any>>(
		(acc, [key, entry]) => {
			const nextKey = parentKey ? `${parentKey}.${key}` : key;

			if (isPlainObject(entry)) {
				Object.assign(acc, flattenRow(entry, nextKey));
				return acc;
			}

			acc[nextKey] = entry;
			return acc;
		},
		{},
	);
}

/**
 * Reads a field from a row, supporting both literal and dotted keys.
 * @param row Source row object.
 * @param key Literal field key or dotted path.
 * @returns Field value when present.
 */
function readRowValue(row: Record<string, any>, key: string): unknown {
	if (Object.prototype.hasOwnProperty.call(row, key)) {
		return row[key];
	}

	return key.split(".").reduce<unknown>((current, part) => {
		if (!current || typeof current !== "object") {
			return undefined;
		}

		return (current as Record<string, unknown>)[part];
	}, row);
}

/**
 * Builds the table model for explicit-column callers without projecting rows.
 * @param sourceRows Raw rows passed by the caller.
 * @param configuredColumns Explicit column list or definitions.
 * @param notshow Columns hidden by the caller.
 * @param includeIndex Whether to include the virtual index column.
 * @returns Column metadata and raw rows for lazy cell resolution.
 */
function buildExplicitColumnModel<T extends Object>(
	sourceRows: T[],
	configuredColumns: (string | Table.ColumnDefinition<T>)[],
	notshow: string[] | undefined,
	includeIndex: boolean,
): ColumnModel<T> {
	const renderMapFromColumns: Record<string, Table.CellRenderer<T>> = {};
	const columnLabels: Record<string, string> = {};
	const columnWidthsFromDefinitions: Record<string, number | string> = {};

	const keys = configuredColumns.map((column) => {
		if (typeof column === "string") {
			return column;
		}

		columnLabels[column.key] = column.label || column.key;
		if (column.render) {
			renderMapFromColumns[column.key] = column.render;
		}
		if (column.width !== undefined) {
			columnWidthsFromDefinitions[column.key] = column.width;
		}
		return column.key;
	});

	const columns = keys.filter((key) => !notshow?.includes(key));
	if (includeIndex && !columns.includes("i")) {
		columns.unshift("i");
	}

	return {
		rows: sourceRows,
		columns,
		renderMapFromColumns,
		columnLabels,
		columnWidthsFromDefinitions,
		hasExplicitColumns: true,
	};
}

/**
 * Builds the table model for schema-less callers by flattening each row once.
 * @param sourceRows Raw rows passed by the caller.
 * @param notshow Columns hidden by the caller.
 * @param includeIndex Whether to include the virtual index column.
 * @returns Column metadata and flattened rows.
 */
function buildDerivedColumnModel<T extends Object>(
	sourceRows: T[],
	notshow: string[] | undefined,
	includeIndex: boolean,
): ColumnModel<T> {
	const flattenedRows = sourceRows.map((value) => flattenRow(value) as T);
	const keys = new Set<string>();

	flattenedRows.forEach((row) => {
		Object.keys(row).forEach((key) => {
			if (notshow && notshow.includes(key)) return;
			if (!notshow && key === "event.original") return;
			keys.add(key);
		});
	});

	if (includeIndex) {
		keys.add("i");
	}

	return {
		rows: flattenedRows,
		columns: Array.from(keys.values()).sort((a, b) => a.localeCompare(b)),
		renderMapFromColumns: {},
		columnLabels: {},
		columnWidthsFromDefinitions: {},
		hasExplicitColumns: false,
	};
}

/**
 * Reads a display value for the requested table cell.
 * @param row Source row for the current rendered line.
 * @param column Column key to read.
 * @param rowIndex Row index in the full table.
 * @param includeIndex Whether the virtual index column is enabled.
 * @param hasExplicitColumns Whether the caller supplied a column schema.
 * @returns Cell value or the blank placeholder when the field is absent.
 */
function readTableCellValue<T extends Object>(
	row: T,
	column: string,
	rowIndex: number,
	includeIndex: boolean,
	hasExplicitColumns: boolean,
): unknown {
	if (column === "i" && includeIndex) {
		return rowIndex;
	}

	const value = hasExplicitColumns
		? readRowValue(row, column)
		: (row as Record<string, unknown>)[column];

	return hasExplicitColumns
		? value ?? "<BLANK>"
		: value === undefined
			? "<BLANK>"
			: value;
}

/**
 * Determines whether a table column matches the active sort field.
 * @param column Column key from the table header.
 * @param sortField Currently sorted field.
 * @returns True when the column should display the sort indicator.
 */
function isTableColumnSorted(column: string, sortField: string | undefined): boolean {
	if (!sortField) return false;
	if (sortField === column) return true;
	if (column === "timestamp" && sortField === "@timestamp") return true;
	if (column === "@timestamp" && sortField === "timestamp") return true;
	return false;
}

/**
 * Creates a stable key for a rendered row.
 * @param row Row data used by the rendered table line.
 * @param index Row index in the full table.
 * @returns Stable key based on row identity and index fallback.
 */
function getRowKey<T extends Object>(row: T, index: number): string {
	const record = row as Record<string, unknown>;
	return `${String(record._id ?? record.id ?? "")}-${index}`;
}

/**
 * Creates descriptors for every row when virtualization is disabled.
 * @param rowCount Total number of table rows.
 * @returns Sequential row descriptors.
 */
function createSequentialRowDescriptors(rowCount: number): RowDescriptor[] {
	return Array.from({ length: rowCount }, (_, index) => ({
		index,
	}));
}

/**
 * Creates a small object preview without deep stringifying large payloads.
 * @param value Object or array value to preview.
 * @returns Bounded human-readable preview.
 */
function previewObjectValue(value: unknown): string {
	if (Array.isArray(value)) {
		const items = value.slice(0, 6).map((item) =>
			item && typeof item === "object" ? "{...}" : String(item),
		);
		return `[${items.join(", ")}${value.length > 6 ? ", ..." : ""}]`;
	}

	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>).slice(0, 8);
		const preview = entries.map(([key, entry]) => {
			const display =
				entry && typeof entry === "object"
					? Array.isArray(entry)
						? `[${entry.length}]`
						: "{...}"
					: typeof entry === "bigint"
						? entry.toString()
						: String(entry);
			return `${key}: ${display}`;
		});
		const suffix =
			Object.keys(value as Record<string, unknown>).length > entries.length
				? ", ..."
				: "";
		return `{${preview.join(", ")}${suffix}}`;
	}

	return String(value);
}

/**
 * Converts a cell value to bounded display text.
 * @param value Cell value.
 * @returns String safe to compute during table render.
 */
function formatCellValue(value: unknown): string {
	if (typeof value === "bigint") {
		return value.toString();
	}

	if (value && typeof value === "object") {
		return previewObjectValue(value);
	}

	return String(value);
}

/**
 * Resolves the final list of row actions, handling backward compatibility
 * with the deprecated `onrowaction` / `iconAction` props.
 */
function resolveActions<T extends Object>(
	actions: Table.Action<T>[] | undefined,
	onrowaction: ((value: T, index: number) => void) | undefined,
	iconAction: string | undefined,
	defaultActionLabel: string,
): Table.Action<T>[] {
	if (actions && actions.length > 0) {
		return actions;
	}

	if (onrowaction) {
		return [
			{
				icon: (iconAction || "Search") as Icon.Name,
				label: defaultActionLabel,
				onClick: onrowaction,
				variant: "tertiary",
			},
		];
	}

	return [];
}

/**
 * Renders a generic data table with optional selection, actions, sorting, and virtualized rows.
 * @param props Table configuration, data rows, column definitions, and callbacks.
 * @returns Table wrapper element.
 */
export function Table<T extends Object>({
	values: _values = [],
	className,
	includeIndex = true,
	columns: _columns,
	notshow,
	selectable,
	selectedrows,
	onrowselect,
	onSelectAll,
	onRowClick,
	activeRowIndex,
	onrowaction,
	iconAction,
	actions: _actions,
	renderCell,
	renderMap,
	sortField,
	sortDirection,
	onSort,
	highlightedId,
	columnVisibility: _columnVisibility,
	persistId: _persistId,
	virtualization: virtualizationProp,
	...props
}: Table.Props<T>) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const { t } = Locale.use();
	const isResizingRef = useRef(false);
	const lastResolvedActionsRef = useRef<Table.Action<T>[]>([]);

	const handleSort = useCallback(
		(field: string) => {
			if (isResizingRef.current) return;
			onSort?.(field);
		},
		[onSort],
	);

	/** Resolve actions with backward compat for deprecated props. */
	const resolvedActions = useMemo(() => {
		const fresh = resolveActions(
			_actions,
			onrowaction,
			iconAction,
			t("common.action"),
		);
		const last = lastResolvedActionsRef.current;
		if (
			last.length === fresh.length &&
			last.every((act, idx) => {
				const fAct = fresh[idx];
				return (
					act.icon === fAct.icon &&
					act.label === fAct.label &&
					act.variant === fAct.variant &&
					act.onClick === fAct.onClick
				);
			})
		) {
			return last;
		}
		lastResolvedActionsRef.current = fresh;
		return fresh;
	}, [_actions, onrowaction, iconAction, t]);

	const columnModel = useMemo(
		() =>
			_columns
				? buildExplicitColumnModel([], _columns, notshow, includeIndex)
				: buildDerivedColumnModel(_values, notshow, includeIndex),
		[_columns, notshow, includeIndex, _columns ? null : _values],
	);

	const {
		columns,
		renderMapFromColumns,
		columnLabels,
		columnWidthsFromDefinitions,
		hasExplicitColumns,
	} = columnModel;
	const rows = hasExplicitColumns ? _values : columnModel.rows;

	const virtualizationConfig = resolveVirtualizationConfig(virtualizationProp);
	const isVirtualizationEnabled =
		virtualizationProp !== false && rows.length > virtualizationConfig.threshold;

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => wrapperRef.current,
		estimateSize: () => virtualizationConfig.estimatedRowHeight,
		overscan: virtualizationConfig.overscan,
	});

	const virtualItems = isVirtualizationEnabled
		? rowVirtualizer.getVirtualItems()
		: [];
	const topSpacerHeight =
		isVirtualizationEnabled && virtualItems.length > 0
			? virtualItems[0].start
			: 0;
	const bottomSpacerHeight =
		isVirtualizationEnabled && virtualItems.length > 0
			? Math.max(
					0,
					rowVirtualizer.getTotalSize() -
						virtualItems[virtualItems.length - 1].end,
				)
			: 0;
	const renderedRowDescriptors = isVirtualizationEnabled
		? virtualItems.map((virtualItem) => ({
				index: virtualItem.index,
			}))
		: createSequentialRowDescriptors(rows.length);

	/** Combined custom cell renderers from column definition and renderMap prop */
	const mergedRenderMap = useMemo(() => {
		return { ...renderMapFromColumns, ...renderMap };
	}, [renderMapFromColumns, renderMap]);

	/**
	 * Determines whether all visible rows are currently selected via checkboxes.
	 * Used to drive the select-all header checkbox state.
	 */
	const isAllSelected = useMemo(() => {
		if (!selectable || !selectedrows || rows.length === 0) return false;
		return rows.length > 0 && selectedrows.size === rows.length;
	}, [selectable, selectedrows, rows.length]);

	/** Whether the table body has clickable rows (enables hover). */
	const isClickable = !!onRowClick;

	// ─── Column Visibility (Phase 4) ───────────────────────────────────
	const {
		hiddenColumns,
		toggleColumn,
		resetConfig,
		isLoaded: configLoaded,
	} = useTableConfig(_persistId, columns, !!_columnVisibility);

	/** Columns filtered by visibility (hidden columns removed). */
	const visibleColumns = useMemo(() => {
		if (!_columnVisibility || hiddenColumns.size === 0) return columns;
		return columns.filter((c) => !hiddenColumns.has(c));
	}, [columns, hiddenColumns, _columnVisibility]);

	// ─── Column Resizing ───────────────────────────────────────────────
	const MIN_COL_WIDTH = 30;
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

	/** Calculate default column widths based on maximum character length of contents or custom column configuration */
	const defaultWidths = useMemo(
		() => {
			const widths: Record<string, number | string> = {};
			const skipRowSampling = rows.length > virtualizationConfig.threshold;

			columns.forEach((column) => {
				const configuredWidth = columnWidthsFromDefinitions[column];
				if (configuredWidth !== undefined) {
					widths[column] = configuredWidth;
					return;
				}

				if (column === "i") {
					widths[column] = 45;
					return;
				}

				let maxLen = (columnLabels[column] || column).length;

				if (!skipRowSampling) {
					const sampleRows = rows.slice(0, 100);
					for (let rowIndex = 0; rowIndex < sampleRows.length; rowIndex++) {
						const value = readTableCellValue(
							sampleRows[rowIndex],
							column,
							rowIndex,
							includeIndex,
							hasExplicitColumns,
						);
						if (value !== undefined && value !== null && value !== "<BLANK>") {
							const valueText = formatCellValue(value);
							if (valueText.length > maxLen) {
								maxLen = valueText.length;
							}
						}
					}
				}

				widths[column] = Math.max(80, Math.min(350, maxLen * 7.5 + 24));
			});

			return widths;
		},
		[
			rows,
			columns,
			columnWidthsFromDefinitions,
			columnLabels,
			includeIndex,
			hasExplicitColumns,
			virtualizationConfig.threshold,
		],
	);

	/**
	 * Handles the start of a column resize drag operation.
	 * Attaches mousemove and mouseup listeners to the window for smooth tracking.
	 */
	const handleResizeStart = useCallback(
		(columnKey: string, startX: number, startWidth: number) => {
			isResizingRef.current = true;
			const localDoc = wrapperRef.current?.ownerDocument ?? document;
			const localWin = localDoc.defaultView ?? window;

			const onMouseMove = (e: MouseEvent) => {
				const delta = e.clientX - startX;
				const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta);
				setColumnWidths((prev) => ({ ...prev, [columnKey]: newWidth }));
			};

			const onMouseUp = () => {
				localWin.removeEventListener("mousemove", onMouseMove);
				localWin.removeEventListener("mouseup", onMouseUp);
				localDoc.body.style.cursor = "";
				localDoc.body.style.userSelect = "";
				setTimeout(() => {
					isResizingRef.current = false;
				}, 100);
			};

			localDoc.body.style.cursor = "col-resize";
			localDoc.body.style.userSelect = "none";
			localWin.addEventListener("mousemove", onMouseMove);
			localWin.addEventListener("mouseup", onMouseUp);
		},
		[],
	);

	/** Calculates the total width of the table by summing all column widths. */
	const totalTableWidth = useMemo(() => {
		let width = 0;
		let hasFlexible = false;
		if (selectable) width += 40;
		visibleColumns.forEach((c) => {
			const w = columnWidths[c] ?? defaultWidths[c];
			if (typeof w === "number") {
				width += w;
			} else {
				hasFlexible = true;
			}
		});
		if (resolvedActions.length > 0) {
			width += resolvedActions.length * 32 + 16;
		}
		return hasFlexible ? "100%" : width;
	}, [
		selectable,
		visibleColumns,
		columnWidths,
		defaultWidths,
		resolvedActions,
	]);

	const bodyColumnCount = Math.max(
		1,
		visibleColumns.length +
			(selectable ? 1 : 0) +
			(resolvedActions.length > 0 ? 1 : 0),
	);

	/**
	 * Renders a table body row from a virtual or sequential row descriptor.
	 * @param descriptor Row descriptor produced by the render plan.
	 * @returns Rendered table item or null when the row no longer exists.
	 */
	const renderBodyRow = useCallback(
		(descriptor: RowDescriptor) => {
			const row = rows[descriptor.index];
			if (!row) {
				return null;
			}

			const record = row as T & Record<string, unknown>;

			return (
				<Item
					columns={visibleColumns}
					key={getRowKey(record, descriptor.index)}
					i={record}
					index={descriptor.index}
					includeIndex={includeIndex}
					hasExplicitColumns={hasExplicitColumns}
					selectable={selectable}
					selected={selectedrows?.has(descriptor.index)}
					onRowSelect={onrowselect}
					actions={resolvedActions}
					onRowClick={onRowClick}
					isActive={activeRowIndex === descriptor.index}
					highlighted={!!(highlightedId && record._id === highlightedId)}
					renderCell={renderCell}
					renderMap={mergedRenderMap}
				/>
			);
		},
		[
			rows,
			visibleColumns,
			includeIndex,
			hasExplicitColumns,
			selectable,
			selectedrows,
			onrowselect,
			resolvedActions,
			onRowClick,
			activeRowIndex,
			highlightedId,
			renderCell,
			mergedRenderMap,
		],
	);

	/** Renders the inner table element with colgroup, thead, and tbody. */
	const tableElement = (
		<table
			className={s.table}
			style={{ width: totalTableWidth }}
		>
			<colgroup>
				{selectable && <col style={{ width: 40 }} />}
				{visibleColumns.map((c) => {
					const w: number | string = columnWidths[c] ?? defaultWidths[c];
					return (
						<col
							key={`col-${c}`}
							style={String(w) === "auto" ? undefined : { width: w }}
						/>
					);
				})}
				{resolvedActions.length > 0 && (
					<col style={{ width: resolvedActions.length * 32 + 16 }} />
				)}
			</colgroup>
			<thead>
				<tr>
					{selectable && (
						<th className={s.selectAllCell}>
							{onSelectAll ? (
								<div className={s.centered}>
									<Checkbox
										checked={isAllSelected}
										onCheckedChange={(c) => onSelectAll(!!c)}
									/>
								</div>
							) : null}
						</th>
					)}
					{visibleColumns.map((c, i) => {
						const isSorted = isTableColumnSorted(c, sortField);
						return (
							<MemoCol
								c={c}
								label={columnLabels[c]}
								key={c + i}
								isSorted={isSorted}
								sortDirection={isSorted ? sortDirection : undefined}
								onSort={handleSort}
								onResizeStart={handleResizeStart}
							/>
						);
					})}
					{resolvedActions.length > 0 && <th className={s.actionCell} />}
				</tr>
			</thead>
			<tbody data-clickable={isClickable || undefined}>
				{isVirtualizationEnabled && topSpacerHeight > 0 ? (
					<tr
						className={s.virtualSpacerRow}
						aria-hidden="true"
					>
						<td
							className={s.virtualSpacerCell}
							colSpan={bodyColumnCount}
							style={{ height: topSpacerHeight }}
						/>
					</tr>
				) : null}
				{renderedRowDescriptors.map(renderBodyRow)}
				{isVirtualizationEnabled && bottomSpacerHeight > 0 ? (
					<tr
						className={s.virtualSpacerRow}
						aria-hidden="true"
					>
						<td
							className={s.virtualSpacerCell}
							colSpan={bodyColumnCount}
							style={{ height: bottomSpacerHeight }}
						/>
					</tr>
				) : null}
			</tbody>
		</table>
	);

	return (
		<TooltipProvider>
			<Stack
				ai="flex-start"
				jc="flex-start"
				dir="column"
				ref={wrapperRef}
				className={cn(s.wrapper, className)}
				style={{
					...props.style,
					["--highlight-color" as any]: Color.Themer.getTargetGuideColor(),
				}}
				{...props}
			>
				{!configLoaded ? null : _columnVisibility ? (
					<ContextMenu>
						<ContextMenuTrigger asChild>{tableElement}</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuLabel>{t("table.columnVisibility")}</ContextMenuLabel>
							<ContextMenuSeparator />
							{columns.map((col) => (
								<ContextMenuCheckboxItem
									key={col}
									checked={!hiddenColumns.has(col)}
									onCheckedChange={() => toggleColumn(col)}
									onSelect={(e) => e.preventDefault()}
								>
									{columnLabels[col] || col}
								</ContextMenuCheckboxItem>
							))}
							{hiddenColumns.size > 0 && (
								<>
									<ContextMenuSeparator />
									<ContextMenuCheckboxItem
										checked={false}
										onCheckedChange={() => resetConfig()}
										onSelect={(e) => e.preventDefault()}
									>
										{t("table.showAllColumns")}
									</ContextMenuCheckboxItem>
								</>
							)}
						</ContextMenuContent>
					</ContextMenu>
				) : (
					tableElement
				)}
			</Stack>
		</TooltipProvider>
	);
}

namespace Col {
	export interface Props extends Stack.Props {
		/** The column field name. */
		c: string;
		/** Custom display label for the column header. */
		label?: string;
		/** Whether this column is currently sorted. */
		isSorted: boolean;
		/** The current sorting direction. */
		sortDirection?: "asc" | "desc";
		/** Callback to trigger a sort on this column. */
		onSort?: (field: string) => void;
		/** Callback to initiate column resize. */
		onResizeStart?: (
			columnKey: string,
			startX: number,
			startWidth: number,
		) => void;
	}
}

/**
 * Renders a table header cell with optional sorting interactivity and resize handle.
 *
 * @param props - Header column configurations and callbacks
 */
function Col({
	c,
	label,
	isSorted,
	sortDirection,
	onSort,
	onResizeStart,
	...props
}: Col.Props) {
	const thRef = useRef<HTMLTableCellElement>(null);

	/**
	 * Initiates column resize on mousedown on the resize handle.
	 * Reads the current rendered width as the starting value.
	 */
	const handleResizeMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			e.preventDefault();
			if (!thRef.current || !onResizeStart) return;
			const startWidth = thRef.current.getBoundingClientRect().width;
			onResizeStart(c, e.clientX, startWidth);
		},
		[c, onResizeStart],
	);

	return (
		<th
			ref={thRef}
			{...props}
			onClick={() => onSort?.(c)}
			style={{
				cursor: onSort ? "pointer" : "default",
				userSelect: "none",
				position: "relative",
			}}
		>
			<Stack
				gap={4}
				ai="center"
				jc="flex-start"
				className={s.headerStack}
			>
				<span>{label ?? c}</span>
				{isSorted && onSort && (
					<Icon
						className={s.headerSortIcon}
						name={sortDirection === "asc" ? "SortAscending" : "SortDescending"}
						size={14}
					/>
				)}
			</Stack>
			{onResizeStart && (
				<div
					className={s.resizeHandle}
					onMouseDown={handleResizeMouseDown}
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
					}}
				/>
			)}
		</th>
	);
}

const MemoCol = React.memo(Col);

namespace Item {
	export interface Props<T extends Object> extends Stack.Props {
		/** The flattened data row. */
		i: T;
		/** Visible column keys. */
		columns: string[];
		/** Row index within the table. */
		index: number;
		/** Whether the virtual index column should be populated. */
		includeIndex: boolean;
		/** Whether the table uses caller-provided columns and raw row reads. */
		hasExplicitColumns: boolean;
		/** Whether checkbox selection is enabled. */
		selectable?: boolean;
		/** Whether this row's checkbox is checked. */
		selected?: boolean;
		/** Callback when this row's checkbox changes. */
		onRowSelect?: (index: number, selected: boolean) => void;
		/** Resolved list of row-level action buttons. */
		actions: Table.Action<T>[];
		/** Callback when the row itself is clicked (click-selection). */
		onRowClick?: (value: T, index: number) => void;
		/** Whether this row is the active/click-selected row. */
		isActive: boolean;
		/** Whether this row is highlighted by external ID match. */
		highlighted: boolean;
		/** Global custom cell renderer. */
		renderCell?: Table.CellRenderer<T>;
		/** Per-column custom cell renderers. */
		renderMap?: Table.RenderMap<T>;
	}
}

/**
 * Renders a single table body row with optional checkbox, actions, and custom rendering.
 */
const Item = React.memo(
	function ItemInner<T extends Object>({
		i,
		columns,
		index,
		includeIndex,
		hasExplicitColumns,
		selectable,
		selected,
		onRowSelect,
		actions,
		onRowClick,
		isActive,
		highlighted,
		renderCell,
		renderMap,
		...props
	}: Item.Props<T>) {
		/**
		 * Handle row click for click-selection.
		 * Prevents triggering row click when clicking on interactive elements (checkbox, button).
		 */
		const handleRowClick = useCallback(
			(e: React.MouseEvent) => {
				if (!onRowClick) return;
				const target = e.target as HTMLElement;
				if (target.closest('button, input, [role="checkbox"]')) return;
				onRowClick(i, index);
			},
			[onRowClick, i, index],
		);

		return (
			<tr
				className={cn(
					s.item,
					isActive && s.activeRow,
					highlighted && s.highlighted,
				)}
				onClick={handleRowClick}
				{...props}
			>
				{selectable && (
					<td className={cn(s.value, s.actionCell)}>
						<div className={s.centered}>
							<Checkbox
								checked={!!selected}
								onCheckedChange={(c) => onRowSelect?.(index, !!c)}
							/>
						</div>
					</td>
				)}
				{columns.map((c, idx) => {
					const cellValue = readTableCellValue(
						i,
						c,
						index,
						includeIndex,
						hasExplicitColumns,
					);

					// Priority: renderMap[column] > renderCell > default Value component
					const columnRenderer = renderMap?.[c];
					if (columnRenderer) {
						return (
							<td
								className={cn(s.value, cellValue === "<BLANK>" && s.blank)}
								key={c + idx}
							>
								{columnRenderer(cellValue, i, c, index)}
							</td>
						);
					}
					if (renderCell) {
						return (
							<td
								className={cn(s.value, cellValue === "<BLANK>" && s.blank)}
								key={c + idx}
							>
								{renderCell(cellValue, i, c, index)}
							</td>
						);
					}
					return (
						<Value
							k={c}
							v={cellValue}
							key={c + cellValue + idx}
						/>
					);
				})}
				{actions.length > 0 && (
					<td className={cn(s.value, s.actionsCell)}>
						<Stack
							gap={4}
							ai="center"
							jc="center"
						>
							{actions.map((action) => (
								<Tooltip
									key={action.label}
									delayDuration={300}
								>
									<TooltipTrigger asChild>
										<Button
											className={s.Button_Icon}
											icon={action.icon}
											variant={action.variant || "tertiary"}
											onClick={(event) => action.onClick(i, index, event)}
										/>
									</TooltipTrigger>
									<TooltipContent sideOffset={4}>{action.label}</TooltipContent>
								</Tooltip>
							))}
						</Stack>
					</td>
				)}
			</tr>
		);
	},
	(prevProps, nextProps) => {
		if (prevProps.index !== nextProps.index) return false;
		if (prevProps.includeIndex !== nextProps.includeIndex) return false;
		if (prevProps.hasExplicitColumns !== nextProps.hasExplicitColumns) return false;
		if (prevProps.selectable !== nextProps.selectable) return false;
		if (prevProps.selected !== nextProps.selected) return false;
		if (prevProps.isActive !== nextProps.isActive) return false;
		if (prevProps.highlighted !== nextProps.highlighted) return false;
		if (prevProps.i !== nextProps.i) return false;
		if (prevProps.columns.length !== nextProps.columns.length) return false;
		for (let i = 0; i < prevProps.columns.length; i++) {
			if (prevProps.columns[i] !== nextProps.columns[i]) return false;
		}
		if (prevProps.actions !== nextProps.actions) return false;
		if (prevProps.onRowClick !== nextProps.onRowClick) return false;
		if (prevProps.onRowSelect !== nextProps.onRowSelect) return false;
		if (prevProps.renderCell !== nextProps.renderCell) return false;
		if (prevProps.renderMap !== nextProps.renderMap) return false;
		return true;
	},
) as <T extends Object>(props: Item.Props<T>) => React.ReactElement | null;

namespace Value {
	export interface Props extends Stack.Props {
		k: string;
		v: any;
	}
}

/**
 * Renders a single cell value, with auto-detection of text truncation.
 * If the value is truncated, hovers trigger a portalled Tooltip.
 * Keeps a completely stable DOM structure to prevent hover flickering and layout shifts.
 */
const Value = React.memo(
	function ValueInner({ k, v, ...props }: Value.Props) {
		const [open, setOpen] = useState(false);
		const cellRef = useRef<HTMLTableCellElement>(null);
		const triggerRef = useRef<HTMLSpanElement>(null);

		useEffect(() => {
			if (!open) return;

			/**
			 * Handles mouse clicks outside the cell and the active tooltip portal
			 * to close/dismiss the active tooltip.
			 *
			 * @param event - The global MouseEvent object.
			 */
			const handleClickOutside = (event: MouseEvent) => {
				const target = event.target as HTMLElement;
				if (
					cellRef.current &&
					!cellRef.current.contains(target) &&
					!target.closest('[data-table-tooltip="true"]')
				) {
					setOpen(false);
				}
			};

			const localDoc = cellRef.current?.ownerDocument ?? document;
			localDoc.addEventListener("click", handleClickOutside);
			return () => {
				localDoc.removeEventListener("click", handleClickOutside);
			};
		}, [open]);

		const stringified = formatCellValue(v);
		const displayValue = stringified;

		if (k === "color") {
			props.style = {
				...props.style,
				color: stringified,
			};
		}

		const glyph = Glyph.List.get(v as Glyph.Id);
		const icon =
			k === "glyph_id" && glyph ? (
				<Icon
					className={s.cellIcon}
					size={12}
					name={glyph}
				/>
			) : null;

		const content = (
			<>
				{icon}
				{displayValue}
			</>
		);

		const tooltipText = displayValue;

		const handleMouseEnter = () => {
			if (!triggerRef.current) return;
			// Detect if text is truncated (overflowing).
			// We add a 1px tolerance to avoid subpixel rendering false-positives.
			const isOverflowing =
				triggerRef.current.scrollWidth > triggerRef.current.clientWidth + 1;
			if (isOverflowing) {
				setOpen(true);
			}
		};

		const handleMouseLeave = () => {
			setOpen(false);
		};

		return (
			<td
				ref={cellRef}
				className={cn(s.value, displayValue === "<BLANK>" && s.blank)}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				{...props}
			>
				<Tooltip
					open={open}
					delayDuration={0}
				>
					<TooltipTrigger asChild>
						<span
							ref={triggerRef}
							className={s.triggerSpan}
						>
							{content}
						</span>
					</TooltipTrigger>
					<TooltipContent
						data-table-tooltip="true"
						sideOffset={4}
						style={{
							maxWidth: 400,
							maxHeight: 300,
							overflow: "auto",
							whiteSpace: "pre-wrap",
							textAlign: "left",
							background: "var(--background-100)",
							padding: 8,
							border: "1px solid var(--gray-400)",
							borderRadius: 6,
							zIndex: 1500,
						}}
					>
						{tooltipText}
					</TooltipContent>
				</Tooltip>
			</td>
		);
	},
	(prevProps, nextProps) => {
		return prevProps.k === nextProps.k && prevProps.v === nextProps.v;
	},
);
