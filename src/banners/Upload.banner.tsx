import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Input } from "@/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { ChangeEvent, useEffect, useState } from "react";
import s from './styles/UploadBanner.module.css';
import { Button } from "@/ui/Button";
import { Switch } from "@/ui/Switch";
import { Mapping, Operation } from "@/class/Info";
import { Card } from "@/ui/Card";
import { cn, formatBytes } from "@/ui/utils";
import { Progress } from "@/ui/Progress";
import { SelectFilesBanner } from "./SelectFiles.banner";
import { PluginEntity } from "@/dto/Plugin.dto";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { Logger } from "@/dto/Logger.class";
import { QueryExternalBanner } from "./QueryExternal.banner";
import { MaybeArray } from "@impactium/types";
import { Stack } from "@impactium/components";
import { Icon } from "@impactium/icons";

interface λIngestFileSettings {
  // plugin name
  plugin?: PluginEntity['filename'],

  // plugin mapping definitions
  mapping?: PluginEntity['mappings'][number]['filename'],

  // plugin parse settings
  method?: PluginEntity['mappings'][number]['mapping_ids'][number]
}

const FILE_SIGNATURES = (() => {
  const list: Record<string, MaybeArray<Uint8Array>> = {};
  list['win_evtx.py'] = new Uint8Array([0x45, 0x6C, 0x66, 0x46, 0x69, 0x6C, 0x65]);
  list['systemd_journal.py'] = new Uint8Array([0x4C, 0x50, 0x4B, 0x53, 0x48, 0x48, 0x52, 0x48])
  list['sqlite.py'] = new Uint8Array([0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72])
  list['pcap.py'] = new Uint8Array([0x0A, 0x0D, 0x0D, 0x0A ]);
  list['pcap.py'] = new Uint8Array([0xA1, 0xB2, 0xC3, 0xD4 ]);
  list['pcap.py'] = new Uint8Array([0xD4, 0xC3, 0xB2, 0xA1 ]);
  list['pcap.py'] = new Uint8Array([0xA1, 0xB2, 0x3C, 0x4d ]);
  list['pcap.py'] = new Uint8Array([0x4D, 0x3C, 0xB2, 0xA1 ]);
  list['win_reg.py'] = new Uint8Array([0x72,0x65,0x67,0x66]);
  return list;
})();

interface TargetSelection {
  file: File
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
      Logger.log(`${file.name} has been uploaded.
Size: ${file.size} bytes.
Progress: ${progress}%`, UploadBanner.name);
    }

    const result = await Info.query_operations();

    setLoading(false);

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

    const mappings = Mapping.find(app, settings[filename].plugin!) || [];

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

  
  const setMethod = (method: λIngestFileSettings['method'], filename: File['name']) => setSettings(s => ({
    ...s,
    [filename]: {
      ...s[filename],
      method
    }
  }));

  const getExtensionMapping = async (file: File): Promise<string> => {
    const isEqual = (buffer: ArrayBuffer, uint: Uint8Array) => {
        const slice = new Uint8Array(buffer.slice(0, uint.byteLength));
        return slice.every((value, index) => value === uint[index]);
    };

    const buffer = await file.arrayBuffer();

    const matchedKey = Object.keys(FILE_SIGNATURES).find(key => {
        const signature = FILE_SIGNATURES[key];
        return Array.isArray(signature)
            ? signature.some(uint => isEqual(buffer, uint))
            : isEqual(buffer, signature);
    });

    return matchedKey || mapExtensions[file.name.split('.')[1]] || 'regex';
  };

  const mapExtensions: Record<string, string> = {
    csv: 'csv.py',
    eml: 'eml.py',
    mbox: 'mbox.py'
  }

  useEffect(() => {
    if (!files) {
      return; 
    }

    [...files].forEach(async file => {
      const plugin = await getExtensionMapping(file);

      setPlugin(plugin, file.name);
    })
  }, [files]);


  const PluginSelection = ({ file }: TargetSelection) => {
    return (  
      <Select onValueChange={plugin => setPlugin(plugin, file.name)} value={settings[file.name].plugin}>
        <SelectTrigger>
          <SelectValue defaultValue={settings[file.name].plugin} placeholder="Choose filename">{settings[file.name].plugin}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {app.general.ingest.map(i => (
            <SelectItem key={i.filename} value={i.filename}>{i.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const MappingSelection = ({ file }: TargetSelection) => {
    const mappings = Mapping.find(app, settings[file.name].plugin!) || [];

    if (!mappings.length) return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue defaultValue={'no_mappings'} placeholder="No mappings available for this plugin" />
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
  };

  const findMethodsByPluginAndMappingName = (plugin?: λIngestFileSettings['plugin'], mapping?: λIngestFileSettings['mapping']) => {
    const mappings = plugin ? app.general.ingest.find(p => p.filename === plugin)?.mappings : null;

    if (!mappings) {
      return [];
    }

    return mappings.find(m => m.filename === mapping)?.mapping_ids || [];
  }

  const MethodSelection = ({ file }: TargetSelection) => {
    console.log('z');
    const fileSettings = settings[file.name];

    const methods = findMethodsByPluginAndMappingName(fileSettings.plugin, fileSettings.mapping);

    if (methods.length === 0) {
      <Select disabled>
        <SelectTrigger>
          <SelectValue defaultValue={'no_mappings'} placeholder="No methods available for this mapping" />
        </SelectTrigger>
      </Select>
    }

    // if (!fileSettings.method) setMethod(methods[0], file.name);

    return (
      <Select disabled={!fileSettings.mapping} onValueChange={mapping => setMethod(mapping, file.name)} value={fileSettings.method}>
        <SelectTrigger>
          <SelectValue defaultValue={methods[0]} placeholder="Choose mapping" />
        </SelectTrigger>
        <SelectContent>
          {methods.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

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

  function addFromExternalQueryButtonHandler() {
    spawnBanner(<QueryExternalBanner />)
  }

  function FilePreview({ file }: TargetSelection) {
    return (
      <Stack className={s.filePreview}>
        <Stack>
          <Icon name='File' fromGeist />
          <Popover>
            <PopoverTrigger asChild>
              <p>{file.name}</p>
            </PopoverTrigger>
            <PopoverContent className={s.popover}>{file.name}</PopoverContent>
          </Popover>
        </Stack>
        <p>{formatBytes(file.size)}</p>
        <PluginSelection file={file} />
        <MappingSelection file={file} />
        <MethodSelection file={file} />
      </Stack>
    )
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
            {Object.keys(settings).map((_, i) => <FilePreview file={files.item(i)!} />)}
          </div>
        </Card>
      )}
      <div className={s.bottom}>
        {loading && <Progress value={progress} />}
        <Button
          variant='outline'
          onClick={addFromExternalQueryButtonHandler}
          img='Kv'
        >Add from external query</Button>
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
