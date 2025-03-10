import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Checkbox } from '@/ui/Checkbox'
import s from './styles/SelectFilesBanner.module.css'
import { Badge } from '@/ui/Badge'
import { Label } from '@/ui/Label'
import { Button, Skeleton, Stack, Input } from '@impactium/components'
import { Context, Operation } from '@/class/Info'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { LimitsBanner } from './Limits.banner'
import { UploadBanner } from './Upload.banner'
import { λContext, λFile } from '@/dto/Dataset'
import { Separator } from '@/ui/Separator'
import { Delete } from './Delete.banner'
import { Preview } from './Preview.banner'
import { λEvent } from '@/dto/ChunkEvent.dto'

export namespace SelectFiles {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner(props: Banner.Props) {
    const { app, Info, spawnBanner, destroyBanner } = useApplication()
    const [filter, setFilter] = useState('')
    const [loading, setLoading] = useState(false)

    const hasData = useMemo(
      () => app.target.operations.length > 0 || app.target.contexts.length > 0,
      [app.target.operations, app.target.contexts],
    )

    const save = useCallback(async () => {
      setLoading(true)
      spawnBanner(<LimitsBanner />)
    }, [spawnBanner])

    const reloadClickHandler = useCallback(async () => {
      await Info.sync()
      destroyBanner()
      spawnBanner(<Banner {...props} />)
    }, [Info, destroyBanner, spawnBanner, props])

    const filteredContexts = useMemo(
      () =>
        Operation.contexts(app).filter((ctx) =>
          Context.files(app, ctx).some((f) =>
            f.name.toLowerCase().includes(filter.toLowerCase()),
          ),
        ),
      [app, filter],
    )

    return (
      <UIBanner
        title="Select sources"
        subtitle={
          <Button
            onClick={reloadClickHandler}
            variant="secondary"
            img="RefreshClockwise"
          >
            Reload
          </Button>
        }
        className={s.banner}
        done={
          <Button
            img="Check"
            loading={loading}
            variant="glass"
            onClick={save}
          />
        }
        option={
          <Button
            img="Upload"
            variant="ghost"
            onClick={() => spawnBanner(<UploadBanner />)}
          />
        }
        {...props}
      >
        <Input
          img="Search"
          placeholder="Filter files by name"
          variant="highlighted"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Skeleton show={!hasData} width="full">
          {filteredContexts.length > 0 ? (
            filteredContexts.map((context) => (
              <ContextComponent key={context.id} context={context} />
            ))
          ) : (
            <p className={s.noData}>
              There is no data to analyze. Click below to upload...
            </p>
          )}
        </Skeleton>
        <div className={s.group}>
          <Button
            onClick={() => Info.selectAll(filter)}
            variant="secondary"
            style={{ width: '100%', background: 'var(--meta-black)' }}
          >
            Select all
          </Button>
        </div>
      </UIBanner>
    )
  }
}

function ContextComponent({ context }: { context: λContext }) {
  const { app, Info, spawnBanner } = useApplication()
  const files = useMemo(() => Context.files(app, context), [app, context])
  const handleContextCheck = useCallback(
    (value: boolean) =>
      value
        ? Info.contexts_select([context])
        : Info.contexts_unselect([context]),
    [Info, context],
  )

  return (
    <div className={s.branch} key={context.id}>
      <div className={s.contextHeading}>
        <Checkbox
          checked={
            context.selected && files.every((f) => f.selected)
              ? true
              : 'indeterminate'
          }
          onCheckedChange={handleContextCheck}
        />
        <Label htmlFor={context.name}>{context.name}</Label>
        <hr style={{ flex: 1 }} />
        <Badge value="Context" />
        <Badge
          value="Delete"
          variant="destructive"
          onClick={() =>
            spawnBanner(
              <Delete.Context.Banner
                context={context}
                back={() => spawnBanner(<SelectFiles.Banner />)}
              />,
            )
          }
        />
      </div>
      <Separator />
      {files.map((file) => (
        <FileComponent key={file.id} file={file} />
      ))}
    </div>
  )
}

function FileComponent({ file }: { file: λFile }) {
  const { Info, spawnBanner } = useApplication()
  const [events, setEvents] = useState<λEvent[] | null>(null)

  useEffect(() => {
    if (!events || !events.length) {
      Info.preview_file(file).then(({ total_hits, docs }) => {
        Info.file_set_total(file.id, total_hits)
        setEvents(docs)
      })
    }
  }, [events, Info, file])

  const handleFileCheck = useCallback(
    (value: boolean) =>
      value ? Info.files_select([file]) : Info.files_unselect([file]),
    [Info, file],
  )

  return (
    <Stack className={s.pluginHeading} key={file.id}>
      <Checkbox
        id={file.name}
        checked={file.selected}
        onCheckedChange={handleFileCheck}
      />
      <Label htmlFor={file.name}>{file.name}</Label>
      <Badge variant="outline" value={file.total} />
      <Button
        img="PreviewEye"
        variant="secondary"
        size="sm"
        onClick={() =>
          events &&
          spawnBanner(
            <Preview.Banner
              values={events}
              fixed
              back={() => spawnBanner(<SelectFiles.Banner />)}
            />,
          )
        }
      />
    </Stack>
  )
}
