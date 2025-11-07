import s from './styles/menu.module.css'
import { UploadBanner } from '@/banners/Upload.banner'
import { Application } from '@/context/Application.context'
import { SelectFiles } from '@/banners/SelectFiles.banner'
import { Frame } from '@/banners/Frame.banner'
import { Sigma } from '@/banners/UploadSigmaRule.banner'
import { QueryExternal } from '@/banners/QueryExternal.banner'
import { Enrichment } from '@/banners/Enrichment.banner'
import { Permissions } from '@/banners/Permissions.banner'
import { Requests } from '@/banners/Requests.banner'
import { GlobalQuery } from '@/banners/GlobalQuery.banner'
import { Session } from '@/banners/Session.banner'
import { Extension } from '@/context/Extension.context'
import { FilterFileBanner } from '@/banners/FilterFile.banner'
import { Commands } from '@/banners/Commands.banner'
import { Settings } from '@/banners/Settings.banner'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Source } from '@/entities/Source'
import { Operation } from '@/entities/Operation'

export function Menu() {
  const { app, spawnBanner } = Application.use()

  const backToOperations = () => {
    spawnBanner(<Operation.Select.Banner />)
  }

  const enrichment = () => {
    spawnBanner(<Enrichment.Banner />)
  }

  const logoutButtonClickHandler = () => spawnBanner(<Session.Save.Banner />);

  return (
    <Stack
      className={s.menu}
      dir="column"
      ai="flex-start"
      gap={12}
    >
      <Button
        variant="secondary"
        title="Upload files"
        icon="Upload"
        size='md'
        onClick={() => spawnBanner(<UploadBanner />)}
      />
      <Button
        variant="secondary"
        title="Query external source"
        icon="ServerCrash"
        size='md'
        onClick={() => spawnBanner(<QueryExternal.Banner />)}
      />
      <Button
        variant="secondary"
        title="Upload sigma rule"
        icon="Sigma"
        size='md'
        onClick={() => spawnBanner(<Sigma.Banner />)}
      />
      <Button
        variant="secondary"
        className={s.relative}
        title="Select files and contexts"
        icon="FileStack"
        size='md'
        onClick={() => spawnBanner(<SelectFiles.Banner />)}
      >
        <Button asChild className={s.file_counter} size='sm' variant='glass'>{Source.Entity.selected(app).length}</Button>
      </Button>
      <Button
        variant="secondary"
        title="Change workflow frame"
        icon="AlignHorizontalSpaceAround"
        size='md'
        onClick={() => spawnBanner(<Frame.Banner />)}
      />
      <Button
        variant="secondary"
        title="Global query"
        icon="Globe"
        size='md'
        onClick={() => spawnBanner(<GlobalQuery.Banner />)}
      />
      <Button
        variant="secondary"
        title="Apply filters"
        icon="Filter"
        size='md'
        onClick={() => spawnBanner(<FilterFileBanner files={[]} />)}
      />
      <Extension.Components type='menu' />
      <Button
        variant="glass"
        title="Data enrichment"
        icon="PrismColor"
        size='md'
        onClick={enrichment}
      />
      <Button
        variant="glass"
        title="Commands"
        icon="Command"
        size='md'
        onClick={() => spawnBanner(<Commands.Banner />)}
      />
      <Stack flex />
      <Button
        className={s.requests}
        variant="secondary"
        title="Requests"
        size='md'
        onClick={() => spawnBanner(<Requests.Banner />)}
      >
        {app.general.requests.filter((r) => r.status === 'ongoing').length}
      </Button>
      <Button
        variant="secondary"
        title="Manage Permissions"
        icon="UserSettings"
        size='md'
        onClick={() => spawnBanner(<Permissions.Banner />)}
      />
      <Button
        variant="secondary"
        title="Back to operations"
        icon="Undo2"
        size='md'
        onClick={backToOperations}
      />
      <Button
        variant="secondary"
        title="Settings"
        size='md'
        icon="SettingsGear"
        onClick={() => spawnBanner(<Settings.Banner />)}
      />
      <Button
        variant="secondary"
        size='md'
        icon="LogOut"
        title="Logout"
        onClick={logoutButtonClickHandler}
      />
    </Stack>
  )
}
