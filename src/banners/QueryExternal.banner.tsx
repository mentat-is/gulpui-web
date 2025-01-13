import { GulpDataset } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner as BannerUI } from '@/ui/Banner';
import { Input } from '@/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Toggle } from '@/ui/Toggle';
import { Button, Skeleton, Stack } from '@impactium/components';
import { Icon } from '@impactium/icons';
import { ChangeEvent, useEffect, useState } from 'react';
import s from './styles/QueryExternalBanner.module.css'
import { Switch } from '@/ui/Switch';

export namespace QueryExternal {
  export const Banner = () => {
    const { Info } = useApplication();
    const [options, setOptions] = useState<GulpDataset.PluginList.Summary | null>(null);
    const [selectedOption, setSelectedOption] = useState<GulpDataset.PluginList.Object | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [url, setUrl] = useState<string>('');
    const [isUrlValid, setIsUrlValid] = useState<boolean>(true);
    const [params, setParams] = useState<Record<string, any>>({});

    const fetchQueryExternalOptions = async () => {
      setLoading(true);
      const list = await Info.plugin_list();

      const filtered = list.filter(i => i.type.includes('external'));

      setOptions(filtered);
      
      setLoading(false);
    }

    useEffect(() => {
      if (options) {
        return;
      }

      fetchQueryExternalOptions()
    }, [options]);

    function PluginSelection() {
      if (!options) {
        return (
          <Skeleton />
        )
      }

      const selectOptionHandler = (name: string) => {
        const option = options.find(op => op.filename === name);

        if (!option) {
          return;
        }

        setSelectedOption(option);
      }

      return (
        <Select onValueChange={selectOptionHandler} disabled={!options}>
          <SelectTrigger value={selectedOption?.filename}>
            <SelectValue placeholder={options ? 'Select plugin to query' : 'Loading...'} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem value={option.filename}>
                {option.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    function DynamicRequestBuilder() {
      const namingIcons: Record<string, Icon.Name> = {
        timestamp_field: 'Clock',
        offset_msec: 'Timer'
      };

      const typesMap: Record<GulpDataset.PluginList.CustomParameters.Type, string> = {
        list: 'Enter a list of values, separate using coma',
        int: 'Enter a number',
        str: 'Enter a string or word',
        bool: '',
        dict: ''
      }

      const CustomInput = (custom: GulpDataset.PluginList.CustomParameters.Object) => {
        function DynamicInput() {
          if (custom.type === 'bool') {
            return <Switch />
          }

          return <Input onChange={customInputChangeHandlerDynamicConstructor(custom.name)} variant='highlighted' placeholder={typesMap[custom.type]} img={namingIcons[custom.name] || 'CircleDashed'} value={custom.default_value} />
        }

        return (
          <Stack className={s.custom}>
            <p>{custom.name}</p>
            <DynamicInput />
          </Stack>
        )
      }

      return (
        <Stack dir='column' className={s.wrapper}>
          {selectedOption?.custom_parameters.map(CustomInput)}
        </Stack>
      )
    }

    const query = async () => {
      if (!selectedOption) {
        return;
      }

      setLoading(true);
      Info.query_external(selectedOption?.filename, url, params)
    }

    const done = (
      <Button img='Check' onClick={query} variant='glass' />
    )   

    const urlValidador = (value: string): [boolean, string] => {
      const regExp = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;

      const trimmed = value.trim();

      const isValid = regExp.test(trimmed);

      return [isValid, trimmed];
    }

    const changeUrlHandler = (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      const [isValid, trimmed] = urlValidador(value);

      setIsUrlValid(isValid);

      setUrl(trimmed);
    }

    const customInputChangeHandlerDynamicConstructor = (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
      // TODO: Validation
      setParams(params => ({
        ...params,
        [name]: event.target.value
      }))
    }

    return (
      <BannerUI title='Query external' loading={loading} done={done}>
        <PluginSelection />
        <Input variant='highlighted' valid={isUrlValid} img='Link' value={url} onChange={changeUrlHandler} placeholder='Link to remote server' />
        <Toggle option={['Dont save in gulp', 'Save in gulp']} />
        <DynamicRequestBuilder />
      </BannerUI>
    )
  }
}