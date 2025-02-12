import s from './../../Gulp.module.css';
import { Engine } from '@/class/Engine.dto';
import { Filter } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { enginesBase } from '@/dto/Engine.dto';
import { λFile } from '@/dto/Dataset';
import { ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

interface TargetMenuProps {
  files: λFile[];
}

export function FilesMenu({ files }: TargetMenuProps) {
  const { Info, app } = useApplication();

  if (!files.length) return null;

  const removeFilters = (files: λFile[]) => {
    files.forEach(Info.filters_remove);

    setTimeout(() => {
      Info.refetch({
        ids: files.map(file => file.id)
      });
    }, 300);
  }

  return (
    <ContextMenuContent data-state='open'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuLabel className={s.cm_title}>{files.length === 1 ? files[0].name : `Selected ${files.length} files`}</ContextMenuLabel>
          </TooltipTrigger>
          <TooltipContent>
            {files.length === 1 ? files[0].name : files.map(file => file.id).join('\n')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger img='Cpu'>Render method</ContextMenuSubTrigger>
        <ContextMenuSubContent>
        {enginesBase.map(i => <ContextMenuItem onClick={() => Info.file_set_render_engine(files.map(file => file.id), i.plugin)} img={i.img}>{i.title}</ContextMenuItem>)}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Filters</ContextMenuLabel>
        {Filter.findMany(app, files) && <ContextMenuItem onClick={() => removeFilters(files)} img='FilterX'>Clear all filters for all selected files</ContextMenuItem>}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem onClick={() => Info.files_unselect(files)} img='EyeOff'>Hide</ContextMenuItem>
        <ContextMenuSub>
        <ContextMenuSubTrigger img='Move'>Reorder</ContextMenuSubTrigger>
      </ContextMenuSub>
      </ContextMenuGroup>
    </ContextMenuContent>
  )
}