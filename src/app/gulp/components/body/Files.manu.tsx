import s from './../../Gulp.module.css';
import { Engine } from '@/class/Engine.dto';
import { Filter } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { enginesBase } from '@/dto/Engine.dto';
import { λSource } from '@/dto/Operation.dto';
import { ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

interface TargetMenuProps {
  sources: λSource[];
  inputRef: React.RefObject<HTMLInputElement>;
}

export function FilesMenu({ sources, inputRef }: TargetMenuProps) {
  const { Info, app } = useApplication();

  if (!sources.length) return null;

  const removeFilters = (sources: λSource[]) => {
    sources.forEach(Info.filters_remove);

    setTimeout(() => {
      Info.refetch({
        ids: sources.map(source => source.id)
      });
    }, 300);
  }

  const engineChangeHandler = (sources: λSource[], engine: Engine.List) => Info.files_replace(sources.map(source => ({ ...source, engine })));

  return (
    <ContextMenuContent data-state='open'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuLabel className={s.cm_title}>{sources.length === 1 ? sources[0].name : `Selected ${sources.length} sources`}</ContextMenuLabel>
          </TooltipTrigger>
          <TooltipContent>
            {sources.length === 1 ? sources[0].name : sources.map(source => source.id).join('\n')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger img='Cpu'>Render method</ContextMenuSubTrigger>
        <ContextMenuSubContent>
        {enginesBase.map(i => <ContextMenuItem onClick={() => engineChangeHandler(sources, i.plugin)} img={i.img}>{i.title}</ContextMenuItem>)}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Filters</ContextMenuLabel>
        {Filter.findMany(app, sources) && <ContextMenuItem onClick={() => removeFilters(sources)} img='FilterX'>Clear all filters for all selected sources</ContextMenuItem>}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem onClick={() => Info.files_unselect(sources)} img='EyeOff'>Hide</ContextMenuItem>
        <ContextMenuSub>
        <ContextMenuSubTrigger img='Move'>Reorder</ContextMenuSubTrigger>
      </ContextMenuSub>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Sigma</ContextMenuLabel>
        <ContextMenuItem onClick={() => inputRef.current?.click()} img='Sigma'>Upload rule</ContextMenuItem>
      </ContextMenuGroup>
    </ContextMenuContent>
  )
}