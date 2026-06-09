import { Application } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Checkbox } from "@/ui/Checkbox";
import s from "./styles/SelectFilesBanner.module.css";
import { Label } from "@/ui/Label";
import { useEffect, useMemo, useReducer, useState, useRef } from "react";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { Frame } from "./Frame.banner";
import { UploadBanner } from "./Upload.banner";
import { Separator } from "@/ui/Separator";
import { Preview } from "./Preview.banner";
import { FilterFileBanner } from "./FilterFile.banner";
import { cn } from "@impactium/utils";
import { Refractor } from "@/ui/utils";
import { SetState } from "@/class/API";
import { toast } from "sonner";
import { Stack } from "@/ui/Stack";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Spinner } from "@/ui/Spinner";
import { Skeleton } from "@/ui/Skeleton";
import { Progress } from "@/ui/Progress";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/ui/Tooltip";
import { Context } from "@/entities/Context";
import { Source } from "@/entities/Source";
import { Operation } from "@/entities/Operation";
import { Request } from "@/entities/Request";
import { Select } from "@/ui/Select";
import { Session } from "./Session.banner";
import { DisplayEventDialog } from "@/dialogs/Event.dialog";
import { useParams } from "react-router-dom";
import { Internal } from "@/entities/addon/Internal";

export namespace SelectFiles {
	export namespace Banner {
		export type Props = UIBanner.Props & {
			showSession?: boolean;
		};
	}

