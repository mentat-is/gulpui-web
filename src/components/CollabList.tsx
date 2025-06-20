import { LinkFunctionality, NoteFunctionality } from "@/banners/Collab.functionality";
import { Delete } from "@/banners/Delete.banner";
import { Event, Link, Note } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { λLink, λNote } from "@/dto/Dataset";
import { Stack, Button, Badge } from "@impactium/components";
import { cn } from "@impactium/utils";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Markdown } from "@/ui/Markdown";
import s from './styles/Collab.module.css';
import { Select } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { debounce } from "lodash";
import React from "react"; export namespace Collab {
  export namespace List {
    export interface Props extends Stack.Props {
      notes: λNote[],
      links: λLink[]
    }
  }

  const EDIT_BUTTON_STYLE = { height: 20, marginLeft: 'auto' } as const;
  const FLEX_WRAP_STYLE = { flexWrap: 'wrap' } as const;
  const BADGE_STYLE = {
    color: 'var(--gray-900)',
    background: 'var(--gray-300)',
    whiteSpace: 'nowrap'
  } as const;

  const SelectItem = React.memo(({ item }: { item: λNote | λLink }) => {
    const itemColorStyle = useMemo(() => ({ color: item.color }), [item.color]);
    const itemIcon = useMemo(() =>
      item.type === 'note' ? Note.icon(item) : Link.icon(item),
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
    const [target, setTarget] = useState<λNote | λLink>(notes[0] || links[0])

    const debouncedSetTarget = useMemo(
      () => debounce((newTarget: λNote | λLink) => setTarget(newTarget), 16),
      []
    );
    useEffect(() => {
      const updated = target ?
        target.type === 'note' ? Note.id(app, target.id) : Link.id(app, target.id) :
        notes[0];
      const newTarget = updated || notes[0];
      if (newTarget && newTarget.id !== target?.id) {
        debouncedSetTarget(newTarget);
      }
    }, [notes, links, target?.id, debouncedSetTarget])
    if (!target) {
      return null;
    }

    const handleEditClick = useCallback(() => {
      const banner = target.type === 'note'
        ? <NoteFunctionality.Create.Banner event={Event.id(app, target.docs[0]._id)} note={target} />
        : <LinkFunctionality.Create.Banner event={Event.id(app, target.doc_id_from)} link={target} />;
      spawnBanner(banner);
    }, [target, app, spawnBanner]);
    const handleDeleteClick = useCallback(() => {
      const banner = target.type === 'note'
        ? <Delete.Note.Banner note={target} />
        : <Delete.Link.Banner link={target} />;
      spawnBanner(banner);
    }, [target, spawnBanner]);
    const handleValueChange = useCallback((v: string) => {
      const newTarget = Note.id(app, v as λNote['id']) || Link.id(app, v as λLink['id']);
      setTarget(newTarget);
    }, [app]);

    const targetColorStyle = useMemo(() => ({ color: target.color }), [target.color]);
    const Edit = useMemo(() => {
      return (
        <Button
          rounded
          variant='glass'
          img='PencilEdit'
          size='sm'
          style={EDIT_BUTTON_STYLE}
          onClick={handleEditClick}
        >
          Edit
        </Button>
      );
    }, [handleEditClick]);

    const List = useMemo(() => {
      return [...notes, ...links].map(c => (
        <SelectItem key={c.id} item={c} />
      ));
    }, [notes, links]);

    const allTags = useMemo(() => {
      return notes.map(n => n.tags).flat();
    }, [notes]);
    const targetIcon = useMemo(() => {
      return target.type === 'note' ? Note.icon(target) : Link.icon(target);
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

    const badgeVariant = target.type === 'note' ? 'teal' : 'amber';
    return (
      <Stack dir='column' ai='stretch' className={cn(s.detailed, className)} {...props}>
        <Stack dir='column' ai='stretch'>
          <Stack>
            {MemoizedSelect}
            <Button
              onClick={handleDeleteClick}
              variant='ghost'
              img='Trash2'
            >
              Delete
            </Button>
          </Stack>
          <Stack style={FLEX_WRAP_STYLE} jc='flex-start' ai='center'>
            <Badge
              variant='gray-subtle'
              icon='ClockRewind'
              style={BADGE_STYLE}
              size='sm'
            >
              Created {formatDistanceToNow(target.time_created, { addSuffix: true })}
            </Badge>
            {allTags.map((tag, index) => (
              <Badge
                key={`${tag}-${index}`}
                icon='Status'
                value={tag}
                variant={badgeVariant}
                size='sm'
              />
            ))}
            {Edit}
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