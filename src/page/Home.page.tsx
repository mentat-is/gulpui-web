import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Application } from "@/context/Application.context";
import { Operation } from "@/entities/Operation";
import { Menu, MenuItem } from "@/components/menu";
import { Icon } from "@impactium/icons";
import { SelectFiles } from "@/banners/SelectFiles.banner";
import { Session } from "@/banners/Session.banner";
import { Checkbox } from "@/ui/Checkbox";
import { Button } from "@/ui/Button";
import s from "./styles/Home.module.css";
import { DisplayOperationDetailDialog } from "@/dialogs/OperationDetail.dialog";
import { Stack } from "@/ui/Stack";
import { Resizer } from "@/ui/Resizer";
import { Banner as UIBanner } from "@/ui/Banner";
import { Toggle } from "@/ui/Toggle";

export namespace Home {
	export namespace Page {
		export interface Props {}
	}

	/**
	 * Root home page — displayed immediately after a successful login.
	 *
	 * Responsibilities:
	 * 1. Fetch plugin list, glyphs, and the operation list via Info.sync().
	 * 2. Render a 3-panel skeleton layout:
	 *    - Left: existing Menu component (to be refactored later to accept button list via props).
	 *    - Main: table of fetched operations, each linking to /operations/:id.
	 *    - Right: empty drawer placeholder for the upcoming operation detail panel.
	 */
	interface BulkDeleteOperationsBannerProps {
		operationIds: Operation.Id[];
		onDeleted: (deletedIds: Operation.Id[]) => void;
	}

	/**
	 * Banner component for confirming bulk deletion of selected operations.
	 *
	 * @param props - Component props.
	 * @param props.operationIds - The list of operation IDs to delete.
	 * @param props.onDeleted - Callback triggered when the operations have been successfully deleted.
	 * @returns The React element for the confirmation banner.
	 */
	function BulkDeleteOperationsBanner({
		operationIds,
		onDeleted,
	}: BulkDeleteOperationsBannerProps) {
		const { Info, app, destroyBanner } = Application.use();
		const [loading, setLoading] = useState(false);
		const [isSubmitted, setIsSubmitted] = useState(false);

		const confirmDelete = async () => {
			const operationsToDelete = operationIds
				.map((id) => app.target.operations.find((op) => op.id === id))
				.filter((op): op is Operation.Type => !!op);

			const deletedIds = await Info.deleteOperation(
				operationsToDelete,
				setLoading,
			);
			if (deletedIds.length > 0) {
				onDeleted(deletedIds);
			}
			destroyBanner();
		};

		return (
			<UIBanner
				title="Delete operations"
				done={
					<Button
						loading={loading}
						icon="Trash2"
						variant="secondary"
						onClick={confirmDelete}
						disabled={!isSubmitted}
					/>
				}
			>
				<p>
					Are you sure you want to delete {operationIds.length} selected
					operations?
				</p>
				<Toggle
					option={["No, don`t delete", "Yes, i`m sure"]}
					checked={isSubmitted}
					onCheckedChange={setIsSubmitted}
				/>
			</UIBanner>
		);
	}

