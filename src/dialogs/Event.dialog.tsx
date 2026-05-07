import { Application } from "@/context/Application.context";
import { Dialog } from "@/ui/Dialog";
import {
	Fragment,
	useEffect,
	useMemo,
	useState,
	useCallback,
	useRef,
} from "react";
import s from "./styles/DisplayEventDialog.module.css";
import { copy, download, generateUUID, Refractor, isPlainObject, sortObjectKeysRecursively as sortTreeValueRecursively, parseLineToKeyValue as parseToKeyValue } from "@/ui/utils";
import { Stack } from "@/ui/Stack";
import { Button } from "@/ui/Button";
import { Skeleton } from "@/ui/Skeleton";
import { MinMaxBase } from "@/class/Info";
import { Navigation } from "./components/navigation";
import { Enrichment } from "@/banners/Enrichment.banner";
import {
	LinkFunctionality,
	NoteFunctionality,
} from "@/banners/Collab.functionality";
import { Collab } from "@/components/CollabList";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/ui/ContextMenu";
import { FilterFileBanner } from "@/banners/FilterFile.banner";
import { SendData } from "@/banners/SendData.banner";
import { toast } from "sonner";
import { JsonView, allExpanded, darkStyles, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { StyleProps } from "react-json-view-lite/dist/DataRenderer";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/Tabs";
import { Table } from "@/components/Table";
import { Markdown } from "@/ui/Markdown";
import { Icon } from "@impactium/icons";
import { cn } from "@impactium/utils";
import { CacheKey } from "@/class/Engine.dto";
import { RenderEngine } from "@/class/RenderEngine";
import { Doc } from "@/entities/Doc";
import { Source } from "@/entities/Source";
import { Filter } from "@/entities/Filter";
import { Note } from "@/entities/Note";
import { Color } from "@/entities/Color";
import { Extension } from "@/context/Extension.context";

// --- UTILITIES ---

/**
 * Removes 'event.original' from an object and re-inserts it at the end.
 * @param obj The source object
 * @returns A new object with 'event.original' at the end
 */
const prepareEventJson = (obj: Record<string, any>): Record<string, string> => {
	const entries = Object.entries(obj).filter(([k]) => k !== "event.original");
	return {
		...Object.fromEntries(entries),
		"event.original": obj["event.original"],
	};
};

/**
 * Flattens a nested object into an array of key-value pairs suitable for table display.
 * @param value The value to flatten
 * @param parentKey The current accumulated key path
 */
const flattenTableEntries = (
	value: unknown,
	parentKey = "",
): Array<{ key: string; value: string }> => {
	if (Array.isArray(value)) {
		return value.flatMap((entry, index) =>
			flattenTableEntries(entry, parentKey ? `${parentKey}.${index}` : String(index)),
		);
	}

	if (value && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
			flattenTableEntries(entry, parentKey ? `${parentKey}.${key}` : key),
		);
	}

	return [{
		key: parentKey,
		value:
			value == null
				? String(value)
				: typeof value === "bigint"
					? value.toString()
					: String(value),
	}];
};

/**
 * Reconstructs the full dot-notated key path from a Tree label element.
 * @param labelEl The label element to start from
 * @param labelClass CSS class for labels
 * @param clickableLabelClass CSS class for clickable labels
 * @param nodeClass CSS class for nodes
 * @param basicClass CSS class for basic containers
 */
const getTreeKeyPath = (
	labelEl: Element,
	labelClass: string,
	clickableLabelClass: string,
	nodeClass: string,
	basicClass: string,
): string => {
	const clean = (el: Element) => (el.textContent || "").trim().replace(/^"+|"+$/g, "");
	const parts: string[] = [clean(labelEl)];

	let nodeEl: Element | null = labelEl.closest(`.${nodeClass}`);
	while (nodeEl) {
		const parentContainer = nodeEl.parentElement;
		if (!parentContainer?.classList.contains(basicClass)) break;
		const parentNode = parentContainer.parentElement;
		if (!parentNode?.classList.contains(nodeClass)) break;

		const parentLabel = Array.from(parentNode.children).find(
			(c) => c.classList.contains(labelClass) || c.classList.contains(clickableLabelClass),
		);
		if (!parentLabel) break;
		parts.unshift(clean(parentLabel));
		nodeEl = parentNode;
	}
	return parts.join(".");
};

