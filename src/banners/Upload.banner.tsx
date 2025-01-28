import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Input } from '@impactium/components';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { ChangeEvent, useEffect, useState } from 'react';
import s from './styles/UploadBanner.module.css';
import { Index, Mapping, Operation } from '@/class/Info';
import { formatBytes } from '@/ui/utils';
import { Progress } from '@/ui/Progress';
import { SelectFilesBanner } from './SelectFiles.banner';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover';
import { MaybeArray } from '@impactium/types';
import { Button, Stack } from '@impactium/components';
import { Icon } from '@impactium/icons';
import { Toggle } from '@/ui/Toggle';
import { toast } from 'sonner';
import { Separator } from '@/ui/Separator';
import { cn } from '@impactium/utils';
import { Default } from '@/dto/Dataset';

interface λIngestFileSettings {
  plugin?: string;
  method?: string;
  mapping?: string;
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
  const { Info, app, spawnBanner } = useApplication();
  const [files, setFiles] = useState<FileList>([] as unknown as FileList);
  const [settings, setSettings] = useState<Record<File['name'], λIngestFileSettings>>({});
  const [context, setContext] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isExistingContextChooserAvalable, setIsExistingContextChooserAvalable] = useState<boolean>(false);

  useEffect(() => {
    setContext('');
  }, [isExistingContextChooserAvalable]);

  const send = async (file: File, start: number, i: number) => {
    const size = 1024 * 2 * 1024
    const end = Math.min(file.size, start + size);

    const index = Index.selected(app);
    if (!index) {
      return;
    }

    const operation = Operation.selected(app);
    if (!operation) {
      return;
    }

    const plugin = settings[file.name].plugin;
    if (!plugin) {
      return;
    }

    const formData = new FormData();
    formData.append('payload', JSON.stringify({
      plugin_params: {
        mapping_file: settings[file.name].method,
        mapping_id: settings[file.name].mapping
      },
      original_file_path: './' + file.name
    }));
    formData.append('f', file.slice(start, end), file.name);

    const response = await api<any>('/ingest_file', {
      method: 'POST',
      body: formData,
      deassign: true,
      raw: true,
      toast: false,
      headers: {
        size: file.size.toString(),
        continue_offset: start.toString(),
      },
      query: {
        plugin: plugin.split('.')[0],
        index: index.name,
        operation_id: operation.id,
        context_name: context,
        ws_id: app.general.ws_id,
      },
    });

    if (response.isError() && response.data.continue_offset) {
      await send(file, response.data.continue_offset, file.size / (file.size - response.data.continue_offset));
      return;
    }
  
    setProgress(Math.floor(((i + (end / file.size)) / files!.length) * 100));

    if (end < file.size) {
      await send(file, end, i);
    }
  };
  
  const submit = async () => {
    setLoading(true);
    setProgress(0);
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await send(file, 0, i);
    }

    await Info.query_operations();

    setLoading(false);

    spawnBanner(<SelectFilesBanner />);
  };
  
  const setPlugin = (plugin: string, filename: File['name']) => {
    setSettings(s => ({
      ...s,
      [filename]: {
        ...s[filename],
        plugin
      }
    }));

    const fileDefinedMethod = settings[filename].method

    if (!fileDefinedMethod) {
      return;
    }

    const methods = Mapping.methods(app, plugin);

    const isNewPluginAllowsFileToHasAnExistanseMethod = methods.includes(fileDefinedMethod);

    if (!isNewPluginAllowsFileToHasAnExistanseMethod) {
      setMethod(methods.length === 1 ? methods[0] : undefined, filename, plugin);
    }
  }

  const setMethod = (method: string | undefined, filename: File['name'], plugin?: string) => {
    setSettings(s => ({
      ...s,
      [filename]: {
        ...s[filename],
        method
      }
    }))

    if (!method) {
      return setMapping(undefined, filename);
    }

    const fileDefinedMapping = settings[filename].mapping;

    const mappings = Mapping.mappings(app, plugin || settings[filename].plugin!, method);

    const isNewMethodAllowsFileToHasAnExistanseMapping = fileDefinedMapping ? mappings.includes(fileDefinedMapping) : false

    if (!isNewMethodAllowsFileToHasAnExistanseMapping) {
      setMapping(mappings.length === 1 ? mappings[0] : undefined, filename);
    }
  };

  const setMapping = (mapping: string | undefined, filename: File['name']) => {
    setSettings(s => ({
      ...s,
      [filename]: {
        ...s[filename],
        mapping
      }
    }));
  };

  useEffect(() => {
    const newSettings: typeof settings = {};

    Object.entries(settings).forEach(file => {
      const [filename, settings] = file;
      
      newSettings[filename] = settings;
    });
  }, [settings]);

  const getExtensionMapping = async (file: File): Promise<string | undefined> => {
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

    return matchedKey;
  };

  useEffect(() => {
    if (!files) {
      return; 
    }

    [...files].forEach(async file => {
      const plugin = await getExtensionMapping(file);

      if (plugin) {
        setPlugin(plugin, file.name);
      }
    })
  }, [files]);

  useEffect(() => {
    if (app.target.plugins.length === 0) {
      Info.mapping_file_list();
    }
  }, [app.target.plugins])


  const PluginSelection = ({ file }: TargetSelection) => {
    return (  
      <Select onValueChange={plugin => setPlugin(plugin, file.name)} value={settings[file.name].plugin}>
        <SelectTrigger>
          <SelectValue defaultValue={settings[file.name].plugin} placeholder='Choose filename'>{settings[file.name].plugin}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Mapping.plugins(app).map(p => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const MethodSelection = ({ file }: TargetSelection) => {
    const plugin = settings[file.name].plugin;

    if (!plugin) {
      return null;
    }

    const methods = Mapping.methods(app, plugin);

    if (!methods.length) {
      return (
        <Select disabled>
          <SelectTrigger>
            <SelectValue defaultValue={'x'} placeholder='No mappings available for this plugin' />
          </SelectTrigger>
        </Select>
      );
    }

    const isFileMethodMissing = !settings[file.name].method;

    if (isFileMethodMissing && methods.length === 1) {
      setMethod(methods[0], file.name);
    }

    return (
      <Select disabled={methods.length < 2} onValueChange={method => setMethod(method, file.name)} value={settings[file.name].method}>
        <SelectTrigger>
          <SelectValue defaultValue={'x'} placeholder='Not selected' />
        </SelectTrigger>
        <SelectContent>
          {methods.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const MappingSelection = ({ file }: TargetSelection) => {
    const { plugin, method, mapping } = settings[file.name];

    const mappings = Mapping.mappings(app, plugin!, method!);

    return (
      <Select disabled={mappings.length < 2} onValueChange={mapping => setMapping(mapping, file.name)} value={mapping}>
        <SelectTrigger defaultValue={mapping} value={mapping}>{mapping || 'Not selected'}</SelectTrigger>
        <SelectContent>
          {mappings.map(m => (
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
    toast('Not paid', {
      description: 'Its paid feature. Maybe. Idk'
    })
  }

  function FilePreview({ file }: TargetSelection) {
    return (
      <Stack className={s.filePreview} gap={16}>
        <Stack>
          <Icon name='File' fromGeist />
          <p className={s.weight}>{formatBytes(file.size)}</p>
          <Popover>
            <PopoverTrigger asChild>
              <p className={s.filename}>{file.name}</p>
            </PopoverTrigger>
            <PopoverContent className={s.popover}>{file.name}</PopoverContent>
          </Popover>
        </Stack>
        <Stack gap={0}>
          <PluginSelection file={file} />
          <Separator style={{ height: 28 }} color='var(--gray-400)' orientation='vertical' />
          <MethodSelection file={file} />
          <Separator style={{ height: 28 }} color='var(--gray-400)' orientation='vertical' />
          <MappingSelection file={file} />
        </Stack>
      </Stack>
    )
  }

  const done = <Button
    variant='glass'
    onClick={submit}
    img='Check'
    className={s.done}
    disabled={!context || files.length === 0 || Object.values(settings).some(s => !s.plugin || !s.method || !s.mapping)}
    loading={loading}
  />

  const option = <Button
    variant='ghost'
    onClick={addFromExternalQueryButtonHandler}
    img='Kv'
  />

  return (
    <Banner title='Upload files' done={done} option={option}>
      <Toggle option={['New context', 'Choose from existing one']} checked={isExistingContextChooserAvalable} onCheckedChange={setIsExistingContextChooserAvalable} />
      {isExistingContextChooserAvalable
        ? <ContextSelection />
        : <Input variant='highlighted' img={Default.Icon.CONTEXT} value={context} onChange={e => setContext(e.target.value)} placeholder='Context name' />}
      <Stack>
        <Input
          type='file'
          id='ingest_input'
          multiple
          onChange={filesSelectHandler}
        />
        <Button variant='secondary' img='Plus'>
          Add files
        </Button>
      </Stack>      
      <Stack dir='column' gap={0} className={cn(s.files, files.length === 0 && s.fill)}>
        {files.length === 0 ? <Placeholder /> : Object.keys(settings).map((_, i) => <FilePreview file={files.item(i)!} />)}
      </Stack>
      {progress > 0 && <Progress value={progress} />}
    </Banner>
  );
}

function Placeholder() {
  return (
    <Stack>
      <Icon name='FileScan' />
      <p>Choose files which you want to upload</p>
    </Stack>
  )
}