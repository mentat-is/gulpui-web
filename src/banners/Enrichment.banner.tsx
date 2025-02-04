import { File, GulpDataset, MinMax, MinMaxBase } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { λEvent } from "@/dto/ChunkEvent.dto";
import { Default, λFile } from "@/dto/Dataset";
import { Banner as UIBanner } from "@/ui/Banner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { Button, Input, Skeleton, Stack } from "@impactium/components";
import { Icon } from "@impactium/icons";
import { format } from "date-fns";
import { ChangeEvent, CSSProperties, Fragment, useEffect, useMemo, useState } from "react";
import s from './styles/EnrichmentBanner.module.css';

export namespace Enrichment {
  export interface Props extends UIBanner.Props {
    event?: λEvent;
  }

  export function Banner({ event, ...props }: Enrichment.Props) {
    const { Info, app } = useApplication();
    const [file, setFile] = useState<λFile | null>(event ? File.id(app, event.file_id) : null);
    const [plugins, setPlugins] = useState<GulpDataset.PluginList.Summary>();
    const [plugin, setPlugin] = useState<GulpDataset.PluginList.Object>();
    const [customParameters, setCustomParameters] = useState<Record<string, any>>({});

    useEffect(() => {
      if (!plugin) {
        return setCustomParameters({});
      }

      const parameters: typeof customParameters = {};

      plugin.custom_parameters.forEach(p => {
        parameters[p.name] = p.default_value;
      })

      setCustomParameters(parameters);
    }, [plugin])

    useEffect(() => {
      Info.plugin_list().then(plugins => {
        setPlugins(plugins.filter(plugin => plugin.type.includes('enrichment')));
      });
    }, []);

    const submit = () => {
      if (!file || !plugin) {
        return;
      }

      if (event) {
        Info.enrich_single_id(plugin.filename, event, customParameters);
        return;
      }
 
      const events = File.events(app, file)
        .filter(e => Number(e.nanotimestamp / 1_000_000) > frame.min && Number(e.nanotimestamp / 1_000_000) < frame.max)
        .map(e => e.id);

      Info.enrichment(plugin.filename, file, events, customParameters);
      
    }

    const disabledStyle: CSSProperties = {
      pointerEvents: 'none',
      color: 'var(--text-dimmed)',
    }

    const done = (
      <Button disabled={!file || !plugin} variant='glass' img='Check' onClick={submit} />
    )

    const FileSelection = () => {
      if (event && file) {
        return (
          <Skeleton show={!plugins} width='full' className={s.skeleton}>
            <Input img={File.icon(file)} value={file.name} variant='highlighted' style={disabledStyle} />
          </Skeleton>
        )
      }

      const Trigger = () => {
        return (
          <SelectTrigger>
            <Stack style={{ pointerEvents: event ? 'none' : 'all' }} gap={16}>
              <Icon variant='dimmed' name={file ? File.icon(file) : Default.Icon.FILE} />
              {file ? file.name : 'Select source you want to enrich'}
            </Stack>
          </SelectTrigger>
        )
      }

      return (
        <Select onValueChange={fileId => setFile(File.id(app, fileId as unknown as λFile['id']))}>
          <Trigger />
          <SelectContent>
            {File.selected(app).map(file => {
              return (
                <SelectItem value={file.id}>
                  {file.name}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )
    }

    const PluginSelection = () => {
      if (!plugins) {
        return <Skeleton className={s.skeleton} width='full' />;
      }

      const Trigger = () => {
        return (
          <SelectTrigger>
            <Stack gap={16}>
              <Icon variant='dimmed' name='Puzzle' />
              {plugin ? plugin.filename : 'Select plugin you want to use for enrichment'}
            </Stack>
          </SelectTrigger>
        )
      }

      return (
        <Select onValueChange={filename => setPlugin(plugins.find(p => p.filename === filename))}>
          <Trigger />
          <SelectContent>
            {plugins.map(plugin => {
              return (
                <SelectItem value={plugin.filename}>
                  {plugin.filename}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )
    }

    const [frame, setFrame] = useState<MinMax>(MinMaxBase);

    useEffect(() => {
      if (!file) {
        return;
      }

      setFrame({
        min: Number(file.nanotimestamp.min / 1_000_000n),
        max: Number(file.nanotimestamp.max / 1_000_000n)
      });
    }, [file]);

    const frameInputChangeHandlerConstructor = (type: keyof MinMax) => (event: ChangeEvent<HTMLInputElement>) => setFrame(frame => ({
      ...frame,
      [type]: event.currentTarget.valueAsNumber
    }))

    const FrameSelector = () => {
      if (event) {
        return (
          <Skeleton width='full' className={s.skeleton} show={!plugins}>
            <Input value={event.id} variant='highlighted' style={disabledStyle} img={Default.Icon.EVENT} />
          </Skeleton>
        )
      }
      return (
        <Fragment>
          <Input onChange={frameInputChangeHandlerConstructor('min')} value={format(frame.min, "yyyy-MM-dd'T'HH:mm")} variant='highlighted' img='CalendarArrowUp' type='datetime-local' />
          <Input onChange={frameInputChangeHandlerConstructor('max')} value={format(frame.max, "yyyy-MM-dd'T'HH:mm")} variant='highlighted' img='CalendarArrowDown' type='datetime-local' />
        </Fragment>
      );
    }

    const CustomParameters = useMemo(() => {
      if (!plugin) {
        return null;
      }

      const customParameterInputChangeHandlerConstructor = (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
        const { value: raw } = event.target;

        const type = plugin.custom_parameters.find(p => p.name === name)?.type;
        
        const value = !type
          ? raw
          : type === 'list'
            ? raw.split(',').map(v => v.trim())
            : type === 'int'
              ? Number(raw) || 0
              : type === 'dict'
                ? raw
                : type === 'bool'
                  ? Boolean(raw)
                  : raw;

        setCustomParameters(c => ({
          ...c,
          [name]: value
        }));
      }

      const mapping: Record<string, Icon.Name> = {
        'ip_fields': 'Location'
      }

      return (
        <Fragment>
          {Object.keys(customParameters).map(k => {
            const value = customParameters[k];

            const param = plugin.custom_parameters.find(c => c.name === k);
            if (!param) {
              return null;
            }
            
            if (param.type === 'bool') {
              return (
                <Stack>
                  <Switch value={value} />
                </Stack>
              )
            }

            return <Input key={k} placeholder={`${k} value should be in ${param.type} format`} onChange={customParameterInputChangeHandlerConstructor(k)} value={Array.isArray(value) ? value.join(', ') : value} variant='highlighted' img={mapping[k] || 'Status'} />
          })}
        </Fragment>
      )
    }, [plugin, customParameters, setCustomParameters]);

    const Hint = () => {
      return (
        <Stack style={{ color: 'var(--text-dimmed)' }}>
          <Icon name='Info' />
          <p style={{ lineHeight: 1.1, fontSize: 11, color: 'var(--text-dimmed)', fontFamily: 'var(--font-mono)', maxWidth: 512, whiteSpace: 'break-spaces' }}>In lists, values can be separated by comma. Dict values should be represented in JSON format</p>
        </Stack>
      )
    }

    return (
      <UIBanner title='Data enrichment' done={done} loading={!plugins}>
        <PluginSelection />
        <FileSelection />
        <FrameSelector />
        {CustomParameters}
        <Hint />
      </UIBanner>
    )
  }
}