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
import {
	copy,
	download,
	generateUUID,
	Refractor,
	isPlainObject,
	sortObjectKeysRecursively as sortTreeValueRecursively,
	parseLineToKeyValue as parseToKeyValue,
} from "@/ui/utils";
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
import {
	JsonView,
	allExpanded,
	darkStyles,
	defaultStyles,
} from "react-json-view-lite";
import { StyleProps } from "react-json-view-lite/dist/DataRenderer";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/Tabs";
import { Table } from "@/components/Table";
import { Markdown } from "@/ui/Markdown";
import { Icon } from "@/ui/Icon";
import { cn } from "@impactium/utils";
import { CacheKey } from "@/class/Engine.dto";
import { RenderEngine } from "@/class/RenderEngine";
import { Doc } from "@/entities/Doc";
import { Source } from "@/entities/Source";
import { Filter } from "@/entities/Filter";
import { Note } from "@/entities/Note";
import { Color } from "@/entities/Color";
import { Extension } from "@/context/Extension.context";
import { Locale } from "@/locales";

// --- UTILITIES ---

/**
 * Extracts the path from a detected selection string.
 * Example: `"gulp.unmapped.Data.0": "480 Pacific Standard Time"` -> `gulp.unmapped.Data.0`
 */
const extractPathFromDetected = (detected: string): string | null => {
	const match = detected.match(/^"([^"]+)":/);
	if (match) {
		return match[1];
	}
	return null;
};

/**
 * Checks if a path points to an actual selectable leaf value (not a parent array/object).
 * For tree context, we only want primitive values or values at array indices, not parent arrays.
 */
const isSelectableLeafValue = (
	json: Record<string, unknown>,
	path: string,
): boolean => {
	const value = getValueByPath(json, path);

	// Must be defined
	if (value === undefined) return false;

	// Primitives and nulls are always selectable
	if (value === null || typeof value !== "object") return true;

	// Objects are not selectable as leaf values
	if (isPlainObject(value)) return false;

	// Arrays are only selectable if the path includes an array index
	if (Array.isArray(value)) {
		// Check if the last part of the path is a numeric index
		const parts = path.split(".");
		return /^\d+$/.test(parts[parts.length - 1]);
	}

	return false;
};

/**
 * Removes array indices from a dot-separated path.
 * Example: `gulp.unmapped.Data.0.key` -> `gulp.unmapped.Data.key`
 */
const stripArrayIndices = (path: string): string => {
	return path
		.split(".")
		.filter((part) => !/^\d+$/.test(part))
		.join(".");
};

/**
 * Removes all quotes from a string.
 * @param text The text to clean
 */
const clean = (el: Element) => {
	let text = (el.textContent || "").trim();
	// Remove all quotes
	text = text.replace(/"/g, "");
	// Remove trailing colon, comma, and whitespace
	text = text.replace(/[:, \s]+$/, "");
	return text;
};

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
			flattenTableEntries(
				entry,
				parentKey ? `${parentKey}.${index}` : String(index),
			),
		);
	}

	if (value && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).flatMap(
			([key, entry]) =>
				flattenTableEntries(entry, parentKey ? `${parentKey}.${key}` : key),
		);
	}

	return [
		{
			key: parentKey,
			value:
				value == null
					? String(value)
					: typeof value === "bigint"
						? value.toString()
						: String(value),
		},
	];
};

/**
 * Reconstructs the full dot-notated key path from a Tree label element.
 * @param labelEl The label element to start from
 * @param labelClass CSS class for labels
 * @param clickableLabelClass CSS class for clickable labels
 * @param nodeClass CSS class for nodes
 * @param basicClass CSS class for basic containers
 */
const getTreeLabelFromElement = (
	element: Element | null,
	labelClass: string,
	clickableLabelClass: string,
	nodeClass: string,
): Element | null => {
	if (!element) return null;

	const directLabel =
		element.classList.contains(labelClass) ||
		element.classList.contains(clickableLabelClass)
			? element
			: (element.closest(`.${labelClass}`) ??
				element.closest(`.${clickableLabelClass}`));

	if (directLabel) return directLabel;

	const node = element.closest(`.${nodeClass}`);
	return node
		? node.querySelector(`.${labelClass}, .${clickableLabelClass}`)
		: null;
};

const getHoveredTreeLabel = (
	target: EventTarget | null,
	labelClass: string,
	clickableLabelClass: string,
	nodeClass: string,
): Element | null => {
	const element =
		target instanceof Element
			? target
			: target instanceof Node
				? target.parentElement
				: null;

	return getTreeLabelFromElement(
		element,
		labelClass,
		clickableLabelClass,
		nodeClass,
	);
};

