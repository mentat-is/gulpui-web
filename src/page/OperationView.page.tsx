import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactDOM from "react-dom/client";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@impactium/utils";
import { useTheme } from "next-themes";
import { Application } from "../context/Application.context";
import { Preloader } from "../components/Preloader";
import s from "../App.module.css";
import { Stack } from "@/ui/Stack";
import { Menu, MenuItem, PluginNode } from "../components/menu";
import { Timeline } from "../app/body/Timeline";
import { Resizer } from "../ui/Resizer";
import { Hint } from "../dialogs/Hint.dialog";
import { DetachedAppProvider } from "../context/DetachedApp.provider";
import { DataStore } from "../store/DataStore";
import { WindowBridge } from "../lib/WindowBridge";
import { RenderEngine } from "../class/RenderEngine";
import { Color } from "../entities/Color";
import { Logger } from "../dto/Logger.class";
import { Source } from "../entities/Source";
import { SelectFiles } from "../banners/SelectFiles.banner";
import { UploadBanner } from "../banners/Upload.banner";
import { FilterFileBanner } from "../banners/FilterFile.banner";
import { QueryExternal } from "../banners/QueryExternal.banner";
import { BridgeManager } from "../banners/BridgeManager.banner";
import { Enrichment } from "../banners/Enrichment.banner";
import { Sigma } from "../banners/Sigma";
import { Requests } from "../banners/Requests.banner";
import { Operation } from "../entities/Operation";
import { Settings } from "../banners/Settings.banner";
import { Session } from "../banners/Session.banner";
import { Extension } from "../context/Extension.context";
import { NotesWindow } from "../components/NotesWindow";
import { TableViewWindow } from "../components/TableViewWindow";
import { DashboardViewWindow } from "../components/DashboardViewWindow";
import { Note } from "../entities/Note";
import { Doc } from "../entities/Doc";
import { NotePoint } from "../ui/Note";
import { DisplayEventDialog } from "../dialogs/Event.dialog";
import { Locale } from "@/locales";

/**
 * FetchEventBannerMain — fetches a note-linked event from the server and opens its dialog
 * in the main tab. Triggered when the detached NotesWindow sends TARGET_NOTE for an event
 * that is not currently loaded in the main tab's timeline.
 *
 * @param docId - The document ID of the event to fetch.
 * @param operationId - The operation ID under which the event was ingested.
 */
function FetchEventBannerMain({
	docId,
	operationId,
}: {
	docId: Doc.Id;
	operationId: Operation.Id;
}) {
	// Construct a minimal Note.Type shell so we can reuse the existing FetchEventBanner component.
	const shell = {
		doc: { _id: docId },
		operation_id: operationId,
		name: docId,
	} as unknown as Note.Type;

	return <NotePoint.FetchEventBanner note={shell} />;
}

export function OperationView() {
	const { operation_id } = useParams<{ operation_id: string }>();
	const navigate = useNavigate();
	const { app, Info, spawnBanner } = Application.use();
	const [initialized, setInitialized] = useState(false);

	// Sync route param with global selection state when operation is swapped in UI
	const selectedOpId = Operation.Entity.selected(app)?.id;

	useEffect(() => {
		if (selectedOpId && selectedOpId !== operation_id) {
			navigate(`/operations/${selectedOpId}`);
		}
	}, [selectedOpId, operation_id, navigate]);

	useEffect(() => {
		if (!operation_id) return;

		/**
		 * Internal async function to check for active sessions and configure selection banner.
		 */
		const initializeOperation = async () => {
			// 0. If operations are not loaded yet (e.g. page refreshed), fetch them from backend
			if (app.target.operations.length === 0) {
				const savedUserId = localStorage.getItem("__user_id");
				if (savedUserId && !app.general.user) {
					try {
						const userProfile = await Info.user_get_by_id(savedUserId);
						if (userProfile) {
							Info.setInfoByKey(userProfile, "general", "user");
						}
					} catch (e) {
						// API error handler in API.tsx handles redirection to /login on 401
						return;
					}
				}

				await Info.plugin_list();
				await Info.glyphs_reload();
				await Info.sync();
			}

			// 1. Ensure the operation is selected in the global state
			const currentOp = Operation.Entity.selected(app);
			const isNewOperation = !currentOp || currentOp.id !== operation_id;
			if (isNewOperation) {
				Info.operations_select(operation_id as Operation.Id);
			}

			// 2. Check if a session was manually loaded or timeline was skipped
			const hasSelectedFiles = Source.Entity.selected(app).length > 0;
			if ((!isNewOperation && hasSelectedFiles) || app.general.skippedAuth) {
				if (app.general.skippedAuth) {
					Info.setInfoByKey(false, "general", "skippedAuth");
				}
				setInitialized(true);
				return;
			}

			// 3. Present the SelectFiles banner to let user pick files/contexts or load a session
			spawnBanner(<SelectFiles.Banner fixed />);
			setInitialized(true);
		};

		initializeOperation();
	}, [operation_id]);

	if (!initialized) {
		return null;
	}

	return <OperationTimeline />;
}

