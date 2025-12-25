import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Checkbox } from '@/ui/Checkbox'
import s from './styles/SelectFilesBanner.module.css'
import { Label } from '@/ui/Label'
import { useMemo, useState } from 'react'
import { Frame } from './Frame.banner'
import { UploadBanner } from './Upload.banner'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { FilterFileBanner } from './FilterFile.banner'
import { cn } from '@impactium/utils'
import { Refractor } from '@/ui/utils'
import { toast } from 'sonner'
import { Stack } from '@/ui/Stack'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Spinner } from '@/ui/Spinner'
import { Skeleton } from '@/ui/Skeleton'
import { Context } from '@/entities/Context'
import { Source } from '@/entities/Source'
import { Operation } from '@/entities/Operation'
import { Request } from '@/entities/Request'

export namespace SelectFiles {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner(props: Banner.Props) {
    const { app, Info, spawnBanner } = Application.use()
    const [filter, setFilter] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedContexts, setSelectedContexts] = useState<Set<Context.Id>>(new Set(Context.Entity.selected(app).map(c => c.id)));
    const [selectedFiles, setSelectedFiles] = useState<Set<Source.Id>>(new Set(Source.Entity.selected(app).map(c => c.id)));

    function all(select: boolean) {
      const operation = Operation.Entity.selected(app);
      if (!operation) {
        toast.error('Operation not selected', {
          richColors: true
        })
        return;
      }

      setSelectedFiles(prev => {
        const newSet = new Set(prev)
        app.target.files
          .filter(file => file.operation_id === operation.id)
          .filter(file => file.name.toLowerCase().includes(filter.toLowerCase()))
          .forEach(file => select ? newSet.add(file.id) : newSet.delete(file.id))
        return newSet
      })

      setSelectedContexts(prev => {
        const newSet = new Set(prev)
        app.target.contexts
          .filter(context => context.operation_id === operation.id)
          .forEach(context => {
            const files = Context.Entity.sources(app, context)
            if (files.some(file => selectedFiles.has(file.id))) {
              newSet.add(context.id)
            } else {
              newSet.delete(context.id)
            }
          })
        return newSet
      })
    }

    function setContext(context: Context.Id, select: boolean) {
      setSelectedContexts(prev => {
        const newSet = new Set(prev)
        if (select) newSet.add(context)
        else newSet.delete(context)
        return newSet
      })

      setSelectedFiles(prev => {
        const newSet = new Set(prev)
        Context.Entity.sources(app, context)
          .filter(file => file.name.toLowerCase().includes(filter.toLowerCase()))
          .forEach(file => select ? newSet.add(file.id) : newSet.delete(file.id))
        return newSet
      })
    }

    function setFile(target: Source.Id, select: boolean) {
      setSelectedFiles(prev => {
        const newSet = new Set(prev)
        if (select) newSet.add(target)
        else newSet.delete(target)
        return newSet
      })

      const file = Source.Entity.id(app, target);

      setSelectedContexts(prev => {
        const files = Context.Entity.sources(app, file.context_id)
        const newSet = new Set(prev)
        if (files.some(f => selectedFiles.has(f.id) || f.id === target)) {
          newSet.add(file.context_id)
        } else {
          newSet.delete(file.context_id)
        }
        return newSet
      })
    }

    const hasData = app.target.operations.length > 0 || app.target.contexts.length > 0;

    const save = () => {
      const contexts = Refractor.array(...app.target.contexts.map(context => ({
        ...context,
        selected: selectedContexts.has(context.id)
      })));
      const files = Refractor.array(...app.target.files.map(file => ({
        ...file,
        selected: selectedFiles.has(file.id)
      })));

      Info.setInfoByKey(contexts, 'target', 'contexts')
      Info.setInfoByKey(files, 'target', 'files')

      Info.session_autosave();
      setTimeout(() => {
        spawnBanner(<Frame.Banner fixed back={() => spawnBanner(<SelectFiles.Banner />)} />);
      }, 10);
    };

    const reloadClickHandler = async () => {
      setLoading(true);
      await Info.sync();
      setLoading(false);
    };

    const filteredContexts = Operation.Entity.contexts(app).filter((ctx) => Context.Entity.sources(app, ctx).some((f) => f.name.toLowerCase().includes(filter.toLowerCase())));

    const SearchInput = useMemo(() => {
      return (
        <Input
          icon='Search'
          placeholder='Search by context name and file name'
          variant='highlighted'
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )
    }, [setFilter, filter]);

