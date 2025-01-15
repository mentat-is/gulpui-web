import { GulpDataset } from '@/class/Info';
import { useApplication } from '@/context/Application.context';
import { Banner as BannerUI } from '@/ui/Banner';
import { Input } from '@/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Switch } from '@/ui/Switch';
import { Button, Skeleton, Stack } from '@impactium/components';
import { Icon } from '@impactium/icons';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import s from './styles/QueryExternalBanner.module.css';

export namespace QueryExternal {
  export const PluginSelection = ({
    options,
    selectedOption,
    onSelect,
  }: {
    options: GulpDataset.PluginList.Summary | null;
    selectedOption: GulpDataset.PluginList.Object | null;
    onSelect: (name: string) => void;
  }) => {
    if (!options) return <Skeleton />;

    return (
      <Select value={selectedOption?.filename} onValueChange={onSelect} disabled={!options}>
        <SelectTrigger>
          <SelectValue placeholder={options ? 'Select plugin to query' : 'Loading...'}>
            {selectedOption?.display_name ?? '????'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.filename} value={option.filename}>
              {option.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  export const DynamicRequestBuilder = ({
    selectedOption,
    params,
    setParams,
  }: {
    selectedOption: GulpDataset.PluginList.Object | null;
    params: Record<string, any>;
    setParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  }) => {
    const namingIcons: Record<string, Icon.Name> = useMemo(
      () => ({
        timestamp_field: 'Clock',
        offset_msec: 'Timer',
      }),
      [],
    );

    const typesMap = useMemo(
      () => ({
        list: 'Enter a list of values, separate using coma',
        int: 'Enter a number',
        str: 'Enter a string or word',
        bool: '',
        dict: '',
      }),
      [],
    );

    const handleInputChange = (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
      setParams(prev => ({ ...prev, [name]: event.target.value }));
    };

    const handleCheckChange = (name: string) => (bool: boolean) => setParams(prev => ({ ...prev, [name]: bool }));

    if (!selectedOption) return null;

    return (
      <Stack dir="column" className={s.wrapper}>
        {selectedOption.custom_parameters.map(custom => (
          <Stack key={custom.name} className={s.custom}>
            <p>{custom.name}{custom.required ? '*' : ''}</p>
            {custom.type === 'bool' ? (
              <Switch checked={params[custom.name]} onCheckedChange={handleCheckChange(custom.name)} />
            ) : (
              <Input
                onChange={handleInputChange(custom.name)}
                variant="highlighted"
                placeholder={typesMap[custom.type]}
                img={namingIcons[custom.name] || 'CircleDashed'}
                value={params[custom.name]}
              />
            )}
          </Stack>
        ))}
      </Stack>
    );
  };

  export const Banner = () => {
    const { Info } = useApplication();
    const [options, setOptions] = useState<GulpDataset.PluginList.Summary | null>(null);
    const [selectedOption, setSelectedOption] = useState<GulpDataset.PluginList.Object | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [url, setUrl] = useState<string>('');
    const [isUrlValid, setIsUrlValid] = useState<boolean>(true);
    const [params, setParams] = useState<Record<string, any>>({});

    useEffect(() => {
      if (options) return;
      const fetchOptions = async () => {
        setLoading(true);
        const list = await Info.plugin_list();
        setOptions(list.filter(i => i.type.includes('external')));
        setLoading(false);
      };
      fetchOptions();
    }, [options, Info]);

    useEffect(() => {
      if (!selectedOption) {
        return;
      }

      const params: Record<string, any> = {};

      selectedOption?.custom_parameters.forEach(c => {
        params[c.name] = c.default_value;
      })

      setParams(params)
    }, [selectedOption]);

    const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.trim();
      const isValid = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(value);
      setIsUrlValid(isValid);
      setUrl(value);
    };

    const handleQuery = async () => {
      if (!selectedOption) return;
      setLoading(true);
      await Info.query_external(selectedOption.filename, url, params);
      setLoading(false);
    };

    const done = (
      <Button img="Check" onClick={handleQuery} variant="glass" disabled={url.length === 0 || !isUrlValid} />
    )

    return (
      <BannerUI title="Query external" loading={loading} done={done}>
        <PluginSelection
          options={options}
          selectedOption={selectedOption}
          onSelect={name => {
            const option = options?.find(op => op.filename === name);
            if (option) setSelectedOption(option);
          }}
        />
        <Input
          variant="highlighted"
          valid={isUrlValid}
          img="Link"
          value={url}
          onChange={handleUrlChange}
          placeholder="Link to remote server"
        />
        <DynamicRequestBuilder selectedOption={selectedOption} params={params} setParams={setParams} />
        <p className={s.hint}>Required params marked with <Icon name='Asterisk' /></p>
      </BannerUI>
    );
  };
}
