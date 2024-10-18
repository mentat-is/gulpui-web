import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Input } from "@/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import s from './styles/UploadBanner.module.css';
import { Button } from "@/ui/Button";
import { Switch } from "@/ui/Switch";
import { Context, Mapping, Operation } from "@/class/Info";
import { Card } from "@/ui/Card";
import { cn, formatBytes } from "@/ui/utils";
import { Progress } from "@/ui/Progress";
import { SelectFilesBanner } from "./SelectFiles.banner";
import { PluginEntity } from "@/dto/Plugin.dto";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";

interface λIngestFileSettings {
  plugin?: PluginEntity['filename'],
  mapping?: PluginEntity['mappings'][number]['filename'],
  method?: PluginEntity['mappings'][number]['mapping_ids'][number]
}

export function UploadBanner() {
  const { Info, app, api, spawnBanner } = useApplication();
  const [files, setFiles] = useState<FileList>();
  const [settings, setSettings] = useState<Record<File['name'], λIngestFileSettings>>({});
  const [context, setContext] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isExistingContextChooserAvalable, setIsExistingContextChooserAvalable] = useState<boolean>(false);

  useEffect(() => {
    setContext('');
  }, [isExistingContextChooserAvalable]);

  const CHUNK_SIZE = 1024 * 2 * 1024;
  
  const sendChunkedFiles = async (file: File, start: number, index: number) => {
    const req_id = file.name + file.size;
    const end = Math.min(file.size, start + CHUNK_SIZE);

    const formData = new FormData();
    formData.append('payload', JSON.stringify(end >= file.size ? { plugin_params: { mapping_file: settings[file.name].mapping } } : {}));
    formData.append('file', file.slice(start, end), file.name);

    await api<any>('/ingest_file', {
      method: 'PUT',
      body: formData,
      headers: {
        'size': file.size.toString(),
        'continue_offset': start.toString(),
      },
      data: {
        req_id,
        plugin: settings[file.name].plugin,
        operation_id: Operation.selected(app)!.id,
        context,
        client_id: app.general.user_id,
        ws_id: app.general.ws_id,
      },
    });
  
    setProgress(Math.floor(((index + (end / file.size)) / files!.length) * 100));

    if (end < file.size) {
      await sendChunkedFiles(file, end, index);
    }
  };
  
  const submitFiles = async () => {
    if (!files) return;

    setLoading(() => true);
    setProgress(0);
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await sendChunkedFiles(file, 0, i);
    }

    const operations = await Info.operations_request();

    setLoading(false);
   
    const result = Info.operations_update(operations);
    
    if (result.contexts.length && result.plugins.length && result.files.length) {
      spawnBanner(<SelectFilesBanner />);
    }
  };
  
  const setPlugin = (plugin: λIngestFileSettings['plugin'], filename: File['name']) => {
    setSettings(s => ({
      ...s,
      [filename]: {
        ...s[filename],
        plugin
      }
    }));

    const mappings = Mapping.find(app, settings[filename].plugin!);

    if (mappings.length) {
      setMapping(mappings[0].filename, filename);
    }
  }

  const setMapping = (mapping: λIngestFileSettings['mapping'], filename: File['name']) => setSettings(s => ({
    ...s,
    [filename]: {
      ...s[filename],
      mapping
    }
  }));

  const getExtensionMapping = (file: File) => {
    const extension = file.name.split('.').pop()!;
    const map: Record<string, PluginEntity['filename']> = {
      'csv': 'csv.py',
    };

    const plugin = map[extension];

    if (!plugin) return undefined;

    return app.general.ingest.find(p => p.filename === plugin);
  }

  const PluginSelection = ({ file }: { file: File }) => {
    const placeholder = app.general.ingest[0];

    if (!settings[file.name].plugin && placeholder) setPlugin(placeholder.filename, file.name);

    return (  
      <Select onValueChange={plugin => setPlugin(plugin, file.name)} value={settings[file.name].plugin}>
        <SelectTrigger>
          <SelectValue defaultValue={getExtensionMapping(file)?.filename} placeholder="Choose filename" />
        </SelectTrigger>
        <SelectContent>
          {app.general.ingest.map(i => (
            <SelectItem key={i.filename} value={i.filename}>{i.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const MappingSelection = useCallback(({ file }: {
    file: File
  }) => {
    const mappings = Mapping.find(app, settings[file.name].plugin!) || [];

    if (!mappings.length) return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue defaultValue={'no_mappings'} placeholder="Choose mapping" />
        </SelectTrigger>
      </Select>
    );

    if (!settings[file.name].mapping) setMapping(mappings[0]?.filename, file.name);

    return (
      <Select disabled={!settings[file.name].plugin} onValueChange={mapping => setMapping(mapping, file.name)} value={settings[file.name].mapping}>
        <SelectTrigger>
          <SelectValue defaultValue={mappings[0].filename} placeholder="Choose mapping" />
        </SelectTrigger>
        <SelectContent>
          {mappings.map(m => (
            <SelectItem key={m.filename} value={m.filename}>{m.filename}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }, [settings, files]);

  const ContextSelection = () => {
    const contexts = Operation.contexts(app);

    if (!context) setContext(contexts[0]?.name);

    return (
      <Select disabled={!contexts.length} onValueChange={setContext} value={context}>
        <SelectTrigger className={s.trigger}>
          <SelectValue defaultValue={contexts[0]?.name} placeholder={contexts.length ? `Choose one context from list below (exist: ${contexts.length})` : 'There is no contexts at this moment'} />
        </SelectTrigger>
        <SelectContent>
          {contexts.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  const filesSelectHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;

    if (!files) return;

    setFiles(files);
    
    const settings: Record<File['name'], λIngestFileSettings> = {};

    for (let index = 0; index < files.length; index++) {
      const file = files.item(index)

      if (!file) continue;

      settings[file.name] = {};
    }

    setSettings(settings);
  }


  return (
    <Banner title='Upload files'>
      <Input
        type='file'
        id='ingest_input'
        multiple
        onChange={filesSelectHandler}
      />
      <div className={s.context}>
        <p className={cn(!isExistingContextChooserAvalable && s.available)}>New context</p>
        <Switch checked={isExistingContextChooserAvalable} onCheckedChange={setIsExistingContextChooserAvalable} />
        <p className={cn(isExistingContextChooserAvalable && s.available)}>Choose from existing one</p>
      </div>
      {isExistingContextChooserAvalable
        ? <ContextSelection />
        : <Input value={context} onChange={e => setContext(e.target.value)} placeholder='Context name' />}
      <Separator />
      {files && (
        <Card className={s.preview}>
          <div className={cn(s.node, s.defines)}>
            <p>Filename</p>
            <p>Size</p>
            <p>Plugin</p>
            <p>Method</p>
          </div>
          <Separator />
          <div className={s.files}>
            {Object.keys(settings).map((filename, i) => (
              <div className={s.node}>
                <Popover>
                  <PopoverTrigger asChild>
                    <p>{filename}</p>
                  </PopoverTrigger>
                  <PopoverContent className={s.popover}>{filename}</PopoverContent>
                </Popover>
                <p>{formatBytes(files.item(i)!.size)}</p>
                <PluginSelection file={files.item(i)!} />
                <MappingSelection file={files.item(i)!} />
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className={s.bottom}>
        {loading && <Progress value={progress} />}
        <Button
          variant={files?.length && context && Object.values(settings).every(s => s.plugin) ? 'default' : 'disabled'}
          onClick={submitFiles}
          img='Check'
          className={s.done}
          loading={loading}
        >Done</Button>
      </div>
    </Banner>
  );
}
