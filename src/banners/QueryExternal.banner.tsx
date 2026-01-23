import { GulpDataset } from '@/class/Info'
import { Application } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select } from '@/ui/Select'
import { Switch } from '@/ui/Switch'
import { Icon } from '@impactium/icons'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import s from './styles/QueryExternalBanner.module.css'
import { Label } from '@/ui/Label'
import { Input } from '@/ui/Input'
import { cn } from '@impactium/utils'
import { Preview } from './Preview.banner'
import { SelectFiles } from './SelectFiles.banner'
import { Skeleton } from '@/ui/Skeleton'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { Textarea } from '@/ui/Textarea'

export namespace QueryExternal {
  export const PluginSelection = ({
    options,
    selectedOption,
    onSelect,
  }: {
    options: GulpDataset.PluginList.Interface[] | null
    selectedOption: GulpDataset.PluginList.Interface | null
    onSelect: (name: string) => void
  }) => {
    if (!options) return <Skeleton />

    return (
      <Select.Root
        value={selectedOption?.filename}
        onValueChange={onSelect}
        disabled={!options}
      >
        <Select.Trigger>
          <Icon name='Puzzle' />
          {selectedOption ? selectedOption.display_name : 'Select plugin to query'}
        </Select.Trigger>
        <Select.Content>
          {options.map((option) => (
            <Select.Item key={option.filename} value={option.filename}>
              <Icon name='Puzzle' />
              {option.display_name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }

  export const DynamicRequestBuilder = ({
    selectedOption,
    params,
    setParams,
  }: {
    selectedOption: GulpDataset.PluginList.Interface | null
    params: Record<string, any>
    setParams: React.Dispatch<React.SetStateAction<Record<string, any>>>
  }) => {
    const typesMap = useMemo(
      () => ({
        list: 'Enter a list of values, separate using coma',
        int: 'Enter a number',
        str: 'Enter a string or word',
        bool: '',
        dict: '',
      }),
      [],
    )

    const handleInputChange =
      (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
        setParams((prev) => ({ ...prev, [name]: event.target.value }))
      }

    const handleCheckChange = (name: string) => (bool: boolean) =>
      setParams((prev) => ({ ...prev, [name]: bool }))

    const handleCheckboxChange = (name: string, value: string) => (checked: boolean) => {
      setParams((prev) => {
        const currentValues = new Set(prev[name] || [])
        if (checked) currentValues.add(value)
        else currentValues.delete(value)

        return { ...prev, [name]: Array.from(currentValues) }
      })
    }

    if (!selectedOption) return null

    return (
      <Stack dir="column" className={s.wrapper} ai='stretch' gap={16}>
        {selectedOption.custom_parameters.map((custom) => (
          custom.values ? (
            <Stack dir="column" ai='start'>
              {custom.values.map((value) => (
                <Stack dir='column' gap={6} ai='flex-start' data-input>
                  <Label value={value} />
                  <Switch
                    key={value}
                    checked={params[custom.name]?.includes(value) || false}
                    onCheckedChange={handleCheckboxChange(custom.name, value)}
                  />
                </Stack>
              ))}
            </Stack>
          ) : custom.type === 'bool' ? (
            <Switch
              checked={params[custom.name]}
              onCheckedChange={handleCheckChange(custom.name)}
            />
          ) : (
            <Stack dir='column' gap={8} ai='stretch'>
              <Input
                onChange={handleInputChange(custom.name)}
                variant="highlighted"
                label={custom.name}
                className={cn(custom.required && s.required)}
                placeholder={typesMap[custom.type]}
                icon='CircleDashed'
                value={params[custom.name]}
              />
              <span className={s.description}>{custom.desc}</span>
            </Stack>
          )
        ))}
      </Stack>
    )
  }


  export namespace Banner {
    export interface Props extends UIBanner.Props {
      preselectedOption?: GulpDataset.PluginList.Interface;
      preparams?: Record<string, any>
      preQ?: any
      preQOptions?: Record<string, any>
    }
  }

  export const Banner = ({ preselectedOption, preparams, preQ, preQOptions, ...props }: QueryExternal.Banner.Props) => {
    const { Info, spawnBanner, destroyBanner, app } = Application.use()
    const [options, setOptions] = useState<GulpDataset.PluginList.Interface[] | null>(app.target.plugins.filter((i) => i.type.includes('external')))
    const [selectedOption, setSelectedOption] = useState(preselectedOption ?? null)
    const [loading, setLoading] = useState<number>(0)
    const [params, setParams] = useState(preparams ?? {});
    const [q, setQ] = useState(preQ ?? null);
    const [qOptions, setQOptions] = useState(preQOptions ?? {});
    const [qText, setQText] = useState(preQ ? JSON.stringify(preQ, null, 2) : '');
    const [qOptionsText, setQOptionsText] = useState(preQOptions && Object.keys(preQOptions).length > 0 ? JSON.stringify(preQOptions, null, 2) : '');
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
      setOptions(app.target.plugins.filter((i) => i.type.includes('external')))
    }, [app.target.plugins]);

    const [isDone, setIsDone] = useState<boolean>(false);

    const handleQuery = async (preview = false) => {
      if (!selectedOption) return
      setLoading(preview ? 2 : 1)
      const result = await Info.query_external(selectedOption.filename, params, preview, q || undefined, Object.keys(qOptions).length > 0 ? qOptions : undefined)
      setLoading(0)
      if (result) {
        spawnBanner(<Preview.Banner total={result.total_hits || result.docs.length} fixed values={result.docs} back={() => spawnBanner(<QueryExternal.Banner preparams={params} preselectedOption={selectedOption} preQ={q} preQOptions={qOptions} {...props} />)} />)
      } else {
        setIsDone(true);
      }
    }

    useEffect(() => {
      if (isDone) {
        spawnBanner(<SelectFiles.Banner />)
      }
    }, [app.target.files]);

    useEffect(() => {
      if (!selectedOption) {
        return setParams({});
      }
      const params: Record<string, any> = {};
      selectedOption.custom_parameters.forEach(param => {
        params[param.name] = preparams ? preparams[param.name] : param.default_value
      });

      setParams(params)
    }, [selectedOption]);

    const done = (
      <Button
        icon="Check"
        loading={loading === 1}
        onClick={() => handleQuery()}
        variant="glass"
      />
    )

    const optionButton = (
      <Button
        icon='PreviewEye'
        variant='tertiary'
        loading={loading === 2}
        onClick={() => handleQuery(true)}
      />
    )

    return (
      <UIBanner title="Query external" done={done} fixed={isDone} option={optionButton} {...props}>
        <PluginSelection
          options={options}
          selectedOption={selectedOption}
          onSelect={(name) => {
            const option = options?.find((op) => op.filename === name)
            if (option) setSelectedOption(option)
          }}
        />
        <DynamicRequestBuilder
          selectedOption={selectedOption}
          params={params}
          setParams={setParams}
        />
        <Stack dir="column" className={s.wrapper} ai='stretch' gap={16}>
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="tertiary"
            icon={showAdvanced ? 'ChevronUp' : 'ChevronDown'}
          >
            Advanced Query Options
          </Button>
          {showAdvanced && (
            <>
              <Stack dir="column" gap={8} ai='stretch'>
                <Label value="Query (q) - JSON format" />
                <Textarea
                  value={qText}
                  onChange={(e) => {
                    setQText(e.target.value)
                  }}
                  onBlur={(e) => {
                    const value = e.currentTarget.value.trim()
                    try {
                      if (value) {
                        const parsed = JSON.parse(value)
                        setQ(parsed)
                        setQText(JSON.stringify(parsed, null, 2))
                      } else {
                        setQ(null)
                        setQText('')
                      }
                    } catch {
                      // Invalid JSON, revert to last valid value
                      setQText(q ? JSON.stringify(q, null, 2) : '')
                    }
                  }}
                  placeholder='{"query": {"match_all": {}}}'
                  className={s.jsonInput}
                />
                <span className={s.description}>Optional: Custom OpenSearch query. Leave empty to use default.</span>
              </Stack>
              <Stack dir="column" gap={8} ai='stretch'>
                <Label value="Query Options (q_options) - JSON format" />
                <Textarea
                  value={qOptionsText}
                  onChange={(e) => {
                    setQOptionsText(e.target.value)
                  }}
                  onBlur={(e) => {
                    const value = e.currentTarget.value.trim()
                    try {
                      if (value) {
                        const parsed = JSON.parse(value)
                        setQOptions(parsed)
                        setQOptionsText(JSON.stringify(parsed, null, 2))
                      } else {
                        setQOptions({})
                        setQOptionsText('')
                      }
                    } catch {
                      // Invalid JSON, revert to last valid value
                      setQOptionsText(Object.keys(qOptions).length > 0 ? JSON.stringify(qOptions, null, 2) : '')
                    }
                  }}
                  placeholder='{"limit": 1000, "fields": ["@timestamp", "event.id"]}'
                  className={s.jsonInput}
                />
                <span className={s.description}>Optional: Query options like limit, fields, sort, etc.</span>
              </Stack>
            </>
          )}
        </Stack>
        <p className={s.hint}>
          Required params marked with <Icon name="Asterisk" />
        </p>
      </UIBanner>
    )
  }
}
