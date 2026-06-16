import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Icon } from "@impactium/icons";
import { Application } from "@/context/Application.context";
import { DisplayOperationDetailDialog } from "@/dialogs/OperationDetail.dialog";
import { Operation } from "@/entities/Operation";
import { User } from "@/entities/User";
import { Group } from "@/entities/Group";
import { Glyph } from "@/entities/Glyph";
import { Permissions } from "@/banners/Permissions.banner";
import { Table } from "@/components/Table";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Stack } from "@/ui/Stack";
import { formatTimestampToReadableString } from "@/ui/utils";
import s from "./styles/HomeContent.module.css";

type EntityRecord = Record<string, unknown> & { id?: string; name?: string };

interface DetailRow {
	label: string;
	value: string;
}

type DetailValueFormatter = (label: string, value: unknown) => string | undefined;

export namespace HomeContent {
	export type Section = "operations" | "users" | "groups";

	export interface OperationsListProps {
		/** Whether the application is still loading the initial operation list. */
		loading: boolean;
	}
}

/**
 * Resolves a stable string identifier from a table row or entity object.
 *
 * @param entity - Entity-like object returned from the API or Table component.
 * @returns The entity ID as a string, or an empty string when not available.
 */
function getEntityId(entity: EntityRecord): string {
	return typeof entity.id === "string" ? entity.id : "";
}

/**
 * Converts a timestamp-like value to the readable format used by the rest of the UI.
 *
 * @param value - Timestamp value from an API entity.
 * @returns A readable timestamp string, or a fallback dash when unavailable.
 */
function formatTimestampValue(value: unknown): string {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return "-";
	}

	const isSeconds = String(value).length <= 10;
	const milliseconds = isSeconds ? value * 1000 : value;
	return formatTimestampToReadableString(milliseconds);
}

/**
 * Converts any API field value into a compact string suitable for detail rows.
 *
 * @param value - Raw field value from an API entity.
 * @returns A display-safe string representation.
 */
function formatDetailValue(value: unknown): string {
	if (value === null || value === undefined || value === "") {
		return "-";
	}

	if (typeof value === "bigint") {
		return value.toString();
	}

	if (Array.isArray(value) || typeof value === "object") {
		return JSON.stringify(value, (_, entry) =>
			typeof entry === "bigint" ? entry.toString() : entry,
		);
	}

	return String(value);
}

/**
 * Extracts the user identifier from a primitive or user-like group member value.
 *
 * @param value - Group user entry returned by the API.
 * @returns The resolved user identifier, or null when no identifier is available.
 */
function extractUserId(value: unknown): string | null {
	if (typeof value === "string") {
		return value;
	}

	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	if (typeof record.user_id === "string") {
		return record.user_id;
	}

	if (typeof record.id === "string") {
		return record.id;
	}

	return null;
}

/**
 * Formats a group user field as a compact list of user identifiers.
 *
 * @param value - Raw group user field value from the API.
 * @returns A comma-separated list of user identifiers.
 */
function formatGroupUsers(value: unknown): string {
	if (Array.isArray(value)) {
		const userIds = value
			.map((entry) => extractUserId(entry))
			.filter((entry): entry is string => !!entry);
		return userIds.length > 0 ? userIds.join(", ") : "-";
	}

	return extractUserId(value) ?? "-";
}

/**
 * Builds detail rows from a generic entity object.
 *
 * @param entity - Entity object to render in the detail drawer.
 * @param hiddenFields - Case-insensitive field names excluded from the detail list.
 * @param formatValue - Optional field-specific formatter.
 * @returns Ordered label/value pairs for the detail drawer.
 */
function buildDetailRows(
	entity: EntityRecord,
	hiddenFields: string[] = [],
	formatValue?: DetailValueFormatter,
): DetailRow[] {
	const hidden = new Set(hiddenFields.map((field) => field.toLowerCase()));

	return Object.entries(entity)
		.filter(([label]) => !hidden.has(label.toLowerCase()))
		.map(([label, value]) => {
			const customValue = formatValue?.(label, value);
			return {
				label,
				value:
					customValue ??
					(label.toLowerCase().includes("time")
						? formatTimestampValue(value)
						: formatDetailValue(value)),
			};
		});
}

/**
 * Renders the shared loading or empty state used by all Home list sections.
 *
 * @param text - Message shown in the center of the result panel.
 * @returns A result container with centered state text.
 */
function ResultState({ text }: { text: string }) {
	return (
		<div className={s.result}>
			<div className={s.resultScroll}>
				<div className={s.emptyState}>{text}</div>
			</div>
		</div>
	);
}