export function OperationTimeline() {
	const { theme } = useTheme();
	const navigate = useNavigate();
	const {
		Info,
		app,
		dialog,
		dialogsDocked,
		hintOpen,
		setHintOpen,
		setDialogsDocked,
		spawnBanner,
		spawnDialog,
		toggleHintOpen,
	} = Application.use();
	const { t } = Locale.use();
	const { extensions } = Extension.use();

	const applyThemeToWindow = useCallback(
		(
			sourceDoc: Document,
			targetDoc: Document,
			nextTheme: string | undefined,
		) => {
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
		},
		[],
	);

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
		[applyThemeToWindow, theme],
	);

	const [windowRef, setWindowRef] = useState<Window | null>(null);
	const notesRootRef = useRef<ReactDOM.Root | null>(null);
	const initialOperationRef = useRef<string | null | undefined>(undefined);

	const [tableWindowRef, setTableWindowRef] = useState<Window | null>(null);
	const tableRootRef = useRef<ReactDOM.Root | null>(null);

	const [dashboardWindowRef, setDashboardWindowRef] = useState<Window | null>(null);
	const dashboardRootRef = useRef<ReactDOM.Root | null>(null);

	const mainBridgeIdRef = useRef(WindowBridge.generateId());
	const mainBridgeRef = useRef<ReturnType<typeof WindowBridge.create> | null>(
		null,
	);

	/**
	 * Stable references to spawnDialog, spawnBanner, and app to be used inside
	 * the WindowBridge BroadcastChannel callback to prevent stale closures.
	 */
	const appRef = useRef(app);
	appRef.current = app;
	const spawnDialogRef = useRef(spawnDialog);
	spawnDialogRef.current = spawnDialog;
	const spawnBannerRef = useRef(spawnBanner);
	spawnBannerRef.current = spawnBanner;

	/**
	 * Initializes the WindowBridge instance to handle cross-window communication
	 * with the detached notes and table windows.
	 */
	useEffect(() => {
		const bridge = WindowBridge.create(mainBridgeIdRef.current, (message) => {
			switch (message.type) {
				case WindowBridge.MessageType.FLAGS_CHANGED: {
					// Flag changes from detached window — re-render canvas
					RenderEngine.clearAllCaches();
					DataStore.markDirty();
					Info.render();
					break;
				}
				case WindowBridge.MessageType.BANNER_ACTION: {
					break;
				}
				case WindowBridge.MessageType.TARGET_NOTE: {
					// Detached NotesWindow requested to open an event dialog in the main tab.
					const { docId, operationId } =
						message.payload as WindowBridge.TargetNotePayload;
					const event = Doc.Entity.id(appRef.current, docId);
					if (event) {
						spawnDialogRef.current(<DisplayEventDialog event={event} />);
					} else {
						// Event not loaded in main tab — fetch it from the server
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
					// Detached dialog window changed the selected event — update the main canvas crosshair.
					const { event: selectedEvent } =
						message.payload as WindowBridge.EventSelectedPayload;
					// Guard against echo: only update if the ID actually changed
					if (selectedEvent?._id !== Info.app.timeline.target?._id) {
						Info.setTimelineTarget(selectedEvent ?? null);
					}
					break;
				}
			}
		});
		mainBridgeRef.current = bridge;

		return () => {
			bridge.destroy();
			mainBridgeRef.current = null;
		};
	}, [Info]);

	// Forward theme changes to all detached windows via BroadcastChannel
	useEffect(() => {
		mainBridgeRef.current?.send(WindowBridge.MessageType.THEME_CHANGE, {
			theme: theme ?? "dark",
		});
	}, [theme]);

	// Sync operations, contexts, and files to detached windows so they can update their lists
	useEffect(() => {
		const selectedSourceIds = app.target.files
			.filter((f: Source.Type) => f.selected)
			.map((f: Source.Type) => f.id);
		mainBridgeRef.current?.send(WindowBridge.MessageType.APP_SNAPSHOT, {
			app: {
				target: {
					operations: app.target.operations,
					events: new Map(), // Omit events map as it cannot be cloned over BroadcastChannel
					filters: app.target.filters,
				},
			} as any,
			selectedSourceIds,
		});
	}, [
		app.target.files,
		app.target.operations,
		app.target.contexts,
		app.target.filters,
		app.timeline.filter,
	]);

	// Sync timeline selection to detached windows
	useEffect(() => {
		mainBridgeRef.current?.send(WindowBridge.MessageType.EVENT_SELECTED, {
			event: app.timeline.target,
		});
	}, [app.timeline.target]);

	/**
	 * Opens the detached Notes window. If the window is already open, focuses it.
	 */
	const openWindow = () => {
		if (windowRef && !windowRef.closed) {
			windowRef.focus();
			return;
		}

		const newWindow = window.open(
			"",
			"GulpNotes",
			"width=1480,height=760,left=100,top=100",
		);
		if (!newWindow) return;

		const container = document.createElement("div");
		newWindow.document.body.appendChild(container);

		copyStylesToWindow(newWindow);

		const detachedBridgeId = WindowBridge.generateId();
		const root = ReactDOM.createRoot(container);
		root.render(
			<DetachedAppProvider
				initialApp={app}
				initialNotes={[...DataStore.notes]}
				bridgeId={detachedBridgeId}
				detachedDocument={newWindow.document}
				mainSpawnBanner={spawnBanner}
			>
				<NotesWindow
					onClose={() => {
						newWindow.close();
					}}
				/>
			</DetachedAppProvider>,
		);
		notesRootRef.current = root;
		setWindowRef(newWindow);
	};

	/**
	 * Closes the detached Notes window and unmounts its React root.
	 */
	const closeWindow = () => {
		if (windowRef) {
			const root = notesRootRef.current;
			notesRootRef.current = null;
			if (root) {
				setTimeout(() => root.unmount(), 0);
			}
			windowRef.close();
			setWindowRef(null);
		}
	};

	/**
	 * Opens the detached Table View window, optionally selecting a specific source.
	 * If the window is already open, focuses it.
	 *
	 * @param sourceId - The ID of the source to select.
	 */
	const openTableWindow = useCallback(
		(sourceId?: Source.Id) => {
			if (tableWindowRef && !tableWindowRef.closed) {
				tableWindowRef.focus();
				if (sourceId) {
					mainBridgeRef.current?.send(
						WindowBridge.MessageType.TABLE_SELECT_SOURCE,
						{
							sourceId,
						},
					);
				}
				return;
			}

			const newWindow = window.open(
				"",
				"GulpTableView",
				"width=800,height=600,left=150,top=150",
			);
			if (!newWindow) return;

			const container = document.createElement("div");
			newWindow.document.body.appendChild(container);

			copyStylesToWindow(newWindow);

			const detachedBridgeId = WindowBridge.generateId();
			const root = ReactDOM.createRoot(container);
			root.render(
				<DetachedAppProvider
					initialApp={app}
					initialNotes={[...DataStore.notes]}
					bridgeId={detachedBridgeId}
					detachedDocument={newWindow.document}
					mainSpawnBanner={spawnBanner}
				>
					<TableViewWindow
						initialSourceId={sourceId}
						onClose={() => {
							newWindow.close();
						}}
					/>
				</DetachedAppProvider>,
			);
			tableRootRef.current = root;
			setTableWindowRef(newWindow);
		},
		[theme, tableWindowRef, app, copyStylesToWindow, spawnBanner],
	);

	/**
	 * Closes the detached Table view window and unmounts its React root.
	 */
	const closeTableWindow = useCallback(() => {
		if (tableWindowRef) {
			const root = tableRootRef.current;
			tableRootRef.current = null;
			if (root) {
				setTimeout(() => root.unmount(), 0);
			}
			tableWindowRef.close();
			setTableWindowRef(null);
		}
	}, [tableWindowRef]);

	/**
	 * Opens the detached Dashboard View window. If it is already open, focuses it.
	 */
	const openDashboardWindow = useCallback(() => {
		if (dashboardWindowRef && !dashboardWindowRef.closed) {
			dashboardWindowRef.focus();
			return;
		}

		const newWindow = window.open(
			"",
			"GulpDashboardView",
			"width=1480,height=820,left=180,top=120",
		);
		if (!newWindow) return;

		const container = document.createElement("div");
		newWindow.document.body.appendChild(container);

		copyStylesToWindow(newWindow);

		const detachedBridgeId = WindowBridge.generateId();
		const root = ReactDOM.createRoot(container);
		root.render(
			<DetachedAppProvider
				initialApp={app}
				initialNotes={[...DataStore.notes]}
				bridgeId={detachedBridgeId}
				detachedDocument={newWindow.document}
				mainSpawnBanner={spawnBanner}
			>
				<DashboardViewWindow
					onClose={() => {
						newWindow.close();
					}}
				/>
			</DetachedAppProvider>,
		);
		dashboardRootRef.current = root;
		setDashboardWindowRef(newWindow);
	}, [app, copyStylesToWindow, dashboardWindowRef, spawnBanner]);

	/**
	 * Closes the detached Dashboard View window and unmounts its React root.
	 */
	const closeDashboardWindow = useCallback(() => {
		if (dashboardWindowRef) {
			const root = dashboardRootRef.current;
			dashboardRootRef.current = null;
			if (root) {
				setTimeout(() => root.unmount(), 0);
			}
			dashboardWindowRef.close();
			setDashboardWindowRef(null);
		}
	}, [dashboardWindowRef]);

	// Listen for beforeunload event on the Notes window to cleanup references
	useEffect(() => {
		if (windowRef) {
			const handleBeforeUnload = () => {
				const root = notesRootRef.current;
				notesRootRef.current = null;
				if (root) {
					setTimeout(() => root.unmount(), 0);
				}
				setWindowRef(null);
			};

			windowRef.addEventListener("beforeunload", handleBeforeUnload);

			return () => {
				windowRef.removeEventListener("beforeunload", handleBeforeUnload);
			};
		}
	}, [windowRef]);

	// Sync theme to NotesWindow via direct DOM access
	useEffect(() => {
		if (!windowRef) return;
		const id = requestAnimationFrame(() => {
			applyThemeToWindow(document, windowRef.document, theme);
		});
		return () => cancelAnimationFrame(id);
	}, [theme, windowRef, applyThemeToWindow]);

	// Listen for beforeunload event on the Table window to cleanup references
	useEffect(() => {
		if (tableWindowRef) {
			const handleBeforeUnload = () => {
				const root = tableRootRef.current;
				tableRootRef.current = null;
				if (root) {
					setTimeout(() => root.unmount(), 0);
				}
				setTableWindowRef(null);
			};

			tableWindowRef.addEventListener("beforeunload", handleBeforeUnload);

			return () => {
				tableWindowRef.removeEventListener("beforeunload", handleBeforeUnload);
			};
		}
	}, [tableWindowRef]);

	// Sync theme to TableViewWindow via direct DOM access
	useEffect(() => {
		if (!tableWindowRef) return;
		const id = requestAnimationFrame(() => {
			applyThemeToWindow(document, tableWindowRef.document, theme);
		});
		return () => cancelAnimationFrame(id);
	}, [theme, tableWindowRef, applyThemeToWindow]);

	// Listen for beforeunload event on the Dashboard window to cleanup references
	useEffect(() => {
		if (dashboardWindowRef) {
			const handleBeforeUnload = () => {
				const root = dashboardRootRef.current;
				dashboardRootRef.current = null;
				if (root) {
					setTimeout(() => root.unmount(), 0);
				}
				setDashboardWindowRef(null);
			};

			dashboardWindowRef.addEventListener("beforeunload", handleBeforeUnload);

			return () => {
				dashboardWindowRef.removeEventListener("beforeunload", handleBeforeUnload);
			};
		}
	}, [dashboardWindowRef]);

	// Sync theme to DashboardViewWindow via direct DOM access
	useEffect(() => {
		if (!dashboardWindowRef) return;
		const id = requestAnimationFrame(() => {
			applyThemeToWindow(document, dashboardWindowRef.document, theme);
		});
		return () => cancelAnimationFrame(id);
	}, [theme, dashboardWindowRef, applyThemeToWindow]);

	// Auto-open or focus the Table view window when app.general.tableViewSource is set
	useEffect(() => {
		if (app.general.tableViewSource) {
			if (!tableWindowRef) {
				openTableWindow(app.general.tableViewSource.id);
			} else {
				tableWindowRef.focus();
				mainBridgeRef.current?.send(
					WindowBridge.MessageType.TABLE_SELECT_SOURCE,
					{
						sourceId: app.general.tableViewSource.id,
					},
				);
			}
			Info.setInfoByKey(null, "general", "tableViewSource");
		}
	}, [app.general.tableViewSource, tableWindowRef, openTableWindow, Info]);

	// Close Notes window when selected operation changes
	const selectedOperationId = app.target.operations.find((o) => o.selected)?.id;
	const currentUser = app.general.user;

	useEffect(() => {
		if (initialOperationRef.current === undefined) {
			initialOperationRef.current = selectedOperationId ?? null;
			return;
		}

		if (selectedOperationId !== initialOperationRef.current) {
			if (windowRef) closeWindow();
			if (dashboardWindowRef) closeDashboardWindow();
			initialOperationRef.current = selectedOperationId ?? null;
		}
	}, [selectedOperationId, windowRef, dashboardWindowRef, closeDashboardWindow]);

	// Close all detached windows on user logout
	useEffect(() => {
		if (!currentUser) {
			if (windowRef) closeWindow();
			if (tableWindowRef) closeTableWindow();
			if (dashboardWindowRef) closeDashboardWindow();
		}
	}, [currentUser, dashboardWindowRef, tableWindowRef, windowRef, closeDashboardWindow, closeTableWindow]);
	const [isPreloaded, setIsPreloaded] = useState(false);
	const dialogWindowRef = useRef<Window | null>(null);
	const dialogRootRef = useRef<ReactDOM.Root | null>(null);
	const dialogBridgeIdRef = useRef<string | null>(null);

	const unmountDialogWindow = useCallback(() => {
		const root = dialogRootRef.current;
		const win = dialogWindowRef.current;

		dialogRootRef.current = null;
		dialogBridgeIdRef.current = null;
		dialogWindowRef.current = null;

		if (root) {
			setTimeout(() => {
				root.unmount();
			}, 0);
		}

		if (win && !win.closed) {
			win.close();
		}
	}, []);

	const renderDetachedDialog = useCallback(
		(targetWindow: Window) => {
			const container =
				targetWindow.document.getElementById("detached-root") ??
				targetWindow.document.createElement("div");
			if (!container.id) {
				container.id = "detached-root";
				targetWindow.document.body.innerHTML = "";
				targetWindow.document.body.appendChild(container);
			}

			if (!dialogRootRef.current) {
				dialogRootRef.current = ReactDOM.createRoot(container);
			}

			if (!dialogBridgeIdRef.current) {
				dialogBridgeIdRef.current = WindowBridge.generateId();
			}

			dialogRootRef.current.render(
				<DetachedAppProvider
					initialApp={app}
					initialNotes={[...DataStore.notes]}
					bridgeId={dialogBridgeIdRef.current}
					detachedDocument={targetWindow.document}
					mainSpawnBanner={spawnBanner}
				>
					<DetachedDialogWindowContent dialog={dialog} />
				</DetachedAppProvider>,
			);
		},
		[app, dialog, spawnBanner],
	);

	useEffect(() => {
		if (isPreloaded) return;

		setTimeout(() => {
			setIsPreloaded(true);
		}, 500);
	}, [isPreloaded]);

	useEffect(() => {
		if (theme) {
			Color.Themer.setTheme();
		}
	}, [theme]);

	useEffect(() => {
		if (dialogWindowRef.current && !dialogWindowRef.current.closed) {
			applyThemeToWindow(document, dialogWindowRef.current.document, theme);
		}
	}, [applyThemeToWindow, theme]);

	useEffect(() => {
		const root = document.getElementById("root");
		if (!root) {
			return Logger.error("ROOT_NOT_FOUND");
		}

		root.classList[app.hidden.toasts ? "add" : "remove"]("hidden_toats");
	}, [app.hidden.toasts]);

	useEffect(() => {
		return () => {
			unmountDialogWindow();
		};
	}, [unmountDialogWindow]);

	useEffect(() => {
		if (dialogsDocked || !dialog) {
			if (dialogWindowRef.current) {
				unmountDialogWindow();
			}
			return;
		}

		let nextWindow = dialogWindowRef.current;
		if (!nextWindow || nextWindow.closed) {
			nextWindow = window.open(
				"",
				"GulpDialogWindow",
				`width=${Math.max(app.timeline.dialogSize, 480)},height=${Math.max(window.innerHeight - 160, 640)},left=${Math.max(window.innerWidth - Math.max(app.timeline.dialogSize, 480) - 48, 48)},top=60`,
			);
			if (!nextWindow) {
				setDialogsDocked(true);
				return;
			}

			nextWindow.document.title = t("operationView.eventDetailsTitle");
			copyStylesToWindow(nextWindow);
			dialogWindowRef.current = nextWindow;
			nextWindow.addEventListener(
				"beforeunload",
				() => {
					const root = dialogRootRef.current;
					dialogRootRef.current = null;
					dialogBridgeIdRef.current = null;
					dialogWindowRef.current = null;
					if (root) {
						setTimeout(() => {
							root.unmount();
						}, 0);
					}
				},
				{ once: true },
			);
		}

		renderDetachedDialog(nextWindow);
	}, [
		app.timeline.dialogSize,
		copyStylesToWindow,
		dialogsDocked,
		renderDetachedDialog,
		setDialogsDocked,
		unmountDialogWindow,
	]);

	// Listen for redock requests sent from the detached dialog window
	useEffect(() => {
		const listenId = WindowBridge.generateId();
		const bridge = WindowBridge.create(listenId, (message) => {
			if (message.type === WindowBridge.MessageType.DOCK_DIALOG) {
				setDialogsDocked(true);
			}
		});
		return () => bridge.destroy();
	}, [setDialogsDocked]);

	// When dock state changes the canvas layout shifts; trigger a canvas redraw after layout settles
	useEffect(() => {
		const id = requestAnimationFrame(() => {
			DataStore.markDirty();
		});
		return () => cancelAnimationFrame(id);
	}, [dialogsDocked]);

	/**
	 * Builds the extension plugin nodes for the Menu's plugin section.
	 * Iterates the `extensions` registry directly (already consumed at the top
	 * level via `Extension.use()`) to avoid calling `Extension.Components` — a
	 * React component that uses `useContext` internally — inside `useMemo`,
	 * which would violate the Rules of Hooks.
	 */
	const pluginNodes = useMemo<PluginNode[]>(
		() =>
			Extension.getBySlot(extensions, Extension.Slot.OperationMenu).map(
				(ext) => {
					return {
						node: (
							<Extension.Component
								key={ext.filename}
								name={ext.filename}
							/>
						),
						title: ext.display_name || ext.filename,
					};
				},
			),
		[extensions],
	);

	/**
	 * Top area menu items for the MainDashboard, grouped by category.
	 * Categories map to the original section headers: "Sources/filter", "External", "Plugins".
	 */
	const menuTopItems = useMemo<MenuItem[]>(
		() => [
			{
				label: t("operationView.menu.openNotesWindow"),
				icon: "FileText",
				category: t("operationView.menu.notesSources"),
				action: () => openWindow(),
			},
			{
				label: t("operationView.menu.openTableWindow"),
				icon: "Table",
				category: t("operationView.menu.notesSources"),
				action: () => openTableWindow(),
			},
			{
				label: t("operationView.menu.openDashboardWindow"),
				icon: "AreaChart",
				category: t("operationView.menu.notesSources"),
				action: () => openDashboardWindow(),
			},
			{
				label: t("operationView.menu.selectFilesAndContexts"),
				icon: "FileStack",
				category: t("operationView.menu.sourcesFilter"),
				action: () => spawnBanner(<SelectFiles.Banner showSession={false} />),
			},
			{
				label: t("operationView.menu.uploadFiles"),
				icon: "Upload",
				category: t("operationView.menu.sourcesFilter"),
				action: () => spawnBanner(<UploadBanner />),
			},
			{
				label: t("operationView.menu.applyFilters"),
				icon: "Filter",
				category: t("operationView.menu.sourcesFilter"),
				action: () => spawnBanner(<FilterFileBanner sources={[]} />),
			},
			{
				label: t("operationView.menu.queryExternalSource"),
				icon: "ServerCrash",
				category: t("operationView.menu.external"),
				action: () => spawnBanner(<QueryExternal.Banner />),
			},
			{
				label: t("operationView.menu.bridgeManager"),
				icon: "Network",
				category: t("operationView.menu.external"),
				action: () => spawnBanner(<BridgeManager.Banner />),
			},
			{
				label: t("operationView.menu.dataEnrichment"),
				icon: "PrismColor",
				category: t("operationView.menu.external"),
				action: () => spawnBanner(<Enrichment.Banner />),
			},
			{
				label: t("operationView.menu.uploadSigmaRule"),
				icon: "Sigma",
				category: t("common.plugins"),
				action: () => spawnBanner(<Sigma.Banner sources={[]} />),
			},
		],
		[spawnBanner, openWindow, openTableWindow, openDashboardWindow, t],
	);

	/**
	 * Bottom area menu items for the MainDashboard.
	 * These are pinned at the bottom of the side navigation panel.
	 */
	const menuBottomItems = useMemo<MenuItem[]>(
		() => [
			{
				label: t("operationView.menu.requests"),
				icon: "Activity",
				category: t("operationView.menu.configuration"),
				action: () => spawnBanner(<Requests.Banner />),
			},
			{
				label: t("operationView.menu.managePermissions"),
				icon: "LucideUserRoundPlus",
				category: t("operationView.menu.configuration"),
				action: () => navigate("/users"),
			},
			{
				label: t("operationView.menu.backToOperations"),
				icon: "Undo2",
				category: t("operationView.menu.configuration"),
				action: () => spawnBanner(<Operation.Select.Banner />),
			},
			{
				label: t("settings.title"),
				icon: "Settings",
				category: t("operationView.menu.configuration"),
				action: () => spawnBanner(<Settings.Banner />),
			},
			{
				label: hintOpen
					? t("operationView.menu.hideUsageInstructions")
					: t("operationView.menu.showUsageInstructions"),
				icon: "Info",
				category: t("operationView.menu.configuration"),
				action: toggleHintOpen,
			},
			{
				label: t("common.logout"),
				icon: "LogOut",
				category: t("operationView.menu.configuration"),
				action: () => spawnBanner(<Session.Save.Banner />),
			},
		],
		[spawnBanner, hintOpen, toggleHintOpen, t],
	);

	if (!isPreloaded) {
		return <Preloader />;
	}

	return (
		<Stack
			gap={12}
			className={s.window}
			ai="stretch"
		>
			<Menu
				topItems={menuTopItems}
				bottomItems={menuBottomItems}
				pluginNodes={pluginNodes}
			/>
			<Timeline />
			{hintOpen ? <Hint.Dialog onClose={() => setHintOpen(false)} /> : null}
			{dialogsDocked && dialog ? (
				<Stack
					className={cn(s.dialog)}
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
		</Stack>
	);
}

function DetachedDialogWindowContent({ dialog }: { dialog: React.ReactNode }) {
	const { dialog: detachedDialog, spawnDialog } = Application.use();

	useEffect(() => {
		spawnDialog(dialog);
	}, [dialog, spawnDialog]);

	return detachedDialog ?? null;
}

// Simple toast mock/fallback if needed, though toast should be imported from sonner or global
const toast = (msg: string) => {
	import("sonner").then(({ toast: t }) => t(msg));
};
