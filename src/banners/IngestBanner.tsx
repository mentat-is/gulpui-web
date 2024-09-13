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
import { cn, ui } from "@/ui/utils";

export function IngestBanner() {
  const { app, api } = useApplication();
  const [files, setFiles] = useState<FileList | null>(null);
  const [plugin, setPlugin] = useState<string>();
  const [filename, setFilename] = useState<string>();
  const [method, setMethod] = useState<string>();
  const [context, setContext] = useState<string>('');
  const [isExistingContextChooserAvalable, setIsExistingContextChooserAvalable] = useState<boolean>(false);

  useEffect(() => {
    setFilename(undefined);
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
  
  const sendChunkedFiles = async (file: File, start: number = 0) => {
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const text = await chunk.text()

    console.log('Chunk', await chunk.text());

    if (!text.length) console.error('ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ ХУЙНЯ');
  
    const payload = JSON.stringify({});
  
    const bodyStart = `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Disposition: form-data; name=payload\r\n\r\n${payload}\r\n--${boundary}\r\nContent-Disposition: form-data; name=file; filename=${file.name}; filename*=utf-8"${file.name}"\r\n\r\n`;
  
    const formEnd = `\r\n--${boundary}--\r\n\r\n`;
  
    const chunkBuffer = await chunk.arrayBuffer();
    const chunkArray = new Uint8Array(chunkBuffer);

    if (!chunkArray.length) console.error('ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ ПИЗДЕЦ');

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
        plugin,
        operation_id: Operation.selected(app)!.id,
        context,
        client_id: app.general.user_id,
        ws_id: app.general.ws_id,
      },
    });

    if (end < file.size) {
      await sendChunkedFiles(file, end);
    }
  };
  
  const submitFiles = async () => {
    if (!files) return;
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await sendChunkedFiles(file, 0);
    }
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
    setContext(Context.selected(app)[0].name);

    return (  
      <Select onValueChange={setContext} value={context || Context.selected(app)[0].name}>
        <SelectTrigger className={s.trigger}>
          <SelectValue defaultValue={Context.selected(app)[0].name} placeholder="Choose method" />
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
      <Button
        variant={files?.length && context && plugin && filename && hasMethod() ? 'default' : 'disabled'}
        onClick={submitFiles}
        img={ui('check/check')}
        className={s.done}
      >Done</Button>
    </Banner>
  );
}



// import { useApplication } from "@/context/Application.context";
// import { Banner } from "@/ui/Banner";
// import { Input } from "@/ui/Input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
// import { Separator } from "@/ui/Separator";
// import { useEffect, useState } from "react";
// import s from './styles/IngestBanner.module.css';
// import { Button } from "@/ui/Button";
// import { Switch } from "@/ui/Switch";
// import { Context, Operation } from "@/class/Info";
// import { Card } from "@/ui/Card";
// import { cn, ui } from "@/ui/utils";

// export function IngestBanner() {
//   const { app, api } = useApplication();
//   const [files, setFiles] = useState<FileList | null>(null);
//   const [plugin, setPlugin] = useState<string>();
//   const [filename, setFilename] = useState<string>();
//   const [method, setMethod] = useState<string>();
//   const [context, setContext] = useState<string>('');
//   const [isExistingContextChooserAvalable, setIsExistingContextChooserAvalable] = useState<boolean>(false);

//   useEffect(() => {
//     setFilename(undefined);
//     setMethod(undefined);
//   }, [plugin]);
  
//   useEffect(() => {
//     setMethod(undefined);
//   }, [filename]);

//   useEffect(() => {
//     setContext('');
//   }, [isExistingContextChooserAvalable]);

//   const hasMethod = () => {
//     const length = app.general.ingest.find(i => i.plugin === plugin)?.types.find(t => t.filename === filename)?.ids.length;

//     return typeof length === 'undefined' || (files && Array.from(files).length)
//   }