	export function Page(_: Home.Page.Props) {
		const { Info, app, spawnBanner, spawnDialog, dialog, banner } =
			Application.use();
		const navigate = useNavigate();
		const [loading, setLoading] = useState(true);
		const [selectedIds, setSelectedIds] = useState<Set<Operation.Id>>(
			new Set(),
		);

		/**
		 * Triggers the bulk deletion banner for selected operations.
		 */
		const handleBulkDelete = () => {
			if (selectedIds.size === 0) return;
			const deletedIds = [...selectedIds];
			spawnBanner(
				<BulkDeleteOperationsBanner
					operationIds={deletedIds}
					onDeleted={(deleted) => {
						setSelectedIds((prev) => {
							const next = new Set(prev);
							deleted.forEach((id) => next.delete(id));
							return next;
						});
					}}
				/>,
				"table",
			);
		};

		/**
		 * On mount, initializes shared application state, mirroring OperationView's exact
		 * pattern: attempt auto-login from localStorage first (handles hard reload while
		 * the SmartSocket token hasn't been restored yet), then fetch plugins, glyphs,
		 * and the operations list.
		 */
		useEffect(() => {
			const initialize = async () => {
				// Replicate OperationView's auto-login guard: if a saved token/userId
				// exists but app.general.user hasn't been restored yet, re-hydrate the
				// user profile. This covers the hard-reload case where the SmartSocket
				// session hasn't reconnected before React mounts.
				if (app.target.operations.length === 0) {
					const savedUserId = localStorage.getItem("__user_id");
					if (savedUserId && !app.general.user) {
						try {
							const userProfile = await Info.user_get_by_id(savedUserId);
							if (userProfile) {
								Info.setInfoByKey(userProfile, "general", "user");
							}
						} catch {
							// API error handler in API.tsx handles redirection to /login on 401
							return;
						}
					}

					await Info.plugin_list();
					await Info.glyphs_reload();
					await Info.sync();
				}

				setLoading(false);
			};

			initialize();
		}, []);

		/**
		 * Selects an operation in global state and navigates to the operation view.
		 *
		 * @param operation - The operation to load.
		 */
		const handleOpenOperation = (operation: Operation.Type) => {
			Info.operations_select(operation.id);
			navigate(`/operations/${operation.id}`);
		};

		/**
		 * Toggles the selection state of a specific operation by its ID.
		 *
		 * @param id - The ID of the operation to toggle.
		 */
		const toggleSelection = (id: Operation.Id) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.add(id);
				}
				return next;
			});
		};

		/**
		 * Selects or deselects all operations in the table.
		 *
		 * @param checked - True to select all operations, false to deselect all.
		 */
		const handleSelectAll = (checked: boolean) => {
			if (checked) {
				setSelectedIds(new Set(app.target.operations.map((op) => op.id)));
			} else {
				setSelectedIds(new Set());
			}
		};

		const isAllSelected =
			app.target.operations.length > 0 &&
			selectedIds.size === app.target.operations.length;

		/**
		 * Renders the sticky header row of the operations table.
		 * Includes the select all checkbox, column titles, and the actions column.
		 */
		const TableHeader = () => (
			<div className={s.tableHeader}>
				<div className={`${s.tableCell} ${s.selectCell}`}>
					<Checkbox
						checked={isAllSelected}
						onCheckedChange={(checked) => handleSelectAll(!!checked)}
						aria-label="Select all operations"
					/>
				</div>
				<div className={s.tableCell}>
					<span className={s.headerLabel}>Icon</span>
				</div>
				<div className={s.tableCell}>
					<span className={s.headerLabel}>Name</span>
				</div>
				<div className={`${s.tableCell} ${s.actionsCell}`}>
					<span className={s.headerLabel}>Actions</span>
				</div>
			</div>
		);

		/**
		 * Renders a single row for one operation.
		 * Provides a checkbox for multi-selection, the operation icon and name,
		 * and buttons to either delete the operation or open it.
		 *
		 * @param props.operation - The operation object to render.
		 */
		const OperationRow = ({ operation }: { operation: Operation.Type }) => {
			const [deleting, setDeleting] = useState(false);

			/**
			 * Handler for deleting the operation.
			 * Calls Info.deleteOperation and removes the operation from the selection set.
			 *
			 * @param e - The mouse event.
			 */
			const handleDelete = async (e: React.MouseEvent) => {
				e.stopPropagation();
				await Info.deleteOperation(operation, setDeleting);
				setSelectedIds((prev) => {
					if (prev.has(operation.id)) {
						const next = new Set(prev);
						next.delete(operation.id);
						return next;
					}
					return prev;
				});
			};

			/**
			 * Handler for opening the operation.
			 * Calls handleOpenOperation.
			 *
			 * @param e - The mouse event.
			 */
			const handleGo = (e: React.MouseEvent) => {
				e.stopPropagation();
				handleOpenOperation(operation);
			};

			/**
			 * Toggles selection of this operation.
			 *
			 * @param checked - The new checkbox checked state.
			 */
			const handleCheckboxChange = (checked: boolean) => {
				toggleSelection(operation.id);
			};

			/**
			 * Row click handler to toggle checkbox selection.
			 * Avoids triggering if interactive elements (checkbox, actions) were clicked directly.
			 *
			 * @param e - The mouse event.
			 */
			const handleRowClick = (e: React.MouseEvent) => {
				const target = e.target as HTMLElement;
				if (
					target.closest(`.${s.actionsCell}`) ||
					target.closest(`.${s.selectCell}`)
				) {
					return;
				}
				spawnDialog(
					<DisplayOperationDetailDialog
						operationId={operation.id}
						fallbackName={operation.name}
						fallbackGlyphId={operation.glyph_id}
						onClose={() => spawnDialog(null)}
					/>,
				);
			};

			return (
				<div
					className={s.operationRow}
					onClick={handleRowClick}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === " ") {
							e.preventDefault();
							toggleSelection(operation.id);
						}
					}}
					aria-label={`Select operation ${operation.name}`}
				>
					<div className={`${s.tableCell} ${s.selectCell}`}>
						<Checkbox
							checked={selectedIds.has(operation.id)}
							onCheckedChange={(checked) => handleCheckboxChange(!!checked)}
							aria-label={`Select operation ${operation.name}`}
						/>
					</div>
					<div className={`${s.tableCell} ${s.iconCell}`}>
						<div className={s.operationIcon}>
							<Icon name={Operation.Entity.icon(operation)} />
						</div>
					</div>
					<div className={s.tableCell}>
						<span className={s.operationName}>{operation.name}</span>
					</div>
					<div className={`${s.tableCell} ${s.actionsCell}`}>
						<Button
							variant="secondary"
							icon="Trash2"
							loading={deleting}
							onClick={handleDelete}
							title="Delete"
							aria-label={`Delete operation ${operation.name}`}
						/>
						<Button
							variant="secondary"
							icon="ArrowRight"
							onClick={handleGo}
							title="Go to"
							aria-label={`Go to operation ${operation.name}`}
						/>
					</div>
				</div>
			);
		};

		/**
		 * Main content area component that decides whether to show
		 * the loading state, the empty state, or the list of operations.
		 *
		 * @returns A React element representing the current main view.
		 */
		const MainContent = () => {
			if (loading) {
				return (
					<div className={s.result}>
						<div className={s.resultScroll}>
							<div className={s.emptyState}>Loading...</div>
						</div>
					</div>
				);
			}

			if (app.target.operations.length === 0) {
				return (
					<div className={s.result}>
						<div className={s.resultScroll}>
							<div className={s.emptyState}>No operations found.</div>
						</div>
					</div>
				);
			}

			return (
				<>
					<div className={s.result}>
						<TableHeader />
						<div className={s.resultScroll}>
							{app.target.operations.map((operation) => (
								<OperationRow
									key={operation.id}
									operation={operation}
								/>
							))}
						</div>
					</div>
					<div className={s.footer}>
						<Stack jc="flex-end">
							<Button
								variant="glass"
								disabled={selectedIds.size === 0}
								onClick={handleBulkDelete}
								icon="Trash2"
							>
								Delete selected operations ({selectedIds.size})
							</Button>
						</Stack>
					</div>
				</>
			);
		};

		/**
		 * Top area menu items for the Home page.
		 * Includes the "Create new" button that opens the operation creation banner.
		 */
		const menuTopItems = useMemo<MenuItem[]>(
			() => [
				{
					label: "Create new",
					icon: "Plus",
					category: "Actions",
					action: () => spawnBanner(<Operation.CreateOrUpdate.Banner />),
				},
			],
			[spawnBanner],
		);

		/**
		 * Bottom area menu items for the Home page.
		 * Includes the "LogOut" button that triggers the session save/logout flow.
		 */
		const menuBottomItems = useMemo<MenuItem[]>(
			() => [
				{
					label: "LogOut",
					icon: "LogOut",
					category: "Account",
					action: () => spawnBanner(<Session.Save.Banner />),
				},
			],
			[spawnBanner],
		);

		return (
			<div className={s.wrapper}>
				{/* Left navigation — data-driven Menu component */}
				<Menu
					topItems={menuTopItems}
					bottomItems={menuBottomItems}
				/>

				{/* Main content: operations list */}
				<main className={s.main}>
					<p className={s.pageTitle}>[ Operations ]</p>
					<MainContent />
				</main>

				{/* Right drawer placeholder — reserved for the upcoming detail panel */}
				{dialog ? (
					<Stack
						className={s.dialog}
						style={{ width: app.timeline.dialogSize }}
						pos="relative"
					>
						<Resizer
							init={app.timeline.dialogSize}
							set={Info.setDialogSize}
						/>
						{dialog}
					</Stack>
				) : null}

				{banner?.target === "table" ? banner.node : null}
			</div>
		);
	}
}