namespace EntityDetailsDialog {
	export interface Props {
		/** Drawer title shown after details load. */
		title: string;
		/** Icon rendered in the detail drawer header. */
		icon: Icon.Name;
		/** Initial row data available before the detail endpoint returns. */
		fallback: EntityRecord;
		/** Loads fresh detail data by ID. */
		loadDetails: () => Promise<EntityRecord>;
		/** Case-insensitive field names excluded from the detail list. */
		hiddenFields?: string[];
		/** Optional field-specific value formatter. */
		formatValue?: DetailValueFormatter;
		/** Optional edit handler rendered as a header action. */
		onEdit?: (details: EntityRecord) => void;
		/** Callback invoked when the drawer should close. */
		onClose: () => void;
	}
}

/**
 * Fetches and displays user or group details in the Home page docked drawer.
 *
 * @param props - Detail drawer configuration and loader callback.
 * @returns A docked dialog containing formatted entity details.
 */
function EntityDetailsDialog({
	title,
	icon,
	fallback,
	loadDetails,
	hiddenFields,
	formatValue,
	onEdit,
	onClose,
}: EntityDetailsDialog.Props) {
	const [loading, setLoading] = useState<boolean>(true);
	const [details, setDetails] = useState<EntityRecord>(fallback);

	/**
	 * Loads the latest entity detail payload and keeps the fallback visible on failure.
	 *
	 * @returns A promise that settles after the detail request completes.
	 */
	const loadEntityDetails = useCallback(async () => {
		setLoading(true);
		try {
			const response = await loadDetails();
			if (response) {
				setDetails(response);
			}
		} finally {
			setLoading(false);
		}
	}, [loadDetails]);

	useEffect(() => {
		loadEntityDetails();
	}, [loadEntityDetails]);

	const rows = buildDetailRows(details, hiddenFields, formatValue);
	const displayTitle = details.name || title;

	return (
		<Dialog
			callback={onClose}
			loading={loading}
		>
			<div className={s.detailHeader}>
				<div className={s.detailTitleContainer}>
					<div className={s.detailIcon}>
						<Icon
							name={icon}
							size={18}
						/>
					</div>
					<h2 className={s.detailTitle}>{displayTitle}</h2>
				</div>
				<div className={s.buttonGroup}>
					{onEdit ? (
						<Button
							variant="secondary"
							icon="PencilEdit"
							title="Edit"
							onClick={() => onEdit(details)}
						/>
					) : null}
					<Button
						variant="secondary"
						icon="X"
						title="Close dialog"
						onClick={onClose}
					/>
				</div>
			</div>
			<Stack
				dir="column"
				className={s.detailList}
			>
				<div className={s.detailSection}>
					<div className={s.detailsList}>
						{rows.map((row) => (
							<div
								key={row.label}
								className={s.detailItem}
							>
								<span className={s.detailLabel}>{row.label}:</span>
								<span className={s.detailValue}>{row.value}</span>
							</div>
						))}
					</div>
				</div>
			</Stack>
		</Dialog>
	);
}

/**
 * Renders the header create action for the active Home section.
 *
 * @param props - Active section controlling which create action is displayed.
 * @returns A section-specific create button, or null when the section has none.
 */
export function HeaderAction({ section }: { section: HomeContent.Section }) {
	const { spawnBanner } = Application.use();

	if (section === "users") {
		return (
			<Button
				variant="glass"
				icon="UserPlus"
				onClick={() => spawnBanner(<Permissions.Users.Create.Banner />)}
			>
				Create user
			</Button>
		);
	}

	if (section === "operations") {
		return (
			<Button
				variant="glass"
				icon="Plus"
				onClick={() => spawnBanner(<Operation.CreateOrUpdate.Banner />)}
			>
				Create new
			</Button>
		);
	}

	return null;
}

/**
 * Renders the operation list previously owned by Home.page.tsx.
 *
 * @param props - Loading state supplied by the Home page initializer.
 * @returns The operation table, loading state, or empty state.
 */
