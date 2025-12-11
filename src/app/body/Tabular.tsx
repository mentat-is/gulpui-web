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

  const contexts = Context.Entity.selected(app);

  const ContextTable = ({ context }: { context: Context.Type }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const sources = Context.Entity.sources(app, context);

    return (
      <Stack className={cn(s.entity, s.context, isExpanded && s.expanded)} dir='column' gap={0} ai='stretch' flex={0}>
        <Button
          variant='tertiary'
          className={s.header}
          icon={isExpanded ? 'ChevronDown' : 'ChevronRight'}
          onClick={() => setIsExpanded(prev => !prev)}
        >
          {context.name}
        </Button>
        <Stack
          className={s.body}
          gap={0} dir='column' ai='stretch' flex={0}
        >
          {sources.map(source => (
            <SourceTable key={source.id} source={source} />
          ))}
        </Stack>
      </Stack>
    );
  };

  const SourceTable = ({ source }: { source: Source.Type }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const events = Source.Entity.events(app, source);

    return (
      <Stack className={cn(s.entity, s.source, isExpanded && s.expanded)} dir='column' gap={0} ai='stretch' flex={'unset'}>
        <Button
          variant='tertiary'
          className={s.header}
          icon={isExpanded ? 'ChevronDown' : 'ChevronRight'}
          onClick={() => setIsExpanded(prev => !prev)}
        >
          {source.name}
        </Button>
        <Stack
          className={s.body}
          ai='flex-start' jc='flex-start'
        >
          <Table values={events.slice(0, 200)} />
        </Stack>
      </Stack>
    );
  };


  return (
    <Stack className={s.table} dir='column' gap={8} ai='stretch'>
      {contexts.map(context => (
        <ContextTable key={context.id} context={context} />
      ))}
    </Stack>

  )
}
