import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Input } from "@/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { useCallback, useEffect, useState } from "react";
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

interface λIngestFile extends File {
  plugin?: PluginEntity['filename'],
  mapping?: PluginEntity['mappings'][number]['filename'],
  method?: PluginEntity['mappings'][number]['mapping_ids'][number]
}

export function UploadBanner() {
  const { Info, app, api, spawnBanner } = useApplication();
  const [files, setFiles] = useState<λIngestFile[]>([]);
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
  
  const sendChunkedFiles = async (file: λIngestFile, start: number, index: number) => {
    const req_id = file.name + file.size;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
  
    const payload = JSON.stringify(end >= file.size ? {
      plugin_params: {
        mapping_file: file.mapping
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
        plugin: file.plugin,
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

  const updateFile = useCallback((file: λIngestFile) => {
    setFiles(f => {
      const _file = f.find(x => x.name === file.name && file.webkitRelativePath === x.webkitRelativePath)!;

      Object.assign(_file, file);

      return f;
    });
  }, [setFiles]);
  
  const setPlugin = (plugin: λIngestFile['plugin'], file: λIngestFile) => updateFile({ ...file, plugin });

  const setMapping = (mapping: λIngestFile['mapping'], file: λIngestFile) => updateFile({ ...file, mapping });

  const setMethod = (method: λIngestFile['method'], file: λIngestFile) => updateFile({ ...file, method });

  const getExtensionMapping = (file: λIngestFile) => {
    return app.general.ingest[0]?.filename;
  }

  const PluginSelection = ({ file }: { file: λIngestFile }) => {
    const placeholder = app.general.ingest[0];

    if (!file.plugin && placeholder) setPlugin(placeholder.filename, file);

    return (  
      <Select onValueChange={plugin => setPlugin(plugin, file)} value={file.plugin}>
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

  const MappingSelection = ({ file }: { file: λIngestFile }) => {
    const mappings = app.general.ingest.find(p => p.filename === file.plugin)?.mappings || [];

    if (!mappings.length) return null;

    if (!file.method) setMapping(mappings[0]?.filename, file);

    return (
      <Select disabled={!file.plugin} onValueChange={mapping => setMapping(mappings[0]?.filename, file)} value={file.mapping}>
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


  return (
    <Banner title='Upload files'>
      <Input
        type='file'
        id='ingest_input'
        multiple
        onChange={(e) => e.currentTarget.files && setFiles(ita(e.currentTarget.files))}
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
            {files.map(file => (
              <div className={s.node}>
                <Popover>
                  <PopoverTrigger asChild>
                    <p>{file.name}</p>
                  </PopoverTrigger>
                  <PopoverContent className={s.popover}>{file.name}</PopoverContent>
                </Popover>
                <p>{formatBytes(file.size)}</p>
                <PluginSelection file={file} />
                <MappingSelection file={file} />
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className={s.bottom}>
        {loading && <Progress value={progress} />}
        <Button
          variant={files?.length && context && files.every(f => f.plugin) ? 'default' : 'disabled'}
          onClick={submitFiles}
          img='Check'
          className={s.done}
          loading={loading}
        >Done</Button>
      </div>
    </Banner>
  );
}
