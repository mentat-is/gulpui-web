import { useApplication } from '@/context/Application.context'
import { Banner } from '@/ui/Banner'
import { Spinner } from '@impactium/components'
import { Select } from '@/ui/Select'
import { useEffect, useState, useCallback, useMemo, ChangeEvent, useRef } from 'react'
import s from './styles/UploadBanner.module.css'
import { Context, FileEntity, GulpDataset, Mapping, MinMax, MinMaxBase, Operation } from '@/class/Info'
import { formatBytes } from '@/ui/utils'
import { SelectFiles } from './SelectFiles.banner'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover'
import { Button, Stack } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { Toggle } from '@/ui/Toggle'
import { Separator } from '@/ui/Separator'
import { cn } from '@impactium/utils'
import { Default, λContext } from '@/dto/Dataset'
import { toast } from 'sonner'
import { SetState } from '@/class/API'
import { Progress as UIProgress } from '@/ui/Progress';
import { Table } from '@/components/Table'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { CustomParameters } from '@/components/CustomParameters'
import { Input } from '@/ui/Input'
import { Checkbox } from '@/ui/Checkbox'
import { Label } from '@/ui/Label'

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

namespace Components {
  export const ContextSelector = ({ app, context, setContext }: {
    app: any
    context: string
    setContext: (value: string) => void
  }) => {
    const contexts = Operation.contexts(app)

    return (
      <Stack dir='column' gap={6} ai='flex-start'>
        <Label value='Context' />
        <Select.Root value={context} onValueChange={setContext} disabled={!contexts.length}>
          <Select.Trigger className={s.trigger}>
            <Icon name={Context.icon(Context.findByName(app, context)!)} />
            <p>{context || 'Select context'}</p>
          </Select.Trigger>
          <Select.Content>
            {contexts.map(c => (
              <Select.Item key={c.name} value={c.name}>
                <Icon name={Context.icon(c)} />
                {c.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Stack>
    )
  }

  export const FilePreview = ({ file, settings, updateSettings, progress }: {
    file: File
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
    progress: number | undefined
  }) => {
    const { Info, app } = useApplication();
    const [preview, setPreview] = useState<λEvent[] | null>(null);

    const methods = Mapping.methods(app, settings.plugin)
    const mappings = Mapping.mappings(app, settings.plugin, settings.method)

    useEffect(() => {
      if (!settings.plugin) {
        return
      }

      if (methods.length === 0) {
        updateSettings({
          method: undefined
        })
      } else if (methods.length === 1) {
        updateSettings({
          method: methods[0]
        })
      } else if (settings.method !== undefined && !methods.includes(settings.method)) {
        updateSettings({
          method: undefined
        })
      }
    }, [settings.plugin])

    useEffect(() => {
      if (!settings.plugin) {
        return
      }

      if (mappings.length === 0 || !settings.method) {
        updateSettings({
          mapping: undefined
        })
      } else if (mappings.length === 1) {
        updateSettings({
          mapping: mappings[0]
        })
      } else if (settings.mapping && !mappings.includes(settings.mapping)) {
        updateSettings({
          mapping: undefined
        })
      }
    }, [settings.method])

    const loadPreview = async () => {
      const preview = await Info.file_ingest({
        preview: true,
        context: 'context',
        file,
        settings,
        size: 0
      })

      setPreview(preview ?? null);
    }

    const setCustomParameters = (custom_parameters: Record<string, any>) => {
      updateSettings({ custom_parameters });
    }

    return (
      <Stack className={s.filePreview} gap={0} pos='relative'>
        {progress && <Progress value={progress} />}
        <Icon name="File" size={14} fromGeist />
        <p className={s.weight}>{formatBytes(file.size)}</p>
        <Popover>
          <PopoverTrigger asChild>
            <p className={s.filename}>{file.name}</p>
          </PopoverTrigger>
          <PopoverContent className={s.popover}>{file.name}</PopoverContent>
        </Popover>
        <Separator orientation="vertical" style={{ height: 28 }} color="var(--gray-400)" />
        <PluginSelector settings={settings} updateSettings={updateSettings} />
        <Separator orientation="vertical" style={{ height: 28 }} color="var(--gray-400)" />
        <MethodSelector settings={settings} updateSettings={updateSettings} methods={methods} />
        <Separator orientation="vertical" style={{ height: 28 }} color="var(--gray-400)" />
        <MappingSelector settings={settings} updateSettings={updateSettings} mappings={mappings} />
        {(app.target.plugins.find(p => p.filename === settings.plugin)?.custom_parameters.length ?? 0) > 0 &&
          <Popover>
            <PopoverTrigger asChild>
              <Button img='Settings' size='sm' style={{ width: 24 }} variant='ghost' />
            </PopoverTrigger>
            <PopoverContent>
              <CustomParameters.Editor plugin={app.target.plugins.find(p => p.filename === settings.plugin)!} customParameters={settings.custom_parameters} setCustomParameters={setCustomParameters} />
            </PopoverContent>
          </Popover>
        }
        <Popover onOpenChange={o => o && loadPreview()}>
          <PopoverTrigger asChild>
            <Button img='PreviewDocument' size='sm' style={{ width: 24 }} variant='ghost' />
          </PopoverTrigger>
          <PopoverContent style={{ maxHeight: '50vh', maxWidth: '50vw', overflow: 'auto' }}>
            {preview ? <Table style={{ overflow: 'visible', width: 'fit-content' }} values={preview} /> : <Spinner style={{ width: 'fit-content', whiteSpace: 'nowrap' }} />}
          </PopoverContent>
        </Popover>
      </Stack>
    )
  }

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
    const { app } = useApplication();

    const plugins = Mapping.plugins(app);

    const cutExtension = useCallback((str: string) => {
      return str.split('.').slice(0, -1).join('')
    }, []);

    return (
      <Select.Root
        value={settings.plugin}
        onValueChange={plugin => updateSettings({ plugin })}
      >
        <Select.Trigger className={s.select}>
          <Select.Value placeholder="Select plugin">
            <p>{settings.plugin ? cutExtension(settings.plugin) : plugins.length > 0 ? 'Select plugin' : 'No plugins'}</p>
          </Select.Value>
        </Select.Trigger>
        <Select.Content>
          {plugins.map(p => (
            <Select.Item key={p} value={p}>{cutExtension(p)}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }

  const MethodSelector = ({ settings, updateSettings, methods }: {
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
    methods: string[]
  }) => {
    return methods.length > 0 ? (
      <Select.Root value={settings.method} onValueChange={method => updateSettings({ method })}>
        <Select.Trigger className={s.select}>
          <p>{settings.method ? settings.method : methods.length > 0 ? 'Select method' : '-'}</p>
        </Select.Trigger>
        <Select.Content>
          {methods.map(m => (
            <Select.Item key={m} value={m}>{m}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    ) : null
  }

  const MappingSelector = ({ settings, updateSettings, mappings }: {
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
    mappings: string[]
  }) => mappings.length > 0 ? (
    <Select.Root
      value={settings.mapping}
      onValueChange={mapping => updateSettings({ mapping })}
    >
      <Select.Trigger className={s.select}>
        <p>{settings.mapping ? settings.mapping : mappings.length > 0 ? 'Select mapping' : (settings.method ? 'No mappings' : '-')}</p>
      </Select.Trigger>
      <Select.Content>
        {mappings.map(m => (
          <Select.Item key={m} value={m}>{m}</Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
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
      <Stack className={s.frame_selector}>
        <Input
          variant="highlighted"
          type="date"
          img="CalendarArrowUp"
          onChange={frameMinInputChangeHandler}
        />
        <Input
          variant="highlighted"
          type="date"
          img="CalendarArrowDown"
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
    const { app } = useApplication();

    useEffect(() => {
      if (!settings.all) {
        settings.all = {
          custom_parameters: {}
        }
      }
    }, [settings]);

    const methods = Mapping.methods(app, settings.all?.plugin)
    const mappings = Mapping.mappings(app, settings.all?.plugin, settings.all?.method)

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
      <Popover>
        <PopoverTrigger asChild>
          <Button style={{ width: '100%' }} variant='secondary' img='SettingsGear'>Select settings for all files</Button>
        </PopoverTrigger>
        <PopoverContent>
          <Stack className={s.allSettings} gap={0}>
            <PluginSelector settings={settings.all} updateSettings={(s) => updateSettings('all', s)} />
            <Separator orientation='vertical' style={{ height: 32 }} />
            <MethodSelector settings={settings.all} updateSettings={(s) => updateSettings('all', s)} methods={methods} />
            <Separator orientation='vertical' style={{ height: 32 }} />
            <MappingSelector settings={settings.all} updateSettings={(s) => updateSettings('all', s)} mappings={mappings} />
            <Separator orientation='vertical' style={{ height: 32 }} />
            <Button variant='hardline' style={{ borderRadius: 2 }} img='Check' onClick={() => setSettings(settings.all)}>Apply!</Button>
          </Stack>
        </PopoverContent>
      </Popover>
    )
  }
}

export function UploadBanner() {
  const { Info, app, destroyBanner } = useApplication()
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
        size: 8,
        settings: settings[file.name],
        setProgress: setFileProgressConstrustor(file),
        frame: customFrame ? frame : undefined
      })
    }

    setLoading(false)

    destroyBanner()
  }, [files, settings, context, customFrame, frame])

  const isValidSettings = Object.keys(settings).every(k => {
    if (k === 'all') {
      return true;
    }
    const s = settings[k];

    return s.plugin && (!Mapping.methods(app, s.plugin).length || s.method) && (!Mapping.mappings(app, s.plugin, s.method!).length || s.mapping);
  })

  const DoneButton = useMemo(() => {
    return (
      <Button
        variant="glass"
        onClick={handleSubmit}
        img="Check"
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

    arr.filter(f => ![...files].some(fx => fx.webkitRelativePath === f.webkitRelativePath))

    setFiles(f => [...f, ...arr]);
  };

  return (
    <Banner
      title="Ingest files"
      done={DoneButton}>
      <Stack dir='column' ai='stretch'>
        {newContext ? (
          <Input
            variant="highlighted"
            label='Context'
            img={Default.Icon.CONTEXT}
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Context name"
            className={s.reset_font}
          />
        ) : (
          <Components.ContextSelector app={app} context={context} setContext={setContext} />
        )}
        <Stack ai='center' gap={4}>
          <Checkbox id='newContext' checked={newContext} onCheckedChange={e => setNewContext(!!e)} />
          <Label htmlFor='newContext' value='Create new context' cursor='pointer' />
        </Stack>
      </Stack>
      <Toggle
        option={['Ingest everything', 'Use limits']}
        checked={customFrame}
        onCheckedChange={setCustomFrame}
      />
      <Components.FrameSelector setFrame={setFrame} isCustomFrame={customFrame} />
      <Stack dir="column" gap={0} className={cn(s.files, !files.length && s.fill)} onClick={() => files.length === 0 ? addFilesButtonClickHandler() : null}>
        {files.length ? [...files].map((file, i) => (
          <Components.FilePreview
            key={i}
            file={file}
            settings={settings[file.name] || {}}
            progress={progress[file.name]}
            updateSettings={(update) => updateSettings(file.name, update)}
          />
        )) : <Placeholder />}
      </Stack>
      <Stack>
        <Components.ApplySettinsForAllFiles settings={settings} updateSettings={updateSettings} setSettings={updateAllSettings} />
        <Button variant="secondary" img="Cross" onClick={() => setFiles([])}>
          Clear selection
        </Button>
      </Stack>
      <Input
        className={s.sr_only}
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Banner>
  )
}

function Placeholder({ className, ...props }: Stack.Props) {
  return (
    <Stack {...props}>
      <Icon name="FileScan" />
      <p>Click here to select files</p>
    </Stack>
  )
}

export function UploadDoneBanner() {
  const { destroyBanner } = useApplication()

  return (
    <Banner fixed>
      <Stack style={{ padding: 32 }} dir='column' flex gap={12}>
        <Icon name='CheckCircle' size={64} style={{ marginBottom: 12 }} strokeWidth='2px !important' fromGeist />
        <p style={{ fontSize: 24 }}>Upload done, gULP is still processing the data</p>
        <span style={{ color: 'var(--text-dimmed)' }}>It can take up to 10 minutes, depending on CPU speed.</span>
        <span style={{ color: 'var(--text-dimmed)' }}>You will see a notification when it would be done.</span>
        <Button style={{ gap: 12, marginTop: 24 }} size='lg' rounded revert img='ChevronCircleRightFill' onClick={destroyBanner}>Got it!</Button>
      </Stack>
    </Banner>
  )
}