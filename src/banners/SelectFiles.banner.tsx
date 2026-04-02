import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Checkbox } from '@/ui/Checkbox'
import s from './styles/SelectFilesBanner.module.css'
import { Label } from '@/ui/Label'
import { useEffect, useMemo, useReducer, useState, useRef } from 'react'
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual'
import { Frame } from './Frame.banner'
import { UploadBanner } from './Upload.banner'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { FilterFileBanner } from './FilterFile.banner'
import { cn } from '@impactium/utils'
import { Refractor } from '@/ui/utils'
import { SetState } from '@/class/API'
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
    const [filter, setFilter] = useState('');
    const [_, debug] = useReducer(i => ++i, 0);
    const [loading, setLoading] = useState(false)
    const [selectedContexts, setSelectedContexts] = useState<Set<Context.Id>>(new Set(Context.Entity.selected(app).map(c => c.id)));
    const [selectedFiles, setSelectedFiles] = useState<Set<Source.Id>>(new Set(Source.Entity.selected(app).map(c => c.id)));

    useEffect(() => {
      const timer = setInterval(debug, 1000);

      return () => clearInterval(timer);
    }, []);

    // @ts-ignore
    const update = <T extends Set<Source.Id | Context.Id>>(values: T, vault: SetState<T>) => vault(new Set<T>([...values.values()]));

    function all(select: boolean) {
      const operation = Operation.Entity.selected(app);
      if (!operation) {
        toast.error('Operation not selected', {
          richColors: true
        })
        return;
      }

      const method = select ? 'add' : 'delete';

      app.target.files.filter(file => file.operation_id === operation.id).filter(file => file.name.toLowerCase().includes(filter.toLowerCase())).forEach(file => {
        selectedFiles[method](file.id);
      });

      app.target.contexts.filter(context => context.operation_id === operation.id).forEach(context => {
        const files = Context.Entity.sources(app, context);

        if (files.some(file => selectedFiles.has(file.id))) {
          selectedContexts.add(context.id);
        } else {
          selectedContexts.delete(context.id);
        }
      })

      update(selectedFiles, setSelectedFiles);
      update(selectedContexts, setSelectedContexts);
    }

    function setContext(context: Context.Id, select: boolean) {
      const method = select ? 'add' : 'delete';

      selectedContexts[method](context);

      Context.Entity.sources(app, context).filter(file => file.name.toLowerCase().includes(filter.toLowerCase())).forEach(file => selectedFiles[method](file.id));

      update(selectedFiles, setSelectedFiles);
      update(selectedContexts, setSelectedContexts);
    }

    function setFile(target: Source.Id, select: boolean) {
      const method = select ? 'add' : 'delete';

      selectedFiles[method](target);

      const file = Source.Entity.id(app, target);

      const files = Context.Entity.sources(app, file.context_id);

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

    const filteredContexts = Operation.Entity.contexts(app).filter((ctx) => {
      if (!filter) return true;
      const contextMatches = ctx.name.toLowerCase().includes(filter.toLowerCase());
      const sourceMatches = Context.Entity.sources(app, ctx).some((f) => f.name.toLowerCase().includes(filter.toLowerCase()));
      return contextMatches || sourceMatches;
    });

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

    type VirtualItemType = { type: 'context'; context: Context.Type; }

    const items = useMemo(() => {
      const arr: VirtualItemType[] = [];
      filteredContexts.forEach(context => {
        arr.push({ type: 'context', context });
        // const files = Context.Entity.sources(app, context).filter(file => file.name.toLowerCase().includes(filter.toLowerCase()));
        // files.forEach((file, index) => {
        //   arr.push({ type: 'file', context, file, isLast: index === files.length - 1 });
        // });
      });
      return arr;
    }, [filteredContexts, filter, app.target.files, app.target.contexts]);

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => items[index].type === 'context' ? 50 : 36,
      overscan: 10,
    });

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
        </Stack>
        <div className={s.wrapper} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <Skeleton show={!hasData} width='full' style={{ height: '100%' }}>
            {items.length > 0 ? (
              <div 
                ref={parentRef}               
                
                style={{ 
                  height: '100%', 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  paddingRight: 8
                }}
              >
                <div  style={{ 
                    height: `${rowVirtualizer.getTotalSize()}px`, 
                    width: '100%', position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                     }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index];
                    if (!item) return null;
                    return (

                        <ContextHeading  
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        context={item.context} selectedFiles={selectedFiles} setFile={setFile} selectedContexts={selectedContexts} setContext={setContext} />                         

                    )
                  })}
                </div>
              </div>
            ) : (
              <p className={s.noData}>
                There is no data to analyze. Click below to upload...
              </p>
            )}
          </Skeleton>
        </div>
        <Stack>
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

function ContextHeading({ context, selectedContexts, selectedFiles, setFile, setContext }: any) {
  const { app, spawnBanner } = Application.use();
  type VirtualItemType = { type: 'file'; context: Context.Type; file: Source.Type; isLast: boolean };
  
  const items = useMemo(() => {
    const arr: VirtualItemType[] = [];
    Context.Entity.sources(app, context).forEach((file, index) => {
      arr.push({ type: 'file', context, file, isLast: index === Context.Entity.sources(app, context).length - 1 });
    });
    return arr;
  }, [context, app.target.files, app.target.contexts]);
  
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => items[index].type === 'file' ? 50 : 36,
    overscan: 10,
  });

  const hasData = items.length > 0;
  
  return (
    <Stack
      dir='column'
      gap={0}
      ai='stretch'
      jc='flex-start'
      className={s.branch}
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
      <Separator className={s.separator} style={{ marginTop: 8 }} />      
          {items.length > 0 ? (
              <div 
                ref={parentRef}               
                
                style={{ 
                  height: '100%', 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >
                <div  style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index];
                    if (!item) return null;
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}                        
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                         <div style={{ paddingTop: 8 }}>
                          <FlatFileComponent file={item.file} selectedFiles={selectedFiles} setFile={setFile} isLast={item.isLast} />
                         </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className={s.noData}>
                There is no data to analyze. Click below to upload...
              </p>
            )}
    </Stack>
  )
}

function FlatFileComponent({ file, selectedFiles, setFile, isLast }: any) {
  return (
    <Stack 
      dir='column' 
      ai='stretch' 
      jc='flex-start'
    >
      <FileComponent file={file} selectedFiles={selectedFiles} setFile={setFile} />
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

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const isIngesting = Source.Entity.getRequestType(app, file) === Request.Prefix.INGESTION;
    if (!isIngesting) {
      if (progress !== 0) setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const current = Info.ingestionProgress.get(file.id) || 0;
      setProgress(current);
    }, 250);

    return () => clearInterval(interval);
  }, [app, file.id, Info.ingestionProgress]);

  const FileIsTooBig = () => {
    const total = file.total + progress;
    if (total < 500_000) {
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
        value={file.total + progress}
      />
      <Button
        shape='icon'
        icon='Filter'
        variant='secondary'
        className={s.smallButton}
        onClick={() => spawnBanner(<FilterFileBanner sources={[file]} fixed back={() => spawnBanner(<SelectFiles.Banner />)} />)}
      />
      <Button
        shape='icon'
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
        onClick={() => spawnBanner(<Source.Delete.Banner source={file} back={() => spawnBanner(<SelectFiles.Banner />)} />)}
      />
    </Stack>
  )
}
