import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Checkbox } from '@/ui/Checkbox'
import s from './styles/SelectFilesBanner.module.css'
import { Badge } from '@impactium/components'
import { Label } from '@/ui/Label'
import { Button, Skeleton, Stack, Input } from '@impactium/components'
import { Context, File, Operation } from '@/class/Info'
import { useEffect, useMemo, useState } from 'react'
import { Frame } from './Frame.banner'
import { UploadBanner } from './Upload.banner'
import { λContext, λFile } from '@/dto/Dataset'
import { Separator } from '@/ui/Separator'
import { Delete } from './Delete.banner'
import { Preview } from './Preview.banner'
import { FilterFileBanner } from './FilterFile.banner'
import { cn } from '@impactium/utils'
import { Refractor } from '@/ui/utils'
import { SetState } from '@/class/API'

export namespace SelectFiles {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner(props: Banner.Props) {
    const { app, Info, spawnBanner } = useApplication()
    const [filter, setFilter] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedContexts, setSelectedContexts] = useState<Set<λContext['id']>>(new Set());
    const [selectedFiles, setSelectedFiles] = useState<Set<λFile['id']>>(new Set());

    // @ts-ignore
    const update = <T extends Set<λFile['id'] | λContext['id']>>(values: T, vault: SetState<T>) => vault(new Set<T>([...values.values()]));

    function all(select: boolean) {
      const method = select ? 'add' : 'delete';

      app.target.files.filter(file => file.name.toLowerCase().includes(filter.toLowerCase())).forEach(file => {
        selectedFiles[method](file.id);
      });

      app.target.contexts.forEach(context => {
        const files = Context.files(app, context);

        if (files.some(file => selectedFiles.has(file.id))) {
          selectedContexts.add(context.id);
        } else {
          selectedContexts.delete(context.id);
        }
      })

      update(selectedFiles, setSelectedFiles);
      update(selectedContexts, setSelectedContexts);
    }

    function setContext(context: λContext['id'], select: boolean) {
      const method = select ? 'add' : 'delete';

      selectedContexts[method](context);

      Context.files(app, context).filter(file => file.name.toLowerCase().includes(filter.toLowerCase())).forEach(file => selectedFiles[method](file.id));

      update(selectedFiles, setSelectedFiles);
      update(selectedContexts, setSelectedContexts);
    }

    function setFile(target: λFile['id'], select: boolean) {
      const method = select ? 'add' : 'delete';

      selectedFiles[method](target);

      const file = File.id(app, target);

      const files = Context.files(app, file.context_id);

      if (files.some(file => selectedFiles.has(file.id))) {
        selectedContexts.add(file.context_id);
      } else {
        selectedContexts.delete(file.context_id);
      }

      update(selectedContexts, setSelectedContexts);
      update(selectedFiles, setSelectedFiles);
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

      setTimeout(() => {
        spawnBanner(<Frame.Banner fixed back={() => spawnBanner(<SelectFiles.Banner />)} />);
      }, 10);
    };

    const reloadClickHandler = async () => {
      setLoading(true);
      await Info.sync();
      setLoading(false);
    };

    const filteredContexts = Operation.contexts(app).filter((ctx) => Context.files(app, ctx).some((f) => f.name.toLowerCase().includes(filter.toLowerCase())));

    const SearchInput = useMemo(() => {
      return (
        <Input
          img='Search'
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
            img='Check'
            variant='glass'
            onClick={save}
          />
        }
        option={
          <Button
            img='Upload'
            variant='ghost'
            onClick={() => spawnBanner(<UploadBanner />)}
          />
        }
        {...props}
      >
        {SearchInput}
        <Stack className={s.wrapper} dir='column' gap={12} jc='stretch'>
          <Skeleton show={!hasData} width='full'>
            {filteredContexts.length > 0 ? (
              filteredContexts.map((context) => (
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
            style={{ flex: 1 }}
            img='FilePlus'
          >
            Select all
          </Button>
          <Button
            onClick={() => all(false)}
            variant='secondary'
            style={{ flex: 1 }}
            img='FileMinus'
          >
            Unselect all
          </Button>
          <Button
            onClick={reloadClickHandler}
            variant='secondary'
            style={{ flex: 1 }}
            img='RefreshClockwise'
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
  context: λContext;
  filter: string;
  selectedFiles: Set<λFile['id']>;
  setFile: (file: λFile['id'], select: boolean) => void;
  selectedContexts: Set<λContext['id']>;
  setContext: (context: λContext['id'], select: boolean) => void;
};

function ContextComponent({ context, filter, selectedFiles, selectedContexts, setFile, setContext }: ContextComponentProps) {
  const { app, spawnBanner } = useApplication()
  const files = Context.files(app, context).filter(file => file.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Stack
      dir='column'
      ai='stretch'
      jc='flex-start'
      className={s.branch}
      key={context.id}
    >
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
          variant='red-subtle'
          icon='Trash2'
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
        <FileComponent key={file.id} file={file} selectedFiles={selectedFiles} setFile={setFile} />
      ))}
    </Stack>
  )
}

interface FileComponentProps {
  file: λFile;
  selectedFiles: Set<λFile['id']>;
  setFile: (file: λFile['id'], select: boolean) => void;
}

function FileComponent({ file, setFile, selectedFiles }: FileComponentProps) {
  const { Info, spawnBanner } = useApplication()
  const [loading, setLoading] = useState<boolean>(false);

  const previewButtonClickHandler = () => {
    setLoading(true)
    Info.preview_file(file)
      .then(({ docs, total_hits }) => spawnBanner(<Preview.Banner total={total_hits} values={docs} fixed back={() => spawnBanner(<SelectFiles.Banner />)} done={<Button img='Check' onClick={() => spawnBanner(<SelectFiles.Banner />)} variant='glass' />} />))
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
    <Stack className={cn(s.pluginHeading, !file.total && s.disabled)} key={file.id}>
      <Checkbox
        id={file.name}
        checked={selectedFiles.has(file.id)}
        onCheckedChange={checked => setFile(file.id, !!checked)}
      />
      <Label value={file.name} />
      <FileIsTooBig />
      <Badge size='sm' className={s.amount} variant='gray-subtle' value={file.total.toString()} />
      <Button
        img='Filter'
        variant='secondary'
        className={s.smallButton}
        onClick={() => spawnBanner(<FilterFileBanner files={[file]} fixed back={() => spawnBanner(<SelectFiles.Banner />)} />)}
      />
      <Button
        img='PreviewEye'
        variant='secondary'
        loading={loading}
        className={s.smallButton}
        onClick={previewButtonClickHandler}
      />
    </Stack>
  )
}