const getTreeKeyPath = (
	labelEl: Element,
	labelClass: string,
	clickableLabelClass: string,
	nodeClass: string,
	basicClass: string,
): string => {
	const clean = (el: Element) => {
		let text = (el.textContent || "").trim();
		// Remove all quotes
		text = text.replace(/"/g, "");
		// Remove trailing colon, comma, and whitespace
		text = text.replace(/[:, \s]+$/, "");
		return text;
	};
	const parts: string[] = [clean(labelEl)];

	let nodeEl: Element | null = labelEl.closest(`.${nodeClass}`);
	while (nodeEl) {
		const parentContainer = nodeEl.parentElement;
		if (!parentContainer?.classList.contains(basicClass)) break;
		const parentNode = parentContainer.parentElement;
		if (!parentNode?.classList.contains(nodeClass)) break;

		const parentLabel = Array.from(parentNode.children).find(
			(c) =>
				c.classList.contains(labelClass) ||
				c.classList.contains(clickableLabelClass),
		);
		if (!parentLabel) break;
		parts.unshift(clean(parentLabel));
		nodeEl = parentNode;
	}
	return parts.join(".");
};

/**
 * Resolves a dot-separated path within a JSON object.
 * Handles both flat maps and nested structures, including array indices.
 * @param json Source data object
 * @param path Dot-separated path to resolve
 */
const getValueByPath = (
	json: Record<string, unknown> | null,
	path: string,
): unknown => {
	if (!json) return undefined;
	if (Object.prototype.hasOwnProperty.call(json, path)) {
		return json[path];
	}

	const parts = path.split(".");
	let current: unknown = json;

	// Try to traverse using dots
	for (const part of parts) {
		if (current && typeof current === "object") {
			// Try direct property access first
			if (Object.prototype.hasOwnProperty.call(current, part)) {
				current = (current as Record<string, unknown>)[part];
			}
			// For arrays, also try numeric index
			else if (Array.isArray(current) && /^\d+$/.test(part)) {
				const index = parseInt(part, 10);
				current = (current as unknown[])[index];
			} else {
				// If we can't find it via dots, try checking if there's a parent key with dots
				// For example, if path is "gulp.unmapped.Guid" and parts[0:2] joined as "gulp.unmapped" exists
				for (let i = parts.length - 1; i > 0; i--) {
					const parentPath = parts.slice(0, i).join(".");
					const childPart = parts[i];

					if (Object.prototype.hasOwnProperty.call(json, parentPath)) {
						const parentObj = json[parentPath];
						if (
							parentObj &&
							typeof parentObj === "object" &&
							Object.prototype.hasOwnProperty.call(parentObj, childPart)
						) {
							return (parentObj as Record<string, unknown>)[childPart];
						}
					}
				}
				return undefined;
			}
		} else {
			return undefined;
		}
	}

	return current;
};

const isTreeLeafValue = (
	json: Record<string, unknown> | null,
	path: string | null,
): boolean => {
	if (!json || !path) return false;
	const value = getValueByPath(json, path);
	return value !== undefined && !isPlainObject(value);
};

const getLeafTooltipText = (
	json: Record<string, unknown> | null,
	path: string | null,
): string | null => {
	if (!json || !path || !isTreeLeafValue(json, path)) return null;

	const value = getValueByPath(json, path);
	if (value === undefined) return null;

	return `${path}: ${String(value)}`;
};

/**
 * Checks if a coordinate point is within the current browser selection.
 * @param x Client X
 * @param y Client Y
 * @returns boolean
 */
const isPointInSelection = (doc: Document, x: number, y: number): boolean => {
	const selection = doc.defaultView?.getSelection();
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
const detectTableSelection = (
	doc: Document,
	element: HTMLElement,
): string | null => {
	const tr = element.closest("tr");
	if (tr) {
		const cells = Array.from(tr.querySelectorAll("td"));
		if (cells.length >= 2) {
			const selection = doc.defaultView?.getSelection();
			if (selection) {
				const range = doc.createRange();
				range.selectNodeContents(tr);
				selection.removeAllRanges();
				selection.addRange(range);
			}
			// Strip array indices from the key
			const rawKey = cells[0].innerText.trim();
			const cleanedKey = stripArrayIndices(rawKey);
			return `"${cleanedKey}": "${cells[1].innerText.trim()}"`;
		}
	}
	return null;
};

/**
 * Detects the full key-value path under the cursor in the Tree view.
 * @param element The clicked element
 * @param json The source JSON object
 */
const resolveTreeContextPath = (
	element: HTMLElement,
	json: Record<string, unknown> | null,
): string | null => {
	if (!json) return null;

	const clickedNode = element.closest(`.${s.node}`) as HTMLElement | null;
	if (!clickedNode) return null;

	const arrayContainer = clickedNode.parentElement;
	if (!arrayContainer || !arrayContainer.classList.contains(s.basic)) {
		return null;
	}

	const parentFieldNode = arrayContainer.parentElement?.closest(`.${s.node}`);
	if (!parentFieldNode) return null;

	const parentLabel = Array.from(parentFieldNode.children).find(
		(child) =>
			child.classList.contains(s.label) ||
			child.classList.contains(s.clickableLabel),
	);
	if (!parentLabel) return null;

	const parentPath = getTreeKeyPath(
		parentLabel,
		s.label,
		s.clickableLabel,
		s.node,
		s.basic,
	);
	if (!parentPath) return null;

	const parentValue = getValueByPath(json, parentPath);
	if (!Array.isArray(parentValue)) return null;

	const index = Array.from(arrayContainer.children).indexOf(clickedNode);
	return index >= 0 ? `${parentPath}.${index}` : null;
};

const detectTreeSelection = (
	doc: Document,
	element: HTMLElement,
	json: Record<string, unknown> | null,
): string | null => {
	let treeLabel: Element | null =
		element.classList.contains(s.label) ||
		element.classList.contains(s.clickableLabel)
			? element
			: (element.closest(`.${s.label}`) ??
				element.closest(`.${s.clickableLabel}`));

	if (!treeLabel) {
		const node = element.closest(`.${s.node}`);
		if (node) {
			// Find the DIRECT child label, not the first descendant label
			// This is important for arrays to avoid getting the first item's label
			treeLabel =
				Array.from(node.children).find(
					(child) =>
						child.classList.contains(s.label) ||
						child.classList.contains(s.clickableLabel),
				) ?? null;
		}
	}

	// If still no label found, try to find any node ancestor that has a label
	if (!treeLabel) {
		let current = element.closest(`.${s.node}`);
		while (current) {
			const label = Array.from(current.children).find(
				(child) =>
					child.classList.contains(s.label) ||
					child.classList.contains(s.clickableLabel),
			);
			if (label) {
				treeLabel = label;
				break;
			}
			// Move to next ancestor node
			current = current.parentElement?.closest(`.${s.node}`) ?? null;
		}
	}

	// Last resort: if we're in a tree node but can't find a label, try to build path from node structure
	if (!treeLabel) {
		const node = element.closest(`.${s.node}`);
		if (node) {
			// Try to get any text that might be a key/index
			const textContent = node.textContent?.trim() || "";
			if (textContent && textContent.length > 0) {
				// This is a fallback - just try to determine if this could be a leaf value
				// by checking the element's text content
				const nodeParent = node.parentElement?.closest(`.${s.node}`);
				if (nodeParent) {
					const parentLabel = Array.from(nodeParent.children).find(
						(c) =>
							c.classList.contains(s.label) ||
							c.classList.contains(s.clickableLabel),
					);
					if (parentLabel) {
						// We have a parent label, try to build path from there
						const parentPath = getTreeKeyPath(
							parentLabel,
							s.label,
							s.clickableLabel,
							s.node,
							s.basic,
						);
						// For now, just use the parent value as we can't determine the exact child key
						if (parentPath && isTreeLeafValue(json, parentPath)) {
							const value = getValueByPath(json, parentPath);
							if (Array.isArray(value)) {
								// This is an array - we're clicking on an element within it
								// Try to find the index from the node's position
								const parent = node.parentElement;
								if (parent) {
									const siblingNodes = Array.from(
										parent.querySelectorAll(`.${s.node}`),
									);
									const index = siblingNodes.indexOf(node);
									if (index >= 0) {
										const childPath = `${parentPath}.${index}`;
										if (isTreeLeafValue(json, childPath)) {
											const childValue = getValueByPath(json, childPath);
											const strValue =
												typeof childValue === "string"
													? `"${childValue}"`
													: JSON.stringify(childValue);
											const selection = doc.defaultView?.getSelection();
											if (selection) {
												const range = doc.createRange();
												range.selectNodeContents(node);
												selection.removeAllRanges();
												selection.addRange(range);
											}
											return `"${childPath}": ${strValue}`;
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	if (treeLabel && json) {
		const resolvedPath = resolveTreeContextPath(element, json);
		const path =
			resolvedPath && isTreeLeafValue(json, resolvedPath)
				? resolvedPath
				: getTreeKeyPath(treeLabel, s.label, s.clickableLabel, s.node, s.basic);
		if (path && isTreeLeafValue(json, path)) {
			const value = getValueByPath(json, path);

			// Check if we're clicking on a child element of an array/object
			const labelNode = treeLabel.closest(`.${s.node}`) as HTMLElement;
			const clickedNode = element.closest(`.${s.node}`) as HTMLElement;

			// If clicked node is different from label node and value is an array/object,
			// try to find the actual child element
			if (
				labelNode &&
				clickedNode &&
				labelNode !== clickedNode &&
				(Array.isArray(value) || (typeof value === "object" && value !== null))
			) {
				// Find which child node we're in
				const parent = clickedNode.parentElement;
				if (parent) {
					const siblingNodes = Array.from(
						parent.querySelectorAll(`.${s.node}`),
					);
					const index = siblingNodes.indexOf(clickedNode);
					if (index >= 0 && Array.isArray(value)) {
						// This is an array, use the index to find the child value
						const childPath = `${path}.${index}`;
						const childValue = getValueByPath(json, childPath);
						if (childValue !== undefined) {
							const strValue =
								typeof childValue === "string"
									? `"${childValue}"`
									: JSON.stringify(childValue);
							const selection = doc.defaultView?.getSelection();
							if (selection) {
								const range = doc.createRange();
								range.selectNodeContents(clickedNode);
								selection.removeAllRanges();
								selection.addRange(range);
							}
							return `"${childPath}": ${strValue}`;
						}
					}
				}
			}

			// Normal case: return the found path
			const strValue =
				typeof value === "string" ? `"${value}"` : JSON.stringify(value);
			const nodeContainer = treeLabel.closest(`.${s.node}`) as HTMLElement;
			if (nodeContainer) {
				const selection = doc.defaultView?.getSelection();
				if (selection) {
					const range = doc.createRange();
					range.selectNodeContents(nodeContainer);
					selection.removeAllRanges();
					selection.addRange(range);
				}
			}
			return `"${path}": ${strValue}`;
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
const createTextNodeRange = (
	doc: Document,
	root: Node,
	startIndex: number,
	endIndex: number,
): Range | null => {
	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let current = 0;
	let startNode: Text | null = null;
	let endNode: Text | null = null;
	let startOffset = 0;
	let endOffset = 0;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const length = node.textContent?.length ?? 0;

		if (!startNode && current + length >= startIndex) {
			startNode = node;
			startOffset = startIndex - current;
		}

		if (!endNode && current + length >= endIndex) {
			endNode = node;
			endOffset = endIndex - current;
			break;
		}

		current += length;
	}

	if (!startNode || !endNode) return null;

	const range = doc.createRange();
	range.setStart(startNode, startOffset);
	range.setEnd(endNode, endOffset);
	return range;
};

const findJsonValueEnd = (text: string, startIndex: number): number => {
	let i = startIndex;

	while (i < text.length && /\s/.test(text[i])) {
		i += 1;
	}

	if (i >= text.length) return i;

	const first = text[i];

	if (first === '"') {
		let escaped = false;
		i += 1;
		while (i < text.length) {
			const ch = text[i];
			if (escaped) {
				escaped = false;
			} else if (ch === "\\") {
				escaped = true;
			} else if (ch === '"') {
				return i + 1;
			}
			i += 1;
		}
		return text.length;
	}

	if (first === "{" || first === "[") {
		const stack: string[] = [first];
		let inString = false;
		let escaped = false;

		i += 1;
		while (i < text.length) {
			const ch = text[i];
			if (inString) {
				if (escaped) escaped = false;
				else if (ch === "\\") escaped = true;
				else if (ch === '"') inString = false;
				i += 1;
				continue;
			}

			if (ch === '"') {
				inString = true;
				i += 1;
				continue;
			}

			if (ch === "{" || ch === "[") {
				stack.push(ch);
			} else if (ch === "}" || ch === "]") {
				const open = stack.pop();
				if (!open) break;
				if ((open === "{" && ch === "}") || (open === "[" && ch === "]")) {
					if (stack.length === 0) return i + 1;
				} else {
					break;
				}
			}
			i += 1;
		}

		return text.length;
	}

	while (i < text.length) {
		const ch = text[i];
		if (/\s|,|\}|\]/.test(ch)) break;
		i += 1;
	}

	return i;
};

const detectRawSelection = (
	doc: Document,
	element: HTMLElement,
	x: number,
	y: number,
	json: Record<string, any> | null,
): string | null => {
	const highlighter = element.closest(`.${s.highlighter}`) as HTMLElement;
	const codeEl = highlighter?.querySelector("code, pre") as HTMLElement | null;

	const selection = doc.defaultView?.getSelection();
	let range: Range | null = null;
	// @ts-ignore
	if ((doc as any).caretRangeFromPoint) {
		// @ts-ignore
		range = (doc as any).caretRangeFromPoint(x, y);
	} else if ((doc as any).caretPositionFromPoint) {
		// @ts-ignore
		const pos = (doc as any).caretPositionFromPoint(x, y);
		if (pos) {
			range = doc.createRange();
			range.setStart(pos.offsetNode, pos.offset);
			range.setEnd(pos.offsetNode, pos.offset);
		}
	}

	if (range && selection && codeEl) {
		const fullText = codeEl.textContent ?? codeEl.innerText ?? "";
		const strippedText = fullText
			.replace(/^```json\s*/g, "")
			.replace(/\s*```$/g, "");
		const jsonStart = fullText.indexOf(strippedText);
		if (jsonStart < 0) return null;

		const preRange = doc.createRange();
		preRange.selectNodeContents(codeEl);
		preRange.setEnd(range.startContainer, range.startOffset);
		const offset = preRange.toString().length;
		const clickIndexInJson = Math.max(0, offset - jsonStart);
		const lineStartIndex =
			strippedText.lastIndexOf("\n", clickIndexInJson - 1) + 1;
		const lineEndIndex = strippedText.indexOf("\n", lineStartIndex);
		const lineText = strippedText.slice(
			lineStartIndex,
			lineEndIndex < 0 ? undefined : lineEndIndex,
		);
		const targetLine = lineText;

		// Try to match key:value on the target line
		let match = targetLine.match(/^(\s*)"([^"]+)":/);
		let currentPath = match?.[2];
		let currentIndent = match?.[1].length;

		// If no key:value match, this might be an array/object value on its own line
		// Walk up to find the key
		if (!currentPath) {
			const lines = strippedText.split("\n");
			const targetLineIndex = lines.indexOf(targetLine);
			for (let i = targetLineIndex - 1; i >= 0; i -= 1) {
				const line = lines[i] ?? "";
				const m = line.match(/^(\s*)"([^"]+)":\s*[\{\[]/);
				if (m) {
					currentPath = m[2];
					currentIndent = m[1].length;
					break;
				}
			}
			if (!currentPath) return null;
		}

		// Build the full path by walking up to find parent keys
		const lines = strippedText.split("\n");
		for (let i = lines.indexOf(targetLine) - 1; i >= 0; i -= 1) {
			const line = lines[i] ?? "";
			const m = line.match(/^(\s*)"([^"]+)":\s*[\{\[]/);
			if (m) {
				const indent = m[1].length;
				if (currentIndent !== undefined && indent < currentIndent) {
					currentPath = `${m[2]}.${currentPath}`;
					currentIndent = indent;
				}
			}
			if (currentIndent === 0) break;
		}

		// Find the value boundaries
		const colonIndex = targetLine.indexOf(":");
		let valueStart: number;
		let valueEnd: number;

		if (colonIndex >= 0) {
			// Standard key:value line
			const firstNonWs = targetLine.slice(colonIndex + 1).search(/\S/);
			valueStart =
				lineStartIndex + colonIndex + 1 + (firstNonWs >= 0 ? firstNonWs : 0);
			valueEnd = findJsonValueEnd(strippedText, valueStart);
		} else {
			// Array/object value line - find the start of the value on this line
			const firstNonWs = targetLine.search(/\S/);
			if (firstNonWs < 0) return null;
			valueStart = lineStartIndex + firstNonWs;
			valueEnd = findJsonValueEnd(strippedText, valueStart);
		}

		const selectedText = strippedText.slice(valueStart, valueEnd).trim();
		const valueRange = createTextNodeRange(
			doc,
			codeEl,
			jsonStart + valueStart,
			jsonStart + valueEnd,
		);

		if (valueRange) {
			selection.removeAllRanges();
			selection.addRange(valueRange);
		} else {
			const fallbackRange = doc.createRange();
			fallbackRange.selectNodeContents(codeEl);
			selection.removeAllRanges();
			selection.addRange(fallbackRange);
		}

		return `"${currentPath}": ${selectedText}`;
	}

	// Fallback for Raw View
	let current: HTMLElement | null = element;
	while (
		current &&
		current !== doc.body &&
		!current.classList.contains(s.highlighter)
	) {
		const text = (current.innerText || current.textContent || "").trim();
		if (text.includes(":")) {
			// Try to parse as JSON to detect if it's a complete key-value pair
			try {
				const match = text.match(/^"([^"]+)":\s*(.+)$/s);
				if (match) {
					const key = match[1];
					const valueStr = match[2];
					// Try parsing the value to see if it's valid JSON
					JSON.parse(valueStr);
					// Valid complete value, use this
					const sel = doc.defaultView?.getSelection();
					if (sel) {
						const r = doc.createRange();
						r.selectNodeContents(current);
						sel.removeAllRanges();
						sel.addRange(r);
					}
					return text;
				}
			} catch (e) {
				// Not a complete value or doesn't match pattern, try parent
			}

			// If doesn't include newlines, it's a simple single-line value, use it
			if (!text.includes("\n")) {
				const sel = doc.defaultView?.getSelection();
				if (sel) {
					const r = doc.createRange();
					r.selectNodeContents(current);
					sel.removeAllRanges();
					sel.addRange(r);
				}
				return text;
			}
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
	doc: Document,
	x: number,
	y: number,
	json: Record<string, any> | null,
): string | null => {
	const element = doc.elementFromPoint(x, y) as HTMLElement;
	if (!element) return null;

	// 1. Table Handling
	if (element.closest(`.${s.tableView}`)) {
		return detectTableSelection(doc, element);
	}

	// 3. Raw Handling (check before tree to ensure proper precedence)
	if (element.closest(`.${s.highlighter}`)) {
		return detectRawSelection(doc, element, x, y, json);
	}

	// 2. Tree Handling - check multiple ways to identify tree context
	// This includes direct node/container checks plus fallback for nested elements
	const inTreeContainer =
		element.closest(`.${s.container}`) ?? element.closest(`.${s.node}`);
	const inScrollableTree =
		element.closest(`.${s.scrollable}`)?.querySelector(`.${s.container}`) !==
			null ||
		element.closest(`.${s.scrollable}`)?.querySelector(`.${s.node}`) !== null;

	if (
		inTreeContainer ||
		(element.closest(`.${s.scrollable}`) && inScrollableTree)
	) {
		return detectTreeSelection(
			doc,
			element,
			json as Record<string, unknown> | null,
		);
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
const getSelectedTableKeyValueObject = (
	doc: Document,
): Record<string, string> | null => {
	const selection = doc.defaultView?.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
		return null;
	}

	const range = selection.getRangeAt(0);
	const selectedCells = Array.from(
		doc.querySelectorAll(`.${s.tableView} tbody td`),
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

	const headerCells = Array.from(table.querySelectorAll("thead th")).map(
		(header) => header.textContent?.trim().toLowerCase() ?? "",
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
			.filter(
				(row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement,
			),
	);

	rows.forEach((row) => {
		const key = row.cells[keyIndex]?.textContent?.trim();
		const value = row.cells[valueIndex]?.textContent?.trim();

		if (!key || key === "<BLANK>" || value == null) {
			return;
		}

		// Strip array indices from the key
		const cleanedKey = stripArrayIndices(key);
		output[cleanedKey] = value;
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

	const { Info, app, spawnBanner, currentDocument } = Application.use();
	const { extensions } = Extension.use();
	const { t } = Locale.use();

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
	const treeContainerRef = useRef<HTMLDivElement | null>(null);
	const isContextMenuSelectingRef = useRef<boolean>(false);
	const isTreeViewContextRef = useRef<boolean>(false);
	const [treeTooltip, setTreeTooltip] = useState<{
		text: string;
		x: number;
		y: number;
	} | null>(null);
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
		const detailed = await Info.query_single_id(event._id, opId);
		setJSON(prepareEventJson(detailed));
	}, [event, app, Info]);

	useEffect(() => {
		if (!json || json._id !== event._id) loadEvent();
	}, [event._id, loadEvent, json]);

	// Global selection tracker
	useEffect(() => {
		const handleSelectionChange = () => {
			if (isContextMenuSelectingRef.current) return;
			const text = currentDocument.defaultView
				?.getSelection()
				?.toString()
				.trim();
			if (text) {
				setSelection(text);
				if (text !== lastAutoSelectionRef.current)
					lastAutoSelectionRef.current = null;
			}
		};
		currentDocument.addEventListener("selectionchange", handleSelectionChange);
		return () =>
			currentDocument.removeEventListener(
				"selectionchange",
				handleSelectionChange,
			);
	}, [currentDocument]);

	useEffect(() => setSelection(""), [event._id]);

	// Tree event handlers using ref-based delegation
	useEffect(() => {
		const container = treeContainerRef.current;
		if (!container || !json) return;

		const handleMouseEnter = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			// For mouseenter, we know target is closer to the actual element
			// Walk up to find the node container
			let nodeEl: Element | null = target;
			while (nodeEl && !nodeEl.classList.contains(s.node)) {
				nodeEl = nodeEl.parentElement;
			}

			if (!nodeEl) {
				setTreeTooltip(null);
				return;
			}

			// Find label within node
			const labelEl = Array.from(nodeEl.children).find(
				(child) =>
					child.classList.contains(s.label) ||
					child.classList.contains(s.clickableLabel),
			);

			if (!labelEl) {
				setTreeTooltip(null);
				return;
			}

			const path = getTreeKeyPath(
				labelEl,
				s.label,
				s.clickableLabel,
				s.node,
				s.basic,
			);

			// Only show tooltip if this is actually a leaf node
			if (!isTreeLeafValue(json, path)) {
				setTreeTooltip(null);
				return;
			}

			const tooltipText = getLeafTooltipText(json, path);

			if (!tooltipText) {
				setTreeTooltip(null);
				return;
			}

			// Get the position of the target element to show tooltip near it
			const rect = target.getBoundingClientRect();
			setTreeTooltip({
				text: tooltipText,
				x: rect.x,
				y: rect.y,
			});
		};

		const handleMouseLeave = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			// Only clear tooltip if we're leaving a node
			if (target.classList.contains(s.node) || target.closest(`.${s.node}`)) {
				setTreeTooltip(null);
			}
		};

		// Use capture phase to catch events before they bubble to container
		container.addEventListener("mouseenter", handleMouseEnter, true);
		container.addEventListener("mouseleave", handleMouseLeave, true);

		return () => {
			container.removeEventListener("mouseenter", handleMouseEnter, true);
			container.removeEventListener("mouseleave", handleMouseLeave, true);
		};
	}, [json, s.node, s.label, s.clickableLabel, s.basic]);

	// --- HANDLERS: Actions ---

	const handleCopyJson = useCallback(() => {
		if (!json) return;
		const path = treeContextPathRef.current;
		if (!path) {
			const selectedTableJson = getSelectedTableKeyValueObject(currentDocument);
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
		if (
			storageId &&
			typeof storageId === "string" &&
			storageId.trim() !== "" &&
			opId
		) {
			Info.download_storage_file(storageId, opId);
		}
	}, [event, app, Info, json]);

	const handleFocusTimeline = useCallback(() => {
		// @ts-ignore
		return window.focusCanvasOnEvent(
			event.gulp_timestamp + (file?.settings.offset || 0),
			false,
			event["gulp.source_id"],
		);
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

	const applySelectionAsFileFilter = useCallback(
		(textSelected?: string) => {
			if (!textSelected) return;
			const file = Source.Entity.id(app, event["gulp.source_id"]);
			const { filters } = Info.getQuery(file);

			const object = parseToKeyValue(textSelected);

			if (Object.keys(object).length === 0) {
				toast(t("eventDialog.invalidFilterSelection"));
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
			spawnBanner(
				<FilterFileBanner
					sources={[file]}
					query={updatedQuery}
				/>,
			);
		},
		[Info, app, event, spawnBanner],
	);

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
			theme === "light" || theme === "light-old" ? defaultStyles : darkStyles;

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
					defaultValue="tree"
					className={s.tabs_wrapper}
				>
					<TabsList className={s.triggers}>
						<TabsTrigger value="raw">
							<Icon
								name="CodeBracket"
								size={14}
							/>{" "}
							{t("eventDialog.raw")}
						</TabsTrigger>
						<TabsTrigger value="table">
							<Icon
								name="Table"
								size={14}
							/>{" "}
							{t("eventDialog.table")}
						</TabsTrigger>
						<TabsTrigger value="tree">
							<Icon
								name="GitFork"
								size={14}
							/>{" "}
							{t("eventDialog.tree")}
						</TabsTrigger>
					</TabsList>

					<ContextMenuTrigger
						asChild
						onMouseDown={(e) => {
							if (
								e.button === 2 &&
								!isPointInSelection(currentDocument, e.clientX, e.clientY)
							) {
								const element = currentDocument.elementFromPoint(
									e.clientX,
									e.clientY,
								) as HTMLElement | null;
								currentDocument.defaultView?.getSelection()?.removeAllRanges();
								const detected = detectSelectionAtPoint(
									currentDocument,
									e.clientX,
									e.clientY,
									json,
								);
								if (detected) {
									isContextMenuSelectingRef.current = true;
									lastAutoSelectionRef.current = detected;
									setSelection(detected);

									// Clear the flag after context menu interactions
									setTimeout(() => {
										isContextMenuSelectingRef.current = false;
									}, 100);

									// Determine which view we're in and extract the appropriate path
									if (element?.closest(`.${s.highlighter}`)) {
										// Raw view: clear tree context
										isTreeViewContextRef.current = false;
										treeContextPathRef.current = null;
									} else if (element?.closest(`.${s.tableView}`)) {
										// Table view: clear tree context
										isTreeViewContextRef.current = false;
										treeContextPathRef.current = null;
									} else if (
										element?.closest(`.${s.container}`) ||
										element?.closest(`.${s.node}`)
									) {
										// Tree view: prefer the resolved array child path when available.
										isTreeViewContextRef.current = true;
										const extractedPath = extractPathFromDetected(detected);
										const resolvedPath = resolveTreeContextPath(
											element as HTMLElement,
											json,
										);
										const candidatePath =
											resolvedPath && isSelectableLeafValue(json, resolvedPath)
												? resolvedPath
												: extractedPath &&
													  isSelectableLeafValue(json, extractedPath)
													? extractedPath
													: null;
										if (candidatePath) {
											treeContextPathRef.current = candidatePath;
										} else {
											// Fallback: try to find from DOM
											let nodeEl: Element | null = element as Element | null;
											while (nodeEl && !nodeEl.classList.contains(s.node)) {
												nodeEl = nodeEl.parentElement;
											}

											if (nodeEl) {
												let labelEl = Array.from(nodeEl.children).find(
													(child) =>
														child.classList.contains(s.label) ||
														child.classList.contains(s.clickableLabel),
												);

												// If label not found as direct child, try to find in ancestor nodes
												if (!labelEl) {
													let current: Element | null = nodeEl;
													while (current) {
														const label = Array.from(current.children).find(
															(child) =>
																child.classList.contains(s.label) ||
																child.classList.contains(s.clickableLabel),
														);
														if (label) {
															labelEl = label;
															break;
														}
														current =
															current.parentElement?.closest(`.${s.node}`) ??
															null;
													}
												}

												if (labelEl) {
													const leafPath = getTreeKeyPath(
														labelEl,
														s.label,
														s.clickableLabel,
														s.node,
														s.basic,
													);

													if (
														leafPath &&
														isSelectableLeafValue(json, leafPath)
													) {
														treeContextPathRef.current = leafPath;
													}
												}
											}
										}
									}
								} else {
									lastAutoSelectionRef.current = null;
									setSelection("");
									treeContextPathRef.current = null;
								}
							}
						}}
						// onContextMenu={() => {
						// 	const current = window.getSelection()?.toString().trim();
						// 	if (current && current !== selection) setSelection(current);
						// }}
					>
						<div
							className={s.contextTrigger}
							ref={treeContainerRef}
						>
							<TabsContent
								value="tree"
								className={s.scrollable}
							>
								<JsonView
									data={unflattenObject}
									clickToExpandNode={false}
									shouldExpandNode={allExpanded}
									style={jsonStyles}
								/>
							</TabsContent>
							<TabsContent
								className={s.scrollable}
								value="raw"
							>
								<Markdown
									className={s.highlighter}
									value={`\`\`\`json\n${JSON.stringify(json, null, 2)}`}
								/>
							</TabsContent>
							<TabsContent
								value="table"
								className={s.scrollable}
							>
								<Table
									className={s.tableView}
									includeIndex={false}
									values={tableRows}
								/>
							</TabsContent>
						</div>
					</ContextMenuTrigger>
				</Tabs>

				<ContextMenuContent container={currentDocument.body}>
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
						{t("eventDialog.createNewNote")}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!selection}
						onClick={handleCreateLink}
						icon="GitPullRequestCreate"
					>
						{t("eventDialog.createNewLink")}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={handleCopyJson}
						icon="Copy"
					>
						{t("common.copy")}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => {
							if (
								isTreeViewContextRef.current &&
								treeContextPathRef.current &&
								json
							) {
								// Tree view: use the stored path to get the actual value
								const path = treeContextPathRef.current;
								const value = getValueByPath(json, path);
								const strValue =
									value === undefined
										? ""
										: typeof value === "string"
											? value
											: JSON.stringify(value);
								applySelectionAsFileFilter(
									`"${stripArrayIndices(path)}": "${strValue}"`,
								);
							} else {
								applySelectionAsFileFilter(selection);
							}
						}}
						icon="Filter"
					>
						{t("eventDialog.newFilter")}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!selection}
						onClick={() => {
							if (
								isTreeViewContextRef.current &&
								treeContextPathRef.current &&
								json
							) {
								// Tree view: use the stored path to get the actual value
								const path = treeContextPathRef.current;
								let value = getValueByPath(json, path);

								// if value is an array, get the numbered element if path ends with a number
								if (
									Array.isArray(value) &&
									/^\d+$/.test(path.split(".").slice(-1)[0] ?? "")
								) {
									const index = Number(path.split(".").slice(-1)[0]);
									if (index >= 0 && index < value.length) {
										value = value[index];
									}
								}
								const cleanedPath = stripArrayIndices(path);
								const strValue =
									value === undefined
										? ""
										: typeof value === "string"
											? value
											: JSON.stringify(value);
								handleEnrich({ key: cleanedPath, value: strValue });
							} else {
								const isManualSelection =
									selection !== lastAutoSelectionRef.current;
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
							}
						}}
						icon="PrismColor"
					>
						{t("targetMenu.enrich")}
					</ContextMenuItem>
					{storageId &&
						typeof storageId === "string" &&
						storageId.trim() !== "" && (
							<ContextMenuItem
								onClick={handleDownloadLogFile}
								icon="Download"
							>
								{t("eventDialog.downloadLogFile")}
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
		currentDocument,
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
					<Icon
						name="CircleAlert"
						size={48}
						style={{ color: "var(--red-500)" }}
					/>
					<p style={{ color: "var(--red-500)", fontWeight: "bold" }}>
						{t("eventDialog.sourceDeleted")}
					</p>
					<p style={{ opacity: 0.6 }}>{t("eventDialog.eventUnavailable")}</p>
				</Stack>
			</Dialog>
		);
	}

	return (
		<Dialog callback={onClose}>
			{json ? (
				<Fragment>
					<Stack
						dir="column"
						className={s.group}
						gap={12}
						ai="stretch"
					>
						<Stack
							className={s.topActions}
							gap={12}
						>
							<Button
								onClick={handleCreateNote}
								variant="secondary"
								title={t("eventDialog.addNoteTitle")}
								icon="StickyNote"
							>
								{t("eventDialog.createNewNote")}
							</Button>
							<Button
								onClick={handleCreateLink}
								variant="secondary"
								title={t("eventDialog.createLinkOriginTitle")}
								icon="GitPullRequestCreate"
							>
								{t("eventDialog.createLink")}
							</Button>
							<Button
								onClick={() => handleEnrich()}
								variant="secondary"
								title={t("eventDialog.enrichCurrentTitle")}
								icon="PrismColor"
							>
								{t("targetMenu.enrich")}
							</Button>
							{Object.values(extensions).some((ext) =>
								Array.isArray(ext.type)
									? ext.type.includes("send_data")
									: (ext.type as any) === "send_data",
							) && (
								<Button
									onClick={handleSendData}
									variant="secondary"
									title={t("eventDialog.sendIocsTitle")}
									icon="Send"
								>
									{t("eventDialog.sendData")}
								</Button>
							)}
							<Button
								onClick={handleConnectLink}
								variant="secondary"
								title={t("eventDialog.connectLinkTitle")}
								icon="GitPullRequestCreateArrow"
							>
								{t("eventDialog.connectLink")}
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
						container={currentDocument.body}
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
								boxShadow:
									"var(--shadow-border), 0 8px 20px var(--gray-alpha-500)",
							}}
						>
							{treeTooltip.text}
						</div>
					)}
					<Navigation event={event} />
					<Stack
						className={s.actionButtons}
						gap={12}
					>
						<Button
							variant="secondary"
							onClick={handleCopyJson}
							icon="Copy"
						>
							{t("eventDialog.copyJson")}
						</Button>
						<Button
							variant="secondary"
							onClick={handleDownloadJson}
							icon="Download"
							title={t("eventDialog.downloadJson")}
						>
							{t("eventDialog.downloadJson")}
						</Button>
						<Button
							onClick={handleFocusTimeline}
							variant="secondary"
							icon="Crosshair"
							title={t("eventDialog.focusTimeline")}
						/>
						<Button
							onClick={() => {
								const opId = Doc.Entity.operationId(app, event);
								if (!opId) return;
								setIsFlagged(Doc.Entity.flag.toggle(event._id, opId));
							}}
							variant="secondary"
							icon={isFlagged ? "FlagOff" : "Flag"}
							disabled={(() => {
								const opId = Doc.Entity.operationId(app, event);
								return (
									(opId &&
										Doc.Entity.flag.isLimitReached(
											Doc.Entity.flag.getList(opId),
										) &&
										!isFlagged) ||
									!opId
								);
							})()}
							title={t("eventDialog.flagEvent")}
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
		return Source.Entity.resolveColor(
			file,
			event.number_hash,
			range,
		);
	}, [event, app.target.files, file]);

	const indicatorColor = useMemo(() => background, [background]);
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
			title={indicatorTooltip}
			aria-label={indicatorTooltip}
			style={{ ...style, background }}
			{...props}
		>
			<Stack
				className={s.indicatorIconWrap}
				ai="center"
				jc="center"
				dir="column"
				gap={2}
			>
				<Icon
					name="Square"
					size={10}
					color={indicatorColor}
				/>
				<p
					style={{
						color: "var(--accent)",
						fontSize: `${indicatorFontSize}px`,
					}}
				>
					{indicatorLabel}
				</p>
			</Stack>
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
