import { useEffect, useState } from "react";
import { Application } from "@/context/Application.context";
import { Operation } from "@/entities/Operation";
import { Dialog } from "@/ui/Dialog";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Stack } from "@/ui/Stack";
import { formatTimestampToReadableString } from "@/ui/utils";
import { GulpDataset } from "@/class/Info";
import s from "./styles/DisplayOperationDetailDialog.module.css";
import sFiles from "@/banners/styles/SelectFilesBanner.module.css";
import {
	ContextHeading,
	FlatFileComponent,
} from "@/banners/SelectFiles.banner";
import { OperationPermissions } from "@/banners/Permissions.banner";
import { cn } from "@impactium/utils";
import { Context } from "@/entities/Context";
import { Source } from "@/entities/Source";
import { Locale } from "@/locales";

export interface DisplayOperationDetailDialogProps {
	/** Unique identifier of the operation to fetch details for. */
	operationId: Operation.Id;
	/** Fallback name to show in the header while details are loading. */
	fallbackName?: string;
	/** Fallback glyph ID to show in the header while details are loading. */
	fallbackGlyphId?: string;
	/** Callback function triggered when the dialog should close. */
	onClose: () => void;
}

/**
 * Dialog component displaying comprehensive details of a specific operation,
 * including its configuration, owner, document counts, tags, and user/group permissions.
 * Wraps content in Gulp's native <Dialog> to support standard docking and resize behavior.
 */
