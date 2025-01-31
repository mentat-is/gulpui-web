import { File, GulpDataset, Info, MinMax, MinMaxBase } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { Default, λFile } from "@/dto/Dataset";
import { Banner as UIBanner } from "@/ui/Banner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/Select";
import { Button, Input, Skeleton, Stack } from "@impactium/components";
import { Icon } from "@impactium/icons";
import { format } from "date-fns";
import { ChangeEvent, useEffect, useState } from "react";

export namespace Enrichment {
  export interface Props extends UIBanner.Props {
    
  }

  export function Banner({ ...props }: Enrichment.Props) {
    const { Info, app } = useApplication();
    const [file, setFile] = useState<λFile | null>(null);
    const [plugins, setPlugins] = useState<GulpDataset.PluginList.Summary>();
    const [plugin, setPlugin] = useState<GulpDataset.PluginList.Object>();

    useEffect(() => {
      Info.plugin_list().then(plugins => {
        setPlugins(plugins.filter(plugin => plugin.type.includes('enrichment')));
      });
    }, []);

    const submit = () => {
      if (!file || !plugin) {
        return;
      }

      const events = File.events(app, file)
        .filter(e => Number(e.nanotimestamp / 1_000_000) > frame.min && Number(e.nanotimestamp / 1_000_000) < frame.max)
        .map(e => e.id);

      Info.enrichment(plugin.filename, events);
    }

    const done = (
      <Button variant='glass' img='Check' onClick={submit} />
    )

    const FileSelection = () => {
      const Trigger = () => {
        return (
          <SelectTrigger>
            <Stack gap={16}>
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
        return <Skeleton width='full' />;
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

    return (
      <UIBanner title='Data enrichment' done={done} loading={!plugins}>
        <PluginSelection />
        <FileSelection />
        <Input onChange={frameInputChangeHandlerConstructor('min')} value={format(frame.min, "yyyy-MM-dd'T'HH:mm")} variant='highlighted' img='CalendarArrowUp' type='datetime-local' />
        <Input onChange={frameInputChangeHandlerConstructor('max')} value={format(frame.max, "yyyy-MM-dd'T'HH:mm")} variant='highlighted' img='CalendarArrowDown' type='datetime-local' />
      </UIBanner>
    )
  }
}