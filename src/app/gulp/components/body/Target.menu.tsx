import s from './../../Gulp.module.css';
import { FilterFileBanner } from '@/banners/FilterFile.banner';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { Filter } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { enginesBase } from '@/dto/Engine.dto';
import { λFile } from '@/dto/Dataset';
import { ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';
import { Enrichment } from '@/banners/Enrichment.banner';
import { SigmaRules } from '@/banners/UploadSigmaRule.banner';
import { Delete } from '@/banners/Delete.banner';

interface TargetMenuProps {
  file?: λFile;
}

export function TargetMenu({ file }: TargetMenuProps) {
  const { Info, spawnBanner, app } = useApplication();

  if (!file) return null;

  const removeFilters = (file: λFile) => {
    Info.filters_remove(file);
    setTimeout(() => {
      Info.refetch({
        ids: file.id
      });
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
      <ContextMenuSub>
        <ContextMenuSubTrigger img='Cpu'>Render method</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {enginesBase.map(i => <ContextMenuItem onClick={() => Info.file_set_render_engine([file.id], i.plugin)} img={i.img}>{i.title}</ContextMenuItem>)}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner file={file} />)} img='Settings'>Settings</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<Enrichment.Banner />)} img='PrismColor'>Enrich</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Filters</ContextMenuLabel>
        <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner file={file} />)} img='Filter'>Filters</ContextMenuItem>
        <ContextMenuItem onClick={() => removeFilters(file)} img='FilterX'>Clear all filters</ContextMenuItem>
        {app.timeline.cache.data.has(file.id) && <ContextMenuItem onClick={() => Info.filters_undo(file)} img='Undo'>Undo last filters change</ContextMenuItem>}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem onClick={() => Info.files_unselect([file])} img='EyeOff'>Hide</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger img='Move'>Reorder</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => Info.files_repin(file.id)} img={file.pinned ? 'PinOff' : 'Pin'}>{file ? file.pinned ? 'Unpin' : 'Pin' : '...'}</ContextMenuItem>
            <ContextMenuItem onClick={() => Info.files_reorder_upper(file.id)} img='ArrowBigUp'>Move upper</ContextMenuItem>
            <ContextMenuItem onClick={() => Info.files_reorder_lower(file.id)} img='ArrowBigDown'>Move lower</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Sigma</ContextMenuLabel>
        <ContextMenuItem onClick={() => spawnBanner(<SigmaRules.Banner file={file} />)} img='Sigma'>Upload rule</ContextMenuItem>
        {app.target.sigma[file.id] && <ContextMenuItem className={s.remove_sigma} onClick={() => Info.sigma.remove(file)} img='X'>Disable rule: {app.target.sigma[file.id].name}</ContextMenuItem>}
      </ContextMenuGroup>
      <ContextMenuItem className={s.delete} img='Trash2' onClick={() => spawnBanner(<Delete.File.Banner file={file} />)}>Delete!</ContextMenuItem>
    </ContextMenuContent>
  )
}
