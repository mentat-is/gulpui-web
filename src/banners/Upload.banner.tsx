import { Application } from '@/context/Application.context'
import { Banner } from '@/ui/Banner'
import { Select } from '@/ui/Select'
import { useEffect, useState, useCallback, useMemo, ChangeEvent, useRef } from 'react'
import s from './styles/UploadBanner.module.css'
import { MinMax, MinMaxBase } from '@/class/Info'
import { formatBytes, Refractor } from '@/ui/utils'
import { SelectFiles } from './SelectFiles.banner'
import { Popover } from '@/ui/Popover'
import { Icon } from '@impactium/icons'
import { Toggle } from '@/ui/Toggle'
import { Separator } from '@/ui/Separator'
import { cn } from '@impactium/utils'
import { Default } from '@/dto/Dataset'
import { toast } from 'sonner'
import { SetState } from '@/class/API'
import { Progress as UIProgress } from '@/ui/Progress';
import { Table } from '@/components/Table'
import { CustomParameters } from '@/components/CustomParameters'
import { Input } from '@/ui/Input'
import { Checkbox } from '@/ui/Checkbox'
import { Label } from '@/ui/Label'
import { Stack } from '@/ui/Stack'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { Context } from '@/entities/Context'
import { Operation } from '@/entities/Operation'
import { Doc } from '@/entities/Doc'
import { Mapping } from '@/entities/Mapping'
import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'

export namespace FileEntity {
  export interface IngestOptions {
    context: Context.Id | string
    file: any;
    frame?: MinMax;
    settings: FileEntity.Settings;
    setProgress?: (num: number) => void;
    preview_mode?: boolean;
  }

  export interface Settings {
    plugin?: string;
    method?: string;
    mapping?: string;
    offset: number;
    custom_parameters: Record<string, any>;
  }
}

const FILE_SIGNATURES: Record<string, Uint8Array[]> = {
  'win_evtx.py': [new Uint8Array([0x45, 0x6c, 0x66, 0x46, 0x69, 0x6c, 0x65])],
  'systemd_journal.py': [
    new Uint8Array([0x4c, 0x50, 0x4b, 0x53, 0x48, 0x48, 0x52, 0x48]),
  ],
  'sqlite.py': [
    new Uint8Array([
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72,
    ]),
  ],
  'pcap.py': [
    new Uint8Array([0x0a, 0x0d, 0x0d, 0x0a]),
    new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]),
    new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]),
    new Uint8Array([0xa1, 0xb2, 0x3c, 0x4d]),
    new Uint8Array([0x4d, 0x3c, 0xb2, 0xa1]),
  ],
  'win_reg.py': [new Uint8Array([0x72, 0x65, 0x67, 0x66])],
  'win_pe.py': [new Uint8Array([0x4d, 0x5a])],
  'zip.py': [
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    new Uint8Array([0x50, 0x4b, 0x07, 0x08]),
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ],
}

let MAX_BYTE_LENGTH = 0

Object.values(FILE_SIGNATURES).forEach((array) => {
  array.forEach((entity) => {
    MAX_BYTE_LENGTH = Math.max(entity.length, MAX_BYTE_LENGTH)
  })
})

const FilesList = React.memo(function FilesList(props: {
  files: File[]
  setFiles: SetState<File[]>
  settings: Record<string, FileEntity.Settings>
  progress: Record<string, number>
  updateSettings: (filename: string, update: Partial<FileEntity.Settings>) => void
}) {
  const { files, settings, progress, updateSettings } = props

  return (
    <>
      {files.map((file, i) => (
        <FilePreview
          key={file.name || i}
          file={file}
          setFiles={props.setFiles}
          settings={settings[file.name] || { custom_parameters: {} }}
          progress={progress[file.name]}
          updateSettings={update => updateSettings(file.name, update)}
        />
      ))}
    </>
  )
})

