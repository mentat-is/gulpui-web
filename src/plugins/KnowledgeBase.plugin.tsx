import { Dialog } from "@/ui/Dialog";
import s from "./KnowledgeBase.module.css";
import { Button } from "@/ui/Button";
import { Application } from "@/context/Application.context";
import { Stack } from "@/ui/Stack";
import { Icon } from "@impactium/icons";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Input } from "@/ui/Input";
import { Badge } from "@/ui/Badge";
import { Operation } from "@/entities/Operation";
import { Glyph } from "@/entities/Glyph";
import { User } from "@/entities/User";
import { UUID } from "crypto";
import { cn } from "@impactium/utils";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/ui/ContextMenu";
import { Popover } from "@/ui/Popover";
import { toast } from "sonner";
import { Checkbox } from "@/ui/Checkbox";
import { Label } from "@/ui/Label";
import { Textarea } from "@/ui/Textarea";

import { Filter } from "@/entities/Filter";
import { Query } from "@/entities/Query";
import { OpenSearchQueryBuilder } from "@/components/QueryBuilder";
import { Banner } from "@/ui/Banner";
import { FilterFileBanner } from "@/banners/FilterFile.banner";
import { Source } from "@/entities/Source";

export namespace KnowledgeBase {
	export const name = "Entity";
	const _ = Symbol(KnowledgeBase.name);
	export type Id = UUID & {
		readonly [_]: unique symbol;
	};

	// ─── Types & Interfaces ───────────────────────────────────

	/**
	 * Represents a Knowledge Base entry (file or folder).
	 */
	export interface Entity {
		is_folder: boolean;
		id: KnowledgeBase.Id;
		parent_id?: KnowledgeBase.Id;
		glyph_id?: Glyph.Id;
		description?: string;
		type: "knowledge_base";
		user_id: User.Id;
		name: string;
		time_created: number;
		time_updated: number;
		tags: KnowledgeBase.Tag[];
		granted_user_ids: User.Id[];
		granted_user_group_ids: User.Id[];
		attachments: Record<string, any>;
	}

	/**
	 * Represents a tag attached to a KB entry.
	 */
	export interface Tag {
		value: string;
		icon: Glyph.Id;
		variant: NonNullable<Badge.Variant>;
	}

	export type Response = KnowledgeBase.Entity[];

	/** Minimal node returned by POST /get_kb_list with show_tree: true */
	export interface TreeNode {
		id: KnowledgeBase.Id;
		name: string;
		is_folder: boolean;
		parent_id: KnowledgeBase.Id | null;
		glyph_id?: Glyph.Id;
	}

	/** Clipboard state for cut operations */
	export interface Clipboard {
		node: TreeNode;
		action: "cut";
	}

	/** Configuration for the KB editor */
	export type EditorTarget =
		| { mode: "create"; isFolder: boolean }
		| { mode: "edit"; nodeId: KnowledgeBase.Id }
		| null;

	/** Specific attachment type for search filters */
	export interface FilterAttachment {
		id: string;
		type: "filter";
		name: string;
		query: Query.Type;
	}

	// ─── Constants ──────────────────────────────────────────────
	const DEBOUNCE_MS = 2000;

	/**
	 * General utilities and shared API calls for the Knowledge Base plugin.
	 */
	export namespace General {
		/**
		 * Reconstructs the breadcrumb path from the root to a specific node.
		 * @param nodes All known tree nodes
		 * @param currentId The current focal point in the tree
		 * @returns Array of path segments
		 */
		export function getBreadcrumbs(
			nodes: TreeNode[],
			currentId: KnowledgeBase.Id | null,
		) {
			const path: { id: KnowledgeBase.Id | null; name: string }[] = [
				{ id: null, name: "/" },
			];
			if (currentId === null) return path;

			const segments: { id: KnowledgeBase.Id | null; name: string }[] = [];
			let cursor: KnowledgeBase.Id | null = currentId;

			let safety = 50;
			while (cursor !== null && safety-- > 0) {
				const node = nodes.find((n) => n.id === cursor);
				if (!node) break;
				segments.unshift({ id: node.id, name: node.name });
				cursor = node.parent_id;
			}
			return [...path, ...segments];
		}

		/**
		 * API configuration for creating a KB entry.
		 * @param name The entry name
		 * @param type Folder or Document
		 * @param parentId Parent folder ID
		 * @param reqId Requesting operation ID
		 * @param data Additional payload fields
		 * @returns API configuration object
		 */
		export function createKB(
			name: string,
			type: "folder" | "document",
			parentId: KnowledgeBase.Id | "",
			reqId: string,
			data: Partial<{
				description: string;
				tags: string[];
				attachments: any[];
				glyph_id: string;
				private: boolean;
			}>,
		) {
			const isFolder = type === "folder";
			return {
				path: "/create_kb" as const,
				config: {
					method: "PUT" as const,
					query: {
						name: name.trim(),
						glyph_id: isFolder ? "Folder" : data.glyph_id || "",
						private: isFolder ? false : !!data.private,
						req_id: reqId,
					},
					body: {
						is_folder: isFolder,
						parent_id: parentId,
						description: data.description || "",
						tags: data.tags || [],
						attachments: data.attachments || [],
					},
				},
			};
		}

