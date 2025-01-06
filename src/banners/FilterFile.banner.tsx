import s from './styles/FilterFileBanner.module.css';
import { Banner } from '@/ui/Banner';
import { useApplication } from '@/context/Application.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Input } from '@/ui/Input';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { Button, Stack } from '@impactium/components';
import { Badge } from '@/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { Calendar } from '@/ui/Calendar';
import { Context, Filter, FilterOptions, FilterType, File, λFilter, μ, Index, Operation } from '@/class/Info';
import { SettingsFileBanner } from './SettingsFileBanner';
import React from 'react';
import { Switch } from '@/ui/Switch';
import { Card } from '@/ui/Card';
import { cn, copy, generateUUID } from '@/ui/utils';
import { toast } from 'sonner';
import { λFile } from '@/dto/Dataset';
import { format } from 'date-fns';
import { Toggle } from '@/ui/Toggle';

const _baseFilter = (): λFilter => ({
  id: generateUUID() as μ.Filter,
  key: '',
  type: FilterType.EQUAL,
  value: ''
})

interface FilterFileBannerProps {
  file: λFile;
}

export function FilterFileBanner({ file }: FilterFileBannerProps) {
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
        index: index.name,
        operation_id: file.operation_id,
        context_id: file.context_id,
        source_id: file.id
      }
    }).then(data => Info.setTimelineFilteringoptions(file, data));
  }, [app.timeline.filtering_options]);

  const submit = async () => {
    if (app.target.filters[file.id] && filters_length.current === app.target.filters[file.id].length) {
      destroyBanner();
      Info.render();
      return;
    }

    setLoading(true);
    Info.filters_cache(file);
    Info.refetch({
      ids: file.id,
      hidden: true
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

  useEffect(() => {
    api('/stats_cancel_request', {
      query: { req_id: file.id }
    }).then(res => toast('Previous request for this file has been canceled succesfully'));
  }, []);

  const resetFilter = () => setFilter(_baseFilter);

  const setKey = (key: string) => {
    const accept = app.timeline.filtering_options[file.id][key];
    if (acceptable !== accept) setValue('');
    setAcceptable(accept);
    setFilter({ ...filter || {}, key })
  };

  const setType = (type: FilterType) => setFilter({...filter || {}, type });

  const setValue = (value: string) => setFilter({...filter || {}, value });

  const setDate = (date: Date | undefined) => setFilter({...filter || {}, value: date?.valueOf() });

  const handleCheckedChange = (checked: boolean, filter: λFilter) => Info.filters_change(file, filter, { isOr: checked });

  const undo = () => Info.filters_undo(file);

  const Done = useCallback(() => {
    return (
      <Button img='Check' variant='glass' loading={loading} onClick={submit} />
    )
  }, [loading, submit]);

  const Undo = useCallback(() => {
    return (
      <Button img='Undo' variant='ghost' onClick={undo} />
    )
  }, [undo]);

  function AvailableFilters() {
    if (filters.length === 0) {
      return null;
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
              <Button size='sm' className={s.delete} variant='ghost' img='Trash2' onClick={() => removeFilter(filter)} />
            </Stack>
            <Toggle className={s.toggle} option={['AND', 'OR']} checked={filter.isOr} onCheckedChange={(checked) => handleCheckedChange(checked, filter)} />
          </React.Fragment>
        ))}
      </Stack>
    )
  }

  function FilterField() {
    return (
      <Stack className={s.top}>
        <Select onValueChange={setKey} value={filter?.key}>
          <SelectTrigger>
            <SelectValue placeholder='Choose filter' />
          </SelectTrigger>
          <SelectContent style={{ maxHeight: '33vh' }}>
            {Object.keys(app.timeline.filtering_options[file.id] || {}).map((key, i) => (
              <SelectItem key={i} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setType} value={filter?.type}>
          <SelectTrigger className={s.select}>
            <SelectValue defaultValue={FilterType.GREATER_OR_EQUAL} />
          </SelectTrigger>
          <SelectContent className={s.select}>
            {Object.values(FilterType).map((filterType, index) => (
              <SelectItem key={index} value={filterType}>
                {filterType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {acceptable === 'date' ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' className={s.button} img='CalendarPlus2'>
                {format(typeof filter?.value === 'number' ? filter?.value : Date.now(), 'LLL dd, y')}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar 
                initialFocus
                mode='single'
                defaultMonth={new Date()}
                selected={filter?.value}
                onSelect={setDate}
                numberOfMonths={1} />
            </PopoverContent>
          </Popover>
        ) : (
          <Input onChange={(event) => setValue(event.currentTarget.value)} placeholder={`Input a ${acceptable}`} value={filter?.value} />
        )}
        <Button className={s.submit} variant={filter?.key && filter?.type && filter?.value ? 'default' : 'disabled'} img='Plus' onClick={addFilter} />
      </Stack>
    )
  }

  const base = `(gulp.operation_id:${file.operation_id} AND gulp.context_id: \"${file.context_id}\" AND gulp.source_id:"${file.name}" AND @timestamp: [${file.nanotimestamp.min} TO ${file.nanotimestamp.max}]) AND `;


  
  return (
    <Banner
      title='Choose filtering options'
      loading={!app.timeline.filtering_options[file.id]}
      done={<Done />}
      option={<Undo />}
      subtitle={
        <Button
          onClick={() => spawnBanner(<SettingsFileBanner file={file} />)}
          variant='ghost'
          img='Settings'>Back to file settings</Button>
        }>
      <FilterField />
      <AvailableFilters />
      <Stack dir='column' className={s.preview} ai='flex-start'>
        <h4>Preview: <Button className={s.copy} size='sm' variant='glass' img='Copy' onClick={() => copy(base + Filter.query(app, file))}>Copy</Button></h4>
        <code><span>{base}</span>{Filter.query(app, file)}</code>
      </Stack>
    </Banner>
  );
}
