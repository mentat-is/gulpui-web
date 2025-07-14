import { SetState } from "@/class/API";
import { GulpDataset } from "@/class/Info";

import s from './styles/CustomParameters.module.css'
import { Separator } from "@/ui/Separator";
import { Toggle } from "@/ui/Toggle";
import { Input, Stack } from "@impactium/components";
import { Icon } from "@impactium/icons";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import { capitalize } from "lodash";
import { ChangeEvent, Fragment, useEffect } from "react";

export namespace CustomParameters {
  export type Location = 'query';

  export type Type = 'int' | 'str' | 'bool' | 'dict' | 'list';

  export interface Interface {
    name: string;
    type: Type;
    desc: string;
    location: Location;
    required: boolean;
    default_value?: any
    values?: string[]
    // internal
    invalid?: boolean;
  }

  export namespace Editor {
    export interface Props {
      plugin?: GulpDataset.PluginList.Interface;
      customParameters: Record<string, any>;
      setCustomParameters: SetState<Record<string, any>>;
    }
  }
  export function Editor({ plugin, customParameters, setCustomParameters }: CustomParameters.Editor.Props) {
    if (!plugin || !customParameters) {
      return <CustomParameters.Error />
    }

    useEffect(() => {
      plugin.custom_parameters.forEach(parameter => {
        if (!customParameters[parameter.name]) {
          customParameters[parameter.name] = parameter.default_value ?? null;
        }
      })

      setCustomParameters(customParameters);
    }, [plugin]);

    const customParameterInputChangeHandlerConstructor =
      (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
        const { value: raw } = event.target

        const type = plugin.custom_parameters.find(
          (p) => p.name === name,
        )?.type

        const value = !type
          ? raw
          : type === 'list'
            ? raw.split(',').map((v) => v.trim())
            : type === 'int'
              ? Number(raw) || 0
              : type === 'dict'
                ? raw
                : type === 'bool'
                  ? Boolean(raw)
                  : raw

        setCustomParameters({
          ...customParameters,
          [name]: value
        })
      }

    const mapping: Record<string, Icon.Name> = {
      ip_fields: 'Location',
    }

    return (
      <Stack dir='column' gap={16} ai='stretch'>
        {Object.entries(customParameters).map(([k, value], i, arr) => {
          const param = plugin.custom_parameters.find(c => c.name === k)
          if (!param) return null

          const common = (
            <Stack key={k} dir='column' ai='flex-start' className={s.param}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Stack>
                      <Icon name='Info' />
                      <p>{param.name}:</p>
                    </Stack>
                  </TooltipTrigger>
                  <TooltipContent>{capitalize(param.desc)}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {param.type === 'bool' ? (
                <Stack style={{ width: '100%' }}>
                  <Toggle
                    onCheckedChange={v => setCustomParameters(c => ({ ...c, [k]: v }))}
                    checked={value}
                    option={['Disabled', 'Enabled']}
                  />
                </Stack>
              ) : (
                <>
                  <Input
                    placeholder={`${k} value should be in ${param.type} format`}
                    onChange={customParameterInputChangeHandlerConstructor(k)}
                    value={Array.isArray(value) ? value.join(', ') : value}
                    variant="highlighted"
                    img={mapping[k] || 'Status'}
                  />
                  <span>{capitalize(param.desc)}</span>
                </>
              )}
            </Stack>
          )

          const addSeparator = param.type === 'bool' || i < arr.length - 1

          return (
            <Fragment key={k}>
              {common}
              {addSeparator && <Separator />}
            </Fragment>
          )
        })}
      </Stack>
    )
  }

  export namespace Error {
    export interface Props {

    }
  }

  export function Error() {
    return (
      <Stack dir='row'>
        <p>Select plugin to enable custom parameters editor</p>
      </Stack>
    )
  }
}