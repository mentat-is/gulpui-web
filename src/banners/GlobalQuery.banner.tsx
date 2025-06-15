import { Event, File, Filter, λFilter, λQuery } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner as UIBanner } from '@/ui/Banner';
import { Button, Input, Stack } from '@impactium/components';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { OpenSearchQueryBuilder } from './FilterFile.banner';
import { Separator } from '@/ui/Separator';
import s from './styles/GlobalQueryBanner.module.css';
import { Icon } from '@impactium/icons';
import { Preview } from './Preview.banner';
import { Notification } from '@/ui/Notification';
import { λDoc, λEvent } from '@/dto/ChunkEvent.dto';
import { λFile } from '@/dto/Dataset';

export namespace GlobalQuery {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      query?: λQuery;
    }
  }

  export function Banner({ query: initQuery, ...props }: GlobalQuery.Banner.Props) {
    const { Info, spawnBanner } = useApplication();
    const [query, setQuery] = useState<λQuery>(initQuery ?? {
      string: '',
      filters: []
    });

    const resetQueryButtonClickHandler = () => {
      setQuery({
        string: '',
        filters: []
      })
    }

    const QueryStringBuilder = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.String string={query.string} setString={string => setQuery(q => ({ ...q, string }))} />
      )
    }, [query.string, setQuery]);

    const setFilters = useCallback((filters: λFilter[]) => {
      setQuery(q => ({
        ...q,
        filters
      }))
    }, [setQuery]);

    const QueryFilterBuilder = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.Filter filters={query.filters} setFilters={setFilters} keys={[]} />
      )
    }, [query, setFilters]);

    console.log(query);

    const AddFilter = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.Add init='' setFilters={setFilters} filters={query.filters} />
      )
    }, [query, setFilters]);

    const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
    const doneButtonClickHandler = async () => {
      setIsQueryLoading(true);
      const { docs, total_hits } = await Info.query_file(query, true);
      setIsQueryLoading(false);

      spawnBanner(<GlobalQuery.Apply query={query} docs={docs} back={() => spawnBanner(<GlobalQuery.Banner query={query} {...props} />)} total={total_hits} />)
    }

    const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
    const tabularPreviewButtonClickHandler = async () => {
      setIsPreviewLoading(true);
      const { docs, total_hits } = await Info.query_file(query, true);
      setIsPreviewLoading(false);

      spawnBanner(<Preview.Banner total={total_hits} values={docs} back={() => spawnBanner(<GlobalQuery.Banner query={query} {...props} />)} />)
    }

    const DoneButton = () => <Button onClick={doneButtonClickHandler} img='Check' loading={isQueryLoading} variant='glass' />

    return (
      <UIBanner done={<DoneButton />} title='Global query' side={<OpenSearchQueryBuilder.Preview query={Filter.query(query)} />} {...props}>
        {QueryStringBuilder}
        {AddFilter}
        <Separator />
        {QueryFilterBuilder}
        <Stack ai='stretch' style={{ width: '100%' }}>
          <Button style={{ flex: 1 }} variant='secondary' img='Undo2' onClick={resetQueryButtonClickHandler}>Reset query</Button>
          <Button style={{ flex: 1 }} variant='secondary' img='Table' loading={isPreviewLoading} onClick={tabularPreviewButtonClickHandler}>Tabular preview</Button>
        </Stack>
        <Notification variant='error' icon='Warning'>
          <p><span>Attention</span>: Some queries may make your PC explode. Build it with caution</p>
        </Notification>
      </UIBanner>
    )
  }

  export namespace Apply {
    export interface Props extends UIBanner.Props {
      query: λQuery;
      total: number;
      docs: λDoc[];
    }
  }

  export function Apply({ query, total, docs, ...props }: Apply.Props) {
    const { Info, destroyBanner } = useApplication();
    const [filename, setFilename] = useState<string>('');
    const [isFilenameValid, setIsFilenameValid] = useState<boolean>(true);
    const [context, setContext] = useState<string>('');
    const [isContextValid, setIsContextValid] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);

    const filenameInputChangeHandler = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setIsFilenameValid(value.length >= 3 && !Info.app.target.files.some(file => file.name === value));

      setFilename(value);
    }, [filename, setFilename, setIsFilenameValid]);

    const contextInputChangeHandler = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setIsContextValid(value.length >= 3 && !Info.app.target.contexts.some(context => context.name === value));

      setContext(value);
    }, [context, setContext, setIsContextValid]);

    const doneButtonClickHandler = useCallback(() => {
      setLoading(true);

      const ids: Set<λFile['id']> = new Set();

      docs.forEach(doc => {
        // TODO ONLY 100;
        ids.add(doc['gulp.source_id']);
      });

      Info.query_global({
        fileName: filename,
        ids: Array.from(ids.keys()),
        contextName: context,
        query,
        total
      }).then(() => {
        setLoading(false);
        destroyBanner();
      });
    }, [Info, filename]);

    const DoneButton = useMemo(() => {
      return (
        <Button loading={loading} onClick={doneButtonClickHandler} disabled={filename.length < 3 || context.length < 3 || !isFilenameValid || !isContextValid} img='Check' variant='glass' />
      )
    }, [isFilenameValid, isContextValid, loading, doneButtonClickHandler]);

    return (
      <UIBanner title='Apply global query' done={DoneButton} {...props}>
        <Preview.AmountNotification total={total} />
        <Input value={filename} valid={isFilenameValid} onChange={filenameInputChangeHandler} variant='highlighted' img='TextTitle' placeholder='File name' />
        <Input value={context} valid={isContextValid} onChange={contextInputChangeHandler} variant='highlighted' img='TextTitle' placeholder='Context name' />
      </UIBanner>
    )
  }
}