/**
 * Resolves a dot-separated path within a JSON object.
 * Handles both flat maps and nested structures.
 * @param json Source data object
 * @param path Dot-separated path to resolve
 */
const getValueByPath = (json: Record<string, unknown>, path: string): unknown => {
	if (Object.prototype.hasOwnProperty.call(json, path)) {
		return json[path];
	}

	const prefix = path + ".";
	const nestedEntries = Object.entries(json).filter(([k]) => k.startsWith(prefix));

	if (nestedEntries.length > 0) {
		const nested: Record<string, any> = {};
		nestedEntries.forEach(([k, v]) => {
			const suffix = k.slice(prefix.length);
			suffix.split(".").reduce(
				(acc: Record<string, any>, part, index, parts) =>
					acc[part] || (acc[part] = index === parts.length - 1 ? v : {}),
				nested,
			);
		});
		return nested;
	}

	const parts = path.split(".");
	let flatKeyMatch: string | null = null;
	for (let i = parts.length; i > 0; i--) {
		const candidate = parts.slice(0, i).join(".");
		if (Object.prototype.hasOwnProperty.call(json, candidate)) {
			flatKeyMatch = candidate;
			break;
		}
	}

	if (flatKeyMatch) {
		let current = json[flatKeyMatch];
		const remainingParts = parts.slice(flatKeyMatch.split(".").length);

		for (const part of remainingParts) {
			if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
				current = (current as Record<string, unknown>)[part];
			} else {
				return undefined;
			}
		}
		return current;
	}

	return undefined;
};

/**
 * Checks if a coordinate point is within the current browser selection.
 * @param x Client X
 * @param y Client Y
 * @returns boolean
 */
const isPointInSelection = (x: number, y: number): boolean => {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
		return false;
	const range = selection.getRangeAt(0);
	const rects = range.getClientRects();
	for (let i = 0; i < rects.length; i++) {
		const rect = rects[i];
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
			return true;
	}
	return false;
};

/**
 * Detects the key-value pair under the cursor in the Table view.
 * @param element The clicked element
 */
const detectTableSelection = (element: HTMLElement): string | null => {
	const tr = element.closest("tr");
	if (tr) {
		const cells = Array.from(tr.querySelectorAll("td"));
		if (cells.length >= 2) {
			const selection = window.getSelection();
			if (selection) {
				const range = document.createRange();
				range.selectNodeContents(tr);
				selection.removeAllRanges();
				selection.addRange(range);
			}
			return `"${cells[0].innerText.trim()}": "${cells[1].innerText.trim()}"`;
		}
	}
	return null;
};

/**
 * Detects the full key-value path under the cursor in the Tree view.
 * @param element The clicked element
 * @param json The source JSON object
 */
const detectTreeSelection = (element: HTMLElement, json: Record<string, unknown> | null): string | null => {
	let treeLabel = element.classList.contains(s.label) || element.classList.contains(s.clickableLabel)
		? element
		: (element.closest(`.${s.label}`) ?? element.closest(`.${s.clickableLabel}`));

	if (!treeLabel) {
		const node = element.closest(`.${s.node}`);
		if (node) {
			treeLabel = node.querySelector(`.${s.label}, .${s.clickableLabel}`);
		}
	}

	if (treeLabel && json) {
		const path = getTreeKeyPath(treeLabel, s.label, s.clickableLabel, s.node, s.basic);
		if (path) {
			const value = getValueByPath(json, path);
			if (value !== undefined) {
				const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
				const nodeContainer = treeLabel.closest(`.${s.node}`) as HTMLElement;
				if (nodeContainer) {
					const selection = window.getSelection();
					if (selection) {
						const range = document.createRange();
						range.selectNodeContents(nodeContainer);
						selection.removeAllRanges();
						selection.addRange(range);
					}
				}
				return `"${path}": "${strValue}"`;
			}
		}
	}
	return null;
};

/**
 * Detects the key-value pair under the cursor in the Raw (JSON) view.
 * @param element The clicked element
 * @param x Client X
 * @param y Client Y
 */
