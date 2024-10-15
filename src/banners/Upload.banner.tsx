import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Input } from "@/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import s from './styles/UploadBanner.module.css';
import { Button } from "@/ui/Button";
import { Switch } from "@/ui/Switch";
import { Context, Operation } from "@/class/Info";
import { Card } from "@/ui/Card";
import { cn, formatBytes } from "@/ui/utils";
import { Progress } from "@/ui/Progress";
import { SelectFilesBanner } from "./SelectFiles.banner";
import { PluginEntity } from "@/dto/Plugin.dto";
import { Mapping } from "@/dto/MappingFileList.dto";
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

  // useEffect(() => {
  //   const filenames = app.general.ingest.find(p => p.filename === plugin?.filename)?.mappings.map(m => m.filename) || [];
  //   setFilename(filenames[0]);
  //   setMethod(undefined);
  // }, [plugin]);
  
  
  // useEffect(() => {
  //   setMethod(undefined);
  // }, [filename]);

  useEffect(() => {
    setContext('');
  }, [isExistingContextChooserAvalable]);

  const CHUNK_SIZE = 1024 * 2 * 1024;
  const boundary = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const sendChunkedFiles = async (file: File, start: number, index: number) => {
    const req_id = file.name + file.size;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
  
    const payload = JSON.stringify(end >= file.size ? {
      plugin_params: {
        mapping_file: settings[file.name].mapping
      }
    }: {});
  
    const bodyStart = `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Disposition: form-data; name=payload\r\n\r\n${payload}\r\n--${boundary}\r\nContent-Disposition: form-data; name=file; filename=${file.name}; filename*=utf-8"${file.name}"\r\n\r\n`;
  
    const formEnd = `\r\n--${boundary}--\r\n\r\n`;
  
    const chunkBuffer = await chunk.arrayBuffer();
    const chunkArray = new Uint8Array(chunkBuffer);

    const bodyBlob = new Blob([bodyStart, chunkArray, formEnd]);
  
    await api<any>('/ingest_file', {
      method: 'PUT',
      body: bodyBlob,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
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

    setTimeout(() => {
      Info.operations_request().then(operations => {
        setLoading(false);
        
        const result = Info.operations_update(operations);
        
        if (result.contexts.length && result.plugins.length && result.files.length) {
          spawnBanner(<SelectFilesBanner />);
        }
      });
    }, 5000);
    
  };

  const updateSettings = useCallback((filename: File['name'], setting: λIngestFileSettings) => {
    setSettings(s => {
      const _file = s[filename]

      Object.assign(_file, setting);

      return s;
    });
  }, [setFiles]);
  
  const setPlugin = (plugin: λIngestFileSettings['plugin'], file: λIngestFileSettings, filename: File['name']) => updateSettings(filename, { ...file, plugin });

  const setMapping = (mapping: λIngestFileSettings['mapping'], file: λIngestFileSettings, filename: File['name']) => updateSettings(filename, { ...file, mapping });

  const setMethod = (method: λIngestFileSettings['method'], file: λIngestFileSettings, filename: File['name']) => updateSettings(filename, { ...file, method });

  const getExtensionMapping = (file: File) => {
    return app.general.ingest[0]?.filename;
  }

  const PluginSelection = ({ setting, file }: {
    setting: λIngestFileSettings,
    file: File
  }) => {
    const placeholder = app.general.ingest[0];

    if (!setting.plugin && placeholder) setPlugin(placeholder.filename, setting, file.name);

    return (  
      <Select onValueChange={plugin => setPlugin(plugin, setting, file.name)} value={setting.plugin}>
        <SelectTrigger>
          <SelectValue defaultValue={getExtensionMapping(file)} placeholder="Choose filename" />
        </SelectTrigger>
        <SelectContent>
          {app.general.ingest.map(i => (
            <SelectItem key={i.filename} value={i.filename}>{i.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const MappingSelection = ({ setting, file }: {
    setting: λIngestFileSettings,
    file: File
  }) => {
    const mappings = app.general.ingest.find(p => p.filename === setting.plugin)?.mappings || [];

    if (!mappings.length) return null;

    if (!setting.method) setMapping(mappings[0]?.filename, setting, file.name);

    return (
      <Select disabled={!setting.plugin} onValueChange={mapping => setMapping(mapping, setting, file.name)} value={setting.mapping}>
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
  };

  const ContextSelection = () => {
    setContext(Context.selected(app)[0]?.name);

    return (
      <Select disabled={!Context.selected(app).length} onValueChange={setContext} value={context}>
        <SelectTrigger className={s.trigger}>
          <SelectValue defaultValue={Context.selected(app)[0]?.name} placeholder={Context.selected(app).length ? `Choose one context from list below (exist: ${Context.selected(app).length})` : 'There is no contexts at this moment'} />
        </SelectTrigger>
        <SelectContent>
          {Operation.contexts(app).map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  const ita = (i: FileList) => {
    return Array.from(i);
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
            <p>Plugin | Method</p>
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
                <PluginSelection file={files.item(i)!} setting={settings[filename]} />
                <MappingSelection file={files.item(i)!} setting={settings[filename]} />
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
