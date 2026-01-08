import { LinkFunctionality, NoteFunctionality } from "@/banners/Collab.functionality";
import { Application } from "@/context/Application.context";
import { cn } from "@impactium/utils";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Markdown } from "@/ui/Markdown";
import s from './styles/Collab.module.css';
import { Select } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
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
    const { app, spawnBanner } = Application.use();
    const hasItems = notes.length > 0 || links.length > 0;
    const [targetId, setTargetId] = useState<string>(notes[0]?.id || links[0]?.id);

    const target = useMemo(() => {
      if (!targetId) return null;
      return ( Note.Entity.id(app, targetId as Note.Id) || Link.Entity.id(app, targetId as Link.Id) ); }, [targetId, app]);

    useEffect(() => {
      setTargetId(notes[0]?.id || links[0]?.id);
    }, [notes, links]);

    const handleEditClick = useCallback(() => {
      if (!target) return;
      const banner = target.type === 'note'
        ? <NoteFunctionality.Create.Banner event={Doc.Entity.id(app, target.doc._id)} note={target} />
        : <LinkFunctionality.Create.Banner event={Doc.Entity.id(app, target.doc_id_from)} link={target as unknown as Link.Type} />;
      spawnBanner(banner);
    }, [target, app, spawnBanner]);
    const handleDeleteClick = useCallback(() => {
      if (!target) return;
      const banner = target.type === 'note'
        ? <Note.Delete.Banner note={target} />
        : <Link.Delete.Banner link={target as unknown as Link.Type} />;
      spawnBanner(banner);
    }, [target, spawnBanner]);
    const handleValueChange = useCallback((v: string) => {
      setTargetId(v);
    }, []);

    const targetColorStyle = useMemo(() => ({ color: target?.color || '#000' }), [target?.color]);

    const Edit = useMemo(() => <Button variant='secondary' icon='PencilEdit' onClick={handleEditClick} />, [handleEditClick]);

    const List = useMemo(() => {
      return [...notes, ...links].map(c => (
        <SelectItem key={c.id} item={c} />
      ));
    }, [notes, links]);

    const allTags = useMemo(() => {
      return notes.map(n => n.tags).flat();
    }, [notes]);

    const MemoizedSelect = useMemo(() => {
      if (!target) return null;
      return (
        <Select.Root onValueChange={handleValueChange}>
          <Select.Trigger style={targetColorStyle} value={target.id}>
            <Select.Icon name="Target" />
            <p>{target.name}</p>
          </Select.Trigger>
          <Select.Content>
            {List}
          </Select.Content>
        </Select.Root>
      );
    }, [handleValueChange, targetColorStyle, target, List]);

    return hasItems && target && (
      <Stack dir='column' ai='stretch' className={cn(s.detailed, className)} {...props}>
          <>
            <Stack dir='column' ai='stretch'>
              <Stack>
                {MemoizedSelect}
                {Edit}
                <Button onClick={handleDeleteClick} variant='tertiary' icon='Trash2' />
              </Stack>
              <Stack style={FLEX_WRAP_STYLE} jc='flex-start' ai='center'>
                <Badge variant='gray-subtle' icon='ClockRewind' size='sm'>
                  Created {formatDistanceToNow(
                    target.time_created,
                    { addSuffix: true }
                  )}
                </Badge>
                {allTags.map(tag => (
                  <Badge key={tag} value={tag} variant='gray-subtle' size='sm'/>
                ))}
              </Stack>
            </Stack>
            <Separator />
            <Description value={ target.type === 'note' ? target.text : target.description }/>
          </>
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
        <Button style={{ width: '100%', position: 'absolute', bottom: 0 }} variant='glass' onClick={() => setIsOpen(v => !v)} icon='AcronymMarkdown'>{inOpen ? 'Hide' : 'Reveal'} description</Button>
      </Stack>
    )
  }
}
