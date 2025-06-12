import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Checkbox } from '@/ui/Checkbox'
import s from './styles/SelectFilesBanner.module.css'
import { Badge } from '@/ui/Badge'
import { Label } from '@/ui/Label'
import { Button, Skeleton, Stack, Input } from '@impactium/components'
import { Context, Filter, Operation } from '@/class/Info'
import { useState, useMemo, useCallback } from 'react'
import { LimitsBanner } from './Limits.banner'
import { UploadBanner } from './Upload.banner'
import { λContext, λFile } from '@/dto/Dataset'
import { Separator } from '@/ui/Separator'
import { Delete } from './Delete.banner'
import { Preview } from './Preview.banner'
import { FilterFileBanner } from './FilterFile.banner'

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

    const filteredContexts = useMemo(() =>
      Operation.contexts(app).filter((ctx) =>
        Context.files(app, ctx).some((f) =>
          f.name.toLowerCase().includes(filter.toLowerCase()),
        ),
      ),
      [app, filter, setFilter]);

    const SearchInput = useMemo(() => {
      return (
        <Input
          img="Search"
          placeholder="Filter files by name"
          variant="highlighted"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )
    }, [filter, setFilter])

    return (
      <UIBanner
        title="Select sources"
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
        {SearchInput}
        <Stack className={s.wrapper} dir='column' gap={12} jc='stretch'>
          <Skeleton show={!hasData} width="full">
            {filteredContexts.length > 0 ? (
              filteredContexts.map((context) => (
                <ContextComponent key={context.id} context={context} filter={filter} />
              ))
            ) : (
              <p className={s.noData}>
                There is no data to analyze. Click below to upload...
              </p>
            )}
          </Skeleton>
        </Stack>

        <Stack>
          <Button
            onClick={() => Info.selectAll(filter)}
            variant="secondary"
            style={{ width: '100%', background: 'var(--meta-black)' }}
            img="FilePlus"
          >
            Select all
          </Button>
          <Button
            onClick={() => Info.unselectAll(filter)}
            variant="secondary"
            style={{ width: '100%', background: 'var(--meta-black)' }}
            img="FileMinus"
          >
            Unselect all
          </Button>
          <Button
            onClick={reloadClickHandler}
            variant="secondary"
            img="RefreshClockwise"
          >
            Reload
          </Button>
        </Stack>
      </UIBanner>
    )
  }
}

function ContextComponent({ context, filter }: { context: λContext, filter: string }) {
  const { app, Info, spawnBanner } = useApplication()
  const files = useMemo(() => Context.files(app, context).filter(file => file.name.toLowerCase().includes(filter.toLowerCase())), [app, context, filter])

  const handleContextCheck = useCallback(
    (value: boolean) =>
      value
        ? Info.contexts_select([context])
        : Info.contexts_unselect([context]),
    [Info, context],
  )

  return (
    <Stack
      dir="column"
      ai="stretch"
      jc="flex-start"
      className={s.branch}
      key={context.id}
    >
      <Stack className={s.contextHeading}>
        <Checkbox
          style={{ height: 20, width: 20 }}
          checked={
            context.selected && files.every((f) => f.selected)
              ? true
              : 'indeterminate'
          }
          onCheckedChange={handleContextCheck}
          id={context.name}
        />
        <Label value={context.name} />
        <hr style={{ flex: 1 }} />
        <Badge
          border
          value="Delete"
          variant="destructive"
          radius={2}
          icon="Trash2"
          onClick={() =>
            spawnBanner(
              <Delete.Context.Banner
                context={context}
                back={() => spawnBanner(<SelectFiles.Banner />)}
              />,
            )
          }
        />
      </Stack>
      <Separator className={s.separator} />
      {files.map((file) => (
        <FileComponent key={file.id} file={file} />
      ))}
    </Stack>
  )
}

function FileComponent({ file }: { file: λFile }) {
  const { app, Info, spawnBanner } = useApplication()
  const [loading, setLoading] = useState<boolean>(false);

  const previewButtonClickHandler = () => {
    setLoading(true)
    Info.preview_file(file).then(({ docs, total_hits }) => spawnBanner(<Preview.Banner total={total_hits} values={docs} fixed back={() => spawnBanner(<SelectFiles.Banner />)} done={<Button img='Check' onClick={() => spawnBanner(<SelectFiles.Banner />)} variant='glass' />} />))
  }

  const handleFileCheck = useCallback(
    (value: boolean) =>
      value ? Info.files_select([file]) : Info.files_unselect([file]),
    [Info, file],
  )

  const FileIsTooBig = useMemo(() => {
    if (file.total < 500_000) {
      return null
    }

    return (
      <Badge radius={2} border variant="warning" icon="Warning" value="This file is too big" />
    )
  }, [])

  return (
    <Stack className={s.pluginHeading} key={file.id}>
      <Checkbox
        id={file.name}
        checked={file.selected}
        onCheckedChange={handleFileCheck}
      />
      <Label value={file.name} />
      {FileIsTooBig}
      <Badge radius={2} variant={Filter.hasFilter(app, file) ? 'outline' : "secondary"} icon='Filter' onClick={() => spawnBanner(<FilterFileBanner file={file} fixed back={() => spawnBanner(<SelectFiles.Banner />)} />)} />
      <Badge radius={2} variant="outline" value={file.total} />
      <Button
        img="PreviewEye"
        variant="secondary"
        loading={loading}
        className={s.previewButton}
        onClick={previewButtonClickHandler}
      />
    </Stack>
  )
}