	export function Banner({ showSession = true, ...props }: Banner.Props) {
		const { app, Info, spawnBanner, spawnDialog } = Application.use();
		const { operation_id: routeOpId } = useParams<{ operation_id: string }>();
		const operation = Operation.Entity.selected(app);
		const operation_id = routeOpId || operation?.id;

		const [sessions, setSessions] = useState<Internal.Session.Data[]>([]);
		const [openSelectSession, setOpenSelectSession] = useState(false);

		const activeSessions = useMemo(() => {
			if (!operation_id) return [];
			return sessions.filter(
				(session) =>
					session.selected.operations &&
					session.selected.operations === operation_id,
			);
		}, [sessions, operation_id]);

		/**
		 * Reloads the sessions list from the backend for the current user.
		 */
		const reloadSessionsList = () => {
			Info.session_list(app.general.user).then((res) => {
				if (res) {
					setSessions(res);
				}
			});
		};

		useEffect(() => {
			let isMounted = true;
			Info.session_list(app.general.user).then((res) => {
				if (isMounted && res) {
					setSessions(res);
				}
			});
			return () => {
				isMounted = false;
			};
		}, [app.general.user]);

		/**
		 * Loads a specific saved session, clears local selections, and launches the operation.
		 * @param name - The name of the session to load.
		 */
		const load_session = async (name: string) => {
			const session = sessions.find((s) => s.name === name);
			if (!session) return;

			await Info.session_load(session);
			setSelectedContexts(new Set());
			setSelectedFiles(new Set());
			spawnBanner(null);

			if (session.timeline.target) {
				spawnDialog(<DisplayEventDialog event={session.timeline.target} />);
			}
		};

		const [filter, setFilter] = useState("");
		const [_, debug] = useReducer((i) => ++i, 0);
		const [loading, setLoading] = useState(false);
		const [selectedContexts, setSelectedContexts] = useState<Set<Context.Id>>(
			new Set(Context.Entity.selected(app).map((c) => c.id)),
		);
		const [selectedFiles, setSelectedFiles] = useState<Set<Source.Id>>(
			new Set(Source.Entity.selected(app).map((c) => c.id)),
		);

		useEffect(() => {
			const timer = setInterval(debug, 1000);

			return () => clearInterval(timer);
		}, []);

		useEffect(() => {
			const operation = Operation.Entity.selected(app);
			if (!operation) return;
			Info.resync_ingestion_state(operation.id);
		}, []);

		const update = <T,>(values: Set<T>, vault: SetState<Set<T>>) =>
			vault(new Set(values));

		function all(select: boolean) {
			const operation = Operation.Entity.selected(app);
			if (!operation) {
				toast.error("Operation not selected", {
					richColors: true,
				});
				return;
			}

			const method = select ? "add" : "delete";

			app.target.contexts
				.filter((context) => context.operation_id === operation.id)
				.forEach((context) => {
					const contextMatches =
						!filter ||
						context.name.toLowerCase().includes(filter.toLowerCase());

					Context.Entity.sources(app, context).forEach((file) => {
						const fileMatches =
							!filter || file.name.toLowerCase().includes(filter.toLowerCase());
						if (contextMatches || fileMatches) {
							selectedFiles[method](file.id);
						}
					});
				});

			app.target.contexts
				.filter((context) => context.operation_id === operation.id)
				.forEach((context) => {
					const files = Context.Entity.sources(app, context);

					if (files.some((file) => selectedFiles.has(file.id))) {
						selectedContexts.add(context.id);
					} else {
						selectedContexts.delete(context.id);
					}
				});

			update(selectedFiles, setSelectedFiles);
			update(selectedContexts, setSelectedContexts);
		}

		function setContext(contextId: Context.Id, select: boolean) {
			const method = select ? "add" : "delete";
			const context = Context.Entity.id(app, contextId);
			if (!context) return;

			selectedContexts[method](contextId);

			const contextMatches =
				!filter || context.name.toLowerCase().includes(filter.toLowerCase());

			Context.Entity.sources(app, context).forEach((file) => {
				const fileMatches =
					!filter || file.name.toLowerCase().includes(filter.toLowerCase());
				if (contextMatches || fileMatches) {
					selectedFiles[method](file.id);
				}
			});

			update(selectedFiles, setSelectedFiles);
			update(selectedContexts, setSelectedContexts);
		}

		function setFile(target: Source.Id, select: boolean) {
			const method = select ? "add" : "delete";

			selectedFiles[method](target);

			const file = Source.Entity.id(app, target);

			const files = Context.Entity.sources(app, file.context_id);

			if (files.some((file) => selectedFiles.has(file.id))) {
				selectedContexts.add(file.context_id);
			} else {
				selectedContexts.delete(file.context_id);
			}

			update(selectedContexts, setSelectedContexts);
			update(selectedFiles, setSelectedFiles);
		}

		const hasData =
			app.target.operations.length > 0 || app.target.contexts.length > 0;

		const save = () => {
			const contexts = Refractor.array(
				...app.target.contexts.map((context) => ({
					...context,
					selected: selectedContexts.has(context.id),
				})),
			);
			const files = Refractor.array(
				...app.target.files.map((file) => ({
					...file,
					selected: selectedFiles.has(file.id),
				})),
			);

			Info.setInfoByKey(contexts, "target", "contexts");
			Info.setInfoByKey(files, "target", "files");

			Info.session_autosave();
			setTimeout(() => {
				spawnBanner(
					<Frame.Banner
						//was fixed //(disable close button)
						onClose={Info.notes_reload}
						back={() => spawnBanner(<SelectFiles.Banner />)}
					/>,
				);
			}, 10);
		};

		const reloadClickHandler = async () => {
			setLoading(true);
			await Info.sync();
			setLoading(false);
		};

		const filteredContexts = useMemo(() => {
			const term = filter.toLowerCase();
			return Operation.Entity.contexts(app).filter((ctx) => {
				if (!filter) return true;
				const contextMatches = ctx.name.toLowerCase().includes(term);
				const sourceMatches = Context.Entity.sources(app, ctx).some((f) =>
					f.name.toLowerCase().includes(term),
				);
				return contextMatches || sourceMatches;
			});
		}, [app.target.contexts, filter]);

		const SearchInput = useMemo(() => {
			return (
				<Input
					icon="Search"
					placeholder="Search by context name and file name"
					variant="highlighted"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				/>
			);
		}, [setFilter, filter]);

		type VirtualItemType =
			| { type: "context"; context: Context.Type; hasFiles: boolean }
			| {
				type: "file";
				file: Source.Type;
				context: Context.Type;
				isLast: boolean;
			};

		const items = useMemo(() => {
			const arr: VirtualItemType[] = [];
			const term = filter.toLowerCase();

			filteredContexts.forEach((context) => {
				const contextMatches =
					!filter || context.name.toLowerCase().includes(term);
				const files = Context.Entity.sources(app, context).filter((file) => {
					if (contextMatches) return true;
					return file.name.toLowerCase().includes(term);
				});

				arr.push({ type: "context", context, hasFiles: files.length > 0 });

				files.forEach((file, index) => {
					arr.push({
						type: "file",
						file,
						context,
						isLast: index === files.length - 1,
					});
				});
			});
			return arr;
		}, [filteredContexts, filter, app.target.files]);

		const parentRef = useRef<HTMLDivElement>(null);
		const rowVirtualizer = useVirtualizer({
			count: items.length,
			getScrollElement: () => parentRef.current,
			estimateSize: (index) => (items[index].type === "context" ? 50 : 36),
			overscan: 10,
		});

		return (
			<UIBanner
				title="Select sources"
				className={s.banner}
				done={
					<Button
						icon="Check"
						variant="glass"
						disabled={!selectedContexts.size || !selectedFiles.size}
						onClick={save}
					/>
				}
				option={
					<Button
						icon="Upload"
						variant="tertiary"
						onClick={() => spawnBanner(<UploadBanner />)}
					/>
				}
				{...props}
			>
				{showSession && activeSessions.length > 0 && (
					<Stack dir="column" gap={6} ai="stretch" style={{ width: "100%", marginBottom: 12 }}>
						<Label value="Session" />
						<Select.Root
							open={openSelectSession}
							onOpenChange={setOpenSelectSession}
							onValueChange={load_session}
						>
							<Select.Trigger>
								<Select.Icon name="Status" />
								Select session
							</Select.Trigger>
							<Select.Content>
								{activeSessions.map((session) => (
									<Select.Item key={session.name} value={session.name} style={{ color: session.color }}>
										<Select.Icon name={session.icon} />
										{session.name}
									</Select.Item>
								))}
								<Button
									variant="tertiary"
									style={{ width: "100%" }}
									onClick={() =>
										spawnBanner(
											<Session.Delete.Banner
												onClose={reloadSessionsList}
												back={() => spawnBanner(<SelectFiles.Banner showSession={showSession} />)}
											/>,
										)
									}
									icon="Wrench"
								>
									Manage sessions
								</Button>
							</Select.Content>
						</Select.Root>
					</Stack>
				)}
				{SearchInput}
				<Stack>
					<Button
						onClick={() => all(true)}
						variant="secondary"
						className={s.actionButton}
						icon="FilePlus"
					>
						Select all
					</Button>
					<Button
						onClick={() => all(false)}
						variant="secondary"
						className={s.actionButton}
						icon="FileMinus"
					>
						Unselect all
					</Button>
				</Stack>
				{Info.activeUploads.size > 0 && (
					<div className={s.uploadingSection}>
						{[...Info.activeUploads.entries()].map(
							([reqId, { filename, percent }]) => (
								<Stack
									key={reqId}
									className={s.uploadingRow}
								>
									<Spinner size={16} />
									<Label value={filename} />
									<Progress
										value={percent}
										className={s.uploadProgress}
									/>
								</Stack>
							),
						)}
					</div>
				)}
				<div
					className={s.wrapper}
					style={{ flex: 1, minHeight: 0, position: "relative" }}
				>
					<Skeleton
						show={!hasData}
						width="full"
						style={{ height: "100%" }}
					>
						{items.length > 0 ? (
							<div
								ref={parentRef}
								style={{
									height: "100%",
									overflowY: "auto",
									overflowX: "hidden",
									paddingRight: 8,
								}}
							>
								<div
									style={{
										height: `${rowVirtualizer.getTotalSize()}px`,
										width: "100%",
										position: "relative",
										display: "flex",
										flexDirection: "column",
									}}
								>
									{rowVirtualizer.getVirtualItems().map((virtualRow) => {
										const item = items[virtualRow.index];
										if (!item) return null;

										const style = {
											position: "absolute" as const,
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${virtualRow.start}px)`,
										};

										if (item.type === "context") {
											return (
												<div
													key={virtualRow.key}
													data-index={virtualRow.index}
													ref={rowVirtualizer.measureElement}
													style={style}
												>
													<ContextHeading
														context={item.context}
														selectedContexts={selectedContexts}
														setContext={setContext}
														noFiles={!item.hasFiles}
													/>
												</div>
											);
										}

										return (
											<div
												key={virtualRow.key}
												data-index={virtualRow.index}
												ref={rowVirtualizer.measureElement}
												style={style}
											>
												<div
													className={cn(s.fileWrapper, item.isLast && s.last)}
												>
													<FlatFileComponent
														file={item.file}
														selectedFiles={selectedFiles}
														setFile={setFile}
														isLast={item.isLast}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : (
							<p className={s.noData}>
								There is no data to analyze. Click below to upload...
							</p>
						)}
					</Skeleton>
				</div>
				<Stack>
					<Button
						onClick={reloadClickHandler}
						variant="secondary"
						className={s.actionButton}
						icon="RefreshClockwise"
						loading={loading}
					>
						Reload
					</Button>
				</Stack>
			</UIBanner>
		);
	}
}

export function ContextHeading({
	context,
	selectedContexts,
	setContext,
	noFiles,
	showCheckbox = true,
}: any) {
	const { spawnBanner } = Application.use();

	return (
		<Stack
			dir="column"
			ai="stretch"
			gap={0}
			className={cn(s.branchHeader, noFiles && s.noFiles)}
		>
			<Stack
				className={s.contextHeading}
				gap={8}
			>
				{showCheckbox && (
					<Checkbox
						style={{ height: 20, width: 20 }}
						checked={selectedContexts?.has(context.id) || false}
						onCheckedChange={(checked) => setContext(context.id, !!checked)}
						id={context.name}
					/>
				)}
				<Label value={context.name} />
				<hr style={{ flex: 1 }} />
				<Badge
					size="sm"
					value="Delete"
					style={{ border: "1px solid var(--red-400)", borderRadius: "2px" }}
					variant="red-subtle"
					icon="Trash2"
					onClick={() =>
						spawnBanner(
							<Context.Delete.Banner
								context={context}
								back={() => spawnBanner(<SelectFiles.Banner />)}
							/>,
						)
					}
				/>
			</Stack>
			{!noFiles && <Separator className={s.separator} />}
		</Stack>
	);
}

export function FlatFileComponent({ file, selectedFiles, setFile, isLast, showFilter = true, showCheckbox = true }: any) {
	return (
		<Stack
			dir="column"
			ai="stretch"
			jc="flex-start"
			className={cn(s.fileBranch, isLast && s.last)}
		>
			<FileComponent
				file={file}
				selectedFiles={selectedFiles}
				setFile={setFile}
				showFilter={showFilter}
				showCheckbox={showCheckbox}
			/>
		</Stack>
	);
}

interface FileComponentProps {
	file: Source.Type;
	selectedFiles: Set<Source.Id>;
	setFile: (file: Source.Id, select: boolean) => void;
	showFilter?: boolean;
	showCheckbox?: boolean;
}

function FileComponent({ file, setFile, selectedFiles, showFilter = true, showCheckbox = true }: FileComponentProps) {
	const { app, Info, spawnBanner } = Application.use();
	const [loading, setLoading] = useState<boolean>(false);

	const previewButtonClickHandler = () => {
		setLoading(true);
		Info.preview_file(file).then(({ docs, total_hits }) =>
			spawnBanner(
				<Preview.Banner
					total={total_hits}
					values={docs}
					fixed
					back={() => spawnBanner(<SelectFiles.Banner />)}
					done={
						<Button
							icon="Check"
							onClick={() => spawnBanner(<SelectFiles.Banner />)}
							variant="glass"
						/>
					}
				/>,
			),
		);
	};

	const progressDefault = Info.ingestionProgress.get(file.id) || 0;
	const [progress, setProgress] = useState<number>(progressDefault);

	useEffect(() => {
		const interval = setInterval(() => {
			const isIngesting =
				Source.Entity.getRequestType(Info.app, file.id) ===
				Request.Prefix.INGESTION;

			if (isIngesting) {
				const reqId = Info.app.general.loadings.byFileId.get(file.id);
				const p =
					Info.ingestionProgress.get(file.id) ||
					(reqId ? Info.ingestionProgress.get(reqId as any) : 0) ||
					0;
				setProgress((prev) => (prev !== p ? p : prev));
			} else {
				setProgress((prev) => (prev !== 0 ? 0 : prev));
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [file.id, Info]);

	const FileIsTooBig = () => {
		const total = Math.max(file.total, progress);
		if (total < 500_000) {
			return null;
		}

		return (
			<Badge
				size="sm"
				variant="amber-subtle"
				icon="Warning"
				value="This file is too big"
			/>
		);
	};

	return (
		<Stack
			className={cn(s.file, !file.total && s.disabled)}
			key={file.id}
		>
			{showCheckbox && (
				<Checkbox
					id={file.name}
					checked={selectedFiles?.has(file.id) || false}
					onCheckedChange={(checked) => setFile(file.id, !!checked)}
				/>
			)}
			{Source.Entity.getRequestType(app, file) === Request.Prefix.INGESTION && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Spinner size={16} />
							</span>
						</TooltipTrigger>
						<TooltipContent>Processing</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
			<Label value={file.name} />
			<FileIsTooBig />
			<Badge
				size="sm"
				className={s.amount}
				variant="gray-subtle"
				value={Math.max(file.total, progress)}
			/>
			{showFilter && (
				<Button
					shape="icon"
					icon="Filter"
					variant="secondary"
					className={s.smallButton}
					onClick={() =>
						spawnBanner(
							<FilterFileBanner
								sources={[file]}
								fixed
								back={() => spawnBanner(<SelectFiles.Banner />)}
							/>,
						)
					}
				/>
			)}
			<Button
				shape="icon"
				icon="PreviewEye"
				variant="secondary"
				loading={loading}
				className={s.smallButton}
				onClick={previewButtonClickHandler}
			/>
			<Badge
				size="sm"
				style={{
					border: "1px solid var(--red-400)",
					borderRadius: "2px",
					padding: 4,
				}}
				variant="red-subtle"
				icon="Trash2"
				onClick={() =>
					spawnBanner(
						<Source.Delete.Banner
							source={file}
							back={() => spawnBanner(<SelectFiles.Banner />)}
						/>,
					)
				}
			/>
		</Stack>
	);
}
