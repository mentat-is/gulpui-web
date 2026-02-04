import s from './styles/menu.module.css'
import { UploadBanner } from '@/banners/Upload.banner'
import { Application } from '@/context/Application.context'
import { SelectFiles } from '@/banners/SelectFiles.banner'
import { Sigma } from '@/banners/Sigma'
import { QueryExternal } from '@/banners/QueryExternal.banner'
import { Enrichment } from '@/banners/Enrichment.banner'
import { Permissions } from '@/banners/Permissions.banner'
import { Requests } from '@/banners/Requests.banner'
import { Session } from '@/banners/Session.banner'
import { Extension } from '@/context/Extension.context'
import { FilterFileBanner } from '@/banners/FilterFile.banner'
import { Settings } from '@/banners/Settings.banner'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Source } from '@/entities/Source'
import { Operation } from '@/entities/Operation'
import { useEffect } from 'react'

export function Menu() {
  const { app, spawnBanner, Info } = Application.use()

  useEffect(() => {
    Info.request_list()
  }, [])

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
      <Stack ai='center' jc='flex-start' dir='column' gap={8} className={s.scroll}>
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
          onClick={() => spawnBanner(<Sigma.Banner sources={[]} />)}
        />
        <Button
          variant="secondary"
          className={s.relative}
          title="Select files and contexts"
          icon="FileStack"
          size='md'
          onClick={() => spawnBanner(<SelectFiles.Banner />)}
        >
          <Button asChild className={s.file_counter} size='sm' variant='glass'>
            <span>
              {Source.Entity.selected(app).length}
            </span>
          </Button>
        </Button>
        <Button
          variant="secondary"
          title="Apply filters"
          icon="Filter"
          size='md'
          onClick={() => spawnBanner(<FilterFileBanner sources={[]} />)}
        />
        <Extension.Components type='menu' />
        <Button
          variant="glass"
          title="Data enrichment"
          icon="PrismColor"
          size='md'
          onClick={enrichment}
        />
      </Stack>
      <Stack flex />
      <Button
        className={s.requests}
        variant="secondary"
        title="Requests"
        size='md'
        onClick={() => spawnBanner(<Requests.Banner />)}
      >
        {app.general.requests.filter(r => r.status === 'pending' || r.status === 'ongoing').length}
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
