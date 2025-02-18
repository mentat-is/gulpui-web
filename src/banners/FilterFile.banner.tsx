import s from './styles/FilterFileBanner.module.css';
import { Banner } from '@/ui/Banner';
import { useApplication } from '@/context/Application.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Button, Stack, Input, Skeleton } from '@impactium/components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { Filter, FilterOptions, FilterType, λFilter, μ, Index } from '@/class/Info';
import React from 'react';
import { copy, generateUUID } from '@/ui/utils';
import { λFile } from '@/dto/Dataset';
import { format } from 'date-fns';
import { Toggle } from '@/ui/Toggle';
import { Icon } from '@impactium/icons';
import { Glyph } from '@/ui/Glyph';
import { SelectIcon } from '@radix-ui/react-select';

const _baseFilter = (): λFilter => ({
  id: generateUUID() as μ.Filter,
  key: '',
  type: FilterType.EQUAL,
  value: ''
})

interface FilterFileBannerProps extends Banner.Props {
  file: λFile;
}

export function FilterFileBanner({ file, ...props }: FilterFileBannerProps) {
  const { app, Info, destroyBanner, spawnBanner } = useApplication();
  const [acceptable, setAcceptable] = useState<Acceptable>('text');
  const [filter, setFilter] = useState<λFilter>(_baseFilter());
  const [loading, setLoading] = useState<boolean>(false);
  const filters_length = useRef<number>((app.target.filters[file.id] || []).length)

  const filters = app.target.filters[file.id] || [];

  useEffect(() => {
    if (app.timeline.filtering_options[file.id]) return;

    const index = Index.selected(app);
    if (!index) {
      return;
    }

    api<FilterOptions>('/opensearch_get_mapping_by_src', {
      query: {
        index,
        operation_id: file.operation_id,
        context_id: file.context_id,
        source_id: file.id,
        ws_id: app.general.ws_id
      }
    }).then(data => Info.setTimelineFilteringoptions(file, data));
  }, [app.timeline.filtering_options]);

  const submit = async () => {
    setLoading(true);
    Info.filters_cache(file);
    Info.refetch({
      ids: file.id,
      hidden: true,
      filter: Filter.query(app, file)
    }).then(() => {
      destroyBanner();
      Info.render();
    });
  }

  const addFilter = () => {
    const _filters = [...filters, filter];
    Info.filters_add(file.id, _filters);
    resetFilter();
  }

  const removeFilter = (filter: λFilter) => {
    const _filters = filters.filter(_filter => _filter.key !== filter.key)
    Info.filters_add(file.id, _filters);
  }

  const resetFilter = () => setFilter(_baseFilter);

  const setKey = (key: string) => {
    const accept = app.timeline.filtering_options[file.id][key];
    if (acceptable !== accept) setValue('');
    setAcceptable(accept);
    setFilter({ ...filter || {}, key })
  };

  const setType = (type: FilterType) => setFilter({...filter || {}, type });

  const setValue = (value: string) => setFilter({...filter || {}, value });

  const handleCheckedChange = (checked: boolean, filter: λFilter) => Info.filters_change(file, filter, { isOr: checked });

  const undo = () => Info.filters_undo(file);

  const Done = () => <Button img='Check' variant='glass' disabled={filter.value} loading={loading} onClick={submit} />;

  const Undo = useCallback(() => {
    return (
      <Button img='Undo' variant='ghost' onClick={undo} />
    )
  }, [undo]);

  function AvailableFilters() {
    if (filters.length === 0) {
      return null;
    }

    const editFilter = (filter: λFilter) => {
      setFilter(filter);
      removeFilter(filter);
    }

    return (
      <Stack dir='column' gap={0} className={s.filters}>
        {filters.map((filter, i) => (
          <React.Fragment key={i}>
            <Stack ai='center' className={s.filter}>
              <code>{filter.key}</code>
              <span>{filter.type}</span>
              <p>{typeof filter.value !== 'string' ? format(filter.value, 'LLL dd, y') : filter.value}</p>
              <hr />
              <Button size='sm' className={s.delete} variant='ghost' img='PenLine' onClick={() => editFilter(filter)} />
              <Button size='sm' className={s.delete} variant='ghost' img='Trash2' onClick={() => removeFilter(filter)} />
            </Stack>
            <Toggle className={s.toggle} option={['AND', 'OR']} checked={filter.isOr} onCheckedChange={(checked) => handleCheckedChange(checked, filter)} />
          </React.Fragment>
        ))}
      </Stack>
    )
  }

  const preloading = useMemo(() => {
    return false;
  }, [app.timeline.filtering_options]);

  const [raw, setRaw] = useState<string>('');
  const [manual, setManual] = useState<boolean>(false);

  const FilterField = useMemo(() => {
    if (manual) {
      return <Input img='CodeBlock' variant='highlighted' value={raw} onChange={e => setRaw(e.target.value)} /> 
    }

    const acceptableToType = (): string => {
      switch (acceptable) {
        case 'date_nanos':
          return 'timestamp in nanosecond';
          
        case 'long':
          return 'number';

        case 'keyword':
          return 'keyword';

        case 'ip':
          return 'ip adress';

        case 'text':
          return 'text';
      }
    }

    return (
      <Stack className={s.top}>
        <Select onValueChange={setKey} value={filter?.key}>
          <Skeleton className={s.skeleton} show={preloading} width='full'>
            <SelectTrigger>
              <SelectIcon asChild>
                <Icon name={Glyph.Fields(filter.key)} />
              </SelectIcon>
              <SelectValue defaultValue={filter.key} />
            </SelectTrigger>
          </Skeleton>
          <SelectContent style={{ maxHeight: '33vh' }}>
            {Object.keys(app.timeline.filtering_options[file.id] || {}).map((key, i) => (
              <SelectItem value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setType} value={filter?.type}>
          <Skeleton className={s.skeleton} show={preloading} width='short'>
            <SelectTrigger style={{ flexShrink: 1.5 }} className={s.select}>
              <SelectValue defaultValue={FilterType.GREATER_OR_EQUAL} />
            </SelectTrigger>
          </Skeleton>
          <SelectContent className={s.select}>
            {Object.values(FilterType).map((filterType, index) => (
              <SelectItem key={index} value={filterType}>
                {filterType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Skeleton show={preloading} width='full'>
          <Input onChange={(event) => setValue(event.currentTarget.value)} placeholder={`Input a ${acceptableToType()}`} value={filter?.value} />
        </Skeleton>
        <Skeleton show={preloading} width='short'>
          <Button className={s.submit} variant={filter?.key && filter?.type && filter?.value ? 'default' : 'disabled'} img='Plus' onClick={addFilter} />
        </Skeleton>
      </Stack>
    )
  }, [filter, acceptable, app.timeline.filtering_options, manual, raw, manual, setManual, setRaw]);

  

  return (
    <Banner
      title='Choose filtering options'
      loading={preloading}
      done={<Done />}
      option={<Undo />} {...props}>
      <Toggle option={['Pretty UI', 'Manual input']} checked={manual} onCheckedChange={() => setManual(v => !v)} />
      {FilterField}
      <AvailableFilters />
      <Skeleton height='full' show={preloading} width='full'>
        <Stack dir='column' className={s.preview} ai='flex-start'>
          <h4>Preview: <Button className={s.copy} size='sm' variant='glass' img='Copy' onClick={() => copy(manual ? Filter.base(file) + raw : Filter.query(app, file))}>Copy</Button></h4>
          <code>{manual ? Filter.base(file) + raw : Filter.query(app, file)}</code>
        </Stack>
      </Skeleton>
      <Button variant='secondary' style={{ width: '100%' }} onClick={() => Info.request_cancel_for_file(file.id)} img='FileX'>Cancel all requests for this file</Button>
    </Banner>
  );
}
