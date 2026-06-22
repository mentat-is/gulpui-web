import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactDOM from "react-dom/client";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Application } from "@/context/Application.context";
import { DetachedAppProvider } from "@/context/DetachedApp.provider";
import { WindowBridge } from "@/lib/WindowBridge";
import { DataStore } from "@/store/DataStore";
import { NotesWindow } from "@/components/NotesWindow";
import { TableViewWindow } from "@/components/TableViewWindow";
import { DashboardViewWindow } from "@/components/DashboardViewWindow";
import { AIAssistantWindow } from "@/components/AIAssistantWindow";
import { RenderEngine } from "@/class/RenderEngine";
import { Source } from "@/entities/Source";
import { Operation } from "@/entities/Operation";
import { Doc } from "@/entities/Doc";
import { Note } from "@/entities/Note";
import { NotePoint } from "@/ui/Note";
import { DisplayEventDialog } from "@/dialogs/Event.dialog";

type DetachedWindowKind = "notes" | "table" | "dashboard" | "assistant";

interface AssistantWindowTarget {
	key: string;
	title: string;
	pluginFilename?: string;
}

interface DetachedWindowRecord {
	key: string;
	kind: DetachedWindowKind;
	window: Window;
	root: ReactDOM.Root;
	bridgeId: string;
}

interface DetachedWindowContextValue {
	status: WindowBridge.MainContextStatus;
	contextVersion: number;
	openNotesWindow: () => void;
	openTableWindow: (sourceId?: Source.Id) => void;
	openDashboardWindow: () => void;
	openAssistantWindow: (target: AssistantWindowTarget) => void;
}

/**
 * FetchEventBannerMain fetches a note-linked event in the main tab when a detached
 * window targets an event that is not currently loaded in the timeline.
 *
 * @param props.docId - Event document ID to fetch.
 * @param props.operationId - Operation owning the event.
 * @returns Banner content that reuses the existing note fetch flow.
 */
function FetchEventBannerMain({
	docId,
	operationId,
}: {
	docId: Doc.Id;
	operationId: Operation.Id;
}) {
	const shell = {
		doc: { _id: docId },
		operation_id: operationId,
		name: docId,
	} as unknown as Note.Type;

	return <NotePoint.FetchEventBanner note={shell} />;
}

/**
 * Creates a stable browser window name for a detached assistant target.
 *
 * @param targetKey - Assistant target key from the built-in or extension registry.
 * @returns Sanitized browser window name.
 */
