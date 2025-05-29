import { LinkFunctionality, NoteFunctionality } from "@/banners/Collab.functionality";
import { Delete } from "@/banners/Delete.banner";
import { Event, Link, Note } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { λLink, λNote } from "@/dto/Dataset";
import { Stack, Button, Badge } from "@impactium/components";
import { cn } from "@impactium/utils";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { Markdown } from "@/ui/Markdown";
import s from './styles/Collab.module.css';
import { Select } from "@/ui/Select";
import { Separator } from "@/ui/Separator";

export namespace Collab {
  export namespace List {
    export interface Props extends Stack.Props {
      notes: λNote[],
      links: λLink[]
    }
  }

  export function List({ notes, links, className, ...props }: Collab.List.Props) {
    if (notes.length === 0 && links.length === 0) {
      return null
    }

    const { app, spawnBanner } = useApplication();
    const [target, setTarget] = useState<λNote | λLink>(notes[0] || links[0])
    const [inOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
      const updated = target ? target.type === 'note' ? Note.id(app, target.id) : Link.id(app, target.id) : notes[0];

      setTarget(updated || notes[0])
    }, [notes, links])

    if (!target) {
      return null;
    }

    const Edit = useMemo(() => {
      const callback = target.type === 'note'
        ? () => spawnBanner(<NoteFunctionality.Create.Banner event={Event.id(app, target.docs[0].id)} note={target} />)
        : () => spawnBanner(<LinkFunctionality.Create.Banner event={Event.id(app, target.doc_id_from)} link={target} />);

      return <Button rounded variant='glass' img='PencilEdit' size='sm' style={{ height: 20, marginLeft: 'auto' }} onClick={callback}>Edit</Button>
    }, [target])

    const List = useMemo(() => {
      return (
        [...notes, ...links].map(c => (
          <Select.Item style={{ color: c.color }} value={c.id}>
            <Select.Icon name={c.type === 'note' ? Note.icon(c) : Link.icon(c)} />
            <p>{c.name}</p>
          </Select.Item>
        ))
      )
    }, [notes, links]);

    return (
      <Stack dir='column' ai='stretch' className={cn(s.detailed, className)} {...props}>
        <Stack dir='column' ai='stretch'>
          <Stack>
            <Select.Root onValueChange={(v) => setTarget(Note.id(app, v as λNote['id']) || Link.id(app, v as λLink['id']))}>
              <Select.Trigger style={{ color: target.color }} value={target.id}>
                <Select.Icon name={target.type === 'note' ? Note.icon(target) : Link.icon(target)} />
                <p>{target.name}</p>
              </Select.Trigger>
              <Select.Content>
                {List}
              </Select.Content>
            </Select.Root>
            <Button onClick={() => spawnBanner(target.type === 'note' ? <Delete.Note.Banner note={target} /> : <Delete.Link.Banner link={target} />)} variant='ghost' img='Trash2'>Delete</Button>
          </Stack>
          <Stack style={{ flexWrap: 'wrap' }} jc='flex-start' ai='center'>
            <Badge variant='gray-subtle' icon='ClockRewind' style={{ color: 'var(--gray-900)', background: 'var(--gray-300)', whiteSpace: 'nowrap' }} size='sm'>
              Created {formatDistanceToNow(target.time_created, { addSuffix: true })}
            </Badge>
            {notes.map(n => n.tags).flat().map(tag => <Badge icon='Status' value={tag} variant={target.type === 'note' ? 'teal' : 'amber'} size='sm' />)}
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