import { GulpDataset } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Input } from '@impactium/components'
import { Select } from '@/ui/Select'
import { Switch } from '@/ui/Switch'
import { Button, Skeleton, Stack } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import s from './styles/QueryExternalBanner.module.css'
import { Label } from '@/ui/Label'

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
          <Select.Value
            placeholder='Select plugin to query'
          >
            {selectedOption?.display_name ?? '????'}
          </Select.Value>
        </Select.Trigger>
        <Select.Content>
          {options.map((option) => (
            <Select.Item key={option.filename} value={option.filename}>
              <Icon name='Status' />
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
    const namingIcons: Record<string, Icon.Name> = useMemo(
      () => ({
        timestamp_field: 'Clock',
        offset_msec: 'Timer',
      }),
      [],
    )

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
      <Stack dir="column" className={s.wrapper}>
        {selectedOption.custom_parameters.map((custom) => (
          <Stack key={custom.name} className={s.custom}>
            <p>
              {custom.name}
              {custom.required ? '*' : ''}
            </p>
            {custom.values ? (
              <Stack dir="column">
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
    )
  }


  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }

  export const Banner = ({ ...props }: QueryExternal.Banner.Props) => {
    const { Info } = useApplication()
    const [options, setOptions] = useState<GulpDataset.PluginList.Interface[] | null>(null)
    const [selectedOption, setSelectedOption] = useState<GulpDataset.PluginList.Interface | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams] = useState<Record<string, any>>({})

    useEffect(() => {
      if (options) return
      const fetchOptions = async () => {
        setLoading(true)
        const list = await Info.plugin_list()
        setOptions(list.filter((i) => i.type.includes('external')))
        setLoading(false)
      }
      fetchOptions()
    }, [options, Info])

    const handleQuery = async () => {
      if (!selectedOption) return
      setLoading(true)
      await Info.query_external(selectedOption.filename, params)
      setLoading(false)
    }

    const done = (
      <Button
        img="Check"
        onClick={handleQuery}
        variant="glass"
      />
    )

    return (
      <UIBanner title="Query external" loading={loading} done={done} {...props}>
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
        <p className={s.hint}>
          Required params marked with <Icon name="Asterisk" />
        </p>
      </UIBanner>
    )
  }
}
