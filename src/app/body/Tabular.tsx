import { Table } from "@/components/Table";
import { Application } from "@/context/Application.context";
import { Context } from "@/entities/Context";
import { Stack } from "@/ui/Stack";
import { useState } from "react";
import s from './styles/Tabular.module.css';
import { cn } from "@impactium/utils";
import { Icon } from "@impactium/icons";
import { Source } from "@/entities/Source";
import { Button } from "@/ui/Button";

export namespace Tabular {
  export interface Props {

  }
}

export function Tabular({ ...props }) {
  const { app } = Application.use();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const contexts = Context.Entity.selected(app);

  const expandToggleButtonClickHandlerConstructor = (id: string) => () => setExpanded(expanded => {
    expanded[expanded.has(id) ? 'delete' : 'add'](id);

    return new Set(...expanded.values());
  })

  const ContextTable = ({ context }: {
    context: Context.Type
  }) => {
    const isExpanded = expanded.has(context.id);

    const sources = Context.Entity.sources(app, context);

    return (
      <Stack className={cn(s.entity, s.context, s.expanded)} dir='column' gap={0} ai='stretch' flex={0}>
        <Button variant='tertiary' className={s.header} icon={isExpanded ? 'ChevronRight' : 'ChevronDown'} onClick={expandToggleButtonClickHandlerConstructor(context.id)}>
          {context.name}
        </Button>
        <Stack className={s.body} style={{ height: 32 * sources.length }} gap={0} dir='column' ai='stretch' flex={0}>
          {sources.map(source => (
            <SourceTable source={source} />
          ))}
        </Stack>
      </Stack>
    )
  }

  const SourceTable = ({ source }: {
    source: Source.Type
  }) => {
    const isExpanded = expanded.has(source.id);

    const events = Source.Entity.events(app, source);

    return (
      <Stack className={cn(s.entity, s.source, s.expanded)} dir='column' gap={0} ai='stretch' flex={0}>
        <Button variant='tertiary' className={s.header} icon={isExpanded ? 'ChevronRight' : 'ChevronDown'} onClick={expandToggleButtonClickHandlerConstructor(source.id)}>
          {source.name}
        </Button>
        <Stack className={s.body}>
          <Table values={events} />
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack className={s.table} dir='column' gap={8} ai='stretch'>
      {contexts.map(context => (
        <ContextTable context={context} />
      ))}
    </Stack>

  )
}
