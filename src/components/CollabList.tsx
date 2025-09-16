import { LinkFunctionality, NoteFunctionality } from "@/banners/Collab.functionality";
import { useApplication } from "@/context/Application.context";
import { cn } from "@impactium/utils";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Markdown } from "@/ui/Markdown";
import s from './styles/Collab.module.css';
import { Select } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { Extension } from "@/context/Extension.context";
import { Stack } from "@/ui/Stack";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Note } from "@/entities/Note";
import { Link } from "@/entities/Link";
import { Doc } from "@/entities/Doc";

export namespace Collab {
  export namespace List {
    export interface Props extends Stack.Props {
      notes: Note.Type[],
      links: Link.Type[]
    }
  }

  const EDIT_BUTTON_STYLE = { height: 20, marginLeft: 'auto' } as const;
  const FLEX_WRAP_STYLE = { flexWrap: 'wrap' } as const;

  const SelectItem = memo(({ item }: { item: Note.Type | Link.Type }) => {
    const itemColorStyle = useMemo(() => ({ color: item.color }), [item.color]);
    const itemIcon = useMemo(() =>
      item.type === 'note' ? Note.Entity.icon(item) : Link.Entity.icon(item),
      [item.type, item]
    );
    return (
      <Select.Item style={itemColorStyle} value={item.id}>
        <Select.Icon name={itemIcon} />
        <p>{item.name}</p>
      </Select.Item>
    );
  }, (prevProps, nextProps) => {
    return prevProps.item.id === nextProps.item.id &&
      prevProps.item.color === nextProps.item.color &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.type === nextProps.item.type;
  });
  export function List({ notes, links, className, ...props }: Collab.List.Props) {
    if (notes.length === 0 && links.length === 0) {
      return null
    }
    const { app, spawnBanner } = useApplication();
    const [target, setTarget] = useState<Note.Type | Link.Type>(notes[0] || links[0])

    useEffect(() => {
      setTarget(notes[0] || links[0]);
    }, [notes, links])
    if (!target) {
      return null;
    }

    const handleEditClick = useCallback(() => {
      const banner = target.type === 'note'
        ? <NoteFunctionality.Create.Banner event={Doc.Entity.id(app, target.doc._id)} note={target} />
        : <LinkFunctionality.Create.Banner event={Doc.Entity.id(app, target.doc_id_from)} link={target} />;
      spawnBanner(banner);
    }, [target, app, spawnBanner]);
    const handleDeleteClick = useCallback(() => {
      const banner = target.type === 'note'
        ? <Note.Delete.Banner note={target} />
        : <Link.Delete.Banner link={target} />;
      spawnBanner(banner);
    }, [target, spawnBanner]);
    const handleValueChange = useCallback((v: string) => {
      const newTarget = Note.Entity.id(app, v as Note.Id) || Link.Entity.id(app, v as Link.Id);
      setTarget(newTarget);
    }, [app]);

    const targetColorStyle = useMemo(() => ({ color: target.color }), [target.color]);
    const Edit = useMemo(() => <Button variant='secondary' img='PencilEdit' onClick={handleEditClick} />, [handleEditClick]);

    const List = useMemo(() => {
      return [...notes, ...links].map(c => (
        <SelectItem key={c.id} item={c} />
      ));
    }, [notes, links]);

    const allTags = useMemo(() => {
      return notes.map(n => n.tags).flat();
    }, [notes]);

    const targetIcon = useMemo(() => {
      return target.type === 'note' ? Note.Entity.icon(target) : Link.Entity.icon(target);
    }, [target]);

    const MemoizedSelect = useMemo(() => {
      return (
        <Select.Root onValueChange={handleValueChange}>
          <Select.Trigger style={targetColorStyle} value={target.id}>
            <Select.Icon name={targetIcon} />
            <p>{target.name}</p>
          </Select.Trigger>
          <Select.Content>
            {List}
          </Select.Content>
        </Select.Root>
      )
    }, [handleValueChange, targetColorStyle, target, targetIcon, List]);

    return (
      <Stack dir='column' ai='stretch' className={cn(s.detailed, className)} {...props}>
        <Stack dir='column' ai='stretch'>
          <Stack>
            {MemoizedSelect}
            <Extension.Component name='Storyline.popover.tsx' />
            {Edit}
            <Button onClick={handleDeleteClick} variant='tertiary' img='Trash2' />
          </Stack>
          <Stack style={FLEX_WRAP_STYLE} jc='flex-start' ai='center'>
            <Badge
              variant='gray-subtle'
              icon='ClockRewind'
              size='sm'
            >
              Created {formatDistanceToNow(target.time_created, { addSuffix: true })}
            </Badge>
            {allTags.map((tag, index) => (
              <Badge
                key={tag}
                value={tag}
                variant='gray-subtle'
                size='sm'
              />
            ))}
          </Stack>
        </Stack>
        <Separator />
        <Description value={target.type === 'note' ? target.text : target.description} />
      </Stack>
    )
  }
  export namespace Description {
    export interface Props {
      value: string
      isDefaultOpen?: boolean
    }
  }
  export function Description({ value, isDefaultOpen = false }: Description.Props) {
    const [inOpen, setIsOpen] = useState<boolean>(isDefaultOpen)
    return (
      <Stack dir='column' style={{ minHeight: 32 }} gap={0} ai='unset' pos='relative'>
        <Markdown className={cn(s.description, inOpen && s.revealed)} value={value} />
        <Button style={{ width: '100%', position: 'absolute', bottom: 0 }} variant='glass' onClick={() => setIsOpen(v => !v)} img='AcronymMarkdown'>{inOpen ? 'Hide' : 'Reveal'} description</Button>
      </Stack>
    )
  }
}