const detectRawSelection = (element: HTMLElement, x: number, y: number): string | null => {
	const highlighter = element.closest(`.${s.highlighter}`) as HTMLElement;
	const codeEl = highlighter.querySelector("code, pre") as HTMLElement;

	const selection = window.getSelection();
	let range: Range | null = null;
	// @ts-ignore
	if (document.caretRangeFromPoint) {
		// @ts-ignore
		range = document.caretRangeFromPoint(x, y);
	} else if (document.caretPositionFromPoint) {
		// @ts-ignore
		const pos = document.caretPositionFromPoint(x, y);
		if (pos) {
			range = document.createRange();
			range.setStart(pos.offsetNode, pos.offset);
			range.setEnd(pos.offsetNode, pos.offset);
		}
	}

	if (range && selection && codeEl) {
		selection.removeAllRanges();
		selection.addRange(range);
		try {
			// @ts-ignore
			selection.modify("move", "backward", "lineboundary");
			// @ts-ignore
			selection.modify("extend", "forward", "lineboundary");
			const lineText = selection.toString().trim();
			if (lineText.includes(":")) {
				const fullText = codeEl.innerText;
				const lines = fullText.split("\n");

				const preRange = document.createRange();
				preRange.selectNodeContents(codeEl);
				preRange.setEnd(range.startContainer, range.startOffset);
				const offset = preRange.toString().length;
				const lineIndex = fullText.substring(0, offset).split("\n").length - 1;

				// Indentation Back-Scanner to resolve nested paths
				const targetLine = lines[lineIndex];
				const match = targetLine.match(/^(\s*)"([^"]+)":/);
				if (match) {
					let currentPath = match[2];
					let currentIndent = match[1].length;

					for (let i = lineIndex - 1; i >= 0; i--) {
						const line = lines[i];
						const m = line.match(/^(\s*)"([^"]+)":\s*[\{\[]/);
						if (m) {
							const indent = m[1].length;
							if (indent < currentIndent) {
								currentPath = m[2] + "." + currentPath;
								currentIndent = indent;
							}
						}
						if (currentIndent === 0) break;
					}
					const colonIndex = lineText.indexOf(":");
					return `"${currentPath}": ${lineText.slice(colonIndex + 1).trim()}`;
				}

				return lineText;
			}
		} catch (e) {
			console.error("Native selection modify failed", e);
		}
	}

	// Fallback for Raw View
	let current: HTMLElement | null = element;
	while (
		current &&
		current !== document.body &&
		!current.classList.contains(s.highlighter)
	) {
		const text = (current.innerText || current.textContent || "").trim();
		if (text.includes(":") && !text.includes("\n")) {
			const sel = window.getSelection();
			if (sel) {
				const r = document.createRange();
				r.selectNodeContents(current);
				sel.removeAllRanges();
				sel.addRange(r);
			}
			return text;
		}
		current = current.parentElement;
	}
	return null;
};

/**
 * Detects if the user has clicked on a key-value pair in any of the views.
 * @param x Client X coordinate
 * @param y Client Y coordinate
 * @param json The current event JSON
 */
const detectSelectionAtPoint = (
	x: number,
	y: number,
	json: Record<string, any> | null,
): string | null => {
	const element = document.elementFromPoint(x, y) as HTMLElement;
	if (!element) return null;

	// 1. Table Handling
	if (element.closest(`.${s.tableView}`)) {
		return detectTableSelection(element);
	}

	// 2. Tree Handling
	if (element.closest(`.${s.container}`) || element.closest(`.${s.node}`)) {
		return detectTreeSelection(element, json as Record<string, unknown> | null);
	}

	// 3. Raw Handling
	if (element.closest(`.${s.highlighter}`)) {
		return detectRawSelection(element, x, y);
	}

	return null;
};

/**
 * Builds a { key: value } object from selected cells in the table view.
 * Returns null when the current selection does not intersect the event table.
 */
/**
 * Builds a { key: value } object from selected cells in the table view.
 * Returns null when the current selection does not intersect the event table.
 */
