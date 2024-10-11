import s from './../../Gulp.module.css';
import { FilterFileBanner } from '@/banners/FilterFile.banner';
import { LinkVisualizer } from '@/banners/LinksVisualizer';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { useApplication } from '@/context/Application.context';
import { λFile } from '@/dto/File.dto';
import { ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

interface TargetMenuProps {
  target?: λFile;
}

export function TargetMenu({ target }: TargetMenuProps) {
  const { Info, spawnBanner } = useApplication();

  if (!target) return null;

  return (
    <ContextMenuContent>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuLabel className={s.cm_title}>{target.name}</ContextMenuLabel>
          </TooltipTrigger>
          <TooltipContent>
            {target.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => Info.files_repin(target!.uuid)} img={target.pinned ? 'PinOff' : 'Pin'}>{target ? target.pinned ? 'Unpin' : 'Pin' : '...'}</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner file={target} />)} img='Settings'>Settings</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner file={target} />)} img='Filter'>Filters</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.filters_remove(target)} img='Filter'>Clear filters</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<LinkVisualizer file={target} />)} img='Waypoints'>Links</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.files_unselect(target)} img='EyeOff'>Hide</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.files_reorder_upper(target.uuid)} img='ArrowBigUp'>Move upper</ContextMenuItem>
      <ContextMenuItem onClick={() => Info.files_reorder_lower(target.uuid)} img='ArrowBigDown'>Move lower</ContextMenuItem>
    </ContextMenuContent>
  )
}