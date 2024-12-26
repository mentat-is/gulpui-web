import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Banner } from "@/ui/Banner";
import { Checkbox } from "@/ui/Checkbox";
import s from './styles/SelectFilesBanner.module.css';
import { Badge } from "@/ui/Badge";
import { Label } from "@/ui/Label";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Button } from "@/ui/Button";
import { Context, Operation, Event, Source } from "@/class/Info";
import { Fragment, useCallback, useMemo, useState } from "react";
import { Input } from "@/ui/Input";
import { LimitsBanner } from "./Limits.banner";
import { UploadBanner } from "./Upload.banner";
import { Logger } from "@/dto/Logger.class";
import { Skeleton } from "@/ui/Skeleton";
import { UUID } from "crypto";
import { λContext, λSource } from "@/dto/Operation.dto";

export function SelectFilesBanner() {
  const { app, destroyBanner, Info, spawnBanner } = useApplication();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(!app.target.operations.length && !app.target.contexts.length);
 
  const save = async () => {
    setLoading(true);
    const unfetched = Source.selected(app).filter(source => Event.get(app, source.id).length === 0).map(source => source.id || Event.get(app, source.id).length < source.detailed.doc_count);

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

    const sources = Context.sources(app, context);

    const Sources = useCallback(() => {
      return (
        <Fragment>
          {sources.map(source => <SourceComponent {...source} />)}
        </Fragment>
      )
    }, [app.target.sources]);

    return (
      <div className={s.branch} key={context.id}>
        <div className={s.contextHeading}>
          <Checkbox />
          <Label htmlFor={context.name}>{context.name}</Label>
          <hr style={{ flex: 1 }} />
          <Badge value='Context' />
        </div>
        <Sources />
      </div>
    )
  }

  function SourceComponent(source: λSource) {
    return (
      <div className={s.pluginHeading} key={source.id}>
        <Checkbox id={source.name} checked={source.selected} />
        <Label htmlFor={source.name}>{Source.wellFormatedName(source)}</Label>
        <hr style={{ flex: 1 }} />
        <Badge value={Source.pluginName(source)} />
      </div>
    )
  }

  const FilteredView = () => {
    const filteredSources = app.target.sources.filter(source => source.name.toLowerCase().includes(filter.toLowerCase()));

    return (
      <Fragment>
        {filteredSources.map(source => (
          <div key={source.id} className={s.source}>
            <Checkbox id={source.name} checked={source.selected} />
            <Label htmlFor={source.name}>{source.name}</Label>
            <Badge value='File' variant='outline' />
          </div>
          )
        )}
      </Fragment>
    )
  }

  return (
    <Banner title={lang.select_context.title} fixed={loading} className={s.banner} done={done}>
      <Input img='Search' skeleton={fulfilled} placeholder='Filter sources by name' value={filter} onChange={(e) => setFilter(e.target.value)} />
      <Skeleton style={{ flex: 1 }} enable={fulfilled}>
      <div className={s.wrapper}>
        <Contexts />  
      </div>
      </Skeleton>
      <div className={s.group}>
        <Button img='Upload' variant='ghost' skeleton={fulfilled} onClick={() => spawnBanner(<UploadBanner />)}>Upload and analize</Button>
        <div className={s.splitter} />
        <Button variant='secondary' skeleton={fulfilled}>Select all</Button>
      </div>
    </Banner>
  );
}