    return (
      <UIBanner
        title='Select sources'
        className={s.banner}
        done={
          <Button
            icon='Check'
            variant='glass'
            disabled={!selectedContexts.size || !selectedFiles.size}
            onClick={save}
          />
        }
        option={
          <Button
            icon='Upload'
            variant='tertiary'
            onClick={() => spawnBanner(<UploadBanner />)}
          />
        }
        {...props}
      >
        {SearchInput}
        <Stack className={s.wrapper} dir='column' gap={12} jc='stretch'>
          <Skeleton show={!hasData} width='full'>
            {filteredContexts.length > 0 ? (
              filteredContexts.map(context => (
                <ContextComponent key={context.id} context={context} filter={filter} setFile={setFile} setContext={setContext} selectedFiles={selectedFiles} selectedContexts={selectedContexts} />
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
            onClick={() => all(true)}
            variant='secondary'
            className={s.actionButton}
            icon='FilePlus'
          >
            Select all
          </Button>
          <Button
            onClick={() => all(false)}
            variant='secondary'
            className={s.actionButton}
            icon='FileMinus'
          >
            Unselect all
          </Button>
          <Button
            onClick={reloadClickHandler}
            variant='secondary'
            className={s.actionButton}
            icon='RefreshClockwise'
            loading={loading}
          >
            Reload
          </Button>
        </Stack>
      </UIBanner>
    )
  }
}

interface ContextComponentProps {
  context: Context.Type;
  filter: string;
  selectedFiles: Set<Source.Id>;
  setFile: (file: Source.Id, select: boolean) => void;
  selectedContexts: Set<Context.Id>;
  setContext: (context: Context.Id, select: boolean) => void;
};

function ContextComponent({ context, filter, selectedFiles, selectedContexts, setFile, setContext }: ContextComponentProps) {
  const { app, spawnBanner } = Application.use()
  const files = Context.Entity.sources(app, context).filter(file => file.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Stack dir='column' ai='stretch' jc='flex-start' className={s.branch} key={context.id}>
      <Stack className={s.contextHeading}>
        <Checkbox
          style={{ height: 20, width: 20 }}
          checked={selectedContexts.has(context.id)}
          onCheckedChange={checked => setContext(context.id, !!checked)}
          id={context.name}
        />
        <Label value={context.name} />
        <hr style={{ flex: 1 }} />
        <Badge
          size='sm'
          value='Delete'
          style={{ border: '1px solid var(--red-400)', borderRadius: '2px' }}
          variant='red-subtle'
          icon='Trash2'
          onClick={() =>
            spawnBanner(
              <Context.Delete.Banner
                context={context}
                back={() => spawnBanner(<SelectFiles.Banner />)}
              />,
            )
          }
        />
      </Stack>
      <Separator className={s.separator} />
      {files.map(file => (
        <FileComponent key={file.id} file={file} selectedFiles={selectedFiles} setFile={setFile} />
      ))}
    </Stack>
  )
}

interface FileComponentProps {
  file: Source.Type;
  selectedFiles: Set<Source.Id>;
  setFile: (file: Source.Id, select: boolean) => void;
}

function FileComponent({ file, setFile, selectedFiles }: FileComponentProps) {
  const { app, Info, spawnBanner } = Application.use()
  const [loading, setLoading] = useState<boolean>(false);

  const previewButtonClickHandler = () => {
    setLoading(true)
    Info.preview_file(file)
      .then(({ docs, total_hits }) => spawnBanner(<Preview.Banner total={total_hits} values={docs} fixed back={() => spawnBanner(<SelectFiles.Banner />)} done={<Button icon='Check' onClick={() => spawnBanner(<SelectFiles.Banner />)} variant='glass' />} />))
  }

  const FileIsTooBig = () => {
    if (file.total < 500_000) {
      return null
    }

    return (
      <Badge size='sm' variant='amber-subtle' icon='Warning' value='This file is too big' />
    )
  };

  return (
    <Stack className={cn(s.file, !file.total && s.disabled)} key={file.id}>
      <Checkbox
        id={file.name}
        checked={selectedFiles.has(file.id)}
        onCheckedChange={checked => setFile(file.id, !!checked)}
      />
      {Source.Entity.getRequestType(app, file) === Request.Prefix.INGESTION && <Spinner size={16} />}
      <Label value={file.name} />
      <FileIsTooBig />
      <Badge
        size='sm'
        className={s.amount}
        variant='gray-subtle'
        value={file.total}
      />
      <Button
        icon='Filter'
        variant='secondary'
        className={s.smallButton}
        onClick={() => spawnBanner(<FilterFileBanner files={[file]} fixed back={() => spawnBanner(<SelectFiles.Banner />)} />)}
      />
      <Button
        icon='PreviewEye'
        variant='secondary'
        loading={loading}
        className={s.smallButton}
        onClick={previewButtonClickHandler}
      />
      <Badge
        size='sm'
        style={{ border: '1px solid var(--red-400)', borderRadius: '2px', padding: 4 }}
        variant='red-subtle'
        icon='Trash2'
        onClick={() => spawnBanner(<Source.Delete.Banner file={file} back={() => spawnBanner(<SelectFiles.Banner />)} />)}
      />
    </Stack>
  )
}
