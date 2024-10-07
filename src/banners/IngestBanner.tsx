import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Input } from "@/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { Separator } from "@/ui/Separator";
import { useEffect, useState } from "react";
import s from './styles/IngestBanner.module.css';
import { Button } from "@/ui/Button";
import { Switch } from "@/ui/Switch";
import { Context, Operation } from "@/class/Info";
import { Card } from "@/ui/Card";
import { cn } from "@/ui/utils";
import { Progress } from "@/ui/Progress";
import { SelectContextBanner } from "./SelectContextBanner";

export function IngestBanner() {
  const { Info, app, api, spawnBanner } = useApplication();
  const [files, setFiles] = useState<FileList | null>(null);
  const [plugin, setPlugin] = useState<string>();
  const [filename, setFilename] = useState<string>();
  const [method, setMethod] = useState<string>();
  const [context, setContext] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isExistingContextChooserAvalable, setIsExistingContextChooserAvalable] = useState<boolean>(false);

  useEffect(() => {
    const filenames = app.general.ingest.find(p => p.plugin === plugin)?.types.map(t => t.filename) || [];
    setFilename(filenames[0]);
    setMethod(undefined);
  }, [plugin]);
  
  
  useEffect(() => {
    setMethod(undefined);
  }, [filename]);

  useEffect(() => {
    setContext('');
  }, [isExistingContextChooserAvalable]);

  const hasMethod = () => {
    const length = app.general.ingest.find(i => i.plugin === plugin)?.types.find(t => t.filename === filename)?.ids.length;

    return typeof length === 'undefined' || (files && Array.from(files).length)
  }

  const CHUNK_SIZE = 1024 * 2 * 1024;
  const boundary = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const sendChunkedFiles = async (file: File, start: number, index: number) => {
    const req_id = file.name + file.size;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
  
    const payload = JSON.stringify({});
  
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
        plugin,
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
          spawnBanner(<SelectContextBanner />);
        }
      });
    }, 5000);
    
  };
  
  

  const FilenameSelection = () => {
    if (!plugin) return null;

    const filenames = app.general.ingest.find(p => p.plugin === plugin)?.types.map(t => t.filename) || [];

    if (!filename) setFilename(filenames[0]);

    return (  
      <Select disabled={!plugin} onValueChange={setFilename} value={filename}>
        <SelectTrigger>
          <SelectValue defaultValue={filenames[0]} placeholder="Choose filename" />
        </SelectTrigger>
        <SelectContent>
          {plugin && filenames.map(f => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const MethodSelection = () => {
    if (!plugin || !filename) return null;

    const methods = app.general.ingest.find(p => p.plugin === plugin)?.types.find(t => t.filename === filename)?.ids || [];

    if (!methods.length) return null;

    if (!method) setMethod(methods[0]);

    return (
      <Select disabled={!plugin} onValueChange={setMethod} value={method}>
        <SelectTrigger>
          <SelectValue defaultValue={methods[0]} placeholder="Choose method" />
        </SelectTrigger>
        <SelectContent>
          {methods.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
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

  return (
    <Banner title='Upload files'>
      <Input
        type='file'
        id='ingest_input'
        multiple
        onChange={(e) => setFiles(e.currentTarget.files)}
      />
      <Separator />
      <div className={s.selection}>
        <Select onValueChange={setPlugin} value={plugin}>
          <SelectTrigger>
            <SelectValue placeholder="Choose plugin" />
          </SelectTrigger>
          <SelectContent>
            {app.general.ingest.map(obj => (
              <SelectItem key={obj.plugin} value={obj.plugin}>{obj.plugin}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FilenameSelection />
        <MethodSelection />
      </div>
      <Card>
        <div className={s.context}>
          <p className={cn(!isExistingContextChooserAvalable && s.available)}>New context</p>
          <Switch checked={isExistingContextChooserAvalable} onCheckedChange={setIsExistingContextChooserAvalable} />
          <p className={cn(isExistingContextChooserAvalable && s.available)}>Choose from existing one</p>
        </div>
        {isExistingContextChooserAvalable
          ? <ContextSelection />
          : <Input value={context} onChange={e => setContext(e.target.value)} placeholder='Context name' />}
      </Card>
      <div className={s.bottom}>
        {loading && <Progress value={progress} />}
        <Button
          variant={files?.length && context && plugin && filename && hasMethod() ? 'default' : 'disabled'}
          onClick={submitFiles}
          img='Check'
          className={s.done}
          loading={loading}
        >Done</Button>
      </div>
    </Banner>
  );
}
