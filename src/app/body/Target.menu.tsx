import s from '../Gulp.module.css'
import { FilterFileBanner } from '@/banners/FilterFile.banner'
import { SettingsFileBanner } from '@/banners/SettingsFileBanner'
import { useApplication } from '@/context/Application.context'
import { enginesBase } from '@/dto/Engine.dto'
import {
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/ui/ContextMenu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/Tooltip'
import { Enrichment } from '@/banners/Enrichment.banner'
import { Sigma } from '@/banners/UploadSigmaRule.banner'
import { DisplayEventDialog } from '@/dialogs/Event.dialog'
import { Refractor } from '@/ui/utils'
import { toast } from 'sonner'
import { Icon } from '@impactium/icons'
import { Stack } from '@/ui/Stack'
import { Source } from '@/entities/Source'

interface TargetMenuProps {
  file: Source.Type
}

export function TargetMenu({ file }: TargetMenuProps) {
  const { Info, spawnBanner, spawnDialog, app } = useApplication()
  const events = Source.Entity.events(app, file);

  const removeFilters = (file: Source.Type) => {
    Info.filters_remove(file)
    setTimeout(() => {
      Info.refetch({
        ids: file.id,
      })
    }, 300)
  }

  const showEvent = (last = false) => {
    const events = Source.Entity.events(app, file);
    if (!events.length) {
      toast.error('There are no events in this source', {
        icon: <Icon name='FileQuestion' />,
        richColors: true
      })
      return;
    }

    const event = last ? events[0] : events[events.length - 1];

    if (!event) {
      return;
    }

    spawnDialog(<DisplayEventDialog event={event} />);
  }

  return (
    <ContextMenuContent data-state="open">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuLabel className={s.cm_title}>
              {file.name}
            </ContextMenuLabel>
          </TooltipTrigger>
          <TooltipContent>{file.name}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => Info.refetch({ ids: file.id })} icon="RefreshClockwise">Refetch</ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger icon="Cpu">Render method</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {enginesBase.map((i) => (
            <ContextMenuItem
              key={i.plugin}
              onClick={() => Info.file_set_settings(file.id, { render_engine: i.plugin })}
              icon={i.img}
            >
              {i.title}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        onClick={() => spawnBanner(<SettingsFileBanner file={file} />)}
        icon="Settings"
      >
        Settings
      </ContextMenuItem>
      <ContextMenuItem
        className={s.glass}
        onClick={() => spawnBanner(<Enrichment.Banner />)}
        icon="PrismColor"
      >
        Enrich
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Filters</ContextMenuLabel>
        <ContextMenuItem onClick={() => spawnBanner(<FilterFileBanner files={[file]} />)} icon='Filter'>
          Manage filters
        </ContextMenuItem>
        <ContextMenuItem onClick={() => removeFilters(file)} icon="X">
          Reset filters
        </ContextMenuItem>
        {app.timeline.cache.data.has(file.id) && (
          <ContextMenuItem onClick={() => Info.filters_undo([file])} icon="Undo">
            Undo last filters change
          </ContextMenuItem>
        )}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Actions</ContextMenuLabel>
        <ContextMenuItem
          onClick={() => Info.setInfoByKey(Refractor.array(...app.target.files.map(f => ({ ...f, selected: f.id === file.id ? false : f.selected }))), 'target', 'files')}
          icon="EyeOff"
        >
          Hide
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger icon="Move">Reorder</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={() => Info.files_repin(file.id)}
              icon={file.pinned ? 'PinOff' : 'Pin'}
            >
              {file ? (file.pinned ? 'Unpin' : 'Pin') : '...'}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => Info.files_reorder_upper(file.id)}
              icon="ArrowBigUp"
            >
              Move upper
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => Info.files_reorder_lower(file.id)}
              icon="ArrowBigDown"
            >
              Move lower
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <Stack gap={2}>
          <ContextMenuItem
            onClick={() => showEvent()}
            icon="ArrowLeftFromLine"
          >
            Show first event
          </ContextMenuItem>
          <ContextMenuItem
            revert
            onClick={() => showEvent(true)}

            icon="ArrowRightFromLine"
          >
            Show last event
          </ContextMenuItem>
        </Stack>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Sigma</ContextMenuLabel>
        <ContextMenuItem onClick={() => spawnBanner(<Sigma.Banner files={[file.id]} />)} icon="Sigma" >
          Upload rule
        </ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuItem
        className={s.delete}
        icon="Trash2"
        onClick={() => spawnBanner(<Source.Delete.Banner file={file} />)}
      >
        Delete!
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
