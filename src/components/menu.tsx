import { Button, Stack } from '@impactium/components'
import s from './styles/menu.module.css'
import { UploadBanner } from '@/banners/Upload.banner'
import { useApplication } from '@/context/Application.context'
import { SelectFiles } from '@/banners/SelectFiles.banner'
import { LimitsBanner } from '@/banners/Limits.banner'
import { SigmaRules } from '@/banners/UploadSigmaRule.banner'
import { QueryExternal } from '@/banners/QueryExternal.banner'
import { StorylineBanner } from '@/banners/storyline.banner'
import { Operation } from '@/banners/Operation.banner'
import { useWindows } from '@/ui/Windows'
import { Enrichment } from '@/banners/Enrichment.banner'
import { Permissions } from '@/banners/Permissions.banner'
import { Export } from '@/banners/Export.banner'
import { Requests } from '@/banners/Requests.banner'
import { GlobalQuery } from '@/banners/GlobalQuery.banner'
import { Session } from '@/banners/Session.banner'
import { Plugin } from '@/context/Plugin.context'

export function Menu() {
  const { app, spawnBanner, scrollX, scrollY } = useApplication()
  const { setWindows } = useWindows()

  const backToOperations = () => {
    setWindows([])
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
        onClick={() => spawnBanner(<SigmaRules.Banner file={null} />)}
      />
      <Button
        variant="secondary"
        title="Select files and contexts"
        img="FileStack"
        onClick={() => spawnBanner(<SelectFiles.Banner />)}
      />
      <Button
        variant="secondary"
        title="Open storyline"
        img="Scroll"
        onClick={() => spawnBanner(<StorylineBanner />)}
      />
      <Button
        variant="secondary"
        title="Change workflow frame"
        img="AlignHorizontalSpaceAround"
        onClick={() => spawnBanner(<LimitsBanner />)}
      />
      <Button
        variant="secondary"
        title="Global query"
        img="Globe"
        onClick={() => spawnBanner(<GlobalQuery.Banner />)}
      />
      <Button
        variant="glass"
        title="Data enrichment"
        img="PrismColor"
        onClick={enrichment}
      />
      <Plugin.All type='menu' />
      <Stack flex />
      <Button
        className={s.requests}
        variant="secondary"
        title="Requests"
        size="icon"
        onClick={() => spawnBanner(<Requests.Banner />)}
      >
        {app.general.requests.filter((r) => r.status === 'pending').length}
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
        img="LogOut"
        title="Logout"
        onClick={logoutButtonClickHandler}
      />
    </Stack>
  )
}
