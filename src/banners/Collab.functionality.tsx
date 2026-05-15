import { Application } from "@/context/Application.context";
import { Banner as UIBanner } from "@/ui/Banner";
import {
	ColorPicker,
	ColorPickerPopover,
	ColorPickerTrigger,
} from "@/ui/Color";
import { useCallback, useMemo, useRef, useState } from "react";
import s from "./styles/CreateNoteBanner.module.css";
import { Separator } from "@/ui/Separator";
import { Default } from "@/dto/Dataset";
import { Icon } from "@impactium/icons";
import { Textarea } from "@/ui/Textarea";
import { Markdown } from "@/ui/Markdown";
import { Toggle } from "@/ui/Toggle";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Stack } from "@/ui/Stack";
import { Button } from "@/ui/Button";
import { Doc } from "@/entities/Doc";
import { Note } from "@/entities/Note";
import { Glyph } from "@/entities/Glyph";
import { Operation } from "@/entities/Operation";
import { Context } from "@/entities/Context";
import { Source } from "@/entities/Source";
import { Link } from "@/entities/Link";
import { Select } from "@/ui/Select";

export namespace NoteFunctionality {
	export namespace Create {
		export namespace Banner {
			export interface Props extends UIBanner.Props {
				note?: Note.Type;
				event?: Doc.Type;
				events?: Doc.Type[];
				container?: HTMLElement | null;
			}
		}

		export function Banner({
			note,
			event,
			events,
			container,
			...props
		}: NoteFunctionality.Create.Banner.Props) {
			const { app, destroyBanner, Info } = Application.use();
			const [color, setColor] = useState<string>(note?.color || "#ffffff");
			const [name, setName] = useState<string>(note?.name || "");
			const [text, setText] = useState<string>(note?.text || "");
			const [rawTags, setRawTags] = useState<string>(
				note?.tags ? note.tags.join(", ") : "",
			);
			const [isPrivate, setIsPrivate] = useState<boolean>(false);
			const [icon, setIcon] = useState<Glyph.Id | null>(
				note?.glyph_id || Glyph.List.keys().next().value || null,
			);
			const [loading, setLoading] = useState<boolean>(false);	

			const Sidebar = useMemo(() => {
				return (
					<Stack
						className={s.sidebar}
						ai="flex-start"
					>
						<Markdown value={text} />
					</Stack>
				);
			}, [text]);

			const send = async () => {
				const operation = Operation.Entity.selected(app);

				if (!operation) {
					return;
				}

				const glyph_id = icon as Glyph.Id;

				const tags = rawTags
					.split(",")
					.map((tag) => tag.trim())
					.filter((t) => t.length);

				setLoading(true);

				if (note?.id) {
					await Info.note_edit({
						id: note.id,
						name,
						text,
						color,
						event: event!,
						glyph_id,
						tags,
					});
				} else if (events && events.length > 0) {
					for (const e of events) {
						await Info.note_create({
							color,
							event: e,
							glyph_id,
							name,
							text,
							isPrivate,
							tags,
						});
					}
				} else if (event) {
					await Info.note_create({
						color,
						event,
						glyph_id,
						name,
						text,
						isPrivate,
						tags,
					});
				}

				setLoading(false);
				destroyBanner();
			};

			return (
				<UIBanner
					title={note?.id ? "Edit note" : "Create note"}
					done={
						<Button
							loading={loading}
							onClick={send}
							variant={name && text ? "glass" : "disabled"}
							icon="Check"
						/>
					}
					side={Sidebar}
					{...props}
				>
					<Stack
						className={s.general}
						ai="stretch"
						dir="column"
						gap={8}
					>
						<Input
							label="Context"
							variant="highlighted"
							className={s.inp_input}
							disabled
							value={
								(() => {
									if (events && events.length > 1) return `Multiple Contexts (${new Set(events.map(e => Doc.Entity.contextId(app, e))).size})`;
									const targetEvent = event || events?.[0];
									if (!targetEvent) return "Unknown Context";
									const contextId = Doc.Entity.contextId(app, targetEvent);
									return contextId ? Context.Entity.id(app, contextId)?.name : "Deleted Context";
								})()
							}
							icon={Default.Icon.CONTEXT}
						/>
						<Input
							label="Source"
							variant="highlighted"
							className={s.inp_input}
							disabled
							value={
								(() => {
									if (events && events.length > 1) return `Multiple Sources (${new Set(events.map(e => e["gulp.source_id"])).size})`;
									const targetEvent = event || events?.[0];
									if (!targetEvent) return "Unknown Source";
									return Source.Entity.id(app, targetEvent["gulp.source_id"])?.name || "Deleted Source";
								})()
							}
							icon={Default.Icon.SOURCE}
						/>
						<Input
							label="Event"
							variant="highlighted"
							className={s.inp_input}
							disabled
							value={
								events && events.length > 1 
									? `${events.length} events selected` 
									: (event || events?.[0])?._id || "Unknown Event"
							}
							icon="Triangle"
						/>
					</Stack>
					<Separator />
					<Input
						label="Title"
						value={name}
						icon="TextTitle"
						onChange={(e) => setName(String(e.currentTarget.value))}
						placeholder="Note title"
						variant="highlighted"
						className={s.inp_input}
					/>
					<Stack className={s.chooser_wrapper}>
						<Glyph.Chooser
							label="Glyph"
							icon={icon}
							setIcon={setIcon}
							container={container}
						/>
						<Stack
							dir="column"
							gap={6}
							ai="flex-start"
							data-input
						>
							<Label value="Pick a color" />
							<ColorPicker
								color={color}
								setColor={setColor}
							>
								<ColorPickerTrigger />
								<ColorPickerPopover container={container} />
							</ColorPicker>
						</Stack>
					</Stack>
					<Input
						placeholder="Tags separated by comma"
						value={rawTags}
						onChange={(e) => setRawTags(e.target.value)}
					/>
					{note?.id ? null : (
						<Toggle
							option={["Public", "Private"]}
							checked={isPrivate}
							onCheckedChange={setIsPrivate}
						/>
					)}
					<Textarea
						className={s.textarea}
						value={text}
						onChange={(e) => setText(String(e.currentTarget.value))}
						placeholder="Note text"
					/>
					<Stack
						gap={4}
						style={{
							color: "var(--gray-900)",
							marginLeft: "auto",
							fontSize: 13,
						}}
					>
						<Icon
							name="AcronymMarkdown"
							size={20}
						/>
						markdown supported.
					</Stack>
				</UIBanner>
			);
		}
	}
}

