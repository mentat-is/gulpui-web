import s from './styles/menu.module.css'
import { UploadBanner } from '@/banners/Upload.banner'
import { useApplication } from '@/context/Application.context'
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
  const { app, spawnBanner } = useApplication()

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
        img="Upload"
        onClick={() => spawnBanner(<UploadBanner />)}
      />
      <Button
        variant="secondary"
        title="Query external source"
        img="ServerCrash"
        onClick={() => spawnBanner(<QueryExternal.Banner />)}
      />
      <Button
        variant="secondary"
        title="Upload sigma rule"
        img="Sigma"
        onClick={() => spawnBanner(<Sigma.Banner />)}
      />
      <Button
        variant="secondary"
        className={s.relative}
        title="Select files and contexts"
        img="FileStack"
        onClick={() => spawnBanner(<SelectFiles.Banner />)}
      >
        <Button className={s.file_counter} size='sm' variant='glass'>{Source.Entity.selected(app).length}</Button>
      </Button>
      <Button
        variant="secondary"
        title="Change workflow frame"
        img="AlignHorizontalSpaceAround"
        onClick={() => spawnBanner(<Frame.Banner />)}
      />
      <Button
        variant="secondary"
        title="Global query"
        img="Globe"
        onClick={() => spawnBanner(<GlobalQuery.Banner />)}
      />
      <Button
        variant="secondary"
        title="Apply filters"
        img="Filter"
        onClick={() => spawnBanner(<FilterFileBanner files={[]} />)}
      />
      <Extension.Components type='menu' />
      <Button
        variant="glass"
        title="Data enrichment"
        img="PrismColor"
        onClick={enrichment}
      />
      <Button
        variant="glass"
        title="Commands"
        img="Command"
        onClick={() => spawnBanner(<Commands.Banner />)}
      />
      <Stack flex />
      <Button
        className={s.requests}
        variant="secondary"
        title="Requests"
        size="icon"
        onClick={() => spawnBanner(<Requests.Banner />)}
      >
        {app.general.requests.filter((r) => r.status === 'ongoing').length}
      </Button>
      <Button
        variant="secondary"
        title="Manage Permissions"
        img="UserSettings"
        onClick={() => spawnBanner(<Permissions.Banner />)}
      />
      <Button
        variant="secondary"
        title="Back to operations"
        img="Undo2"
        onClick={backToOperations}
      />
      <Button
        variant="secondary"
        title="Settings"
        img="SettingsGear"
        onClick={() => spawnBanner(<Settings.Banner />)}
      />
      <Button
        variant="secondary"
        img="LogOut"
        title="Logout"
        onClick={logoutButtonClickHandler}
      />
    </Stack>
  )
}
