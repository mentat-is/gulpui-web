import { Application } from '@/context/Application.context';
import { Banner as UIBanner } from '@/ui/Banner';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { Separator } from '@/ui/Separator';
import { Preview } from './Preview.banner';
import { Notification } from '@/ui/Notification';
import { Checkbox } from '@/ui/Checkbox';
import { Label } from '@/ui/Label';
import { OpenSearchQueryBuilder } from '@/components/QueryBuilder';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Stack } from '@/ui/Stack';
import { Query } from '@/entities/Query';
import { Filter } from '@/entities/Filter';
import { Doc } from '@/entities/Doc';

export namespace GlobalQuery {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      query?: Query.Type;
    }
  }

  export function Banner({ query: initQuery, ...props }: GlobalQuery.Banner.Props) {
    const { Info, spawnBanner, destroyBanner } = Application.use();
    const [query, setQuery] = useState<Query.Type>(initQuery ?? {
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

    const normalizedQuery = useMemo(
      () => Filter.Entity.query(query) as unknown as Query.Type,
      [query]
    );

    const QueryStringBuilder = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.String string={query.string} setString={string => setQuery(q => ({ ...q, string }))} />
      )
    }, [query.string, setQuery]);

    const setFilters = useCallback((filters: Filter.Type[]) => {
      setQuery(q => ({
        ...q,
        filters
      }))
    }, [setQuery]);

    const QueryFilterBuilder = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.Filters filters={query.filters} setFilters={setFilters} keys={[]} />
      )
    }, [query, setFilters]);

    const AddFilter = useMemo(() => {
      return (
        <OpenSearchQueryBuilder.Query.Add setFilters={setFilters} filters={query.filters} />
      )
    }, [query, setFilters]);

    const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
    const doneButtonClickHandler = async () => {
      setIsQueryLoading(true);

      const { total_hits: total } = await Info.query_file(normalizedQuery, {
        preview: true
      });

      await Info.query_global({ 
        filename, 
        context, 
        separately, 
        query: normalizedQuery, 
        total 
      });

      setIsQueryLoading(false);
      destroyBanner();
    }

    const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
    const tabularPreviewButtonClickHandler = async () => {
      setIsPreviewLoading(true);
      const { docs, total_hits } = await Info.query_file(normalizedQuery, {
        preview: true
      });
      setIsPreviewLoading(false);

      spawnBanner(<Preview.Banner total={total_hits} values={docs} back={() => spawnBanner(<GlobalQuery.Banner query={query} {...props} />)} />)
    }

    const DoneButton = () => <Button onClick={doneButtonClickHandler} icon='Check' loading={isQueryLoading} disabled={separately ? filename.length < 3 || context.length < 3 || !isFilenameValid || !isContextValid : false} variant='glass' />

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
          <Input value={filename} valid={isFilenameValid} onChange={filenameInputChangeHandler} variant='highlighted' icon='TextTitle' placeholder='Source.Entity name' />
          <Input value={context} valid={isContextValid} onChange={contextInputChangeHandler} variant='highlighted' icon='TextTitle' placeholder='Context name' />
        </>
      )

    }, [separately, filename, setFilename, isFilenameValid, setIsFilenameValid, context, setContext, isContextValid, setIsContextValid]);

    return (
      <UIBanner done={<DoneButton />} title='Global query' side={<OpenSearchQueryBuilder.Preview query={normalizedQuery} />} {...props}>
        {QueryStringBuilder}
        {AddFilter}
        <Separator />
        {QueryFilterBuilder}
        <Stack ai='stretch' style={{ width: '100%' }}>
          <Button style={{ flex: 1 }} variant='secondary' icon='Undo2' onClick={resetQueryButtonClickHandler}>Reset query</Button>
          <Button style={{ flex: 1 }} variant='secondary' icon='Table' loading={isPreviewLoading} onClick={tabularPreviewButtonClickHandler}>Tabular preview</Button>
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
      query: Query.Type;
      total: number;
      docs: Doc.Minified[];
      separately: boolean;
    }
  }
}