const getSelectedTableKeyValueObject = (): Record<string, string> | null => {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
		return null;
	}

	const range = selection.getRangeAt(0);
	const selectedCells = Array.from(
		document.querySelectorAll(`.${s.tableView} tbody td`),
	).filter((cell) => {
		try {
			return range.intersectsNode(cell);
		} catch {
			return false;
		}
	}) as HTMLTableCellElement[];

	if (selectedCells.length === 0) {
		return null;
	}

	const table = selectedCells[0].closest("table");
	if (!table) {
		return null;
	}

	const headerCells = Array.from(table.querySelectorAll("thead th")).map((header) =>
		header.textContent?.trim().toLowerCase() ?? "",
	);

	let keyIndex = headerCells.indexOf("key");
	let valueIndex = headerCells.indexOf("value");

	if (keyIndex < 0 || valueIndex < 0) {
		const rowCellCount = selectedCells[0].closest("tr")?.cells.length ?? 0;
		if (rowCellCount >= 2) {
			keyIndex = 0;
			valueIndex = 1;
		} else {
			return null;
		}
	}

	const output: Record<string, string> = {};
	const rows = new Set(
		selectedCells
			.map((cell) => cell.closest("tr"))
			.filter((row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement),
	);

	rows.forEach((row) => {
		const key = row.cells[keyIndex]?.textContent?.trim();
		const value = row.cells[valueIndex]?.textContent?.trim();

		if (!key || key === "<BLANK>" || value == null) {
			return;
		}

		output[key] = value;
	});

	return Object.keys(output).length > 0 ? output : null;
};

/**
 * Dialog component for displaying and interacting with a single event's details.
 * Supports Tree, Raw (JSON), and Table views with rich context menu actions.
 */