//   const submit = () => {
//     const payload = JSON.stringify({
//       flt: {},
//       plugin_params: {
//         mapping_file: filename,
//         mapping_id: method,
//       }
//     });

//     api<any>('/ingest_file', {
//       method: 'PUT',
//       data: {
//         plugin,
//         operation_id: Operation.selected(app)!.id,
//         context,
//         client_id: app.general.user_id,
//         ws_id: app.general.ws_id,
//       },
//       headers: {
//         size: Array.from(files!).map(f => f.size).reduce((a, b) => a + b, 0).toString(),
//         continue_offset: (0).toString()
//       }
//     }
//     )
//   }

//   const FilenameSelection = () => {
//     if (!plugin) return null;

//     const filenames = app.general.ingest.find(p => p.plugin === plugin)?.types.map(t => t.filename) || [];

//     if (!filename) setFilename(filenames[0]);

//     return (  
//       <Select disabled={!plugin} onValueChange={setFilename} value={filename}>
//         <SelectTrigger>
//           <SelectValue defaultValue={filenames[0]} placeholder="Choose filename" />
//         </SelectTrigger>
//         <SelectContent>
//           {plugin && filenames.map(f => (
//             <SelectItem key={f} value={f}>{f}</SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     );
//   };

//   const MethodSelection = () => {
//     if (!plugin || !filename) return null;

//     const methods = app.general.ingest.find(p => p.plugin === plugin)?.types.find(t => t.filename === filename)?.ids || [];

//     if (!methods.length) return null;

//     if (!method) setMethod(methods[0]);

//     return (
//       <Select disabled={!plugin} onValueChange={setMethod} value={method}>
//         <SelectTrigger>
//           <SelectValue defaultValue={methods[0]} placeholder="Choose method" />
//         </SelectTrigger>
//         <SelectContent>
//           {methods.map(m => (
//             <SelectItem key={m} value={m}>{m}</SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     );
//   };

//   const ContextSelection = () => {
//     setContext(Context.selected(app)[0].name);

//     return (  
//       <Select onValueChange={setContext} value={context || Context.selected(app)[0].name}>
//         <SelectTrigger className={s.trigger}>
//           <SelectValue defaultValue={Context.selected(app)[0].name} placeholder="Choose method" />
//         </SelectTrigger>
//         <SelectContent>
//           {Operation.contexts(app).map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
//         </SelectContent>
//       </Select>
//     );
//   }

//   return (
//     <Banner title='Upload files'>
//       <Input
//         type='file'
//         id='ingest_input'
//         multiple
//         onChange={(e) => setFiles(e.currentTarget.files)}/>
//       {files?.length && Array.from(files).map(f => <p className={s.p}>{f.name}</p>)}
//       <Separator />
//       <div className={s.selection}>
//         <Select onValueChange={setPlugin} value={plugin}>
//           <SelectTrigger>
//             <SelectValue placeholder="Choose plugin" />
//           </SelectTrigger>
//           <SelectContent>
//             {app.general.ingest.map(obj => (
//               <SelectItem key={obj.plugin} value={obj.plugin}>{obj.plugin}</SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//         <FilenameSelection />
//         <MethodSelection />
//       </div>
//       <Card>
//         <div className={s.context}>
//           <p className={cn(!isExistingContextChooserAvalable && s.available)}>New context</p>
//           <Switch checked={isExistingContextChooserAvalable} onCheckedChange={setIsExistingContextChooserAvalable} />
//           <p className={cn(isExistingContextChooserAvalable && s.available)}>Choose from existing one</p>
//         </div>
//         {isExistingContextChooserAvalable
//           ? <ContextSelection />
//           : <Input value={context} onChange={e => setContext(e.target.value)} placeholder='Context name' />}
//       </Card>
//       <Button variant={files?.length && context && plugin && filename && hasMethod() ? 'default' : 'disabled'} onClick={submit} img={ui('check/check')} className={s.done}>Done</Button>
//     </Banner>
//   )
// }