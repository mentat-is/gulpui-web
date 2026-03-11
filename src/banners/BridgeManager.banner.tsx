import { Application } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import { Select } from "@/ui/Select";
import { Icon } from "@impactium/icons";
import { useEffect, useState, useMemo } from "react";
import { Label } from "@/ui/Label";
import { Skeleton } from "@/ui/Skeleton";
import { Button } from "@/ui/Button";
import { Stack } from "@/ui/Stack";
import { toast } from "sonner";
import { AdvancedPluginParams } from "@/components/AdvancedPluginParams";
import { Operation } from "@/entities/Operation";
import { Badge } from "@/ui/Badge";
import { SummaryTable, SummaryTableColumn } from "@/components/AdvancedPluginParams/SummaryTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/Tooltip";

export namespace BridgeManager {
	export const Banner = (props: any) => {
		const { Info, destroyBanner, app } = Application.use();
		const operation = Operation.Entity.selected(app);

		const [bridges, setBridges] = useState<any[] | null>(null);
		const [selectedBridgeId, setSelectedBridgeId] = useState<string>("");
		const selectedBridge = useMemo(() => bridges?.find((b) => b.id === selectedBridgeId) || null, [bridges, selectedBridgeId]);

		const [tasks, setTasks] = useState<any[] | null>(null);
		const [loading, setLoading] = useState(false);

		const loadBridges = () => {
			setLoading(true);
			Info.list_bridges()
				.then((res: any) => {
					const data = res?.data?.bridges || res?.data || res || [];
					setBridges(Array.isArray(data) ? data : []);
				})
				.catch(() => toast.error("Failed to load bridges"))
				.finally(() => setLoading(false));
		};

		const loadTasks = () => {
			if (!selectedBridgeId || !operation) {
				setTasks(null);
				return;
			}
			setLoading(true);
			Info.list_ingestion_tasks({ bridge_id: selectedBridgeId, operation_ids: [operation.id] })
				.then((res: any) => {
					const data = res?.data?.tasks || res?.data || res || [];
					setTasks(Array.isArray(data) ? data : []);
				})
				.catch(() => toast.error("Failed to load tasks"))
				.finally(() => setLoading(false));
		};

		useEffect(() => {
			loadBridges();
		}, []);

		useEffect(() => {
			loadTasks();
		}, [selectedBridgeId]);

		const handleStop = (taskId: string) => {
			Info.stop_ingestion(taskId)
				.then((res: any) => {
					if (res) {
						toast.success("Task stopped");
						loadTasks();
					} else {
						toast.error("Failed to stop task");
					}
				})
				.catch(() => toast.error("Failed to stop task"));
		};

		const handleDelete = (taskId: string) => {
			Info.delete_ingestion(taskId)
				.then((res: any) => {
					if (res) {
						toast.success("Task deleted");
						loadTasks();
					} else {
						toast.error("Failed to delete task");
					}
				})
				.catch(() => toast.error("Failed to delete task"));
		};

		const handleStart = (task: any) => {
            console.log(task.plugin_params)
			if (!selectedBridgeId || !operation) return;
			Info.create_start_ingestion(selectedBridgeId, operation.id, task.plugin_params || {})
				.then((res: any) => {
					if (res) {
						toast.success("Task started");
						loadTasks();
					} else {
						toast.error("Failed to start task");
					}
				})
				.catch(() => toast.error("Failed to start task"));
		};

		const handleCreateNewTask = (pluginParams: any) => {
            console.log(pluginParams)
			if (!selectedBridgeId || !operation) return;
			Info.create_start_ingestion(selectedBridgeId, operation.id, pluginParams)
				.then((res: any) => {
					if (res) {
						toast.success("Task created successfully");
						loadTasks();
					} else {
						toast.error("Failed to create task");
					}
				})
				.catch(() => toast.error("Failed to create task"));
		};

		const taskColumns: SummaryTableColumn<any>[] = [
			{
				key: "id",
				label: "Task ID",
				width: "1%",
				render: (val) => (
					<Tooltip>
						<TooltipTrigger asChild>
							<span style={{ cursor: "default" }}>{String(val).slice(0, 8)}...</span>
						</TooltipTrigger>
						<TooltipContent>
							{val}
						</TooltipContent>
					</Tooltip>
				)
			},
			{
				key: "parameters",
				label: "Parameters",
				render: (_, item) => {
					const params = item.plugin_params?.custom_parameters || {};
					const jsonStr = JSON.stringify(params, null, 2);
					const preview = typeof params === 'object' ? JSON.stringify(params).slice(0, 30) + (JSON.stringify(params).length > 30 ? '...' : '') : String(params);

					return (
						<Tooltip>
							<TooltipTrigger asChild>
								<span style={{ cursor: "default", fontFamily: "var(--font-mono)", fontSize: 11 }}>
									{preview}
								</span>
							</TooltipTrigger>
							<TooltipContent style={{ maxWidth: 500, whiteSpace: "pre", fontFamily: "var(--font-mono)", fontSize: 11 }}>
								{jsonStr}
							</TooltipContent>
						</Tooltip>
					);
				}
			},
			{ key: "status", label: "Status", width: 80, render: (val) => <Badge color={val === "ongoing" ? "blue" : val === "error" ? "red" : "gray"}>{val || "stopped"}</Badge> },
			{
				key: "actions",
				label: "Actions",
				width: "1%",
				render: (_, task) => (
					<Stack dir="row" jc="center" ai="center">
						{task.status === "ongoing" && (
							<Button variant="tertiary" shape="icon" icon="Square" onClick={(e) => { e.stopPropagation(); handleStop(task.id); }} title="Stop Task" style={{ height: 24, width: 24, minHeight: 24 }} />
						)}
						{task.status !== "ongoing" && (
							<Button variant="tertiary" shape="icon" icon="Play" onClick={(e) => { e.stopPropagation(); handleStart(task); }} title="Start Task" style={{ height: 24, width: 24, minHeight: 24 }} />
						)}
					</Stack>
				)
			}
		];

		return (
			<TooltipProvider>
				<UIBanner title="Bridge Manager" {...props}>
					<Stack dir="column" gap={16} ai="stretch" style={{ width: "100%", paddingBottom: 16 }}>
						<Label value="Select Registered Bridge" />
						{!bridges ? (
							<Skeleton style={{ height: 40 }} />
						) : bridges.length === 0 ? (
							<div style={{ padding: 12, backgroundColor: "var(--background-100)", borderRadius: 8, color: "var(--gray-500)" }}>
								No bridges found.
							</div>
						) : (
							<Select.Root value={selectedBridgeId} onValueChange={setSelectedBridgeId}>
								<Select.Trigger>
									<Icon name="Network" />
									{selectedBridge ? selectedBridge.name || selectedBridge.id : "Select a bridge..."}
								</Select.Trigger>
								<Select.Content>
									{bridges.map((bridge) => (
										<Select.Item key={bridge.id} value={bridge.id}>
											{bridge.name || bridge.id}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>
						)}

						{selectedBridge && (
							<Stack dir="column" gap={8} ai="stretch" style={{ padding: 12, backgroundColor: "var(--background-100)", borderRadius: 8, border: "1px solid var(--gray-alpha-400)" }}>
								<Stack dir="row" jc="space-between" ai="center">
									<span style={{ fontWeight: 600, color: "var(--gray-900)" }}>Bridge Connection</span>
									<Badge color={selectedBridge.status === "ready" || selectedBridge.status === "connected" ? "green" : selectedBridge.status === "error" ? "red" : "gray"}>
										{selectedBridge.status || "Unknown"}
									</Badge>
								</Stack>
								<Stack dir="row" gap={8} ai="center">
									<Icon name="Link" size={14} style={{ color: "var(--gray-500)" }} />
									<span style={{ color: "var(--gray-600)", wordBreak: "break-all", fontSize: 13 }}>
										{selectedBridge.url || "No URL provided"}
									</span>
								</Stack>
							</Stack>
						)}

						{selectedBridgeId && (
							<>
								<Stack dir="row" jc="space-between" ai="center" style={{ marginTop: 8 }}>
									<Label value="Ingestion Tasks" />
									<AdvancedPluginParams
										pluginParams={{}}
										updatePluginParams={handleCreateNewTask}
										customParamsMode="textarea"
										triggerText="New Task"
										triggerIcon="Plus"
										triggerVariant="secondary"
										applyText="Create new task"
										onReset={() => {}}
									/>
								</Stack>

								<Stack dir="column" gap={8} ai="stretch">
									{!tasks && loading ? (
										<>
											<Skeleton style={{ height: 60 }} />
											<Skeleton style={{ height: 60 }} />
										</>
									) : (
										<>
											<SummaryTable
												columns={taskColumns}
												data={tasks || []}
												onDelete={(item) => handleDelete(item.id)}
											/>
											<Stack style={{ marginTop: 8 }}>
												<Button
													onClick={loadTasks}
													variant='secondary'
													icon='RefreshClockwise'
													loading={loading}
													style={{ background: "var(--background-100)", flex: 1 }}
												>
													Reload
												</Button>
											</Stack>
										</>
									)}
								</Stack>
							</>
						)}
					</Stack>
				</UIBanner>
			</TooltipProvider>
		);
	};
}
