import s from './../../Gulp.module.css';
import { FilterFileBanner } from '@/banners/FilterFile.banner';
import { LinkVisualizer } from '@/banners/LinksVisualizer';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { Filter } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { λFile } from '@/dto/File.dto';
import { ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

interface TargetMenuProps {
  file?: λFile;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function TargetMenu({ file, inputRef }: TargetMenuProps) {
  const { Info, spawnBanner, app } = useApplication();

  if (!file) return null;

  const removeFilters = (file: λFile) => {
    Info.filters_remove(file);
    setTimeout(() => {
      Info.refetch(file.uuid);
    }, 300);
  }

  return (
    <ContextMenuContent data-state='open'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuLabel className={s.cm_title}>{file.name}</ContextMenuLabel>
          </TooltipTrigger>
          <TooltipContent>
            {file.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner file={file} />)} img='Settings'>Settings</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<LinkVisualizer file={file} />)} img='Waypoints'>Links</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Filters</ContextMenuLabel>
        <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner file={file} />)} img='Filter'>Filters</ContextMenuItem>
        {Filter.find(app, file) && <ContextMenuItem onClick={() => removeFilters(file)} img='FilterX'>Clear all filters</ContextMenuItem>}
        {Filter.find(app, file) && app.timeline.cache.data.has(file.uuid) && <ContextMenuItem onClick={() => Info.filters_undo(file)} img='Undo'>Undo last filters change</ContextMenuItem>}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem onClick={() => Info.files_unselect(file)} img='EyeOff'>Hide</ContextMenuItem>
        <ContextMenuSub>
        <ContextMenuSubTrigger img='Move'>Reorder</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => Info.files_repin(file!.uuid)} img={file.pinned ? 'PinOff' : 'Pin'}>{file ? file.pinned ? 'Unpin' : 'Pin' : '...'}</ContextMenuItem>
          <ContextMenuItem onClick={() => Info.files_reorder_upper(file.uuid)} img='ArrowBigUp'>Move upper</ContextMenuItem>
          <ContextMenuItem onClick={() => Info.files_reorder_lower(file.uuid)} img='ArrowBigDown'>Move lower</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Sigma</ContextMenuLabel>
        <ContextMenuItem onClick={() => inputRef.current?.click()} img='Sigma'>Upload rule</ContextMenuItem>
        {app.target.sigma[file.uuid] && <ContextMenuItem className={s.remove_sigma} onClick={() => Info.sigma.remove(file)} img='X'><span>Disable rule: {app.target.sigma[file.uuid].name}</span></ContextMenuItem>}
      </ContextMenuGroup>
    </ContextMenuContent>
  )
}