export const ContextSelector = ({ app, context, setContext }: {
  app: any
  context: string
  setContext: (value: string) => void
}) => {
  const contexts = Operation.Entity.contexts(app);

  return (
    <Stack dir='column' gap={6} ai='flex-start'>
      <Label value='Context' />
      <Select.Root value={context} onValueChange={setContext} disabled={!contexts.length}>
        <Select.Trigger>
          <Icon name={Context.Entity.icon(Context.Entity.findByName(app, context)!)} />
          {context || 'Select context'}
        </Select.Trigger>
        <Select.Content>
          {contexts.map(c => (
            <Select.Item key={c.name} value={c.name}>
              <Icon name={Context.Entity.icon(c)} />
              {c.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Stack>
  )
}

export const FilePreview = React.memo(({ file, settings, updateSettings, progress, setFiles }: {
  file: File
  settings: FileEntity.Settings
  updateSettings: (update: Partial<FileEntity.Settings>) => void
  progress: number | undefined
  setFiles: SetState<File[]>
}) => {
  const { Info, app } = Application.use()
  const [preview, setPreview] = useState<Doc.Type[] | null>(null)

  const methods = useMemo(
    () => Mapping.Entity.methods(app, settings.plugin),
    [app, settings.plugin],
  )

  const mappings = useMemo(
    () => Mapping.Entity.mappings(app, settings.plugin, settings.method),
    [app, settings.plugin, settings.method],
  )

  useEffect(() => {
    if (!settings.plugin) return

    if (methods.length === 0) {
      updateSettings({ method: undefined })
    } else if (methods.length === 1) {
      updateSettings({ method: methods[0] })
    } else if (settings.method !== undefined && !methods.includes(settings.method)) {
      updateSettings({ method: undefined })
    }
  }, [settings.plugin, methods])

  useEffect(() => {
    if (!settings.plugin) return

    if (mappings.length === 0 || !settings.method) {
      updateSettings({ mapping: undefined })
    } else if (mappings.length === 1) {
      updateSettings({ mapping: mappings[0] })
    } else if (settings.mapping && !mappings.includes(settings.mapping)) {
      updateSettings({ mapping: undefined })
    }
  }, [settings.method, mappings])


  const loadPreview = async () => {
    const preview = await Info.file_ingest({
      preview_mode: true,
      context: 'context',
      file,
      settings
    })

    setPreview(preview ?? null);
  }

  const setCustomParameters = (custom_parameters: Record<string, any>) => {
    updateSettings({ custom_parameters });
  }

  const fileOffsetInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const offset = parseInt(event.currentTarget.value);
    if (Number.isNaN(offset)) {
      return;
    }

    updateSettings({ offset })
  }

  return (
    <Stack className={s.filePreview} gap={0} flex={0} pos='relative'>
      {progress && <Progress value={progress} />}
      <Icon name={Default.Icon.SOURCE} />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={s.filename}>{file.name}</p>
          </TooltipTrigger>
          <TooltipContent>
            {file.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Popover.Root onOpenChange={o => o && loadPreview()}>
        <Popover.Trigger asChild>
          <Button icon='PreviewDocument' variant='tertiary' />
        </Popover.Trigger>
        <Popover.Content style={{ maxHeight: '50vh', maxWidth: '50vw', overflow: 'auto' }}>
          {preview ? <Table style={{ overflow: 'visible', width: 'fit-content' }} values={Array.isArray(preview) ? preview : []} /> : <Spinner style={{ width: 'fit-content', whiteSpace: 'nowrap' }} />}
        </Popover.Content>
      </Popover.Root>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button icon='Settings' variant='tertiary' />
        </Popover.Trigger>
        <Popover.Content style={{ overflow: 'auto', maxHeight: '50vh' }}>
          <Stack dir='column' ai='stretch'>
            <Input value={settings.offset} onChange={fileOffsetInputChangeHandler} icon='LayoutShift' variant='highlighted' placeholder='0 milliseconds' label='Offset' />
            <PluginSelector settings={settings} updateSettings={updateSettings} />
            <MethodSelector settings={settings} updateSettings={updateSettings} methods={methods} />
            <MappingSelector settings={settings} updateSettings={updateSettings} mappings={mappings} />
            <CustomParameters.Editor plugin={app.target.plugins.find(p => p.filename === settings.plugin)!} customParameters={settings.custom_parameters} setCustomParameters={setCustomParameters} />
          </Stack>
        </Popover.Content>
      </Popover.Root>
      <Button icon='X' variant='tertiary' shape='icon' onClick={() => setFiles(sources => sources.filter(source => source.name !== file.name))} />
    </Stack>
  )
})

const Progress = ({ value }: {
  value: number
}) => {
  return (
    <Stack className={s.progress} pos='absolute'>
      <UIProgress className={s.bar} background='var(--green-800)' color='var(--green-800)' value={value} />
    </Stack>
  )
}

const PluginSelector = ({ settings, updateSettings }: {
  settings: FileEntity.Settings
  updateSettings: (update: Partial<FileEntity.Settings>) => void
}) => {
  const { app } = Application.use();

  const plugins = Mapping.Entity.plugins(app);

  const cutExtension = useCallback((str: string) => {
    return str.split('.').slice(0, -1).join('')
  }, []);

  return (
    <Stack dir='column' gap={6} ai='flex-start' data-input>
      <Label value='Plugin' />
      <Select.Root
        value={settings.plugin}
        onValueChange={plugin => updateSettings({ plugin })}
      >
        <Select.Trigger className={s.select}>
          <Icon name='Puzzle' />
          {settings.plugin ? cutExtension(settings.plugin) : plugins.length > 0 ? 'Select plugin' : 'No plugins'}
        </Select.Trigger>
        <Select.Content>
          {plugins.map(p => (
            <Select.Item key={p} value={p}>{cutExtension(p)}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Stack>
  )
}

const MethodSelector = ({ settings, updateSettings, methods }: {
  settings: FileEntity.Settings
  updateSettings: (update: Partial<FileEntity.Settings>) => void
  methods: string[]
}) => {
  return methods.length > 0 ? (
    <Stack dir='column' gap={6} ai='flex-start' data-input>
      <Label value='Mapping File' />
      <Select.Root value={settings.method} onValueChange={method => updateSettings({ method })}>
        <Select.Trigger className={s.select}>
          <Icon name='ChevronRight' />
          {settings.method ? settings.method : methods.length > 0 ? 'Select method' : '-'}
        </Select.Trigger>
        <Select.Content>
          {methods.map(m => (
            <Select.Item key={m} value={m}>{m}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Stack>
  ) : null
}

const MappingSelector = ({ settings, updateSettings, mappings }: {
  settings: FileEntity.Settings
  updateSettings: (update: Partial<FileEntity.Settings>) => void
  mappings: string[]
}) => mappings.length > 0 ? (
  <Stack dir='column' gap={6} ai='flex-start' data-input>
    <Label value='Mapping ID' />
    <Select.Root
      value={settings.mapping}
      onValueChange={mapping => updateSettings({ mapping })}
    >
      <Select.Trigger className={s.select}>
        <Icon name='ChevronRight' />
        {settings.mapping ? settings.mapping : mappings.length > 0 ? 'Select mapping' : (settings.method ? 'No mappings' : '-')}
      </Select.Trigger>
      <Select.Content>
        {mappings.map(m => (
          <Select.Item key={m} value={m}>{m}</Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  </Stack>
) : null

export const FrameSelector = ({ isCustomFrame, setFrame }: {
  isCustomFrame: boolean,
  setFrame: SetState<FileEntity.IngestOptions['frame']>
}) => {
  if (!isCustomFrame) {
    return null;
  }

  const frameInputChangeHandler = (
    event: ChangeEvent<HTMLInputElement>,
    type: keyof MinMax,
  ) => {
    const value = event.target.valueAsDate

    if (!value) {
      toast.error('Date is not valid', {
        richColors: true,
      })
      return
    }

    setFrame((f) => ({
      ...f!,
      [type]: value.valueOf(),
    }))
  }

  const frameMinInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) =>
    frameInputChangeHandler(event, 'min')

  const frameMaxInputChangeHandler = (event: ChangeEvent<HTMLInputElement>) =>
    frameInputChangeHandler(event, 'max')

  return (
    <Stack gap={12} className={s.frame_selector}>
      <Input
        variant="highlighted"
        type="date"
        icon="CalendarArrowUp"
        onChange={frameMinInputChangeHandler}
      />
      <Input
        variant="highlighted"
        type="date"
        icon="CalendarArrowDown"
        onChange={frameMaxInputChangeHandler}
      />
    </Stack>
  )
}

export const ApplySettinsForAllFiles = ({ settings, updateSettings, setSettings }: {
  settings: Record<string, FileEntity.Settings>,
  updateSettings: any,
  setSettings: (s: FileEntity.Settings) => void
}) => {
  const { app } = Application.use();

  useEffect(() => {
    if (!settings.all) {
      settings.all = {
        offset: 0,
        custom_parameters: {}
      }
    }
  }, [settings]);

  const methods = Mapping.Entity.methods(app, settings.all?.plugin)
  const mappings = Mapping.Entity.mappings(app, settings.all?.plugin, settings.all?.method)

  useEffect(() => {
    if (!settings.all?.plugin) {
      return
    }

    if (methods.length === 0) {
      updateSettings('all', {
        method: undefined
      })
    } else if (methods.length === 1) {
      updateSettings('all', {
        method: methods[0]
      })
    } else if (settings.all?.method !== undefined && !methods.includes(settings.all?.method)) {
      updateSettings('all', {
        method: undefined
      })
    }
  }, [settings.all?.plugin])

  useEffect(() => {
    if (!settings.all?.plugin) {
      return
    }

    if (mappings.length === 0 || !settings.all?.method) {
      updateSettings('all', {
        mapping: undefined
      })
    } else if (mappings.length === 1) {
      updateSettings('all', {
        mapping: mappings[0]
      })
    } else if (settings.all?.mapping && !mappings.includes(settings.all?.mapping)) {
      updateSettings('all', {
        mapping: undefined
      })
    }
  }, [settings.all?.method])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button style={{ width: '100%' }} variant='secondary' icon='Settings'>Select settings for all files</Button>
      </Popover.Trigger>
      <Popover.Content>
        <Stack className={s.allSettings} gap={0}>
          <PluginSelector settings={settings?.all || {}} updateSettings={(s) => updateSettings('all', s)} />
          <Separator orientation='vertical' style={{ height: 32 }} />
          <MethodSelector settings={settings?.all || {}} updateSettings={(s) => updateSettings('all', s)} methods={methods} />
          <Separator orientation='vertical' style={{ height: 32 }} />
          <MappingSelector settings={settings?.all || {}} updateSettings={(s) => updateSettings('all', s)} mappings={mappings} />
          <Separator orientation='vertical' style={{ height: 32 }} />
          <Button variant='tertiary' style={{ borderRadius: 2 }} icon='Check' onClick={() => setSettings(settings.all)}>Apply!</Button>
        </Stack>
      </Popover.Content>
    </Popover.Root>
  )
}

export function UploadBanner() {
  const { Info, app, spawnBanner } = Application.use()
  const [files, setFiles] = useState<File[]>([])
  const [context, setContext] = useState<FileEntity.IngestOptions['context']>('')
  const [loading, setLoading] = useState(false)
  const [newContext, setNewContext] = useState(true)
  const [customFrame, setCustomFrame] = useState(false)
  const [frame, setFrame] = useState<FileEntity.IngestOptions['frame']>(MinMaxBase)

  useEffect(() => {
    setContext('');
  }, [newContext])

  const [settings, setSettings] = useState<Record<string, FileEntity.Settings>>({})

  const updateSettings = useCallback(
    (filename: string, update: Partial<FileEntity.Settings>) => {
      setSettings(prev => ({
        ...prev,
        [filename]: { ...prev[filename], ...update, ...{} }
      }))
    },
    []
  )

  const detectFileType = useCallback((file: File) => {
    return readFileChunk(file)
      .then(buffer =>
        Object.keys(FILE_SIGNATURES)
          .find(key => FILE_SIGNATURES[key]
            .some(uint => compareSignature(buffer, uint))))
  }, [])

  useEffect(() => {
    files.forEach(file => {
      detectFileType(file).then(plugin => {
        updateSettings(file.name, {
          plugin: plugin || 'win_evtx.py',
          custom_parameters: {}
        })
      })
    })
  }, [files])

  const readFileChunk = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(file.slice(0, MAX_BYTE_LENGTH))
    })
  }

  const compareSignature = (buffer: ArrayBuffer, signature: Uint8Array): boolean => {
    const slice = new Uint8Array(buffer)
    return signature.every((value, index) => value === slice[index])
  }

  const [progress, setProgress] = useState<Record<string, number>>({});

  const setFileProgressConstrustor = (file: File) => (num: number) => {
    setProgress(p => ({
      ...p,
      [file.name]: num
    }))
  }

  const handleSubmit = useCallback(async () => {
    setLoading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      Info.file_ingest({
        context,
        file,
        settings: settings[file.name],
        setProgress: setFileProgressConstrustor(file),
        frame: customFrame ? frame : undefined
      })
    }

    setLoading(false)

    spawnBanner(<SelectFiles.Banner />)
  }, [files, settings, context, customFrame, frame])

  const isValidSettings = useMemo(() => {
    return Object.keys(settings).every(k => {
      if (k === 'all') return true
      const s = settings[k]
      if (!s) return false

      const methods = Mapping.Entity.methods(app, s.plugin)
      const mappings = Mapping.Entity.mappings(app, s.plugin, s.method!)

      return (
        !!s.plugin &&
        (!methods.length || !!s.method) &&
        (!mappings.length || !!s.mapping)
      )
    })
  }, [settings, app])


  const DoneButton = useMemo(() => {
    return (
      <Button
        variant="glass"
        onClick={handleSubmit}
        icon="Check"
        className={s.done}
        disabled={!context || !files.length || !isValidSettings}
        loading={loading}
      />
    )
  }, [context, handleSubmit, files, isValidSettings, loading])

  const updateAllSettings = async (newSettings: FileEntity.Settings) => {
    for (const setting in settings) {
      await new Promise((res) => {
        setTimeout(() => {
          res(updateSettings(setting, newSettings))
        }, 50);
      })
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesButtonClickHandler = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const arr = [...(event.target.files || [])];

    setFiles(files => {
      const sources = Refractor.array(...files);

      arr.forEach(source => {
        if (sources.every(s => s.name !== source.name)) {
          sources.push(source);
        }
      });

      return sources;
    });
  };

  return (
    <Banner
      className={s.banner}
      title="Ingest files"
      done={DoneButton}>
      <Toggle
        option={['Ingest everything', 'Use limits']}
        checked={customFrame}
        onCheckedChange={setCustomFrame}
      />
      <FrameSelector setFrame={setFrame} isCustomFrame={customFrame} />
      {files.length ? <Stack dir='column' className={cn(s.files, !files.length && s.fill)} onClick={() => files.length === 0 ? addFilesButtonClickHandler() : null} ai='stretch'>
        <Stack className={s.inner} gap={0} dir='column'>
          <FilesList
            files={files}
            setFiles={setFiles}
            settings={settings}
            progress={progress}
            updateSettings={updateSettings}
          />
        </Stack>
      </Stack> : null}
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        value={''}
        variant='highlighted'
        onChange={handleFileChange}
      />
      <Stack>
        <ApplySettinsForAllFiles settings={settings} updateSettings={updateSettings} setSettings={updateAllSettings} />
        <Button variant="secondary" icon="Cross" onClick={() => setFiles([])}>
          Clear selection
        </Button>
      </Stack>
      <Stack dir='column' ai='stretch'>
        {newContext ? (
          <Input
            variant="highlighted"
            label='Context'
            icon={Default.Icon.CONTEXT}
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Context name"
            className={s.reset_font}
          />
        ) : (
          <ContextSelector app={app} context={context} setContext={setContext} />
        )}
        <Stack ai='center' gap={4}>
          <Checkbox id='newContext' checked={newContext} onCheckedChange={e => setNewContext(!!e)} />
          <Label htmlFor='newContext' value='Create new context' cursor='pointer' />
        </Stack>
      </Stack>
    </Banner>
  )
}