export namespace LinkFunctionality {
	export namespace Create {
		export namespace Banner {
			export interface Props extends UIBanner.Props {
				event: Doc.Type;
				link?: Link.Type;
				initialDocIds?: Doc.Id[];
				showBackButton?: boolean;
			}
		}

		export function Banner({
			link,
			event,
			initialDocIds,
			showBackButton = true,
			...props
		}: LinkFunctionality.Create.Banner.Props) {
			const { app, destroyBanner, Info } = Application.use();
			const [color, setColor] = useState<string>(
				link?.color || Default.Color.LINK,
			);
			const [icon, setIcon] = useState<Glyph.Id | null>(
				link?.glyph_id || Glyph.List.keys().next().value || null,
			);
			const [name, setName] = useState<string>(link?.name || "");
			const [description, setDescription] = useState<string>(
				link?.description || "",
			);
			const [loading, setLoading] = useState<boolean>(false);

			const context = useMemo(() => {
				const contextId = Doc.Entity.contextId(app, event);
				return contextId ? Context.Entity.id(app, contextId) : undefined;
			}, [app, event]);

			const file = useMemo(() => {
				return Source.Entity.id(app, event["gulp.source_id"]);
			}, [app, event]);

			const handleBack = useCallback(() => {
				destroyBanner();
				props.back?.();
			}, [destroyBanner, props]);

			const handleClose = useCallback(() => {
				props.onClose?.();
				if (props.back) {
					window.setTimeout(() => props.back?.(), 0);
				}
			}, [props]);

			const send = async () => {
				setLoading(true);

				const glyph_id = icon as Glyph.Id;

				if (link) {
					await Info.link_edit({
						id: link.id,
						color,
						description,
						events: link.doc_ids,
						glyph_id,
						name,
					}).then(() => {
						destroyBanner();
						props.back?.();
					});
				} else {
					await Info.link_create({
						name,
						glyph_id,
						color,
						event,
						doc_ids: initialDocIds,
						description,
					}).then(() => {
						destroyBanner();
						props.back?.();
					});
				}
				setLoading(false);
			};

			const Done = useCallback(() => {
				return (
					<Button
						loading={loading}
						onClick={send}
						variant="glass"
						disabled={!name || !icon}
						icon="Check"
					/>
				);
			}, [loading, name, send]);

			return (
				<UIBanner
					{...props}
					title="Create link"
					done={<Done />}
					back={props.back && showBackButton ? handleBack : undefined}
					onClose={handleClose}
				>
					<Stack
						className={s.general}
						ai="stretch"
						dir="column"
						gap={8}
					>
						<Input
							label="Context"
							variant="highlighted"
							className={s.inp_input}
							disabled
							value={context?.name || "Deleted Context"}
							icon={Default.Icon.CONTEXT}
						/>
						<Input
							label="Source"
							variant="highlighted"
							className={s.inp_input}
							disabled
							value={file?.name || "Deleted Source"}
							icon={Default.Icon.SOURCE}
						/>
						<Input
							label="Event"
							variant="highlighted"
							className={s.inp_input}
							disabled
							value={event._id}
							icon="Triangle"
						/>
						<Separator />
						<Input
							label="Title"
							value={name}
							variant="highlighted"
							icon="TextTitle"
							onChange={(e) => setName(String(e.currentTarget.value))}
							placeholder="Link title"
						/>
						<Stack className={s.chooser_wrapper}>
							<Glyph.Chooser
								label="Glyph"
								icon={icon}
								setIcon={setIcon}
							/>
							<Stack
								dir="column"
								gap={6}
								ai="flex-start"
								data-input
							>
								<Label value="Pick a color" />
								<ColorPicker
									color={color}
									setColor={setColor}
								>
									<ColorPickerTrigger />
									<ColorPickerPopover />
								</ColorPicker>
							</Stack>
						</Stack>
						<Textarea
							className={s.textarea}
							value={description}
							onChange={(e) => setDescription(String(e.currentTarget.value))}
							placeholder="Link description"
						/>
						<Stack
							gap={4}
							style={{
								color: "var(--gray-900)",
								marginLeft: "auto",
								fontSize: 13,
							}}
						>
							<Icon
								name="AcronymMarkdown"
								size={20}
							/>
							markdown supported.
						</Stack>
					</Stack>
				</UIBanner>
			);
		}
	}