export function DisplayEventDialog({
	event,
	onClose,
}: {
	event: Doc.Type;
	onClose?: () => void;
}) {
	if (!event) return null;

	const { Info, app, spawnBanner } = Application.use();
	const { extensions } = Extension.use();

	// --- STATE ---
	const [json, setJSON] = useState<Record<string, string> | null>(null);
	const [selection, setSelection] = useState<string>("");
	const [isFlagged, setIsFlagged] = useState(() => {
		const opId = Doc.Entity.operationId(app, event);
		return opId ? Doc.Entity.flag.isFlagged(event._id, opId) : false;
	});
	const lastAutoSelectionRef = useRef<string | null>(null);
	const prevTargetRef = useRef<Doc.Id | null>(null);
	const treeContextPathRef = useRef<string | null>(null);
	const [treeTooltip, setTreeTooltip] = useState<{ path: string; x: number; y: number } | null>(null);
	const { theme } = useTheme();

	// --- DERIVED DATA ---
	const notes = useMemo(
		() => Doc.Entity.notes(app, event),
		[app.timeline.renderVersion, event],
	);
	const links = useMemo(
		() => Doc.Entity.links(app, event),
		[app.timeline.renderVersion, event],
	);
	const file = useMemo(
		() => Source.Entity.id(app, event["gulp.source_id"]),
		[app.target.files, event],
	);

	// --- EFFECTS ---

	// Sync with timeline focus
	useEffect(() => {
		if (prevTargetRef.current === event._id) return;
		prevTargetRef.current = event._id;
		Info.setTimelineTarget(file ? event : null);
	}, [event._id, file, Info]);

	// Load detailed event data
	const loadEvent = useCallback(async () => {
		const opId = Doc.Entity.operationId(app, event);
		if (!opId) return;
		const detailed = await Info.query_single_id(
			event._id,
			opId,
		);
		setJSON(prepareEventJson(detailed));
	}, [event, app, Info]);

	useEffect(() => {
		if (!json || json._id !== event._id) loadEvent();
	}, [event._id, loadEvent, json]);

	// Global selection tracker
	useEffect(() => {
		const handleSelectionChange = () => {
			const text = window.getSelection()?.toString().trim();
			if (text) {
				setSelection(text);
				if (text !== lastAutoSelectionRef.current)
					lastAutoSelectionRef.current = null;
			}
		};
		document.addEventListener("selectionchange", handleSelectionChange);
		return () =>
			document.removeEventListener("selectionchange", handleSelectionChange);
	}, []);

	useEffect(() => setSelection(""), [event._id]);


	// --- HANDLERS: Actions ---

	const handleCopyJson = useCallback(() => {
		if (!json) return;
		const path = treeContextPathRef.current;
		if (!path) {
			const selectedTableJson = getSelectedTableKeyValueObject();
			if (selectedTableJson) {
				copy(JSON.stringify(selectedTableJson, null, 2));
				return;
			}
			copy(JSON.stringify(json, null, 2));
			return;
		}

		const value = getValueByPath(json, path);
		if (value !== undefined) {
			copy(JSON.stringify({ [path]: value }, null, 2));
		} else {
			copy(JSON.stringify(json, null, 2));
		}
	}, [json]);

	const handleDownloadJson = useCallback(() => {
		if (json) {
			download(
				JSON.stringify(json, null, 2),
				"application/json",
				`${event._id}_from_${event["gulp.source_id"]}.json`,
			);
		}
	}, [json, event._id, event]);

	const handleDownloadLogFile = useCallback(() => {
		const storageId = json?.["gulp.storage_id"];
		const opId = Doc.Entity.operationId(app, event);
		if (storageId && typeof storageId === "string" && storageId.trim() !== "" && opId) {
			Info.download_storage_file(storageId, opId);
		}
	}, [event, app, Info, json]);

	const handleFocusTimeline = useCallback(() => {
		// @ts-ignore
		return window.focusCanvasOnEvent(event.gulp_timestamp + (file?.settings.offset || 0), false, event["gulp.source_id"]);
	}, [event, file]);

	// --- HANDLERS: Banners ---

	const handleEnrich = useCallback(
		(enrichmentField?: { key: string; value: string }) => {
			spawnBanner(
				<Enrichment.Banner
					event={event}
					enrichmentField={enrichmentField}
					onEnrichment={(e) => setJSON(e as unknown as typeof json)}
				/>,
			);
		},
		[spawnBanner, event, json],
	);

	const handleCreateNote = useCallback(() => {
		spawnBanner(<NoteFunctionality.Create.Banner event={event} />);
	}, [spawnBanner, event]);

	const handleCreateLink = useCallback(() => {
		spawnBanner(<LinkFunctionality.Create.Banner event={event} />);
	}, [spawnBanner, event]);

	const handleSendData = useCallback(() => {
		spawnBanner(<SendData.Banner event={event} />);
	}, [spawnBanner, event]);

	const handleConnectLink = useCallback(() => {
		spawnBanner(<LinkFunctionality.Connect.Banner event={event} />);
	}, [spawnBanner, event]);

	const applySelectionAsFileFilter = useCallback((textSelected?:string) => {
		if (!textSelected) return;
		const file = Source.Entity.id(app, event["gulp.source_id"]);
		const { filters } = Info.getQuery(file);

		const object = parseToKeyValue(textSelected);

		if (Object.keys(object).length === 0) {
			toast(`Invalid selection. Unable to add new filters`);
			return;
		}

		const newFilters: Filter.Type[] = Object.keys(object).map((k) => ({
			id: generateUUID<Filter.Id>(),
			type: object[k].includes("*") || k.includes("*") ? "wildcard" : "range",
			operator: "must",
			field: k,
			value: object[k],
			enabled: true,
		}));

		const updatedQuery = {
			...Info.getQuery(file),
			filters: [...filters, ...newFilters],
		};

		toast(`Added ${newFilters.length} new filters`);
		spawnBanner(<FilterFileBanner sources={[file]} query={updatedQuery} />);
	}, [Info, app, event, spawnBanner]);

	// --- UI COMPONENTS: Sub-renders ---

	const highlights = useMemo(() => {
		if (!json) return null;

		const storageId = json["gulp.storage_id"];
		const tableRows = flattenTableEntries(json).sort((a, b) =>
			a.key.localeCompare(b.key),
		);
		const unflattenObject = sortTreeValueRecursively(
			Object.keys(json).reduce((res, k) => {
				k.split(".").reduce(
					(acc: any, e, i, keys) =>
						acc[e] ||
						(acc[e] = isNaN(Number(keys[i + 1]))
							? keys.length - 1 === i
								? json[k]
								: {}
							: []),
					res,
				);
				return res;
			}, {}),
		) as Record<string, unknown>;

		const baseJsonStyles =
			theme === "light" || theme === "light-old"
				? defaultStyles
				: darkStyles;

		const jsonStyles: StyleProps = {
			...baseJsonStyles,
			noQuotesForStringValues: false,
			quotesForFieldNames: true,
			stringifyStringValues: true,
			basicChildStyle: s.node,
			childFieldsContainer: s.basic,
			clickableLabel: s.clickableLabel,
			punctuation: s.punctuation,
			stringValue: s.string,
			numberValue: s.numeric,
			booleanValue: s.bool,
			nullValue: s.null,
			undefinedValue: s.undefined,
			otherValue: s.other,
			expandIcon: s.expandIcon,
			collapseIcon: s.collapseIcon,
			collapsedContent: s.collapsed,
			container: s.container,
			label: s.label,
		};

		return (
			<ContextMenu>
				<Tabs
					defaultValue="raw"
					className={s.tabs_wrapper}
				>
					<TabsList className={s.triggers}>
						<TabsTrigger value="tree">
							<Icon
								name="GitFork"
								size={14}
							/>{" "}
							Tree
						</TabsTrigger>
						<TabsTrigger value="raw">
							<Icon
								name="CodeBracket"
								size={14}
							/>{" "}
							Raw
						</TabsTrigger>
						<TabsTrigger value="table">
							<Icon
								name="Table"
								size={14}
							/>{" "}
							Table
						</TabsTrigger>
					</TabsList>

					<ContextMenuTrigger
						asChild
						onMouseDown={(e) => {
							if (e.button === 2 && !isPointInSelection(e.clientX, e.clientY)) {
								const element = document.elementFromPoint(
									e.clientX,
									e.clientY,
								) as HTMLElement;
								window.getSelection()?.removeAllRanges();
								const detected = detectSelectionAtPoint(
									e.clientX,
									e.clientY,
									json,
								);
								if (detected) {
									lastAutoSelectionRef.current = detected;
									setSelection(detected);

									if (element.closest(`.${s.highlighter}`)) {
										const colonIndex = detected.indexOf(":");
										if (colonIndex !== -1) {
											treeContextPathRef.current = detected.slice(0, colonIndex).trim().replace(/^"+|"+$/g, "");
											return;
										}
									}
								} else {
									lastAutoSelectionRef.current = null;
									setSelection("");
								}

								let labelEl = element
									? (element.classList.contains(s.label) || element.classList.contains(s.clickableLabel)
										? element
										: (element.closest(`.${s.label}`) ?? element.closest(`.${s.clickableLabel}`)))
									: null;

								if (!labelEl && element) {
									const node = element.closest(`.${s.node}`);
									if (node) {
										labelEl = node.querySelector(`.${s.label}, .${s.clickableLabel}`);
									}
								}

								treeContextPathRef.current = labelEl
									? getTreeKeyPath(labelEl, s.label, s.clickableLabel, s.node, s.basic)
									: null;
							}
						}}
						// onContextMenu={() => {
						// 	const current = window.getSelection()?.toString().trim();
						// 	if (current && current !== selection) setSelection(current);
						// }}
					>
						<div className={s.contextTrigger}>
							<TabsContent
								value="tree"
								className={s.scrollable}
								onMouseMove={(e) => {
									const target = e.target as Element;
									const labelEl =
										target.classList.contains(s.label) || target.classList.contains(s.clickableLabel)
											? target
											: (target.closest(`.${s.label}`) ?? target.closest(`.${s.clickableLabel}`));
									if (!labelEl) {
										setTreeTooltip(null);
										return;
									}
									const path = getTreeKeyPath(labelEl, s.label, s.clickableLabel, s.node, s.basic);
									setTreeTooltip({ path, x: e.clientX, y: e.clientY });
								}}
								onMouseLeave={() => setTreeTooltip(null)}
							>
								<JsonView
									data={unflattenObject}
									clickToExpandNode={false}
									shouldExpandNode={allExpanded}
									style={jsonStyles}
								/>
							</TabsContent>
							<TabsContent value="raw">
								<Markdown
									className={s.highlighter}
									value={`\`\`\`json\n${JSON.stringify(json, null, 2)}`}
								/>
							</TabsContent>
							<TabsContent
								value="table"
								className={s.scrollable}
							>
								<Table className={s.tableView} includeIndex={false} values={tableRows} />
							</TabsContent>
						</div>
					</ContextMenuTrigger>
				</Tabs>

				<ContextMenuContent>
					<ContextMenuItem
						disabled={!selection}
						onClick={() =>
							spawnBanner(
								<NoteFunctionality.Create.Banner
									event={event}
									note={{ text: selection } as Note.Type}
								/>,
							)
						}
						icon="StickyNote"
					>
						Create new note
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!selection}
						icon="GitPullRequestCreate"
					>
						Create new link
					</ContextMenuItem>
					<ContextMenuItem
						onClick={handleCopyJson}
						icon="Copy"
					>
						Copy
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() =>applySelectionAsFileFilter(selection)}
						icon="Filter"
					>
						New filter
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!selection}
						onClick={() => {
							const isManualSelection = selection !== lastAutoSelectionRef.current;
							if (isManualSelection) {
								handleEnrich({ key: "selection", value: selection });
							} else {
								const object = parseToKeyValue(selection);
								const keys = Object.keys(object);
								if (keys.length > 0) {
									handleEnrich({ key: keys[0], value: object[keys[0]] });
								} else {
									handleEnrich({ key: "selection", value: selection });
								}
							}
						}}
						icon="PrismColor"
					>
						Enrich
					</ContextMenuItem>
					{storageId &&
						typeof storageId === "string" &&
						storageId.trim() !== "" && (
							<ContextMenuItem
								onClick={handleDownloadLogFile}
								icon="Download"
							>
								Download log file
							</ContextMenuItem>
						)}
				</ContextMenuContent>
			</ContextMenu>
		);
	}, [
		json,
		selection,
		spawnBanner,
		event,
		applySelectionAsFileFilter,
		handleDownloadLogFile,
		handleEnrich,
		handleCopyJson,
	]);

	if (!file) {
		return (
			<Dialog callback={onClose}>
				<Stack
					style={{ width: "100%", height: "300px" }}
					flex
					ai="center"
					jc="center"
					dir="column"
					gap={12}
				>
					<Icon name="CircleAlert" size={48} style={{ color: "var(--red-500)" }} />
					<p style={{ color: "var(--red-500)", fontWeight: "bold" }}>Source was deleted</p>
					<p style={{ opacity: 0.6 }}>This event is no longer available.</p>
				</Stack>
			</Dialog>
		);
	}

	return (
		<Dialog callback={onClose}>
			<Navigation event={event} />
			{json ? (
				<Fragment>
					<Stack
						dir="column"
						className={s.group}
						gap={12}
						ai="stretch"
					>
						<Stack
							gap={12}
							flex
						>
							<Button
								onClick={handleCreateNote}
								variant="secondary"
								title="Add a new note to the current event"
								icon="StickyNote"
							>
								Create new note
							</Button>
							<Button
								onClick={handleCreateLink}
								variant="secondary"
								title="Create link with the current event as origin."
								icon="GitPullRequestCreate"
							>
								Create link
							</Button>
						</Stack>
						<Stack
							gap={12}
							flex
						>
							<Button
								onClick={() => handleEnrich()}
								variant="secondary"
								title="Enrich the current event"
								icon="PrismColor"
							>
								Enrich
							</Button>
							{Object.values(extensions).some((ext) =>
								ext.type.includes("send_data"),
							) && (
									<Button
										onClick={handleSendData}
										variant="glass"
										icon="Send"
									>
										Send Data
									</Button>
								)}
							<Button
								onClick={handleConnectLink}
								variant="secondary"
								title="connect the current event with a link"
								icon="GitPullRequestCreateArrow"
							>
								Connect link
							</Button>
						</Stack>
						<Extension.Component
							name="Story.popover.tsx"
							props={{ doc: event }}
						/>
					</Stack>

					<Collab.List
						notes={notes}
						links={links}
					/>

					{highlights}
					{treeTooltip && (
						<div
							style={{
								position: "fixed",
								left: treeTooltip.x + 14,
								top: treeTooltip.y + 14,
								background: "var(--background-100)",
								border: "1px solid var(--gray-400)",
								borderRadius: 4,
								padding: "2px 8px",
								fontSize: 10,
								fontFamily: "var(--font-mono)",
								color: "var(--second)",
								pointerEvents: "none",
								zIndex: 9999,
								maxWidth: 400,
								wordBreak: "break-all",
								boxShadow: "var(--shadow-border), 0 8px 20px var(--gray-alpha-500)",
							}}
						>
							{treeTooltip.path}
						</div>
					)}
					<Stack
						className={s.actionButtons}
						gap={12}
					>
						<Button
							variant="secondary"
							onClick={handleCopyJson}
							icon="Copy"
						>
							Copy JSON
						</Button>
						<Button
							variant="secondary"
							onClick={handleDownloadJson}
							icon="Download"
							title="Download JSON"
						>
							Download JSON
						</Button>
						<Button
							onClick={handleFocusTimeline}
							variant="secondary"
							icon="Crosshair"
							title="Focus timeline"
						/>
						<Button
							onClick={() => {
								const opId = Doc.Entity.operationId(app, event);
								if (!opId) return;
								setIsFlagged(
									Doc.Entity.flag.toggle(
										event._id,
										opId,
									),
								);
							}}
							variant="secondary"
							icon={isFlagged ? "FlagOff" : "Flag"}
							disabled={
								(() => {
									const opId = Doc.Entity.operationId(app, event);
									return (opId && Doc.Entity.flag.isLimitReached(
										Doc.Entity.flag.getList(opId),
									) && !isFlagged) || !opId;
								})()
							}
							title="Flag event"
						/>
					</Stack>
				</Fragment>
			) : (
				<LoadingSkeleton />
			)}
		</Dialog>
	);
}

