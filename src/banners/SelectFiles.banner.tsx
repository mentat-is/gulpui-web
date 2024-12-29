import { useApplication } from '@/context/Application.context';
import { useLanguage } from '@/context/Language.context';
import { Banner } from '@/ui/Banner';
import { Checkbox } from '@/ui/Checkbox';
import s from './styles/SelectFilesBanner.module.css';
import { Badge } from '@/ui/Badge';
import { Label } from '@/ui/Label';
import { Button, Skeleton } from '@impactium/components';
import { Context, Operation, Event, File } from '@/class/Info';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Input } from '@/ui/Input';
import { LimitsBanner } from './Limits.banner';
import { UploadBanner } from './Upload.banner';
import { λContext, λFile } from '@/dto/Operation.dto';

export function SelectFilesBanner() {
  const { app, destroyBanner, Info, spawnBanner } = useApplication();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(!app.target.operations.length && !app.target.contexts.length);
 
  const save = async () => {
    setLoading(true);
    const unfetched = File.selected(app).filter(file => Event.get(app, file.id).length === 0).map(file => file.id || Event.get(app, file.id).length < file.detailed.doc_count);

    if (unfetched.length && app.target.bucket.selected) {
      return await Info.refetch({
        ids: unfetched
      }).then(destroyBanner);
    }

    spawnBanner(<LimitsBanner />);
  }

  const fulfilled = !Operation.selected(app)?.contexts;

  const done = <Button img='Check' loading={loading} variant='glass' onClick={save} />;

  const NoDataInOperation = useMemo(() => <p className={s.noData}>There is no any data to analyze. Click below to upload...</p>, []);

  function Contexts() {
    const contexts = Operation.contexts(app);

    if (contexts.length === 0) {
      return NoDataInOperation;
    }

    return (
      <Fragment>
        {contexts.map(context => <ContextComponent {...context} />)}
      </Fragment>
    )
  }

  function ContextComponent(context: λContext) {
    if (filter.length) {
      return <FilteredView />
    }

    const files = Context.files(app, context);

    const Files = useCallback(() => {
      return (
        <Fragment>
          {files.map(file => <FileComponent {...file} />)}
        </Fragment>
      )
    }, [app.target.files]);

    const handleContextCheck = (value: boolean) => {
      const newContexts = value
        ? Context.select(app, context)
        : Context.unselect(app, context)

      Info.contexts_select(newContexts)
    }

    return (
      <div className={s.branch} key={context.id}>
        <div className={s.contextHeading}>
          <Checkbox checked={context.selected ? Context.files(app, context).every(f => f.selected) ? true : 'indeterminate' : false} onCheckedChange={handleContextCheck} />
          <Label htmlFor={context.name}>{context.name}</Label>
          <hr style={{ flex: 1 }} />
          <Badge value='Context' />
        </div>
        <Files />
      </div>
    )
  }

  function FileComponent(file: λFile) {
    const handleFileCheck = (value: boolean) => {
      const newFiles = value
        ? File.select(app, file)
        : File.unselect(app, file)

      Info.files_select(newFiles)
    }

    return (
      <div className={s.pluginHeading} key={file.id}>
        <Checkbox id={file.name} checked={file.selected} onCheckedChange={handleFileCheck} />
        <Label htmlFor={file.name}>{File.wellFormatedName(file)}</Label>
        <hr style={{ flex: 1 }} />
        <Badge value={File.pluginName(file)} />
      </div>
    )
  }

  const FilteredView = () => {
    const filteredFiles = app.target.files.filter(file => file.name.toLowerCase().includes(filter.toLowerCase()));

    return (
      <Fragment>
        {filteredFiles.map(file => (
          <div key={file.id} className={s.file}>
            <Checkbox id={file.name} checked={file.selected} />
            <Label htmlFor={file.name}>{file.name}</Label>
            <Badge value='File' variant='outline' />
          </div>
          )
        )}
      </Fragment>
    )
  }

  return (
    <Banner title={lang.select_context.title} fixed={loading} className={s.banner} done={done}>
      <Input img='Search' skeleton={fulfilled} placeholder='Filter files by name' value={filter} onChange={(e) => setFilter(e.target.value)} />
      <Skeleton style={{ flex: 1 }} show={fulfilled}>
      <div className={s.wrapper}>
        <Contexts />  
      </div>
      </Skeleton>
      <div className={s.group}>
        <Skeleton show={fulfilled}>
          <Button img='Upload' variant='ghost' onClick={() => spawnBanner(<UploadBanner />)}>Upload and analize</Button>
        </Skeleton>
        
        <div className={s.splitter} />
        <Skeleton show={fulfilled}>
          <Button variant='secondary'>Select all</Button>
        </Skeleton>
        
      </div>
    </Banner>
  );
}
