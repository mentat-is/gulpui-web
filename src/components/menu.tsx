import s from "./styles/menu.module.css";
import { UploadBanner } from "@/banners/Upload.banner";
import { Application } from "@/context/Application.context";
import { SelectFiles } from "@/banners/SelectFiles.banner";
import { Sigma } from "@/banners/Sigma";
import { QueryExternal } from "@/banners/QueryExternal.banner";
import { Enrichment } from "@/banners/Enrichment.banner";
import { Permissions } from "@/banners/Permissions.banner";
import { Requests } from "@/banners/Requests.banner";
import { Session } from "@/banners/Session.banner";
import { Extension } from "@/context/Extension.context";
import { FilterFileBanner } from "@/banners/FilterFile.banner";
import { Settings } from "@/banners/Settings.banner";
import { BridgeManager } from "@/banners/BridgeManager.banner";
import { Stack } from "@/ui/Stack";
import { Button } from "@/ui/Button";
import { Source } from "@/entities/Source";
import { Operation } from "@/entities/Operation";
import React, { useEffect, useState, useRef } from "react";
import { cn } from "@impactium/utils";

export function Menu() {
	const { app, hintOpen, toggleHintOpen, spawnBanner, Info } =
		Application.use();
	const { extensions } = Extension.use();
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isOpen &&
				menuRef.current &&
				!menuRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	useEffect(() => {
		Info.request_list();
	}, []);

	const backToOperations = () => {
		spawnBanner(<Operation.Select.Banner />);
	};

	const enrichment = () => {
		spawnBanner(<Enrichment.Banner />);
	};

	const logoutButtonClickHandler = () => spawnBanner(<Session.Save.Banner />);

	const handleAction = (fn?: () => void) => {
		if (fn) fn();
		setIsOpen(false);
	};

	const ActionButton = ({ title, icon, onClick, children, className }: any) => {
		return (
			<Button
				variant="secondary"
				title={title}
				icon={icon}
				size="md"
				className={cn(className, s.actionBtn, isOpen && s.actionBtnExpanded)}
				onClick={() => handleAction(onClick)}
			>
				{isOpen && <span className={s.btnLabel}>{title}</span>}
				{children}
			</Button>
		);
	};

	const extensionNodes = Extension.Components({ type: "menu" });
	const pluginItems = React.Children.map(extensionNodes, (child) => {
		if (React.isValidElement(child)) {
			const childElement = child as React.ReactElement<any>;
			const name = childElement.props.name;
			const ext = extensions[name];
			const title = childElement.props.title || (ext ? ext.display_name : name);

			return (
				<div
					onClickCapture={() => setIsOpen(false)}
					className={cn(s.pluginWrapper, isOpen && s.pluginWrapperExpanded)}
				>
					{React.cloneElement(childElement, {
						props: {
							...childElement.props.props,
							children: isOpen ? " " : undefined,
						},
					})}
					{isOpen && <span className={s.pluginLabelOverlay}>{title}</span>}
				</div>
			);
		}
		return child;
	});

	return (
		<div
			ref={menuRef}
			className={cn(s.menuWrapper, isOpen && s.menuWrapperExpanded)}
		>
			<Stack
				className={cn(s.menu, isOpen && s.expanded)}
				dir="column"
				ai={isOpen ? "stretch" : "flex-start"}
				gap={12}
			>
				<Button
					variant="secondary"
					title={isOpen ? "Close Menu" : "Expand Menu"}
					icon="MenuAlt"
					size="md"
					className={cn(s.actionBtn, isOpen && s.actionBtnExpanded)}
					onClick={() => setIsOpen(!isOpen)}
				>
					{isOpen && (
						<span className={s.btnLabel}>
							{isOpen ? "Close Menu" : "Expand Menu"}
						</span>
					)}
				</Button>

				<Stack
					ai={isOpen ? "stretch" : "center"}
					jc="flex-start"
					dir="column"
					gap={8}
					className={s.scroll}
				>
					<Stack
						dir="column"
						gap={4}
						className={s.section}
					>
						{isOpen && <div className={s.sectionTitle}>Sources/filter</div>}
						<ActionButton
							title="Select files and contexts"
							icon="FileStack"
							className={cn(s.relative, isOpen && s.expanded)}
							onClick={() => spawnBanner(<SelectFiles.Banner />)}
						>
							<Button
								asChild
								className={cn(s.file_counter)}
								size="sm"
								variant="glass"
							>
								<span>{Source.Entity.selected(app).length}</span>
							</Button>
						</ActionButton>
						<ActionButton
							title="Upload files"
							icon="Upload"
							onClick={() => spawnBanner(<UploadBanner />)}
						/>
						<ActionButton
							title="Apply filters"
							icon="Filter"
							onClick={() => spawnBanner(<FilterFileBanner sources={[]} />)}
						/>
					</Stack>

					<Stack
						dir="column"
						gap={4}
						className={s.section}
					>
						{isOpen && <div className={s.sectionTitle}>External</div>}
						<ActionButton
							title="Query external source"
							icon="ServerCrash"
							onClick={() => spawnBanner(<QueryExternal.Banner />)}
						/>
						<ActionButton
							title="Bridge Manager"
							icon="Network"
							onClick={() => spawnBanner(<BridgeManager.Banner />)}
						/>
						<ActionButton
							title="Data enrichment"
							icon="PrismColor"
							onClick={enrichment}
						/>
					</Stack>

					<Stack
						dir="column"
						gap={4}
						className={s.section}
					>
						{isOpen && <div className={s.sectionTitle}>Plugins</div>}
						<ActionButton
							title="Upload sigma rule"
							icon="Sigma"
							onClick={() => spawnBanner(<Sigma.Banner sources={[]} />)}
						/>
						{pluginItems}
					</Stack>
				</Stack>

				<Stack
					flex
					className={s.spacer}
				/>

				<Stack
					dir="column"
					gap={8}
					ai={isOpen ? "stretch" : "center"}
					className={s.bottomArea}
				>
					<ActionButton
						className={s.requests}
						title="Requests"
						icon="Activity"
						onClick={() => spawnBanner(<Requests.Banner />)}
					>
						<span
							className={cn(s.requestsBadge, isOpen && s.requestsBadgeExpanded)}
						>
							{
								app.general.requests.filter(
									(r) => r.status === "pending" || r.status === "ongoing",
								).length
							}
						</span>
					</ActionButton>
					<ActionButton
						title="Manage Permissions"
						icon="UserSettings"
						onClick={() => spawnBanner(<Permissions.Banner />)}
					/>
					<ActionButton
						title="Back to operations"
						icon="Undo2"
						onClick={backToOperations}
					/>
					<ActionButton
						title="Settings"
						icon="SettingsGear"
						onClick={() => spawnBanner(<Settings.Banner />)}
					/>
					<ActionButton
						title={
							hintOpen ? "Hide usage instructions" : "Show usage instructions"
						}
						icon="Info"
						onClick={toggleHintOpen}
					/>
					<ActionButton
						title="Logout"
						icon="LogOut"
						onClick={logoutButtonClickHandler}
					/>
				</Stack>
			</Stack>
		</div>
	);
}
