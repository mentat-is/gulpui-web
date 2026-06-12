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
import { Table } from "@/components/Table";

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
				<Operation.BulkDelete.Banner
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

		const OperationActions = ({ operation }: { operation: Operation.Type }) => {
			const [deleting, setDeleting] = useState(false);

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

			const handleGo = (e: React.MouseEvent) => {
				e.stopPropagation();
				handleOpenOperation(operation);
			};

			return (
				<Stack gap={4} ai="center" jc="center" dir="row">
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
				</Stack>
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

			const selectedIndices = new Set<number>();
			app.target.operations.forEach((op, i) => {
				if (selectedIds.has(op.id)) {
					selectedIndices.add(i);
				}
			});

			return (
				<>
					<Table<Operation.Type>
						className={s.result}
						values={app.target.operations}
						selectable={true}
						selectedrows={selectedIndices}
						onrowselect={(index, selected) => {
							const op = app.target.operations[index];
							if (op) toggleSelection(op.id);
						}}
						onSelectAll={handleSelectAll}
						onRowClick={(row) => {
							spawnDialog(
								<DisplayOperationDetailDialog
									operationId={row.id}
									fallbackName={row.name}
									fallbackGlyphId={row.glyph_id}
									onClose={() => spawnDialog(null)}
								/>,
							);
						}}
						includeIndex={false}
						persistId="home-operations-table"
						columns={[
							{
								key: "icon",
								label: "Icon",
								width: 60,
								render: (_, row) => (
									<div className={s.operationIcon}>
										<Icon name={Operation.Entity.icon(row)} />
									</div>
								),
							},
							{
								key: "name",
								label: "Name",
								width: "auto",
							},
							{
								key: "actions",
								label: "Actions",
								width: 120,
								render: (_, row) => <OperationActions operation={row} />,
							},
						]}
					/>
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