		/**
		 * API configuration for updating a KB entry.
		 * @param objId Target KB ID
		 * @param name The entry name
		 * @param isFolder Whether it's a folder (affects glyph choice)
		 * @param reqId Requesting operation ID
		 * @param data Additional payload fields
		 * @returns API configuration object
		 */
		export function updateKB(
			objId: KnowledgeBase.Id,
			name: string,
			isFolder: boolean,
			reqId: string,
			data: Partial<{
				description: string;
				tags: string[];
				attachments: any[];
				glyph_id: string;
			}>,
		) {
			return {
				path: "/update_kb" as const,
				config: {
					method: "POST" as const,
					query: {
						obj_id: objId,
						name: name.trim(),
						glyph_id: isFolder ? "Folder" : data.glyph_id || "",
						req_id: reqId,
					},
					body: {
						description: data.description || "",
						tags: data.tags || [],
						attachments: data.attachments || [],
					},
				},
			};
		}

		/**
		 * Deletes a KB entry.
		 * @param objId The KB ID to delete
		 * @returns API configuration object
		 */
		export function deleteKB(objId: KnowledgeBase.Id) {
			return {
				path: "/delete_kb" as const,
				config: {
					method: "DELETE" as const,
					query: { obj_id: objId },
				},
			};
		}

		/**
		 * Moves a KB entry to a new folder.
		 * @param objId The KB ID to move
		 * @param parentId The destination folder ID (null or empty for root)
		 * @returns API configuration object
		 */
		export function moveKB(objId: KnowledgeBase.Id, parentId: KnowledgeBase.Id | "") {
			return {
				path: "/move_kb" as const,
				config: {
					method: "POST" as const,
					query: {
						obj_id: objId,
						parent_id: parentId,
					},
				},
			};
		}

		/**
		 * Fetches a single KB entry by its ID.
		 * @param objId The KB ID to fetch
		 * @returns API configuration object
		 */
		export function getKBById(objId: KnowledgeBase.Id) {
			return {
				path: "/get_kb_by_id" as const,
				config: {
					method: "GET" as const,
					query: { obj_id: objId },
				},
			};
		}

		/**
		 * Fetches the list of KB tree nodes.
		 * @param operationIds Target operation IDs
		 * @param filter Optional search criteria
		 * @returns API configuration object
		 */
		export function getKBList(operationIds: string[], filter?: { name: string }) {
			const body: Record<string, any> = {
				show_tree: true,
				operation_ids: operationIds,
			};
			if (filter) body.flt = filter;

			return {
				path: "/get_kb_list" as const,
				config: {
					method: "POST" as const,
					body,
				},
			};
		}
	}


	// ─── Explorer Component ─────────────────────────────────────

	/**
	 * File-system-like explorer for the Knowledge Base.
	 * Supports navigation, search, and context-menu actions (delete, rename, cut, paste).
	 *
	 * @param props Dialog implementation props
	 */
	export function Explorer({ className, ...props }: Explorer.Props) {
		const { app } = Application.use();
		const selectedOperationId = Operation.Entity.selected(app)?.id;

		// ── Core states ───────────────────────────────────────────
		const [nodes, setNodes] = useState<TreeNode[]>([]);
		const [currentFolderId, setCurrentFolderId] =
			useState<KnowledgeBase.Id | null>(null);
		const [history, setHistory] = useState<(KnowledgeBase.Id | null)[]>([]);
		const [forwardHistory, setForwardHistory] = useState<
			(KnowledgeBase.Id | null)[]
		>([]);
		const [loading, setLoading] = useState<boolean>(false);

		// ── Search states ─────────────────────────────────────────
		const [searchMode, setSearchMode] = useState<boolean>(false);
		const [searchQuery, setSearchQuery] = useState<string>("");
		const [debouncedQuery, setDebouncedQuery] = useState<string>("");

		// ── Context menu states ───────────────────────────────────
		const [clipboard, setClipboard] = useState<Clipboard | null>(null);
		const [renaming, setRenaming] = useState<KnowledgeBase.Id | null>(null);
		const [renameValue, setRenameValue] = useState<string>("");

		const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);

		// ── API Logic ─────────────────────────────────────────────

		/**
		 * Fetch all KB tree nodes from the API.
		 * @param query Optional search string to filter by name
		 */
		const fetchNodes = useCallback(
			(query?: string) => {
				if (!selectedOperationId) return;

				const { path, config } = General.getKBList(
					[selectedOperationId],
					query?.trim() ? { name: query.trim() } : undefined,
				);

				api<TreeNode[]>(
					path,
					{ ...config, setLoading },
					(data) => {
						setNodes(data);
					},
				);
			},
			[selectedOperationId],
		);

		// ── Effects ───────────────────────────────────────────────

		// Initial load
		useEffect(() => {
			fetchNodes();
		}, [fetchNodes]);

		// Search debouncing
		useEffect(() => {
			if (!searchMode) return;
			const timer = setTimeout(() => {
				setDebouncedQuery(searchQuery);
			}, DEBOUNCE_MS);
			return () => clearTimeout(timer);
		}, [searchQuery, searchMode]);

		// Re-fetch on search or return to normal
		useEffect(() => {
			if (searchMode) {
				fetchNodes(debouncedQuery);
			} else if (debouncedQuery !== "") {
				setDebouncedQuery("");
				fetchNodes();
			}
		}, [debouncedQuery, searchMode, fetchNodes]);

		// ── Navigation Logic ──────────────────────────────────────

		/**
		 * Navigate into a folder, pushing the current location onto the history stack.
		 * @param folderId The folder to navigate into (null = root)
		 */
		const navigateTo = useCallback(
			(folderId: KnowledgeBase.Id | null) => {
				setHistory((prev) => [...prev, currentFolderId]);
				setForwardHistory([]);
				setCurrentFolderId(folderId);
			},
			[currentFolderId],
		);

