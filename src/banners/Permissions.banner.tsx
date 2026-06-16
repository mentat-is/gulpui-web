import { Application } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Table } from "@/components/Table";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { capitalize } from "lodash";
import { Icon } from "@impactium/icons";
import { toast } from "sonner";
import { SetState } from "@/class/API";
import { Skeleton } from "@/ui/Skeleton";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Stack } from "@/ui/Stack";
import { Select } from "@/ui/Select";
import { User } from "@/entities/User";
import { Group } from "@/entities/Group";
import { Glyph } from "@/entities/Glyph";

export namespace Permissions {
	export type Role = "admin" | "read" | "edit" | "ingest" | "delete";
	export const PermissionSelectRoles: Role[] = [
		"read",
		"ingest",
		"edit",
		"delete",
		"admin",
	];
	export const UserListChangedEvent = "gulp:user-list-changed";

	/**
	 * Notifies active user list views that user data has changed.
	 */
	export function notifyUserListChanged() {
		window.dispatchEvent(new Event(UserListChangedEvent));
	}

	/**
	 * Extracts the most useful API error message from supported response shapes.
	 *
	 * @param data - API error payload returned by the request helper.
	 * @returns A readable error message for toast display.
	 */
	export function getApiErrorMessage(data: unknown): string {
		if (!data || typeof data !== "object") {
			return "Unexpected API error";
		}

		const errorData = data as Record<string, unknown>;
		if (typeof errorData.msg === "string") {
			return errorData.msg;
		}

		const nestedError = errorData.__error;
		if (nestedError && typeof nestedError === "object") {
			const nestedErrorData = nestedError as Record<string, unknown>;
			if (typeof nestedErrorData.msg === "string") {
				return nestedErrorData.msg;
			}
		}

		return "Unexpected API error";
	}

