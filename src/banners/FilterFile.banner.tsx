import s from './styles/FilterFileBanner.module.css'
import { Banner } from '@/ui/Banner'
import { useApplication } from '@/context/Application.context'
import { Select } from '@/ui/Select'
import { Button, Stack, } from '@impactium/components'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { File, Filter, Parser, λFilter, λQuery } from '@/class/Info'
import { fws, Refractor } from '@/ui/utils'
import { λFile } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { Separator } from '@/ui/Separator'
import { Preview } from './Preview.banner'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover'
import { OpenSearchQueryBuilder } from '@/components/QueryBuilder'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'

interface FilterFileBannerProps extends Banner.Props {
  files: λFile[],
  query?: λQuery,
  keys?: string[]
}

export function FilterFileBanner({ files: initFiles, query: initQuery, keys: initKeys, ...props }: FilterFileBannerProps) {
  const { app, Info, spawnBanner, destroyBanner } = useApplication()
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

  const Done = useCallback(() => <Button img='Check' variant='glass' loading={loading} onClick={submit} />, [loading, submit]);
  const Undo = useCallback(() => <Button img='Undo' variant='ghost' onClick={() => Info.filters_undo(files)} />, [files]);

  const QueryStringPart = useMemo(() => {
    if (files.length > 1) {
      return null;
    }

    return (
      <OpenSearchQueryBuilder.Query.String style={fws} string={query.string} setString={string => setQuery(q => ({ ...q, string }))} reset={() => setQuery(base)} />
    )
  }, [files, Info]);

  const setFilters = useCallback((filters: λFilter[]) => setQuery(q => ({ ...q, filters })), [setQuery]);

  const [dubugger, reload] = useReducer(v => v++, 0);

  useEffect(() => {
    const id = setInterval(() => {
      reload();
    }, 100);

    return () => clearInterval(id);
  }, []);

  const AddCondition = useMemo(() => (
    <OpenSearchQueryBuilder.Query.Add filters={query.filters} setFilters={setFilters} init={[...keys][0]} />
  ), [query, setFilters, keys.size, dubugger]);

  const QueryConditions = useMemo(() => (
    <OpenSearchQueryBuilder.Query.Filter filters={query.filters} setFilters={setFilters} keys={[...keys]} />
  ), [query, setFilters, keys.size, dubugger])

  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  const previewCurrentFilterButtonClickHandler = useCallback(() => {
    setIsPreviewLoading(true);
    Info.preview_query({
      ...query,
      string: Filter.base(files)
    }).then(({ docs, total_hits }) => {
      setIsPreviewLoading(false);
      if (total_hits > 0) {
        spawnBanner(<Preview.Banner total={total_hits} values={docs} fixed back={() => spawnBanner(<FilterFileBanner files={files} query={query} keys={[...keys]} {...props} />)} />)
      }
    });
  }, [query, files, keys, setIsPreviewLoading]);

  const [lastQueriesList, setLastQueriesList] = useState<λQuery[]>([]);

  useEffect(() => {
    Info.getLastQueries().then(setLastQueriesList);
  }, [setLastQueriesList]);

  const LastQueries = useMemo(() => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button img='ClockFading' variant='secondary'>
            Last filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className={s.lastFilters}>
          <Stack dir='column'>
            {lastQueriesList.map((q, i) => (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Stack>
                        <p>{q.string}</p>
                        <Button img='Check' variant='glass' onClick={() => Info.setQuery(files, q)} />
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
        </PopoverContent>
      </Popover>
    )
  }, [lastQueriesList]);

  return (
    <Banner
      title='Choose filtering options'
      done={<Done />}
      side={<OpenSearchQueryBuilder.Preview query={Filter.query(query)} />}
      subtitle={LastQueries}
      className={s.banner}
      option={<Undo />}
      {...props}
    >
      <Select.Multi.Root value={files.map(file => file.id)} onValueChange={files => setFiles(files.map(file => File.id(app, file as λFile['id'])))}>
        <Select.Trigger>
          <Select.Multi.Value icon={['File', 'Files']} placeholder='Select files to apply filters' text={len => typeof len === 'number' ? `Selected ${len} files` : File.id(app, len as λFile['id']).name} />
        </Select.Trigger>
        <Select.Content>
          {File.selected(app).map(file => (
            <Select.Item value={file.id}>
              <Icon name={File.icon(file)} />
              {file.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Multi.Root>
      {QueryStringPart}
      {AddCondition}
      <Separator />
      {QueryConditions}
      <Button variant='glass' loading={isPreviewLoading} onClick={previewCurrentFilterButtonClickHandler} img='PreviewDocument'>Preview result of current filter</Button>
    </Banner>
  )
}