	export namespace Connect {
		export interface Props {
			event: Doc.Type;
		}
		export function Banner({ event }: LinkFunctionality.Connect.Props) {
			const { app, Info, destroyBanner, spawnBanner } = Application.use();

			const links = useMemo(
				() => Link.Entity.selected(app),
				[app.timeline.renderVersion],
			);

			const [loading, setLoading] = useState<boolean>(false);

			// Returns a list of already connected links. Updates together with links
			const alreadyConnectedLinks = useMemo(
				() =>
					links
						.filter((link) => link.doc_ids.includes(event._id))
						.map((link) => link.id),
				[links, event],
			);

			const handleChange = useCallback(
				async (nextIds: string[]) => {
					setLoading(() => true);
					const prev = new Set(alreadyConnectedLinks);
					const next = new Set(nextIds);

					const toConnect = links.filter(
						(l) => next.has(l.id) && !prev.has(l.id),
					);
					const toDisconnect = links.filter(
						(l) => prev.has(l.id) && !next.has(l.id),
					);

					for (const link of toConnect) await Info.links_connect(link, event);
					for (const link of toDisconnect)
						await Info.links_disconnect(link, event);
					setLoading(() => false);
				},
				[alreadyConnectedLinks, links],
			);

			const handleCreateLink = useCallback(() => {
				spawnBanner(
					<LinkFunctionality.Create.Banner
						event={event}
						initialDocIds={[]}
						showBackButton={false}
						back={() => spawnBanner(<LinkFunctionality.Connect.Banner event={event} />)}
					/>,
				);
			}, [event, spawnBanner]);

			return (
				<UIBanner
					title="Connect link to event"
				>
					<Select.Multi.Root
						value={alreadyConnectedLinks}
						onValueChange={handleChange}
						disabled={loading}
					>
						<Select.Trigger>
							<Select.Multi.Value
								icon={["DataPointMedium", "DataPoint"]}
								placeholder="Select links to be connected with this event"
								text={(len) => `Connected with ${len} links`}
							/>
						</Select.Trigger>
						<Select.Content>
							{links.map((link) => (
								<Select.Item
									key={link.id}
									value={link.id}
									style={{ color: link.color }}
									disabled={loading}
								>
									<Select.Icon name={Link.Entity.icon(link)} />
									{link.name}
								</Select.Item>
							))}
							<Stack
								gap={6}
								jc="center"
								style={{
									width: "100%",
									padding: "8px 10px",
									color: "var(--gray-800)",
									textAlign: "center",
									opacity: loading ? 0.6 : 1,
								}}
							>
								<Select.Icon name="GitMerge" />
								{`Select links to connect to document ${event._id}`}
							</Stack>
						</Select.Content>
					</Select.Multi.Root>
					<Button
						onClick={handleCreateLink}
						variant="secondary"
						icon="GitPullRequestCreate"
						style={{ width: "100%" }}
					>
						Create new link
					</Button>
				</UIBanner>
			);
		}
	}
}
