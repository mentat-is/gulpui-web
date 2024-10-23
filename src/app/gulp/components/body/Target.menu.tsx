import s from './../../Gulp.module.css';
import { FilterFileBanner } from '@/banners/FilterFile.banner';
import { LinkVisualizer } from '@/banners/LinksVisualizer';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { Filter } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { λFile } from '@/dto/File.dto';
import { ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

interface TargetMenuProps {
  file?: λFile;
}

export function TargetMenu({ file }: TargetMenuProps) {
  const { Info, spawnBanner, app } = useApplication();

  if (!file) return null;

  const removeFilters = (file: λFile) => {
    Info.filters_remove(file);
    setTimeout(() => {
      Info.refetch(file.uuid);
    }, 300);
  }

  return (
    <ContextMenuContent>
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
      <ContextMenuItem onClick={() => Info.files_repin(file!.uuid)} img={file.pinned ? 'PinOff' : 'Pin'}>{file ? file.pinned ? 'Unpin' : 'Pin' : '...'}</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner file={file} />)} img='Settings'>Settings</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner file={file} />)} img='Filter'>Filters</ContextMenuItem>
      {Filter.find(app, file) && <ContextMenuItem onClick={() => removeFilters(file)} img='FilterX'>Clear filters</ContextMenuItem>}
      {Filter.find(app, file) && app.timeline.cache.data.has(file.uuid) && <ContextMenuItem onClick={() => Info.filters_undo(file)} img='Undo'>Return previous filters</ContextMenuItem>}
      <ContextMenuItem onClick={() => spawnBanner(<LinkVisualizer file={file} />)} img='Waypoints'>Links</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.files_unselect(file)} img='EyeOff'>Hide</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.files_reorder_upper(file.uuid)} img='ArrowBigUp'>Move upper</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.files_reorder_lower(file.uuid)} img='ArrowBigDown'>Move lower</ContextMenuItem>
    </ContextMenuContent>
  )
}