export function DisplayOperationDetailDialog({
	operationId,
	fallbackName,
	fallbackGlyphId,
	onClose,
}: DisplayOperationDetailDialogProps) {
	const { app, Info, spawnBanner, destroyBanner } = Application.use();
	const { t } = Locale.use();
	const [loading, setLoading] = useState<boolean>(true);
	const [details, setDetails] =
		useState<GulpDataset.OperationGetById.Response | null>(null);

	const globalOp = Info.app.target.operations.find(
		(op) => op.id === operationId,
	);

	// Fetch detailed operation data on mount or when operationId changes
	useEffect(() => {
		let active = true;

		const loadDetails = async () => {
			setLoading(true);
			try {
				const response = await Info.operation_get_by_id(operationId);
				if (active) {
					setDetails(response);
				}
			} catch (error) {
				console.error("Failed to load operation details:", error);
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		loadDetails();

		return () => {
			active = false;
		};
	}, [operationId, Info]);

	/**
	 * Formats a Unix timestamp to a human-readable date and time.
	 * Supports both seconds and milliseconds Unix formats.
	 *
	 * @param timestamp - The Unix timestamp to convert.
	 * @returns The formatted timestamp string.
	 */
	const formatUnixTimestamp = (timestamp: number): string => {
		const isSeconds = String(timestamp).length <= 10;
		const milliseconds = isSeconds ? timestamp * 1000 : timestamp;
		return formatTimestampToReadableString(milliseconds);
	};

	const handleEdit = () => {
		const operation = {
			id: operationId,
			name: details?.name ?? globalOp?.name ?? fallbackName ?? "",
			glyph_id: globalOp?.glyph_id ?? (fallbackGlyphId as any) ?? "",
			description:
				globalOp && globalOp.description !== undefined
					? globalOp.description
					: (details?.description ?? ""),
		} as any;

		spawnBanner(
			<Operation.CreateOrUpdate.Banner
				operation={operation}
				onSuccess={async () => {
					try {
						const response = await Info.operation_get_by_id(operationId);
						setDetails(response);
					} catch (error) {
						console.error("Failed to reload operation details:", error);
					}
				}}
			/>,
		);
	};

	// Determine values to show in header depending on load state
	const displayName = details?.name ?? fallbackName ?? t("operationDetails.title");
	const iconName = Operation.Entity.icon(
		globalOp || ({ glyph_id: fallbackGlyphId } as any),
	);

	return (
		<Dialog
			callback={onClose}
			loading={loading}
		>
			{/* Dialog Header */}
			<div className={s.header}>
				<div className={s.titleContainer}>
					<div className={s.iconWrapper}>
						<Icon
							name={iconName}
							size={18}
						/>
					</div>
					<h2 className={s.title}>{displayName}</h2>
				</div>
				<div className={s.buttonGroup}>
					<Button
						variant="secondary"
						icon="PencilEdit"
						title={t("operationDetails.edit")}
						onClick={handleEdit}
					/>
					<Button
						variant="secondary"
						icon="X"
						title={t("common.closeDialog")}
						onClick={onClose}
					/>
				</div>
			</div>

			{/* Dialog Body */}
			{details ? (
				<Stack
					dir="column"
					gap={20}
					className={s.scrollable}
				>
					{/* Details Section */}
					<div className={s.section}>
						<div className={s.detailsList}>
							<div className={s.detailItem}>
								<span className={s.detailLabel}>{t("common.id")}:</span>
								<span className={s.detailValue}>{details.id}</span>
							</div>
							<div className={s.detailItem}>
								<span className={s.detailLabel}>{t("common.name")}:</span>
								<span className={s.detailValue}>{details.name}</span>
							</div>
							<div className={s.detailItem}>
								<span className={s.detailLabel}>{t("common.created")}:</span>
								<span className={s.detailValue}>
									{formatUnixTimestamp(details.time_created)}
								</span>
							</div>
							<div className={s.detailItem}>
								<span className={s.detailLabel}>{t("common.owner")}:</span>
								<span className={s.detailValue}>{details.user_id}</span>
							</div>
							<div className={s.detailItem}>
								<span className={s.detailLabel}>{t("common.docCount")}:</span>
								<span className={s.detailValue}>
									{details.doc_count.toLocaleString()}
								</span>
							</div>
							<div className={s.detailItem}>
								<span className={s.detailLabel}>{t("common.description")}:</span>
								<span className={s.detailValue}>
									{(globalOp && globalOp.description !== undefined
										? globalOp.description
										: details.description) || "-"}
								</span>
							</div>
							<div
								className={s.detailItem}
								style={{ flexDirection: "column", alignItems: "stretch" }}
							>
								<span
									className={s.detailLabel}
									style={{ marginBottom: 6 }}
								>
									{t("common.tags")}
								</span>
								{details.tags && details.tags.length > 0 ? (
									<div className={s.badgeList}>
										{details.tags.map((tag) => (
											<Badge
												key={tag}
												variant="blue-subtle"
												size="sm"
											>
												{tag}
											</Badge>
										))}
									</div>
								) : (
									<span className={s.noData}>{t("operationDetails.noTags")}</span>
								)}
							</div>
						</div>
					</div>

					{/* Permissions Section */}
					<div className={s.section}>
						<Stack
							ai="center"
							jc="space-between"
							className={s.sectionTitle}
						>
							<span>{t("common.permissions")}</span>
							<Button
								icon="PenLine"
								variant="secondary"
								style={{ padding: 0 }}
								onClick={() =>
									spawnBanner(
										<OperationPermissions.Banner
											operationId={operationId}
											granted_user_ids={details.granted_user_ids || []}
											granted_user_group_ids={
												details.granted_user_group_ids || []
											}
											onSuccess={() => {
												setLoading(true);
												Info.operation_get_by_id(operationId)
													.then(setDetails)
													.finally(() => setLoading(false));
											}}
										/>,
									)
								}
							/>
						</Stack>
						<div className={s.detailsList}>
							<div
								className={s.detailItem}
								style={{ flexDirection: "column", alignItems: "stretch" }}
							>
								<span
									className={s.detailLabel}
									style={{ marginBottom: 6 }}
								>
									{t("common.users")}:
								</span>
								{details.granted_user_ids &&
								details.granted_user_ids.length > 0 ? (
									<div className={s.badgeList}>
										{details.granted_user_ids.map((userId) => (
											<Badge
												key={userId}
												variant="gray-subtle"
												size="sm"
											>
												{userId}
											</Badge>
										))}
									</div>
								) : (
									<span className={s.noData}>{t("operationDetails.noUsers")}</span>
								)}
							</div>

							<div
								className={s.detailItem}
								style={{
									flexDirection: "column",
									alignItems: "stretch",
									marginTop: 8,
								}}
							>
								<span
									className={s.detailLabel}
									style={{ marginBottom: 6 }}
								>
									{t("common.groups")}:
								</span>
								{details.granted_user_group_ids &&
								details.granted_user_group_ids.length > 0 ? (
									<div className={s.badgeList}>
										{details.granted_user_group_ids.map((groupId) => (
											<Badge
												key={groupId}
												variant="purple-subtle"
												size="sm"
											>
												{groupId}
											</Badge>
										))}
									</div>
								) : (
									<span className={s.noData}>{t("operationDetails.noGroups")}</span>
								)}
							</div>
						</div>
					</div>

					{/* Contexts and Sources Section */}
					{(() => {
						const contexts = Operation.Entity.contexts(app, operationId);
						if (!contexts || contexts.length === 0) return null;
						return (
							<div className={s.section}>
								<div className={s.sectionTitle}>{t("operationDetails.contextsAndSources")}</div>
								<div
									className={s.detailsList}
									style={{ flexDirection: "column", gap: 0 }}
								>
									{contexts.map((context: Context.Type) => {
										const sources = Context.Entity.sources(app, context);
										return (
											<div key={context.id}>
												<ContextHeading
													context={context}
													selectedContexts={new Set()}
													setContext={() => {}}
													noFiles={sources.length === 0}
													showCheckbox={false}
												/>
												{sources.map((source: Source.Type, index: number) => {
													const isLast = index === sources.length - 1;
													return (
														<div
															key={source.id}
															className={cn(
																sFiles.fileWrapper,
																isLast && sFiles.last,
															)}
														>
															<FlatFileComponent
																file={source}
																selectedFiles={new Set()}
																setFile={() => {}}
																isLast={isLast}
																showFilter={false}
																showCheckbox={false}
																onPreviewBack={() => destroyBanner()}
															/>
														</div>
													);
												})}
											</div>
										);
									})}
								</div>
							</div>
						);
					})()}
				</Stack>
			) : (
				!loading && (
					<div
						className={s.noData}
						style={{ textAlign: "center", padding: "40px 0" }}
					>
						{t("operationDetails.loadFailed")}
					</div>
				)
			)}
		</Dialog>
	);
}