/**
 * Skeleton loader for the dialog.
 */
function LoadingSkeleton() {
	return (
		<Stack
			style={{ width: "100%", height: "100%" }}
			flex
			ai="center"
			jc="center"
			dir="column"
			gap={12}
		>
			<Stack style={{ width: "100%" }}>
				<Skeleton width="full" />
				<Skeleton width="full" />
			</Stack>
			<Stack style={{ width: "100%" }}>
				<Skeleton width="full" />
				<Skeleton width="full" />
			</Stack>
			<Skeleton
				width="full"
				height="full"
			/>
			<Stack style={{ width: "100%" }}>
				<Skeleton width="full" />
				<Skeleton width="full" />
				<Skeleton width="full" />
			</Stack>
		</Stack>
	);
}

// --- SECONDARY COMPONENTS ---

export namespace EventIndicator {
	export interface Props extends Button.Props {
		event: Doc.Type;
	}
}

const getReadableIndicatorTextColor = (hexColor: string): string => {
	const hex = hexColor.replace("#", "");
	if (hex.length !== 6) {
		return Color.Themer.getTheme("").FONT_ACCENT;
	}

	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);

	if ([r, g, b].some(Number.isNaN)) {
		return Color.Themer.getTheme("").FONT_ACCENT;
	}

	return Color.Themer.getReadablePaletteTextColor(hexColor);
};

