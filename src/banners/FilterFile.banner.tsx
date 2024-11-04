import { λFile } from '@/dto/File.dto';
import s from './styles/FilterFileBanner.module.css';
import { Banner } from '@/ui/Banner';
import { useApplication } from '@/context/Application.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Input } from '@/ui/Input';
import { useEffect, useRef, useState } from 'react';
import { Acceptable } from '@/dto/ElasticGetMapping.dto';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { format } from 'date-fns';
import { Calendar } from '@/ui/Calendar';
import { ResponseBase } from '@/dto/ResponseBase.dto';
import { Context, Filter, FilterOptions, FilterType, λFilter, Plugin, μ } from '@/class/Info';
import { SettingsFileBanner } from './SettingsFileBanner';
import React from 'react';
import { Switch } from '@/ui/Switch';
import { Card } from '@/ui/Card';
import { cn, generateUUID } from '@/ui/utils';
import { toast } from 'sonner';

const _baseFilter = (): λFilter => ({
  uuid: generateUUID() as μ.Filter,
  key: '',
  type: FilterType.EQUAL,
  value: ''
})

interface FilterFileBannerProps {
  file: λFile;
}

export function FilterFileBanner({ file }: FilterFileBannerProps) {
  const { app, api, Info, destroyBanner, spawnBanner } = useApplication();
  const [acceptable, setAcceptable] = useState<Acceptable>('text');
  const [filter, setFilter] = useState<λFilter>(_baseFilter());
  const [loading, setLoading] = useState<boolean>(false);
  const filters_length = useRef<number>((app.target.filters[file.uuid] || []).length)

  const filters = app.target.filters[file.uuid] || [];

  useEffect(() => {
    if (app.timeline.filtering_options[file.uuid]) return;

    const context = Context.uuid(app, Plugin.uuid(app, file._uuid)!._uuid)!.name;

    api<ResponseBase<FilterOptions>>('/elastic_get_mapping_by_source', {
      data: {
        context,
        src: file.name
      }
    }).then(res => res.isSuccess() && Info.setTimelineFilteringoptions(file, res.data));
  }, [app.timeline.filtering_options]);

  const submit = async () => {
    if (app.target.filters[file.uuid] && filters_length.current === app.target.filters[file.uuid].length) {
      destroyBanner();
      Info.render();
      return;
    }

    setLoading(true);
    Info.filters_cache(file);
    Info.refetch({
      uuids: file.uuid,
      hidden: true
    }).then(() => {
      destroyBanner();
      Info.render();
    });
  }

  const addFilter = () => {
    const _filters = [...filters, filter];
    Info.filters_add(file.uuid, _filters);
    resetFilter();
  }

  const removeFilter = (filter: λFilter) => {
    const _filters = filters.filter(_filter => _filter.key !== filter.key)
    Info.filters_add(file.uuid, _filters);
  }

  useEffect(() => {
    api('/stats_cancel_request', {
      data: { req_id: file.uuid }
    }).then(res => res.isSuccess() && toast('Previous request for this file has been canceled'));
  }, []);

  const resetFilter = () => setFilter(_baseFilter);

  const setKey = (key: string) => {
    const accept = app.timeline.filtering_options[file.uuid][key];
    if (acceptable !== accept) setValue('');
    setAcceptable(accept);
    setFilter({ ...filter || {}, key })
  };

  const setType = (type: FilterType) => setFilter({...filter || {}, type });

  const setValue = (value: string) => setFilter({...filter || {}, value });

  const setDate = (date: Date | undefined) => setFilter({...filter || {}, value: date?.valueOf() });

  const handleCheckedChange = (checked: boolean, filter: λFilter) => Info.filters_change(file, filter, { isOr: checked });

  const undo = () => Info.filters_undo(file);

  return (
    <Banner
      title={'Choose filtering options'}
      className={s.banner} loading={!app.timeline.filtering_options[file.uuid]}
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
            {Object.keys(app.timeline.filtering_options[file.uuid] || {}).map((key, i) => (
              <SelectItem key={i} value={key}>
                {key.startsWith('gulp.unmapped.') ? key.slice(14) : key}
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
        {filters.map((filter, i) => {
          return (
            <React.Fragment key={i}>
              <div className={s.filter}>
                <code>{filter.key}</code>
                <Badge value={filter.type} />
                <p>{typeof filter.value !== 'string' ? format(filter.value, "LLL dd, y") : filter.value}</p>
                <Button variant='destructive' img='Trash2' onClick={() => removeFilter(filter)} />
              </div>
              {i !== filters.length - 1 && (
                <div className={s.switch}>
                  <p className={cn(!filter.isOr && s.active)}>AND</p>
                  <Switch onCheckedChange={(checked) => handleCheckedChange(checked, filter)} />
                  <p className={cn(filter.isOr && s.active)}>OR</p>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
      <Card className={s.preview}>
        <h4>Preview</h4>
        <code><span>{Filter.base(app, file)}</span> AND {Filter.query(app, file)}</code>
      </Card>
      <div className={s.bottom}>
        <Button img='Undo' variant='outline' onClick={undo}>Undo</Button>
        <Button img='Check' loading={loading} onClick={submit}>Submit</Button>
      </div>
    </Banner>
  );
}