function createAssistantWindowName(targetKey: string): string {
	return `GulpAIAssistant-${targetKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * Extracts the operation ID from an operation workspace route.
 *
 * @param pathname - Current browser location pathname.
 * @returns Operation ID from the route, or null outside operation routes.
 */
function getRouteOperationId(pathname: string): Operation.Id | null {
	const match = pathname.match(/^\/operations\/([^/]+)/);
	return match ? decodeURIComponent(match[1]) as Operation.Id : null;
}

/**
 * Reads whether the browser still has a persisted auth token.
 *
 * @returns True when a non-placeholder token is present.
 */
function hasStoredToken(): boolean {
	const token = localStorage.getItem("__token");
	return !!token && token !== "-";
}

/**
 * DetachedWindow.Provider owns detached browser windows independently of route
 * components so they can idle and resume while the main tab navigates.
 *
 * @param props.children - Routed application content rendered under the coordinator.
 * @returns Provider wrapping the routed application.
 */
function _({ children }: { children: ReactNode }) {
	const {
		Info,
		app,
		spawnBanner,
		spawnDialog,
		setDialogsDocked,
	} = Application.use();
	const location = useLocation();
	const { theme } = useTheme();
	const [windows, setWindows] = useState<Record<string, DetachedWindowRecord>>(
		{},
	);
	const windowsRef = useRef<Record<string, DetachedWindowRecord>>({});
	const bridgeIdRef = useRef(WindowBridge.generateId());
	const bridgeRef = useRef<ReturnType<typeof WindowBridge.create> | null>(null);
	const [authLost, setAuthLost] = useState(false);
	const routeOperationId = getRouteOperationId(location.pathname);
	const selectedOperationId =
		Operation.Entity.selected(app)?.id ?? routeOperationId;
	const selectedSourceIds = useMemo(
		() =>
			app.target.files
				.filter((source) =>
					source.selected &&
					(!routeOperationId || source.operation_id === routeOperationId),
				)
				.map((source) => source.id),
		[app.target.files, routeOperationId],
	);
	const selectedSourceIdsSignature = selectedSourceIds.join(",");

	const appRef = useRef(app);
	appRef.current = app;
	const infoRef = useRef(Info);
	infoRef.current = Info;
	const spawnDialogRef = useRef(spawnDialog);
	spawnDialogRef.current = spawnDialog;
	const spawnBannerRef = useRef(spawnBanner);
	spawnBannerRef.current = spawnBanner;

	const status = useMemo<WindowBridge.MainContextStatus>(() => {
		const authenticated = !!app.general.user || hasStoredToken() || app.general.skippedAuth;
		if (authLost || !authenticated) return "auth_lost";
		if (!routeOperationId) return "idle";
		if (!selectedOperationId || selectedSourceIds.length === 0) return "initializing";
		return "active";
	}, [
		app.general.skippedAuth,
		app.general.user,
		authLost,
		routeOperationId,
		selectedOperationId,
		selectedSourceIdsSignature,
	]);

	const contextVersion = useMemo(
		() =>
			[
				status,
				selectedOperationId ?? "",
				selectedSourceIdsSignature,
				routeOperationId ?? "",
			].join("|"),
		[routeOperationId, selectedOperationId, selectedSourceIdsSignature, status],
	);

	const contextVersionNumber = useMemo(() => {
		let hash = 0;
		for (let index = 0; index < contextVersion.length; index++) {
			hash = (hash * 31 + contextVersion.charCodeAt(index)) >>> 0;
		}
		return hash;
	}, [contextVersion]);

	/**
	 * Applies current theme variables and stylesheets to a detached document.
	 *
	 * @param targetWindow - Detached browser window to style.
	 * @returns Nothing.
	 */
	const copyStylesToWindow = useCallback(
		(targetWindow: Window) => {
			applyThemeToWindow(document, targetWindow.document, theme);

			Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
				try {
					if (styleSheet.href) {
						const link = document.createElement("link");
						link.rel = "stylesheet";
						link.href = styleSheet.href;
						targetWindow.document.head.appendChild(link);
					} else if (styleSheet.cssRules) {
						const style = document.createElement("style");
						Array.from(styleSheet.cssRules).forEach((rule) => {
							style.appendChild(document.createTextNode(rule.cssText));
						});
						targetWindow.document.head.appendChild(style);
					}
				} catch (error) {
					console.warn("error copying style", error);
				}
			});
		},
		[theme],
	);

	/**
	 * Broadcasts the current lifecycle status and, when active, the current app snapshot.
	 *
	 * @returns Nothing.
	 */
	const replayDetachedState = useCallback(() => {
		WindowBridge.broadcastMainContext(
			appRef.current,
			status,
			selectedOperationId,
		);
	}, [selectedOperationId, status]);
	const replayDetachedStateRef = useRef(replayDetachedState);

	useEffect(() => {
		replayDetachedStateRef.current = replayDetachedState;
	}, [replayDetachedState]);

	/**
	 * Removes a detached window record after the external window closes.
	 *
	 * @param key - Detached window key.
	 * @returns Nothing.
	 */
	const forgetWindow = useCallback((key: string) => {
		const record = windowsRef.current[key];
		if (record) {
			setTimeout(() => record.root.unmount(), 0);
		}
		delete windowsRef.current[key];
		setWindows({ ...windowsRef.current });
	}, []);

	/**
	 * Opens a detached window or focuses an already-open instance.
	 *
	 * @param key - Internal window key.
	 * @param kind - Detached window kind.
	 * @param windowName - Browser window name used for reuse.
	 * @param features - Browser window feature string.
	 * @param renderContent - Content renderer for the detached root.
	 * @returns Opened or focused browser window.
	 */
	const openDetachedWindow = useCallback(
		(
			key: string,
			kind: DetachedWindowKind,
			windowName: string,
			features: string,
			renderContent: (targetWindow: Window) => ReactNode,
		) => {
			const existing = windowsRef.current[key];
			if (existing && !existing.window.closed) {
				existing.window.focus();
				replayDetachedState();
				return existing.window;
			}

			const targetWindow = window.open("", windowName, features);
			if (!targetWindow) return null;

			targetWindow.document.body.innerHTML = "";
			const container = document.createElement("div");
			targetWindow.document.body.appendChild(container);
			copyStylesToWindow(targetWindow);

			const bridgeId = WindowBridge.generateId();
			const root = ReactDOM.createRoot(container);
			root.render(
				<DetachedAppProvider
					initialApp={appRef.current}
					initialNotes={[...DataStore.notes]}
					bridgeId={bridgeId}
					detachedDocument={targetWindow.document}
					mainSpawnBanner={spawnBannerRef.current}
				>
					{renderContent(targetWindow)}
				</DetachedAppProvider>,
			);

			const record: DetachedWindowRecord = {
				key,
				kind,
				window: targetWindow,
				root,
				bridgeId,
			};
			windowsRef.current[key] = record;
			setWindows({ ...windowsRef.current });
			targetWindow.addEventListener(
				"beforeunload",
				() => forgetWindow(key),
				{ once: true },
			);
			setTimeout(replayDetachedState, 0);
			return targetWindow;
		},
		[copyStylesToWindow, forgetWindow, replayDetachedState],
	);

	const openNotesWindow = useCallback(() => {
		openDetachedWindow(
			"notes",
			"notes",
			"GulpNotes",
			"width=1480,height=760,left=100,top=100",
			(targetWindow) => (
				<NotesWindow onClose={() => targetWindow.close()} />
			),
		);
	}, [openDetachedWindow]);

	const openTableWindow = useCallback(
		(sourceId?: Source.Id) => {
			openDetachedWindow(
				"table",
				"table",
				"GulpTableView",
				"width=800,height=600,left=150,top=150",
				(targetWindow) => (
					<TableViewWindow
						initialSourceId={sourceId}
						onClose={() => targetWindow.close()}
					/>
				),
			);

			if (sourceId) {
				bridgeRef.current?.send(WindowBridge.MessageType.TABLE_SELECT_SOURCE, {
					sourceId,
				});
			}
		},
		[openDetachedWindow],
	);

	const openDashboardWindow = useCallback(() => {
		openDetachedWindow(
			"dashboard",
			"dashboard",
			"GulpDashboardView",
			"width=1480,height=820,left=180,top=120",
			(targetWindow) => (
				<DashboardViewWindow onClose={() => targetWindow.close()} />
			),
		);
	}, [openDetachedWindow]);

	const openAssistantWindow = useCallback(
		(target: AssistantWindowTarget) => {
			openDetachedWindow(
				`assistant:${target.key}`,
				"assistant",
				createAssistantWindowName(target.key),
				"width=480,height=800,left=120,top=120",
				(targetWindow) => (
					<AIAssistantWindow
						title={target.title}
						pluginFilename={target.pluginFilename}
						onClose={() => targetWindow.close()}
					/>
				),
			);
		},
		[openDetachedWindow],
	);

	useEffect(() => {
		const bridge = WindowBridge.create(bridgeIdRef.current, (message) => {
			switch (message.type) {
				case WindowBridge.MessageType.FLAGS_CHANGED:
					RenderEngine.clearAllCaches();
					DataStore.markDirty();
					infoRef.current.render();
					break;
				case WindowBridge.MessageType.TARGET_NOTE: {
					const { docId, operationId } =
						message.payload as WindowBridge.TargetNotePayload;
					const event = Doc.Entity.id(appRef.current, docId);
					if (event) {
						spawnDialogRef.current(<DisplayEventDialog event={event} />);
					} else {
						spawnBannerRef.current(
							<FetchEventBannerMain
								docId={docId}
								operationId={operationId}
							/>,
						);
					}
					break;
				}
				case WindowBridge.MessageType.EVENT_SELECTED: {
					const { event } = message.payload as WindowBridge.EventSelectedPayload;
					if (event?._id !== infoRef.current.app.timeline.target?._id) {
						infoRef.current.setTimelineTarget(event ?? null);
					}
					break;
				}
				case WindowBridge.MessageType.DOCK_DIALOG:
					setDialogsDocked(true);
					break;
				case WindowBridge.MessageType.DETACHED_READY:
					replayDetachedStateRef.current();
					break;
			}
		});
		bridgeRef.current = bridge;
		return () => {
			bridge.destroy();
			bridgeRef.current = null;
		};
	}, [setDialogsDocked]);

	useEffect(() => {
		replayDetachedState();
	}, [
		replayDetachedState,
		app.target.files,
		app.target.operations,
		app.target.contexts,
		app.target.filters,
		app.timeline.filter,
		app.timeline.target,
	]);

	useEffect(() => {
		bridgeRef.current?.send(WindowBridge.MessageType.THEME_CHANGE, {
			theme: theme ?? "dark",
		});
		Object.values(windowsRef.current).forEach((record) => {
			if (!record.window.closed) {
				requestAnimationFrame(() => {
					applyThemeToWindow(document, record.window.document, theme);
				});
			}
		});
	}, [theme, windows]);

	useEffect(() => {
		const handleAuthLost = () => setAuthLost(true);
		window.addEventListener("gulp-auth-lost", handleAuthLost);
		return () => window.removeEventListener("gulp-auth-lost", handleAuthLost);
	}, []);

	useEffect(() => {
		if (app.general.user || hasStoredToken()) {
			setAuthLost(false);
		}
	}, [app.general.user]);

	useEffect(() => {
		/**
		 * Replays detached state after source/session selection commits in the main tab.
		 *
		 * @returns Nothing.
		 */
		const handleReplayRequest = () => {
			window.setTimeout(() => {
				replayDetachedStateRef.current();
			}, 0);
			window.setTimeout(() => {
				replayDetachedStateRef.current();
			}, 100);
		};

		window.addEventListener(WindowBridge.DETACHED_REPLAY_EVENT, handleReplayRequest);
		return () =>
			window.removeEventListener(
				WindowBridge.DETACHED_REPLAY_EVENT,
				handleReplayRequest,
			);
	}, []);

	useEffect(() => {
		const handleBeforeUnload = () => {
			WindowBridge.broadcastMainStatus("initializing", selectedOperationId);
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [selectedOperationId]);

	useEffect(() => {
		if (app.general.tableViewSource) {
			openTableWindow(app.general.tableViewSource.id);
			Info.setInfoByKey(null, "general", "tableViewSource");
		}
	}, [Info, app.general.tableViewSource, openTableWindow]);

	const value = useMemo<DetachedWindowContextValue>(
		() => ({
			status,
			contextVersion: contextVersionNumber,
			openNotesWindow,
			openTableWindow,
			openDashboardWindow,
			openAssistantWindow,
		}),
		[
			contextVersionNumber,
			openAssistantWindow,
			openDashboardWindow,
			openNotesWindow,
			openTableWindow,
			status,
		],
	);

	return (
		<DetachedWindow.Context.Provider value={value}>
			{children}
		</DetachedWindow.Context.Provider>
	);
}

/**
 * Applies current theme attributes and CSS custom properties to a detached document.
 *
 * @param sourceDoc - Main document to read CSS variables from.
 * @param targetDoc - Detached document to update.
 * @param nextTheme - Theme name to apply.
 * @returns Nothing.
 */
function applyThemeToWindow(
	sourceDoc: Document,
	targetDoc: Document,
	nextTheme: string | undefined,
) {
	const sourceRoot = sourceDoc.documentElement;
	const targetRoot = targetDoc.documentElement;

	targetRoot.setAttribute("data-theme", nextTheme ?? "dark");

	const styles = getComputedStyle(sourceRoot);
	for (let index = 0; index < styles.length; index++) {
		const key = styles[index];
		if (key.startsWith("--")) {
			targetRoot.style.setProperty(key, styles.getPropertyValue(key));
		}
	}
}

export namespace DetachedWindow {
	export const Context = createContext<DetachedWindowContextValue | null>(null);
	export const Provider = _;

	export function use(): DetachedWindowContextValue {
		const value = useContext(Context);
		if (!value) throw new Error("DetachedWindow.Context not found");
		return value;
	}
}