	export namespace Users {
		export const UsernameRule = /^[a-zA-Z0-9_.@-]{4,16}$/;
		export const PasswordRule =
			/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-])[A-Za-z0-9!@#$%^&*()_+\-]{8,64}$/;

		export namespace RolesSelect {
			export interface Props {
				/** Currently selected permission roles. */
				value: Permissions.Role[];
				/** Callback invoked when selected roles change. */
				onChange: (roles: Permissions.Role[]) => void;
			}
		}

		/**
		 * Renders a multi-value permission selector using the shared Select UI.
		 *
		 * @param props - Selected role values and change callback.
		 * @returns A multi-select trigger and role option list.
		 */
		export function RolesSelect({ value, onChange }: RolesSelect.Props) {
			/**
			 * Keeps selected role values valid and ordered by the canonical role list.
			 *
			 * @param selectedRoles - Raw selected values emitted by the multi-select.
			 * @returns A filtered and ordered role list.
			 */
			const normalizeSelectedRoles = (
				selectedRoles: string[],
			): Permissions.Role[] =>
				PermissionSelectRoles.filter((role) => selectedRoles.includes(role));

			const triggerLabel =
				value.length > 0
					? value.map((role) => capitalize(role)).join(", ")
					: "Choose permissions";

			return (
				<Select.Multi.Root
					value={value}
					onValueChange={(selectedRoles) =>
						onChange(normalizeSelectedRoles(selectedRoles))
					}
				>
					<Select.Trigger>
						<Icon
							name="Gavel"
							color="currentColor"
						/>
						<span>{triggerLabel}</span>
					</Select.Trigger>
					<Select.Content>
						{PermissionSelectRoles.map((role) => (
							<Select.Item
								key={role}
								value={role}
							>
								{capitalize(role)}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Multi.Root>
			);
		}

		export namespace Create {
			export namespace Banner {
				export interface Props extends UIBanner.Props {
					/** Callback invoked after a user is created successfully. */
					onSuccess?: () => void;
				}
			}
			export const Banner = ({ onSuccess, ...props }: Banner.Props) => {
				const { destroyBanner } = Application.use();
				const [loading, setLoading] = useState<boolean>(false);
				const [icon, setIcon] = useState<Glyph.Id | null>(null);
				const [id, setId] = useState<string>("");
				const [isIdValid, setIsIdValid] = useState<boolean>(true);
				const [password, setPassword] = useState<string>("");
				const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
				const [permissions, setPermissions] = useState<Permissions.Role[]>([
					"read",
				]);

				const inputConstructor =
					(
						set: SetState<string>,
						setValid: SetState<boolean>,
						regexp: RegExp,
					) =>
					(event: ChangeEvent<HTMLInputElement>) => {
						const { value } = event.target;
						setValid(value.length > 3 ? true : regexp.test(value));
						set(value);
					};

				/**
				 * Creates a user with the selected glyph, password, and permissions.
				 */
				const submit = () => {
					api(
						"/user_create",
						{
							method: "POST",
							query: {
								user_id: id,
								password,
								glyph_id:
									icon ||
									(Array.from(Glyph.List.entries()).find(
										(i) => i[1] === "User",
									)?.[0] as string),
							},
							setLoading,
							body: {
								permission: permissions,
							},
							toast: {
								onError: (response) =>
									toast.error("Failed creating user", {
										description: Permissions.getApiErrorMessage(
											response.data,
										),
										icon: <Icon name="Warning" />,
										richColors: true,
									}),
							},
						},
						() => {
							Permissions.notifyUserListChanged();
							onSuccess?.();
							destroyBanner();
						},
					);
				};

				/**
				 * Stores the role list selected from the permissions multi-select.
				 *
				 * @param selectedRoles - Roles selected by the user.
				 */
				const handlePermissionsChange = (
					selectedRoles: Permissions.Role[],
				) => {
					setPermissions(selectedRoles);
				};

				/**
				 * Renders the banner confirmation button for user creation.
				 *
				 * @returns The configured done button.
				 */
				const Done = () => (
					<Button
						icon="Check"
						loading={loading}
						onClick={submit}
						disabled={
							id.length < 3 ||
							!isIdValid ||
							password.length < 5 ||
							!isPasswordValid ||
							permissions.length === 0 ||
							!icon
						}
						variant="glass"
					/>
				);

				return (
					<UIBanner
						title="Create user"
						done={<Done />}
						{...props}
					>
						<Input
							icon="User"
							placeholder="User idendificator"
							variant="highlighted"
							value={id}
							valid={isIdValid}
							onChange={inputConstructor(
								setId,
								setIsIdValid,
								new RegExp(Permissions.Users.UsernameRule),
							)}
						/>
						<Input
							icon="Key"
							placeholder="Password"
							variant="highlighted"
							value={password}
							valid={isPasswordValid}
							onChange={inputConstructor(
								setPassword,
								setIsPasswordValid,
								new RegExp(Permissions.Users.PasswordRule),
							)}
						/>
						<Users.RolesSelect
							value={permissions}
							onChange={handlePermissionsChange}
						/>
						<Glyph.Chooser
							icon={icon}
							setIcon={setIcon}
						/>
					</UIBanner>
				);
			};
		}
		export namespace Edit {
			export namespace Banner {
				export interface Props extends UIBanner.Props {
					/** User loaded into the edit form. */
					user: User.Type;
					/** Callback invoked after a user is updated successfully. */
					onSuccess?: () => void;
				}
			}
			export function Banner({ user, onSuccess, ...props }: Banner.Props) {
				const { destroyBanner } = Application.use();
				const [loading, setLoading] = useState<boolean>(false);
				const [icon, setIcon] = useState<Glyph.Id | null>(user.glyph_id);
				const [id, setId] = useState<string>(user.id);
				const [isIdValid, setIsIdValid] = useState<boolean>(true);
				const [password, setPassword] = useState<string>("");
				const [showPassword, setShowPassword] = useState(false);
				const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true);
				const [permissions, setPermissions] = useState<Permissions.Role[]>(
					user.permission ?? ["read"],
				);

				const inputConstructor =
					(
						set: SetState<string>,
						setValid: SetState<boolean>,
						regexp: RegExp,
					) =>
					(event: ChangeEvent<HTMLInputElement>) => {
						const { value } = event.target;
						setValid(value.length > 3 ? true : regexp.test(value));
						set(value);
					};

				/**
				 * Updates the selected user with current form values and permissions.
				 */
				const submit = () => {
					api(
						"/user_update",
						{
							method: "PATCH",
							query: {
								user_id: id,
								password,
								glyph_id:
									icon ||
									(Array.from(Glyph.List.entries()).find(
										(i) => i[1] === "User",
									)?.[0] as string),
							},
							setLoading,
							body: {
								permission: permissions,
							},
							toast: {
								onError: (response) =>
									toast.error("Failed updating user", {
										description: Permissions.getApiErrorMessage(
											response.data,
										),
										icon: <Icon name="Warning" />,
										richColors: true,
									}),
							},
						},
						() => {
							Permissions.notifyUserListChanged();
							onSuccess?.();
							destroyBanner();
						},
					);
				};

				/**
				 * Stores the role list selected from the permissions multi-select.
				 *
				 * @param selectedRoles - Roles selected by the user.
				 */
				const handlePermissionsChange = (
					selectedRoles: Permissions.Role[],
				) => {
					setPermissions(selectedRoles);
				};

				/**
				 * Renders the banner confirmation button for user updates.
				 *
				 * @returns The configured done button.
				 */
				const Done = () => (
					<Button
						icon="Check"
						loading={loading}
						onClick={submit}
						disabled={
							id.length < 3 ||
							!isIdValid ||
							password.length < 5 ||
							!isPasswordValid ||
							permissions.length === 0 ||
							!icon
						}
						variant="glass"
					/>
				);

				return (
					<UIBanner
						title={`Edit user ${user.name}`}
						done={<Done />}
						{...props}
					>
						<Input
							icon="User"
							placeholder="User idendificator"
							variant="highlighted"
							value={id}
							valid={isIdValid}
							onChange={inputConstructor(
								setId,
								setIsIdValid,
								new RegExp(Permissions.Users.UsernameRule),
							)}
						/>
						<Input
							icon="Key"
							placeholder="Password"
							variant="highlighted"
							type={showPassword ? "text" : "password"}
							value={password}
							endIcon={showPassword ? "EyeOff" : "Eye"}
							endIconTitle={showPassword ? "Hide password" : "Show password"}
							onEndIconClick={() => setShowPassword((current) => !current)}
							valid={isPasswordValid}
							onChange={inputConstructor(
								setPassword,
								setIsPasswordValid,
								new RegExp(Permissions.Users.PasswordRule),
							)}
						/>
						<Users.RolesSelect
							value={permissions}
							onChange={handlePermissionsChange}
						/>
						<Glyph.Chooser
							icon={icon}
							setIcon={setIcon}
						/>
					</UIBanner>
				);
			}
		}
	}
}

export namespace OperationPermissions {
	export namespace Banner {
		export interface Props extends UIBanner.Props {
			operationId: string;
			granted_user_ids: string[];
			granted_user_group_ids: string[];
			onSuccess?: () => void;
		}
	}

	export const Banner = ({
		operationId,
		granted_user_ids,
		granted_user_group_ids,
		onSuccess,
		...props
	}: Banner.Props) => {
		const { Info, destroyBanner } = Application.use();
		const [users, setUsers] = useState<User.Type[]>([]);
		const [groups, setGroups] = useState<Group.Type[]>([]);
		const [loading, setLoading] = useState<boolean>(true);

		// Local sets for selection UI
		const [selectedUsers, setSelectedUsers] = useState<Set<string>>(
			new Set(granted_user_ids),
		);
		const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
			new Set(granted_user_group_ids),
		);

		const reload = useCallback(() => {
			let usersLoaded = false;
			let groupsLoaded = false;

			const checkDone = () => {
				if (usersLoaded && groupsLoaded) {
					setLoading(false);
				}
			};

			api<User.Type[]>("/user_list", {}, (res) => {
				setUsers(res || []);
				usersLoaded = true;
				checkDone();
			});

			api<Group.Type[]>("/user_group_list", { method: "POST" }, (res) => {
				setGroups(res || []);
				groupsLoaded = true;
				checkDone();
			});
		}, []);

		useEffect(() => {
			reload();
		}, [reload]);

		const handleUserSelect = (index: number, selected: boolean) => {
			const user = users[index];
			if (!user) return;

			if (selected) {
				Info.add_granted_user("operation", operationId, user.id).then(() =>
					setSelectedUsers((prev) => new Set(prev).add(user.id)),
				);
			} else {
				Info.remove_granted_user("operation", operationId, user.id).then(() =>
					setSelectedUsers((prev) => {
						const next = new Set(prev);
						next.delete(user.id);
						return next;
					}),
				);
			}
		};

		const handleGroupSelect = (index: number, selected: boolean) => {
			const group = groups[index];
			if (!group) return;

			if (selected) {
				Info.add_granted_group("operation", operationId, group.id).then(() =>
					setSelectedGroups((prev) => new Set(prev).add(group.id)),
				);
			} else {
				Info.remove_granted_group("operation", operationId, group.id).then(() =>
					setSelectedGroups((prev) => {
						const next = new Set(prev);
						next.delete(group.id);
						return next;
					}),
				);
			}
		};

		// Convert sets to indices for Table
		const selectedUserIndices = new Set<number>();
		users.forEach((u, i) => {
			if (selectedUsers.has(u.id)) selectedUserIndices.add(i);
		});

		const selectedGroupIndices = new Set<number>();
		groups.forEach((g, i) => {
			if (selectedGroups.has(g.id)) selectedGroupIndices.add(i);
		});

		return (
			<UIBanner
				title="Operation Permissions"
				loading={loading}
				onClose={onSuccess}
				{...props}
			>
				<Stack
					dir="column"
					ai="stretch"
					style={{
						height: "100%",
						overflow: "auto",
						gap: 24,
						paddingBottom: 24,
					}}
				>
					{/* Users Section */}
					<Stack
						dir="column"
						ai="stretch"
						gap={8}
					>
						<div
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: "var(--second)",
								letterSpacing: "0.08em",
								fontFamily: "var(--font-mono)",
							}}
						>
							Users
						</div>
						{users.length > 0 ? (
							<Table
								values={users}
								selectable={true}
								selectedrows={selectedUserIndices}
								onrowselect={handleUserSelect}
								columns={["id", "name", "permission"]}
								notshow={["glyph_id", "password"]}
								includeIndex={false}
							/>
						) : (
							<Skeleton
								width="full"
								style={{ height: 100 }}
							/>
						)}
					</Stack>

					{/* Groups Section */}
					<Stack
						dir="column"
						ai="stretch"
						gap={8}
					>
						<div
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: "var(--second)",
								letterSpacing: "0.08em",
								fontFamily: "var(--font-mono)",
							}}
						>
							Groups
						</div>
						{groups.length > 0 ? (
							<Table
								values={groups}
								selectable={true}
								selectedrows={selectedGroupIndices}
								onrowselect={handleGroupSelect}
								columns={["id", "name"]}
								notshow={["glyph_id"]}
								includeIndex={false}
							/>
						) : (
							<Skeleton
								width="full"
								style={{ height: 100 }}
							/>
						)}
					</Stack>
				</Stack>
			</UIBanner>
		);
	};
}