		/** Go back to the previous folder in the history stack */
		const goBack = useCallback(() => {
			if (history.length === 0) return;
			const prev = [...history];
			const target = prev.pop()!;
			setHistory(prev);
			setForwardHistory((fwd) => [...fwd, currentFolderId]);
			setCurrentFolderId(target);
		}, [history, currentFolderId]);

		/** Go forward to the next folder in the forward-history stack */
		const goForward = useCallback(() => {
			if (forwardHistory.length === 0) return;
			const fwd = [...forwardHistory];
			const target = fwd.pop()!;
			setForwardHistory(fwd);
			setHistory((prev) => [...prev, currentFolderId]);
			setCurrentFolderId(target);
		}, [forwardHistory, currentFolderId]);

		/** Build the breadcrumb path from root to the current folder */
		const breadcrumbPath = useMemo(
			() => General.getBreadcrumbs(nodes, currentFolderId),
			[nodes, currentFolderId],
		);

		/** Toggle search mode on/off, resetting query when closing */
		const toggleSearch = useCallback(() => {
			setSearchMode((prev) => {
				if (prev) {
					setSearchQuery("");
					setDebouncedQuery("");
					fetchNodes();
				}
				return !prev;
			});
		}, [fetchNodes]);

		/** Close search when the input loses focus and is empty */
		const handleSearchBlur = useCallback(() => {
			if (searchQuery.trim().length === 0) {
				setSearchMode(false);
				setSearchQuery("");
				setDebouncedQuery("");
				fetchNodes();
			}
		}, [searchQuery, fetchNodes]);

		// ── Context Menu Action Handlers ──────────────────────────

		/**
		 * Delete a KB entry via API and remove from memory on success.
		 * For non-empty folders the server returns an error (surfaced via Logger).
		 * @param node The tree node to delete
		 */
		const handleDelete = useCallback(
			(node: TreeNode) => {
				const { path, config } = General.deleteKB(node.id);
				api<void>(
					path,
					config,
					() => {
						setNodes((prev) => prev.filter((n) => n.id !== node.id));
						// Clear clipboard if the deleted node was cut
						if (clipboard?.node.id === node.id) setClipboard(null);
						toast.success(`"${node.name}" deleted`);
					},
				);
			},
			[clipboard],
		);

		/**
		 * Rename a KB entry via API and update in memory on success.
		 * Silently aborts if the new name is empty or unchanged.
		 * @param node    The tree node to rename
		 * @param newName The desired new name
		 */
		const handleRename = useCallback(
			(node: TreeNode, newName: string) => {
				const trimmed = newName.trim();
				if (!trimmed || trimmed === node.name) {
					setRenaming(null);
					setRenameValue("");
					return;
				}

				const { path, config } = General.updateKB(
					node.id,
					trimmed,
					node.is_folder,
					selectedOperationId || "",
					{},
				);

				api<KnowledgeBase.Entity>(
					path,
					config,
					() => {
						setNodes((prev) =>
							prev.map((n) => (n.id === node.id ? { ...n, name: trimmed } : n)),
						);
						setRenaming(null);
						setRenameValue("");
						toast.success(`Renamed to "${trimmed}"`);
					},
				);
			},
			[selectedOperationId],
		);

		/**
		 * Cut an item — saves it to the clipboard for a future paste.
		 * @param node The tree node to cut
		 */
		const handleCut = useCallback((node: TreeNode) => {
			setClipboard({ node, action: "cut" });
		}, []);

		/**
		 * Paste (move) the cut item into a target folder via API.
		 * Enforces UI-side guards per API specification.
		 * @param targetFolderId The ID of the destination folder
		 */
		const handlePaste = useCallback(
			(targetFolderId: KnowledgeBase.Id) => {
				if (!clipboard) return;

				const item = clipboard.node;
				const { path, config } = General.moveKB(item.id, targetFolderId ?? "");

				api<void>(
					path,
					config,
					() => {
						setNodes((prev) =>
							prev.map((n) =>
								n.id === item.id ? { ...n, parent_id: targetFolderId } : n,
							),
						);
						setClipboard(null);
						toast.success(`"${item.name}" moved`);
					},
				);
			},
			[clipboard],
		);

		/**
		 * Begin renaming a node — opens the rename popover on its row.
		 * @param node The tree node to rename
		 */
		const startRename = useCallback((node: TreeNode) => {
			setRenaming(node.id);
			setRenameValue(node.name);
		}, []);

		/** Cancel the current rename operation and close the popover */
		const cancelRename = useCallback(() => {
			setRenaming(null);
			setRenameValue("");
		}, []);

		/**
		 * Submit the rename with the current renameValue.
		 * @param node The tree node being renamed
		 */
		const submitRename = useCallback(
			(node: TreeNode) => {
				handleRename(node, renameValue);
			},
			[handleRename, renameValue],
		);

		// ── Derived Data ──────────────────────────────────────────

		/** The current folder node (null when at root) */
		const currentFolder = useMemo(
			() =>
				currentFolderId
					? (nodes.find((n) => n.id === currentFolderId) ?? null)
					: null,
			[currentFolderId, nodes],
		);

