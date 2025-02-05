import { useApplication } from '@/context/Application.context';
import { useLanguage } from '@/context/Language.context';
import { Banner as UIBanner } from '@/ui/Banner';
import { Checkbox } from '@/ui/Checkbox';
import s from './styles/SelectFilesBanner.module.css';
import { Badge } from '@/ui/Badge';
import { Label } from '@/ui/Label';
import { Button, Skeleton } from '@impactium/components';
import { Context, Operation, File } from '@/class/Info';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@impactium/components';
import { LimitsBanner } from './Limits.banner';
import { UploadBanner } from './Upload.banner';
import { λContext, λFile } from '@/dto/Dataset';
import { Separator } from '@/ui/Separator';

export namespace SelectFiles {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }

  export function Banner({ ...props }: Banner.Props) {
    const { app, Info, spawnBanner } = useApplication();
    const [filter, setFilter] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(!app.target.operations.length && !app.target.contexts.length);
   
    const save = async () => {
      setLoading(true);
  
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
        <div className={s.wrapper}>
          {contexts.map(context => <ContextComponent {...context} />)}
        </div>
      )
    }
  
    function ContextComponent(context: λContext) {
      const files = Context.files(app, context);
  
      const Files = useCallback(() => {
        if (!files) {
          return (
            <Fragment>
              {Array.from({ length: 8 }).map(() => <Skeleton height={20} width='100%' />)}
            </Fragment>
          )
        }
  
        return (
          <Fragment>
            {files.map(file => <FileComponent {...file} />)}
          </Fragment>
        )
      }, [app.target.files]);
  
      if (files.every(f => !f.name.toLowerCase().includes(filter.toLowerCase()))) {
        return null;
      }
  
      const handleContextCheck = (value: boolean) => {
        if (value === true) {
          Info.contexts_select([context])
        } else {
          Info.contexts_unselect([context])
        }
      }
  
      return (
        <div className={s.branch} key={context.id}>
          <div className={s.contextHeading}>
            <Checkbox checked={context.selected ? (Context.files(app, context).every(f => f.selected) ? true : 'indeterminate') : false} onCheckedChange={handleContextCheck} />
            <Label htmlFor={context.name}>{context.name}</Label>
            <hr style={{ flex: 1 }} />
            <Badge value='Context' />
          </div>
          <Separator />
          <Files />
        </div>
      )
    }
  
    function FileComponent(file: λFile) {
      const handleFileCheck = (value: boolean) => {
        if (value === true) {
          Info.files_select([file])
        } else {
          Info.files_unselect([file])
        }
      }
  
      if (!file.name.toLowerCase().includes(filter.toLowerCase())) {
        return null;
      }
  
      return (
        <div className={s.pluginHeading} key={file.id}>
          <Checkbox id={file.name} checked={file.selected} onCheckedChange={handleFileCheck} />
          <Label htmlFor={file.name}>{File.wellFormatedName(file)}</Label>
        </div>
      )
    }
  
    const UploadButton = useCallback(() => {
      return <Button img='Upload' variant='ghost' onClick={() => spawnBanner(<UploadBanner />)} />
    }, []);
  
    return (
      <UIBanner title='Select workflow' fixed={loading} className={s.banner} done={done} option={<UploadButton />} {...props}>
        <Skeleton show={fulfilled} width='full'>
          <Input img='Search' placeholder='Filter files by name' value={filter} onChange={(e) => setFilter(e.target.value)} />
        </Skeleton>
        <Skeleton show={fulfilled} height='full' width='full'>
          <Contexts />
        </Skeleton>
        <div className={s.group}>
          <Skeleton width='full' show={fulfilled}>
            <Button onClick={() => Info.selectAll(filter)} variant='secondary' style={{ width: '100%', background: 'var(--meta-black)' }}>Select all</Button>
          </Skeleton>
        </div>
      </UIBanner>
    );
  }
  
}
