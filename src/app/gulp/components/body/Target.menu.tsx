import s from './../../Gulp.module.css';
import { FilterFileBanner } from '@/banners/FilterFile.banner';
import { LinkVisualizer } from '@/banners/LinksVisualizer';
import { SettingsFileBanner } from '@/banners/SettingsFileBanner';
import { Filter } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { enginesBase } from '@/dto/Engine.dto';
import { λSource } from '@/dto/Operation.dto';
import { ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/ui/ContextMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';

interface TargetMenuProps {
  source?: λSource;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function TargetMenu({ source, inputRef }: TargetMenuProps) {
  const { Info, spawnBanner, app } = useApplication();

  if (!source) return null;

  const removeFilters = (source: λSource) => {
    Info.filters_remove(source);
    setTimeout(() => {
      Info.refetch({
        ids: source.id
      });
    }, 300);
  }

  return (
    <ContextMenuContent data-state='open'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuLabel className={s.cm_title}>{source.name}</ContextMenuLabel>
          </TooltipTrigger>
          <TooltipContent>
            {source.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger img='Cpu'>Render method</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {enginesBase.map(i => <ContextMenuItem onClick={() => Info.files_replace({ ...source, settings: {...source.settings, engine: i.plugin}})} img={i.img}>{i.title}</ContextMenuItem>)}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem onClick={() => spawnBanner(<SettingsFileBanner source={source} />)} img='Settings'>Settings</ContextMenuItem>
      <ContextMenuItem onClick={() => spawnBanner(<LinkVisualizer source={source} />)} img='Link'>Links</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Filters</ContextMenuLabel>
        <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner source={source} />)} img='Filter'>Filters</ContextMenuItem>
        {Filter.find(app, source) && <ContextMenuItem onClick={() => removeFilters(source)} img='FilterX'>Clear all filters</ContextMenuItem>}
        {Filter.find(app, source) && app.timeline.cache.data.has(source.id) && <ContextMenuItem onClick={() => Info.filters_undo(source)} img='Undo'>Undo last filters change</ContextMenuItem>}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem onClick={() => Info.files_unselect(source)} img='EyeOff'>Hide</ContextMenuItem>
        <ContextMenuSub>
        <ContextMenuSubTrigger img='Move'>Reorder</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => Info.files_repin(source.id)} img={source.pinned ? 'PinOff' : 'Pin'}>{source ? source.pinned ? 'Unpin' : 'Pin' : '...'}</ContextMenuItem>
          <ContextMenuItem onClick={() => Info.files_reorder_upper(source.id)} img='ArrowBigUp'>Move upper</ContextMenuItem>
          <ContextMenuItem onClick={() => Info.files_reorder_lower(source.id)} img='ArrowBigDown'>Move lower</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Sigma</ContextMenuLabel>
        <ContextMenuItem onClick={() => inputRef.current?.click()} img='Sigma'>Upload rule</ContextMenuItem>
        {app.target.sigma[source.id] && <ContextMenuItem className={s.remove_sigma} onClick={() => Info.sigma.remove(source)} img='X'><span>Disable rule: {app.target.sigma[source.id].name}</span></ContextMenuItem>}
      </ContextMenuGroup>
    </ContextMenuContent>
  )
}