export function OperationsList({ loading }: HomeContent.OperationsListProps) {
	const { Info, app, spawnBanner, spawnDialog } = Application.use();
	const navigate = useNavigate();
	const [selectedIds, setSelectedIds] = useState<Set<Operation.Id>>(new Set());

	/**
	 * Selects an operation in global state and navigates to the operation view.
	 *
	 * @param operation - The operation to open.
	 */
	const handleOpenOperation = useCallback(
		(operation: Operation.Type) => {
			Info.operations_select(operation.id);
			navigate(`/operations/${operation.id}`);
		},
		[Info, navigate],
	);

	/**
	 * Opens the operation detail drawer without changing the route.
	 *
	 * @param operation - The operation to display.
	 */
	const handleDisplayOperationDetails = useCallback(
		(operation: Operation.Type) => {
			spawnDialog(
				<DisplayOperationDetailDialog
					operationId={operation.id}
					fallbackName={operation.name}
					fallbackGlyphId={operation.glyph_id}
					onClose={() => spawnDialog(null)}
				/>,
			);
		},
		[spawnDialog],
	);

	/**
	 * Toggles the selection state of a specific operation by its ID.
	 *
	 * @param id - The ID of the operation to toggle.
	 */
	const toggleSelection = useCallback((id: Operation.Id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	/**
	 * Selects or deselects all operations in the table.
	 *
	 * @param checked - True to select all operations, false to deselect all.
	 */
	const handleSelectAll = useCallback(
		(checked: boolean) => {
			if (checked) {
				setSelectedIds(new Set(app.target.operations.map((op) => op.id)));
			} else {
				setSelectedIds(new Set());
			}
		},
		[app.target.operations],
	);

	/**
	 * Triggers the bulk deletion banner for selected operations.
	 */
	const handleBulkDelete = useCallback(() => {
		if (selectedIds.size === 0) return;

		spawnBanner(
			<Operation.BulkDelete.Banner
				operationIds={[...selectedIds]}
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
	}, [selectedIds, spawnBanner]);

	const selectedIndices = useMemo(() => {
		const indices = new Set<number>();
		app.target.operations.forEach((operation, index) => {
			if (selectedIds.has(operation.id)) {
				indices.add(index);
			}
		});
		return indices;
	}, [app.target.operations, selectedIds]);

	const actions = useMemo<Table.Action<Operation.Type>[]>(
		() => [
			{
				icon: "Trash2",
				label: "Delete",
				variant: "secondary",
				onClick: async (operation) => {
					await Info.deleteOperation(operation, () => undefined);
					setSelectedIds((prev) => {
						const next = new Set(prev);
						next.delete(operation.id);
						return next;
					});
				},
			},
			{
				icon: "ArrowRight",
				label: "Go to",
				variant: "secondary",
				onClick: handleOpenOperation,
			},
		],
		[Info, handleOpenOperation],
	);

	if (loading) {
		return <ResultState text="Loading..." />;
	}

	if (app.target.operations.length === 0) {
		return <ResultState text="No operations found." />;
	}

	return (
		<>
			<Table<Operation.Type>
				className={s.result}
				values={app.target.operations}
				selectable={true}
				selectedrows={selectedIndices}
				onrowselect={(index) => {
					const operation = app.target.operations[index];
					if (operation) {
						toggleSelection(operation.id);
					}
				}}
				onSelectAll={handleSelectAll}
				onRowClick={handleDisplayOperationDetails}
				includeIndex={false}
				persistId="home-operations-table"
				actions={actions}
				columns={[
					{
						key: "icon",
						label: "Icon",
						width: 60,
						render: (_, row) => (
							<div className={s.entityIcon}>
								<Icon name={Operation.Entity.icon(row)} />
							</div>
						),
					},
					{
						key: "name",
						label: "Name",
						width: "auto",
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
}

/**
 * Renders the user management list inside the Home main content panel.
 *
 * @returns The users table, loading state, or empty state.
 */
export function UsersList() {
	const { Info, app, spawnBanner, spawnDialog } = Application.use();
	const [loading, setLoading] = useState<boolean>(true);
	const [users, setUsers] = useState<User.Type[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	/**
	 * Reloads the user list from the API.
	 *
	 * @returns A promise that settles after users are refreshed.
	 */
	const reloadUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await Info.user_list();
			setUsers(response || []);
		} finally {
			setLoading(false);
		}
	}, [Info]);

	useEffect(() => {
		reloadUsers();
	}, [reloadUsers]);

	useEffect(() => {
		/**
		 * Refreshes the user table after create/edit banners complete.
		 */
		const handleUserListChanged = () => {
			reloadUsers();
		};

		window.addEventListener(
			Permissions.UserListChangedEvent,
			handleUserListChanged,
		);
		return () => {
			window.removeEventListener(
				Permissions.UserListChangedEvent,
				handleUserListChanged,
			);
		};
	}, [reloadUsers]);

	/**
	 * Deletes a user and refreshes the list when the request succeeds.
	 *
	 * @param userId - Identifier of the user to delete.
	 * @returns A promise resolving to true when deletion succeeds.
	 */
	const deleteUser = useCallback(
		async (userId: string): Promise<boolean> => {
			if (userId === app.general.user?.id) {
				toast.error("You cannot delete the current user", {
					icon: <Icon name="Stop" />,
					richColors: true,
				});
				return false;
			}

			const deleted = await Info.user_delete(userId);
			if (deleted) {
				toast.success(`User ${userId} has been deleted successfully`, {
					icon: <Icon name="Check" />,
					richColors: true,
				});
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(userId);
					return next;
				});
				await reloadUsers();
			} else {
				toast.error(`Failed deleting user ${userId}`, {
					icon: <Icon name="Stop" />,
					richColors: true,
				});
			}
			return deleted;
		},
		[Info, app.general.user?.id, reloadUsers],
	);

	/**
	 * Deletes all selected users sequentially.
	 *
	 * @returns A promise that settles after all selected delete requests finish.
	 */
	const handleBulkDelete = useCallback(async () => {
		for (const userId of selectedIds) {
			await deleteUser(userId);
		}
	}, [deleteUser, selectedIds]);

	/**
	 * Opens the user detail drawer and loads the full user payload by ID.
	 *
	 * @param user - User row selected from the table.
	 */
	const openUserDetails = useCallback(
		(user: User.Type) => {
			spawnDialog(
				<EntityDetailsDialog
					title={user.name || user.id}
					icon="User"
					fallback={user as unknown as EntityRecord}
					loadDetails={() =>
						Info.user_get_by_id(user.id).then(
							(response) => response as unknown as EntityRecord,
						)
					}
					hiddenFields={["user_data", "pwd_hash", "psw_hash", "password"]}
					onEdit={(details) =>
						spawnBanner(
							<Permissions.Users.Edit.Banner
								user={details as unknown as User.Type}
							/>,
						)
					}
					onClose={() => spawnDialog(null)}
				/>,
			);
		},
		[Info, spawnDialog],
	);

	const selectedIndices = useMemo(() => {
		const indices = new Set<number>();
		users.forEach((user, index) => {
			if (selectedIds.has(user.id)) {
				indices.add(index);
			}
		});
		return indices;
	}, [selectedIds, users]);

	const actions = useMemo<Table.Action<User.Type>[]>(
		() => [
			{
				icon: "Trash2",
				label: "Delete",
				variant: "secondary",
				onClick: (user) => {
					deleteUser(user.id);
				},
			},
			{
				icon: "PenLine",
				label: "Edit",
				variant: "secondary",
				onClick: (user) => {
					spawnBanner(<Permissions.Users.Edit.Banner user={user} />);
				},
			},
		],
		[deleteUser, spawnBanner],
	);

	if (loading) {
		return <ResultState text="Loading users..." />;
	}

	if (users.length === 0) {
		return <ResultState text="No users found." />;
	}

	return (
		<>
			<Table<User.Type>
				className={s.result}
				values={users}
				selectable={true}
				selectedrows={selectedIndices}
				onrowselect={(index) => {
					const user = users[index];
					if (!user) return;
					setSelectedIds((prev) => {
						const next = new Set(prev);
						if (next.has(user.id)) {
							next.delete(user.id);
						} else {
							next.add(user.id);
						}
						return next;
					});
				}}
				onSelectAll={(checked) => {
					setSelectedIds(
						checked ? new Set(users.map((user) => user.id)) : new Set(),
					);
				}}
				onRowClick={openUserDetails}
				includeIndex={false}
				persistId="home-users-table"
				actions={actions}
				columns={[
					{
						key: "icon",
						label: "Icon",
						width: 60,
						render: (_, row) => {
							const glyphId = row.glyph_id || Glyph.getIdByName("User");
							const glyph = Glyph.List.get(glyphId);
							return (
								<div className={s.entityIcon}>
									<Icon name={glyph || "User"} />
								</div>
							);
						},
					},
					{ key: "id", label: "ID", width: "auto" },
					{ key: "name", label: "Name", width: "auto" },
					{
						key: "permission",
						label: "Roles",
						width: 180,
						render: (value) =>
							Array.isArray(value)
								? value.join(", ")
								: formatDetailValue(value),
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
						Delete selected users ({selectedIds.size})
					</Button>
				</Stack>
			</div>
		</>
	);
}

/**
 * Renders the group management list inside the Home main content panel.
 *
 * @returns The groups table, loading state, or empty state.
 */
export function GroupsList() {
	const { Info, spawnDialog } = Application.use();
	const [loading, setLoading] = useState<boolean>(true);
	const [groups, setGroups] = useState<Group.Type[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	/**
	 * Reloads the group list from the API.
	 *
	 * @returns A promise that settles after groups are refreshed.
	 */
	const reloadGroups = useCallback(async () => {
		setLoading(true);
		try {
			const response = await Info.user_group_list();
			setGroups(response || []);
		} finally {
			setLoading(false);
		}
	}, [Info]);

	useEffect(() => {
		reloadGroups();
	}, [reloadGroups]);

	/**
	 * Deletes a group and refreshes the list when the request succeeds.
	 *
	 * @param groupId - Identifier of the group to delete.
	 * @returns A promise resolving to true when deletion succeeds.
	 */
	const deleteGroup = useCallback(
		async (groupId: string): Promise<boolean> => {
			const deleted = await Info.user_group_delete(groupId);
			if (deleted) {
				toast.success(`Group ${groupId} has been deleted successfully`, {
					icon: <Icon name="Check" />,
					richColors: true,
				});
				setSelectedIds((prev) => {
					const next = new Set(prev);
					next.delete(groupId);
					return next;
				});
				await reloadGroups();
			} else {
				toast.error(`Failed deleting group ${groupId}`, {
					icon: <Icon name="Stop" />,
					richColors: true,
				});
			}
			return deleted;
		},
		[Info, reloadGroups],
	);

	/**
	 * Deletes all selected groups sequentially.
	 *
	 * @returns A promise that settles after all selected delete requests finish.
	 */
	const handleBulkDelete = useCallback(async () => {
		for (const groupId of selectedIds) {
			await deleteGroup(groupId);
		}
	}, [deleteGroup, selectedIds]);

	/**
	 * Opens the group detail drawer and loads the full group payload by ID.
	 *
	 * @param group - Group row selected from the table.
	 */
	const openGroupDetails = useCallback(
		(group: Group.Type) => {
			const entity = group as EntityRecord;
			const groupId = getEntityId(entity);
			if (!groupId) return;

			spawnDialog(
				<EntityDetailsDialog
					title={entity.name || groupId}
					icon="Users"
					fallback={entity}
					loadDetails={() =>
						Info.user_group_get_by_id(groupId).then(
							(response) => response as EntityRecord,
						)
					}
					formatValue={(label, value) => {
						const normalizedLabel = label.toLowerCase();
						if (normalizedLabel === "user" || normalizedLabel === "users") {
							return formatGroupUsers(value);
						}

						return undefined;
					}}
					onClose={() => spawnDialog(null)}
				/>,
			);
		},
		[Info, spawnDialog],
	);

	const selectedIndices = useMemo(() => {
		const indices = new Set<number>();
		groups.forEach((group, index) => {
			const groupId = getEntityId(group as EntityRecord);
			if (selectedIds.has(groupId)) {
				indices.add(index);
			}
		});
		return indices;
	}, [groups, selectedIds]);

	const actions = useMemo<Table.Action<Group.Type>[]>(
		() => [
			{
				icon: "Trash2",
				label: "Delete",
				variant: "secondary",
				onClick: (group) => {
					const groupId = getEntityId(group as EntityRecord);
					if (groupId) {
						deleteGroup(groupId);
					}
				},
			},
		],
		[deleteGroup],
	);

	if (loading) {
		return <ResultState text="Loading groups..." />;
	}

	if (groups.length === 0) {
		return <ResultState text="No groups found." />;
	}

	return (
		<>
			<Table<Group.Type>
				className={s.result}
				values={groups}
				selectable={true}
				selectedrows={selectedIndices}
				onrowselect={(index) => {
					const group = groups[index];
					if (!group) return;

					const groupId = getEntityId(group as EntityRecord);
					if (!groupId) return;

					setSelectedIds((prev) => {
						const next = new Set(prev);
						if (next.has(groupId)) {
							next.delete(groupId);
						} else {
							next.add(groupId);
						}
						return next;
					});
				}}
				onSelectAll={(checked) => {
					const ids = groups
						.map((group) => getEntityId(group as EntityRecord))
						.filter((groupId) => groupId.length > 0);
					setSelectedIds(checked ? new Set(ids) : new Set());
				}}
				onRowClick={openGroupDetails}
				includeIndex={false}
				persistId="home-groups-table"
				actions={actions}
				columns={[
					{
						key: "icon",
						label: "Icon",
						width: 60,
						render: () => (
							<div className={s.entityIcon}>
								<Icon name="Users" />
							</div>
						),
					},
					{ key: "id", label: "ID", width: "auto" },
					{ key: "name", label: "Name", width: "auto" },
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
						Delete selected groups ({selectedIds.size})
					</Button>
				</Stack>
			</div>
		</>
	);
}
