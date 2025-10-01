import s from './styles/FilterFileBanner.module.css'
import { Banner } from '@/ui/Banner'
import { Application } from '@/context/Application.context'
import { Select } from '@/ui/Select'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { fws } from '@/ui/utils'
import { Icon } from '@impactium/icons'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { Popover } from '@/ui/Popover'
import { OpenSearchQueryBuilder } from '@/components/QueryBuilder'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { Query } from '@/entities/Query'
import { Source } from '@/entities/Source'
import { Filter } from '@/entities/Filter'

interface FilterFileBannerProps extends Banner.Props {
  files: Source.Type[],
  query?: Query.Type,
  keys?: string[]
}

export function FilterFileBanner({ files: initFiles, query: initQuery, keys: initKeys, ...props }: FilterFileBannerProps) {
  const { app, Info, spawnBanner, destroyBanner } = Application.use()
  const [loading, setLoading] = useState<boolean>(false)
  const [files, setFiles] = useState(initFiles);

  const base = useMemo(() => ({
    string: '',
    filters: []
  }), []);

  const [isInvoked, setIsInvoked] = useState<boolean>(false);

  const updateQuery = useCallback(() => {
    if (!files.length) {
      return base;
    }

    const q = Info.getQuery(files[0]);

    return {
      ...q,
      string: files.length === 1 ? q.string : ''
    };
  }, [files, base]);

  const [query, setQuery] = useState(initQuery ?? updateQuery());

  useEffect(() => {
    if (!isInvoked) {
      return setIsInvoked(true);
    }

    const query = updateQuery();

    setQuery(query);
  }, [files]);

  const keys = useMemo(() => {
    const keys = new Set<string>();

    Promise.all(files.map(file => Info.event_keys(file).then(fileKeys => Object.keys(fileKeys).forEach(k => keys.add(k)))));

    return keys
  }, [files]);

  const submit = async () => {
    setLoading(true);

    Info.filters_cache(files)

    Info.setQuery(files, query);

    await Info.refetch({ ids: files.map(f => f.id) });

    Info.render();

    if (props.back) {
      props.back()
    } else {
      destroyBanner()
    }
    setLoading(false);
  }

  const Done = useCallback(() => <Button icon='Check' variant='glass' loading={loading} onClick={submit} />, [loading, submit]);
  const Undo = useCallback(() => <Button icon='Undo' variant='tertiary' onClick={() => Info.filters_undo(files)} />, [files]);

  const QueryStringPart = useMemo(() => {
    if (files.length > 1) {
      return null;
    }

    return (
      <OpenSearchQueryBuilder.Query.String style={fws} string={query.string} setString={string => setQuery(q => ({ ...q, string }))} reset={() => setQuery(base)} />
    )
  }, [files, Info]);

  const setFilters = useCallback((filters: Filter.Type[]) => setQuery(q => ({ ...q, filters })), [setQuery]);

  const [dubugger, reload] = useReducer(v => v++, 0);

  useEffect(() => {
    const id = setInterval(() => {
      reload();
    }, 100);

    return () => clearInterval(id);
  }, []);

  const AddCondition = useMemo(() => (
    <OpenSearchQueryBuilder.Query.Add filters={query.filters} setFilters={setFilters} />
  ), [query, setFilters, dubugger]);

  const QueryConditions = useMemo(() => (
    <OpenSearchQueryBuilder.Query.Filters filters={query.filters} setFilters={setFilters} keys={[...keys]} />
  ), [query, setFilters, keys.size, dubugger])

  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  const previewCurrentFilterButtonClickHandler = useCallback(() => {
    setIsPreviewLoading(true);
    Info.preview_query({
      ...query,
      string: Filter.Entity.base(files)
    }).then(({ docs, total_hits }) => {
      setIsPreviewLoading(false);
      if (total_hits > 0) {
        spawnBanner(<Preview.Banner total={total_hits} values={docs} fixed back={() => spawnBanner(<FilterFileBanner files={files} query={query} keys={[...keys]} {...props} />)} />)
      }
    });
  }, [query, files, keys, setIsPreviewLoading]);

  const [lastQueriesList, setLastQueriesList] = useState<Query.Type[]>([]);

  useEffect(() => {
    Info.getLastQueries().then(setLastQueriesList);
  }, [setLastQueriesList]);

  const LastQueries = useMemo(() => {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button icon='ClockFading' variant='secondary'>
            Last filters
          </Button>
        </Popover.Trigger>
        <Popover.Content className={s.lastFilters}>
          <Stack dir='column'>
            {lastQueriesList.map((q, i) => (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Stack>
                        <p>{q.string}</p>
                        <Button icon='Check' variant='glass' onClick={() => Info.setQuery(files, q)} />
                      </Stack>
                    </TooltipTrigger>
                    <TooltipContent className={s.tooltip}>
                      <p>{q.string}</p>
                      <p>{JSON.stringify(q.filters, null, 2)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {lastQueriesList.length - 1 > i && <Separator />}
              </>
            ))}
          </Stack>
        </Popover.Content>
      </Popover.Root>
    )
  }, [lastQueriesList]);

  return (
    <Banner
      title='Choose filtering options'
      done={<Done />}
      side={<OpenSearchQueryBuilder.Preview query={Filter.Entity.query(query)} />}
      subtitle={LastQueries}
      className={s.banner}
      option={<Undo />}
      {...props}
    >
      <Select.Multi.Root value={files.map(file => file.id)} onValueChange={files => setFiles(files.map(file => Source.Entity.id(app, file as Source.Id)))}>
        <Select.Trigger>
          <Select.Multi.Value icon={['File', 'Files']} placeholder='Select files to apply filters' text={len => typeof len === 'number' ? `Selected ${len} files` : Source.Entity.id(app, len as Source.Id).name} />
        </Select.Trigger>
        <Select.Content>
          {Source.Entity.selected(app).map(file => (
            <Select.Item value={file.id}>
              <Icon name={Source.Entity.icon(file)} />
              {file.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Multi.Root>
      {QueryStringPart}
      {AddCondition}
      <Separator />
      {QueryConditions}
      <Button variant='glass' loading={isPreviewLoading} onClick={previewCurrentFilterButtonClickHandler} icon='PreviewDocument'>Preview result of current filter</Button>
    </Banner>
  )
}