/**
 * Visual indicator button for events in lists or timelines.
 */
export function EventIndicator({
	event,
	className,
	style,
	...props
}: EventIndicator.Props) {
	const { app } = Application.use();
	if (!event) return null;

	const file = Source.Entity.id(app, event["gulp.source_id"]);
	if (!file) return null;

	const notes = useMemo(
		() => Doc.Entity.notes(app, event),
		[app.timeline.renderVersion, event._id],
	);
	const links = useMemo(
		() => Doc.Entity.links(app, event),
		[app.timeline.renderVersion, event._id],
	);

	const background = useMemo(() => {
		const range =
			RenderEngine[CacheKey].range.get(event["gulp.source_id"]) ?? MinMaxBase;
		const code = Refractor.any.toNumber(
			Refractor.get(event, file.settings.field),
		);
		return Color.Entity.gradient(
			file.settings.render_color_palette,
			code,
			range,
		);
	}, [event, app.target.files, file]);

	const indicatorTextColor = useMemo(
		() => getReadableIndicatorTextColor(background),
		[background],
	);
	const indicatorLabel = useMemo(
		() => String(event["gulp.event_code"]).slice(0, 4),
		[event],
	);
	const indicatorTooltip = useMemo(
		() => String(event["gulp.event_code"]),
		[event],
	);
	const indicatorFontSize = useMemo(() => {
		return 8;
	}, [indicatorLabel]);

	return (
		<Button
			shape="icon"
			className={cn(className, s.indicator)}
			rounded
			title={indicatorTooltip}
			aria-label={indicatorTooltip}
			style={{ ...style, background }}
			{...props}
		>
			<hr />
			<p style={{ color: indicatorTextColor, fontSize: `${indicatorFontSize}px` }}>
				{indicatorLabel}
			</p>
			{Doc.Entity.flag.isFlagged(
				event._id,
				Doc.Entity.operationId(app, event),
			) && (
					<Stack
						ai="center"
						jc="center"
						className={cn(s.marker, s.flagged)}
						pos="absolute"
					>
						<Icon
							size={8}
							name="Flag"
						/>
					</Stack>
				)}
			{notes.length > 0 && (
				<Stack
					ai="center"
					jc="center"
					className={cn(s.marker, s.collab)}
					pos="absolute"
				>
					<Icon
						size={8}
						name="StickyNote"
					/>
				</Stack>
			)}
			{links.length > 0 && (
				<Stack
					ai="center"
					jc="center"
					className={cn(s.marker, s.collab, s.linkMarker)}
					pos="absolute"
				>
					<Icon
						size={8}
						name="Link"
					/>
				</Stack>
			)}
		</Button>
	);
}
