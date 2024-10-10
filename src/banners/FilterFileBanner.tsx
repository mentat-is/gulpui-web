import { λFile } from '@/dto/File.dto';
import s from './styles/FilterFileBanner.module.css';
import { Banner } from '@/ui/Banner';
import { useApplication } from '@/context/Application.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Input } from '@/ui/Input';
import { useEffect, useState } from 'react';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { format } from 'date-fns';
import { Calendar } from '@/ui/Calendar';
import { ResponseBase } from '@/dto/ResponseBase.dto';
import { FilterOptions, FilterType, GulpQueryFilterObject } from '@/dto/GulpGueryFilter.class';
import { cn } from '@/ui/utils';
import { Context, Plugin } from '@/class/Info';
import { SettingsFileBanner } from './SettingsFileBanner';

const _baseFilter = {
  key: '',
  type: FilterType.EQUAL,
  value: ''
}

interface FilterFileBannerProps {
  file: λFile;
}

export function FilterFileBanner({ file }: FilterFileBannerProps) {
  const { app, api, Info, destroyBanner, spawnBanner } = useApplication();
  const [acceptable, setAcceptable] = useState<Acceptable>('text');
  const [filteringOptions, setFilteringOptions] = useState<FilterOptions>({})
  const [filter, setFilter] = useState<GulpQueryFilterObject>(_baseFilter);
  const [loading, setLoading] = useState<boolean>(true);

  const filters = app.target.filters[file.uuid] || [];
  
  useEffect(() => {
    if (!filters.length || !filters.find(f => f.key === 'log.file.path')) {
      Info.filters_add(file.uuid, [{
        key: 'log.file.path',
        type: FilterType.EQUAL,
        value: file.name,
        static: true
      }])
    }
  }, []);

  useEffect(() => {
    if (Object.keys(filteringOptions).length) return;

    const context = Context.uuid(app, Plugin.find(app, file._uuid)!._uuid)!.name;

    api<ResponseBase<FilterOptions>>('/elastic_get_mapping_by_source', {
      data: {
        context,
        src: file.name
      }
    }).then(res => {
      setLoading(false);
      if (res.isSuccess()) setFilteringOptions(res.data);
    })
  }, []);

  const submit = () => Info.finalizeFiltering(file.uuid).then(destroyBanner);

  const addFilter = () => {
    const _filters = [...filters, filter];
    Info.filters_add(file.uuid, _filters);
    resetFilter();
  }

  const removeFilter = (filter: GulpQueryFilterObject) => {
    const _filters = filters.filter(_filter => _filter.key !== filter.key)
    Info.filters_add(file.uuid, _filters);
  }

  const changeFilter = (filter: GulpQueryFilterObject) => setFilter(filter);

  const resetFilter = () => setFilter(_baseFilter);

  const setKey = (key: string) => {
    const accept = filteringOptions[key];
    if (acceptable !== accept) setValue('');
    setAcceptable(accept);
    changeFilter({ ...filter || {}, key })
  };

  const setType = (type: FilterType) => changeFilter({...filter || {}, type });

  const setValue = (value: string) => changeFilter({...filter || {}, value });

  const setDate = (date: Date | undefined) => changeFilter({...filter || {}, value: date?.valueOf() });

  return (
    <Banner
      title={'Choose filtering options'}
      className={s.banner} loading={loading || !Object.keys(filteringOptions).length}
      subtitle={
        <Button
          onClick={() => spawnBanner(<SettingsFileBanner file={file} />)}
          variant='ghost'
          img='Settings'>File settings</Button>
        }>
      <div className={s.top}>
        <Select onValueChange={setKey} value={filter?.key}>
          <SelectTrigger>
            <SelectValue placeholder="Choose filter" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(filteringOptions).map((key, i) => (
              <SelectItem key={i} value={key}>
                {key.startsWith('gulp.unmapped.') ? key.slice(14) : key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setType} value={filter?.type}>
          <SelectTrigger>
            <SelectValue defaultValue={FilterType.GREATER_OR_EQUAL} />
          </SelectTrigger>
          <SelectContent>
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
                {format(typeof filter?.value === 'number' ? filter?.value : Date.now(), "LLL dd, y")}
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
      </div>
      <div className={s.avilable_filters}>
        {filters.map(filter => (
          <div className={cn(s.filter, filter.static && s.static)}>
            <code>{filter.key}</code>
            <Badge value={filter.type} />
            <p>{typeof filter.value !== 'string' ? format(filter.value, "LLL dd, y") : filter.value}</p>
            {!filter.static && <Button img='Trash2' onClick={() => removeFilter(filter)} />}
          </div>
        ))}
      </div>
      <Button img='Check' onClick={submit}>Submit</Button>
    </Banner>
  );
}