		/** Children of the current folder, sorted folders-first then alphabetically */
		const childItems = useMemo(() => {
			let items: TreeNode[];
			if (searchMode && debouncedQuery.trim().length > 0) {
				items = nodes;
			} else {
				items = nodes.filter((n) => {
					if (currentFolderId === null) return n.parent_id === null;
					return n.parent_id === currentFolderId;
				});
				items = items.filter((n) => n.id !== currentFolderId);
			}

			return items.sort((a, b) => {
				if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
				return a.name.localeCompare(b.name);
			});
		}, [nodes, currentFolderId, searchMode, debouncedQuery]);

		// ── Item Click Handler ────────────────────────────────────

		/** Navigate into a folder on click; open editor for files */
		const handleItemClick = useCallback(
			(item: TreeNode) => {
				if (item.is_folder) {
					if (searchMode) {
						setSearchMode(false);
						setSearchQuery("");
						setDebouncedQuery("");
					}
					navigateTo(item.id);
				} else {
					setEditorTarget({ mode: "edit", nodeId: item.id });
				}
			},
			[navigateTo, searchMode],
		);

		// ── JSX ───────────────────────────────────────────────────

		return (
			<Dialog
				className={cn(s.explorer, className)}
				loading={loading}
				{...props}
			>
				{editorTarget ? (
					<Explorer.Editor
						target={editorTarget}
						onClose={() => setEditorTarget(null)}
						currentFolderId={currentFolderId}
						nodes={nodes}
						refreshNodes={(newName?: string) => {
							fetchNodes();
							if (newName && searchMode) {
								setSearchMode(false);
								setSearchQuery("");
								setDebouncedQuery("");
							}
						}}
						navigateTo={navigateTo}
						setEditorTarget={setEditorTarget}
					/>
				) : (
					<>
						<Explorer.Header
							historyLength={history.length}
							forwardHistoryLength={forwardHistory.length}
							goBack={goBack}
							goForward={goForward}
							breadcrumbPath={breadcrumbPath}
							navigateTo={navigateTo}
							searchMode={searchMode}
							setSearchMode={setSearchMode}
							searchQuery={searchQuery}
							setSearchQuery={setSearchQuery}
							handleSearchBlur={handleSearchBlur}
							toggleSearch={toggleSearch}
							onAddFolder={() =>
								setEditorTarget({ mode: "create", isFolder: true })
							}
							onAddDocument={() =>
								setEditorTarget({ mode: "create", isFolder: false })
							}
						/>

						<Explorer.List
							items={childItems}
							loading={loading}
							searchMode={searchMode}
							searchQuery={searchQuery}
							handleItemClick={handleItemClick}
							clipboard={clipboard}
							currentFolder={currentFolder}
							currentFolderId={currentFolderId}
							renaming={renaming}
							renameValue={renameValue}
							onSetRenameValue={setRenameValue}
							onDelete={handleDelete}
							onCut={handleCut}
							onPaste={handlePaste}
							onStartRename={startRename}
							onRenameSubmit={submitRename}
							onRenameCancel={cancelRename}
							onEditFolder={(node) =>
								setEditorTarget({ mode: "edit", nodeId: node.id })
							}
						/>
					</>
				)}
			</Dialog>
		);
	}

	export namespace Explorer {
		export interface Props extends Dialog.Props {}

		// ─── Header ───────────────────────────────────────────────

		/**
		 * Props for the navigation header.
		 */
		export interface HeaderProps {
			historyLength: number;
			forwardHistoryLength: number;
			goBack: () => void;
			goForward: () => void;
			breadcrumbPath: { id: KnowledgeBase.Id | null; name: string }[];
			navigateTo: (id: KnowledgeBase.Id | null) => void;
			searchMode: boolean;
			setSearchMode: (mode: boolean) => void;
			searchQuery: string;
			setSearchQuery: (query: string) => void;
			handleSearchBlur: () => void;
			toggleSearch: () => void;
			onAddFolder: () => void;
			onAddDocument: () => void;
		}

		/**
		 * Navigation header component.
		 * Swaps between breadcrumbs and search input.
		 *
		 * @param props Header implementation props
		 */
		export const Header = memo(
			({
				historyLength,
				forwardHistoryLength,
				goBack,
				goForward,
				breadcrumbPath,
				navigateTo,
				searchMode,
				searchQuery,
				setSearchQuery,
				handleSearchBlur,
				toggleSearch,
				onAddFolder,
				onAddDocument,
			}: HeaderProps) => {
				const searchInputRef = useRef<HTMLInputElement>(null);

				useEffect(() => {
					if (searchMode && searchInputRef.current) {
						searchInputRef.current.focus();
					}
				}, [searchMode]);

				return (
					<Stack
						className={s.header}
						gap={4}
					>
						<Button
							variant="secondary"
							icon="ChevronLeft"
							shape="icon"
							disabled={historyLength === 0}
							onClick={goBack}
							title="Go back"
						/>
						<Button
							variant="secondary"
							icon="ChevronRight"
							shape="icon"
							disabled={forwardHistoryLength === 0}
							onClick={goForward}
							title="Go forward"
						/>

						<div className={s.breadcrumb_container}>
							{searchMode ? (
								<div className={s.search_input}>
									<Input
										ref={searchInputRef}
										variant="highlighted"
										icon="MagnifyingGlass"
										placeholder="Search knowledge base…"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.currentTarget.value)}
										onBlur={handleSearchBlur}
									/>
								</div>
							) : (
								<div className={s.breadcrumbs}>
									{breadcrumbPath.map((segment) => (
										<span key={segment.id ?? "root"}>
											<span
												className={s.breadcrumb_segment}
												onClick={() => navigateTo(segment.id)}
											>
												{segment.name}
											</span>
											{segment.name !== "/" && (
												<span className={s.breadcrumb_separator}>/</span>
											)}
										</span>
									))}
								</div>
							)}
						</div>

						<Button
							variant={searchMode ? "glass" : "secondary"}
							icon="MagnifyingGlass"
							shape="icon"
							onClick={toggleSearch}
							title="Toggle search"
						/>
						<Popover.Root>
							<Popover.Trigger asChild>
								<Button
									variant="secondary"
									icon="Plus"
									shape="icon"
									title="Create new KB entry"
								/>
							</Popover.Trigger>
							<Popover.Content
								align="end"
								className={s.create_popover}
							>
								<Stack
									dir="column"
									ai="stretch"
									gap={2}
								>
									<Button
										variant="tertiary"
										icon="Folder"
										className={s.popover_button}
										onClick={onAddFolder}
									>
										New folder
									</Button>
									<Button
										variant="tertiary"
										icon="File"
										className={s.popover_button}
										onClick={onAddDocument}
									>
										New document
									</Button>
									<Button
										variant="tertiary"
										icon="Upload"
										className={s.popover_button}
										disabled
									>
										Upload document
									</Button>
								</Stack>
							</Popover.Content>
						</Popover.Root>
					</Stack>
				);
			},
		);

		// ─── List ─────────────────────────────────────────────────

		/**
		 * Props for the nodes list component.
		 */
		export interface ListProps {
			items: TreeNode[];
			loading: boolean;
			searchMode: boolean;
			searchQuery: string;
			handleItemClick: (item: TreeNode) => void;
			clipboard: Clipboard | null;
			currentFolder: TreeNode | null;
			currentFolderId: KnowledgeBase.Id | null;
			renaming: KnowledgeBase.Id | null;
			renameValue: string;
			onSetRenameValue: (v: string) => void;
			onDelete: (node: TreeNode) => void;
			onCut: (node: TreeNode) => void;
			onPaste: (targetId: KnowledgeBase.Id) => void;
			onStartRename: (node: TreeNode) => void;
			onRenameSubmit: (node: TreeNode) => void;
			onRenameCancel: () => void;
			onEditFolder: (node: TreeNode) => void;
		}

		/**
		 * Scrollable list of KB entries with context-menu support.
		 * Right-clicking items shows Delete, Rename, Cut and Paste actions.
		 * Right-clicking empty space shows Rename and Paste for the current folder.
		 *
		 * @param props List implementation props
		 */
		export const List = memo(
			({
				items,
				loading,
				searchMode,
				searchQuery,
				handleItemClick,
				clipboard,
				currentFolder,
				currentFolderId,
				renaming,
				renameValue,
				onSetRenameValue,
				onDelete,
				onCut,
				onPaste,
				onStartRename,
				onRenameSubmit,
				onRenameCancel,
				onEditFolder,
			}: ListProps) => {
				// Track which node the context menu was opened on, and whether it was a row click
				const [contextTarget, setContextTarget] = useState<{
					node: TreeNode;
					isRowClick: boolean;
				} | null>(null);

				/**
				 * Determine the context target from the right-click position.
				 * Uses data-kb-id attribute to detect which row was clicked.
				 * Falls back to the current folder for empty-area clicks.
				 * Prevents the menu entirely for root empty-area and search empty-area.
				 */
				const handleContextMenu = useCallback(
					(e: React.MouseEvent) => {
						// Close any open rename popover before opening a new context menu
						onRenameCancel();

						// Check if a list item row was clicked
						const row = (e.target as HTMLElement).closest(
							"[data-kb-id]",
						) as HTMLElement | null;

						if (row) {
							const itemId = row.getAttribute("data-kb-id") as KnowledgeBase.Id;
							const item = items.find((n) => n.id === itemId);
							if (item) {
								setContextTarget({ node: item, isRowClick: true });
								return;
							}
						}

						// Empty space — show menu for current folder (including root) outside search mode
						if (!searchMode) {
							if (currentFolderId === null) {
								// Virtual node for root
								setContextTarget({
									node: {
										id: null as any,
										name: "/",
										is_folder: true,
										parent_id: null,
									},
									isRowClick: false,
								});
							} else if (currentFolder) {
								setContextTarget({
									node: currentFolder,
									isRowClick: false,
								});
							}
						} else {
							// Search mode empty space — suppress the context menu
							e.preventDefault();
							setContextTarget(null);
						}
					},
					[items, currentFolder, searchMode, onRenameCancel, currentFolderId],
				);

				const canPaste = useMemo(() => {
					if (!clipboard || !contextTarget) return false;
					if (!contextTarget.node.is_folder) return false;
					// Cannot paste into itself
					if (clipboard.node.id === contextTarget.node.id) return false;
					// Cannot paste into the same folder where it already is
					if (clipboard.node.parent_id === contextTarget.node.id) return false;
					return true;
				}, [clipboard, contextTarget]);

				// ── Context Menu Content ─────────────────────────

				const menuContent = contextTarget ? (
					<ContextMenuContent>
						{/* Context menu entries for non-root entities */}
						{contextTarget.node.id !== null && contextTarget.node.is_folder && (
							<ContextMenuItem
								onClick={() => {
									onEditFolder(contextTarget.node);
									setContextTarget(null);
								}}
								icon="Pencil"
							>
								Edit
							</ContextMenuItem>
						)}
						{contextTarget.node.id !== null && (
							<ContextMenuItem
								onClick={() => {
									onStartRename(contextTarget.node);
									setContextTarget(null);
								}}
								icon="Pencil"
							>
								Rename
							</ContextMenuItem>
						)}

						{/* Delete and Cut — only for direct row clicks */}
						{contextTarget.isRowClick && (
							<>
								<ContextMenuItem
									onClick={() => {
										onDelete(contextTarget.node);
										setContextTarget(null);
									}}
									icon="Trash"
								>
									Delete
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => {
										onCut(contextTarget.node);
										setContextTarget(null);
									}}
									icon="Scissors"
								>
									Cut
								</ContextMenuItem>
							</>
						)}

						{/* Paste — only when the target is a folder and clipboard has content */}
						{contextTarget.node.is_folder && clipboard && (
							<>
								{/* Only show separator if something else was rendered above */}
								{(contextTarget.node.id !== null ||
									contextTarget.isRowClick) && <ContextMenuSeparator />}
								<ContextMenuItem
									disabled={!canPaste}
									onClick={() => {
										if (canPaste) {
											onPaste(contextTarget.node.id);
											setContextTarget(null);
										}
									}}
									icon="Clipboard"
								>
									Paste here
								</ContextMenuItem>
							</>
						)}
					</ContextMenuContent>
				) : null;

				// ── Empty state ──────────────────────────────────

				if (items.length === 0 && !loading) {
					return (
						<ContextMenu>
							<ContextMenuTrigger asChild>
								<div
									className={s.empty}
									onContextMenu={handleContextMenu}
								>
									<Badge
										variant="gray-subtle"
										size="lg"
									>
										{searchMode && searchQuery.trim().length > 0
											? "No results found"
											: "This folder is empty"}
									</Badge>
								</div>
							</ContextMenuTrigger>
							{menuContent}
						</ContextMenu>
					);
				}

				// ── Populated list ───────────────────────────────

				return (
					<ContextMenu>
						<ContextMenuTrigger asChild>
							<div
								className={s.list}
								onContextMenu={handleContextMenu}
							>
								{items.map((item) => (
									<Popover.Root
										key={item.id}
										open={renaming === item.id}
										onOpenChange={(open) => {
											if (!open) onRenameCancel();
										}}
									>
										<Popover.Trigger asChild>
											<div
												data-kb-id={item.id}
												className={cn(
													s.list_item,
													item.is_folder && s.list_item_folder,
													clipboard?.node.id === item.id && s.list_item_cut,
												)}
												onClick={() =>
													renaming !== item.id && handleItemClick(item)
												}
											>
												<Icon
													name={
														(item.glyph_id as any) ||
														(item.is_folder ? "Folder" : "File")
													}
													size={16}
												/>
												<span className={s.list_item_name}>{item.name}</span>
											</div>
										</Popover.Trigger>
										{renaming === item.id && (
											<Popover.Content
												side="bottom"
												align="start"
												className={s.rename_popover}
											>
												<Input
													value={renameValue}
													onChange={(e) =>
														onSetRenameValue(e.currentTarget.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter") onRenameSubmit(item);
														if (e.key === "Escape") onRenameCancel();
													}}
													autoFocus
													placeholder="New name…"
												/>
											</Popover.Content>
										)}
									</Popover.Root>
								))}
							</div>
						</ContextMenuTrigger>
						{menuContent}
					</ContextMenu>
				);
			},
		);

		// ─── Editor Component ───────────────────────────────────────

		// ─── Editor Components ──────────────────────────────────────

		/**
		 * Renders a list of attachments (filters) with edit/delete support.
		 * Right-clicking an attachment shows further actions.
		 *
		 * @param props AttachmentList implementation props
		 */
		const AttachmentList = memo(
			({
				attachments,
				onEdit,
				onDelete,
				onApply,
			}: {
				attachments: Record<string, FilterAttachment>;
				onEdit: (data: FilterAttachment) => void;
				onDelete: (id: string) => void;
				onApply: (data: FilterAttachment) => void;
			}) => {
				const filters = Object.values(attachments).filter(
					(a: any) => a.type === "filter",
				);

				if (filters.length === 0) return null;

				return (
					<Stack
						dir="row"
						gap={8}
						className={s.attachment_stack}
					>
						{filters.map((filter) => (
							<ContextMenu key={filter.id}>
								<ContextMenuTrigger asChild>
									<div>
										<Badge
											variant="gray-subtle"
											size="md"
											onClick={() => onEdit(filter)}
											className={s.attachment_badge}
										>
											{filter.name || "Unnamed filter"}
										</Badge>
									</div>
								</ContextMenuTrigger>
								<ContextMenuContent>
									<ContextMenuItem
										onClick={() => onEdit(filter)}
										icon="Pencil"
									>
										Edit
									</ContextMenuItem>
									<ContextMenuItem
										onClick={() => onDelete(filter.id)}
										icon="Trash2"
									>
										Delete
									</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem
										onClick={() => onApply(filter)}
										icon="Play"
									>
										Apply
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						))}
					</Stack>
				);
			},
		);

		/**
		 * Modal content for adding or editing a search filter attachment.
		 *
		 * @param props FilterModal implementation props
		 */
		const FilterModalContent = memo(
			({
				initialData,
				onSave,
				onClose,
			}: {
				initialData?: FilterAttachment;
				onSave: (data: FilterAttachment) => void;
				onClose: () => void;
			}) => {
				const [name, setName] = useState(initialData?.name || "");
				const [filters, setFilters] = useState<Filter.Type[]>(
					initialData?.query?.filters || [],
				);

				/** Submits the filter data back to the parent */
				const handleSave = () => {
					onSave({
						id: initialData?.id || crypto.randomUUID(),
						type: "filter",
						name,
						query: { string: "", filters },
					});
				};

				return (
					<Banner
						title={initialData ? "Edit Filter" : "Add Filter"}
						onClose={onClose}
						option={
							<Button
								onClick={onClose}
								variant="secondary"
							>
								Cancel
							</Button>
						}
						done={
							<Button
								onClick={handleSave}
								variant="glass"
								disabled={!name.trim()}
							>
								Add Filter
							</Button>
						}
					>
						<Stack
							dir="column"
							gap={12}
							ai="stretch"
							className={s.filter_modal_stack}
						>
							<Stack
								dir="column"
								gap={8}
								ai="stretch"
							>
								<Label value="Filter Name" />
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Name of the filter"
									autoFocus
								/>
							</Stack>

							<OpenSearchQueryBuilder.Query.Filters
								filters={filters}
								setFilters={setFilters}
								keys={[]}
							/>
							<OpenSearchQueryBuilder.Query.Add
								filters={filters}
								setFilters={setFilters}
							/>
						</Stack>
					</Banner>
				);
			},
		);

		export interface EditorProps {
			target: EditorTarget;
			onClose: () => void;
			currentFolderId: KnowledgeBase.Id | null;
			nodes: TreeNode[];
			refreshNodes: (newName?: string) => void;
			navigateTo: (id: KnowledgeBase.Id | null) => void;
			setEditorTarget: (target: EditorTarget) => void;
		}

		/**
		 * Full-page editor for creating or modifying KB entries.
		 * Manages metadata (name, tags, glyph) and attachments.
		 * Persists changes only when the user explicitly clicks "Save/Update".
		 *
		 * @param props Editor implementation props
		 */
		export const Editor = memo(
			({
				target,
				onClose,
				currentFolderId,
				nodes,
				refreshNodes,
				setEditorTarget,
			}: EditorProps) => {
				const { app, spawnBanner, destroyBanner } = Application.use();
				const selectedOperationId = Operation.Entity.selected(app)?.id;

				const isCreateMode = target?.mode === "create";
				const nodeId = target?.mode === "edit" ? target.nodeId : null;

				// Form values
				const [name, setName] = useState(isCreateMode ? "new kb entry" : "");
				const [tagsText, setTagsText] = useState("");
				const [icon, setIcon] = useState<Glyph.Id | null>(null);
				const [isPrivate, setIsPrivate] = useState<boolean>(false);
				const [description, setDescription] = useState("");
				const [attachments, setAttachments] = useState<
					Record<string, FilterAttachment>
				>({});
				const [initialLoad, setInitialLoad] = useState(target?.mode === "edit");
				const [requesting, setRequesting] = useState(false);
				const [dataIsFolder, setDataIsFolder] = useState(
					isCreateMode ? target.isFolder : false,
				);

				/**
				 * Opens the filter management banner.
				 * @param initialData Existing filter to edit, or undefined for a new one
				 */
				const spawnFilterModal = useCallback(
					(initialData?: FilterAttachment) => {
						spawnBanner(
							<FilterModalContent
								initialData={initialData}
								onSave={(data) => {
									setAttachments((prev) => ({ ...prev, [data.id]: data }));
									destroyBanner();
								}}
								onClose={() => destroyBanner()}
							/>,
						);
					},
					[spawnBanner, destroyBanner],
				);

				/**
				 * Removes an attachment from local state.
				 * @param id The attachment ID to remove
				 */
				const deleteAttachment = useCallback((id: string) => {
					setAttachments((prev) => {
						const next = { ...prev };
						delete next[id];
						toast.info("Attachment removed locally. Click Update to persist changes.");
						return next;
					});
				}, []);

				/**
				 * Applies a saved filter to the currently selected sources.
				 * @param filter The filter attachment to apply
				 */
				const handleApply = useCallback(
					(filter: FilterAttachment) => {
						const sources = Source.Entity.selected(app);
						if (sources.length === 0) {
							toast.error("No files selected to apply the filter");
							return;
						}

						spawnBanner(
							<FilterFileBanner
								sources={sources}
								query={filter.query}
							/>,
						);
					},
					[app.target.files, app.timeline.filter, app.timeline.renderVersion, spawnBanner],
				);

				// Load entity on mount if edit mode
				useEffect(() => {
					if (target?.mode === "edit") {
						setInitialLoad(true);
						const { path, config } = General.getKBById(target.nodeId);
						api<KnowledgeBase.Entity>(
							path,
							config,
							(data) => {
								setName(data.name || "");
								setTagsText(data.tags ? (data.tags as any[]).join(", ") : "");
								setIcon(data.glyph_id || null);
								setDescription(data.description || "");
								setDataIsFolder(data.is_folder);

								const loadedAttachments = (data.attachments || []).reduce(
									(acc: Record<string, any>, curr: any) => {
										if (!curr.id) curr.id = crypto.randomUUID();
										acc[curr.id] = curr;
										return acc;
									},
									{},
								);
								setAttachments(loadedAttachments);

								setInitialLoad(false);
							},
						);
					} else if (isCreateMode) {
						setDataIsFolder(target.isFolder);
						setName("");
						setTagsText("");
						setIcon(Glyph.List.keys().next().value || null);
						setDescription("");
						setAttachments({});
						setIsPrivate(false);
						setInitialLoad(false);
					}
				}, [target, isCreateMode]);

				/** Breadcrumb path for the current editor location */
				const breadcrumbPath = useMemo(
					() => General.getBreadcrumbs(nodes, currentFolderId),
					[nodes, currentFolderId],
				);

				/**
				 * Submits the current form state to the API.
				 * Handles both Create (PUT) and Update (POST) operations.
				 */
				const handleSave = useCallback(async () => {
					if (!name.trim()) return;

					setRequesting(true);
					const tags = tagsText
						.split(",")
						.map((t) => t.trim())
						.filter(Boolean);

					const parent_id = currentFolderId === null ? "" : currentFolderId;

					const reqBody = {
						description,
						tags,
						attachments: Object.values(attachments),
						glyph_id: icon || "",
						private: isPrivate,
					};

					const { path, config } = isCreateMode
						? General.createKB(
								name,
								dataIsFolder ? "folder" : "document",
								parent_id,
								selectedOperationId || "",
								reqBody,
						  )
						: General.updateKB(
								nodeId!,
								name,
								dataIsFolder,
								selectedOperationId || "",
								reqBody,
						  );

					api<KnowledgeBase.Entity>(
						path,
						config,
						(data) => {
							setRequesting(false);
							toast.success(`"${name}" ${isCreateMode ? "created" : "updated"}`);
							refreshNodes(name.trim());
							if (isCreateMode) {
								setEditorTarget({ mode: "edit", nodeId: data.id });
							}
						},
					);
				}, [
					name,
					tagsText,
					description,
					attachments,
					icon,
					isPrivate,
					isCreateMode,
					dataIsFolder,
					currentFolderId,
					selectedOperationId,
					nodeId,
					refreshNodes,
					setEditorTarget,
				]);

				if (initialLoad)
					return (
						<div className={s.empty}>
							<Badge variant="gray-subtle">Loading...</Badge>
						</div>
					);

				return (
					<div className={s.editor}>
						<Stack
							className={s.header}
							gap={4}
						>
							<Button
								variant="secondary"
								icon="ChevronLeft"
								shape="icon"
								onClick={onClose}
								title="Back"
							/>
							<div className={s.editor_breadcrumbs}>
								{breadcrumbPath.map((segment) => (
									<span key={segment.id ?? "root"}>
										<span className={s.breadcrumb_segment}>{segment.name}</span>
										{segment.name !== "/" && (
											<span className={s.breadcrumb_separator}>/</span>
										)}
									</span>
								))}
							</div>
							<div className={s.editor_name_input}>
								<Input
									value={name}
									onChange={(e) => setName(e.currentTarget.value)}
									placeholder="Name"
								/>
							</div>
							<Popover.Root>
								<Popover.Trigger asChild>
									<Button
										variant="secondary"
										icon="Plus"
										shape="icon"
										title="Attachments"
									/>
								</Popover.Trigger>
								<Popover.Content
									align="end"
									className={s.attachment_popover}
								>
									<Stack
										dir="column"
										ai="stretch"
										gap={2}
									>
										<Button
											variant="tertiary"
											icon="Filter"
											className={s.popover_button}
											onClick={() => {
												spawnFilterModal(undefined);
											}}
										>
											Add Filter
										</Button>
									</Stack>
								</Popover.Content>
							</Popover.Root>
						</Stack>

						<div className={s.editor_body}>
							<div className={s.editor_field}>
								<Label value="Tags" />
								<Input
									placeholder="Tags separated by comma"
									value={tagsText}
									onChange={(e) => setTagsText(e.target.value)}
								/>
							</div>

							{!dataIsFolder && (
								<div className={s.editor_row_with_private}>
									<Glyph.Chooser
										label="Glyph"
										icon={icon}
										setIcon={setIcon}
									/>
									<Stack
										dir="row"
										gap={8}
										ai="center"
										className={s.private_checkbox_container}
									>
										<Checkbox
											checked={isPrivate}
											onCheckedChange={(checked) =>
												setIsPrivate(checked === true)
											}
										/>
										<Label value="Private document" />
									</Stack>
								</div>
							)}

							<Textarea
								className={s.editor_textarea}
								value={description}
								onChange={(e) => setDescription(e.currentTarget.value)}
								placeholder="Markdown description"
							/>

							<Stack
								dir="column"
								gap={4}
								ai="flex-start"
								className={s.attachment_section}
							>
								<Label
									className={s.attachment_label_main}
									value="Attachments:"
								/>
								<Label value="Filters:" />
								<AttachmentList
									attachments={attachments}
									onEdit={(attachment) => {
										spawnFilterModal(attachment);
									}}
									onDelete={deleteAttachment}
									onApply={handleApply}
								/>
							</Stack>
						</div>

						<div className={s.editor_footer}>
							<Button
								variant="glass"
								onClick={handleSave}
								loading={requesting}
								disabled={!name.trim()}
							>
								{isCreateMode ? "Create" : "Update"}
							</Button>
						</div>
					</div>
				);
			},
		);
	}
}

export default function () {
	const { spawnDialog } = Application.use();

	return (
		<Button
			variant="secondary"
			title="Knowledge Base"
			icon="BookOpen"
			size="md"
			onClick={() => spawnDialog(<KnowledgeBase.Explorer />)}
		/>
	);
}
