import { Event, File, Filter, λFilter, λQuery } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner as UIBanner } from '@/ui/Banner';
import { Button, Input, Stack } from '@impactium/components';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { OpenSearchQueryBuilder } from './FilterFile.banner';
import { Separator } from '@/ui/Separator';
import s from './styles/GlobalQueryBanner.module.css';
import { Preview } from './Preview.banner';
import { Notification } from '@/ui/Notification';
import { λDoc } from '@/dto/ChunkEvent.dto';
import { λFile } from '@/dto/Dataset';
import { Checkbox } from '@/ui/Checkbox';
import { Label } from '@/ui/Label';

export namespace GlobalQuery {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      query?: λQuery;
    }
  }

  export function Banner({ query: initQuery, ...props }: GlobalQuery.Banner.Props) {
    const { Info, spawnBanner, destroyBanner } = useApplication();
    const [query, setQuery] = useState<λQuery>(initQuery ?? {
      string: '',
      filters: []
    });
    const [separately, setSeparately] = useState(false);

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

    const AddFilter = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.Add init='' setFilters={setFilters} filters={query.filters} />
      )
    }, [query, setFilters]);

    const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
    const doneButtonClickHandler = async () => {
      setIsQueryLoading(true);
      const { total_hits: total } = await Info.query_file(query, {
        preview: true
      });

      await Info.query_global({ filename, context, separately, query, total });

      setIsQueryLoading(false);
      destroyBanner();
    }

    const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
    const tabularPreviewButtonClickHandler = async () => {
      setIsPreviewLoading(true);
      const { docs, total_hits } = await Info.query_file(query, {
        preview: true
      });
      setIsPreviewLoading(false);

      spawnBanner(<Preview.Banner total={total_hits} values={docs} back={() => spawnBanner(<GlobalQuery.Banner query={query} {...props} />)} />)
    }

    const DoneButton = () => <Button onClick={doneButtonClickHandler} img='Check' loading={isQueryLoading} disabled={separately ? filename.length < 3 || context.length < 3 || !isFilenameValid || !isContextValid : false} variant='glass' />

    const [filename, setFilename] = useState<string>('');
    const [isFilenameValid, setIsFilenameValid] = useState<boolean>(true);
    const [context, setContext] = useState<string>('');
    const [isContextValid, setIsContextValid] = useState<boolean>(true);

    const FileDefiner = useMemo(() => {
      if (!separately) {
        return null;
      }

      const filenameInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        setIsFilenameValid(value.length >= 3 && !Info.app.target.files.some(file => file.name === value));

        setFilename(value);
      };

      const contextInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        setIsContextValid(value.length >= 3 && !Info.app.target.contexts.some(context => context.name === value));

        setContext(value);
      };

      return (
        <>
          <Input value={filename} valid={isFilenameValid} onChange={filenameInputChangeHandler} variant='highlighted' img='TextTitle' placeholder='File name' />
          <Input value={context} valid={isContextValid} onChange={contextInputChangeHandler} variant='highlighted' img='TextTitle' placeholder='Context name' />
        </>
      )

    }, [separately, filename, setFilename, isFilenameValid, setIsFilenameValid, context, setContext, isContextValid, setIsContextValid]);

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
        <Stack ai='center' gap={4}>
          <Checkbox id='isNewLine' checked={separately} onCheckedChange={v => setSeparately(!!v)} />
          <Label htmlFor='isNewLine' value='Temporarily save the result as a new file' />
        </Stack>
        {FileDefiner}
        <Notification variant='error' icon='Warning'>
          <p><span>Warning</span>: global queries may have significant impact on system performance. Please use with caution.</p>
        </Notification>
      </UIBanner>
    )
  }

  export namespace Apply {
    export interface Props extends UIBanner.Props {
      query: λQuery;
      total: number;
      docs: λDoc[];
      separately: boolean;
    }
  }
}