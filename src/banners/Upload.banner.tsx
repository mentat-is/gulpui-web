import { useApplication } from '@/context/Application.context'
import { Banner } from '@/ui/Banner'
import { Input } from '@impactium/components'
import { Select } from '@/ui/Select'
import { useEffect, useState, useCallback, useMemo, ChangeEvent } from 'react'
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


namespace UploadLogic {
  export const useFileSettings = (files: FileList) => {
    const [settings, setSettings] = useState<Record<string, FileEntity.Settings>>({})

    const updateSettings = useCallback(
      (filename: string, update: Partial<FileEntity.Settings>) => {
        setSettings(prev => ({
          ...prev,
          [filename]: { ...prev[filename], ...update }
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
      ;[...files].forEach(file => {
        detectFileType(file).then(plugin => {
          if (plugin) {
            updateSettings(file.name, { plugin })
          }
        })
      })
    }, [files])

    return { settings, updateSettings }
  }

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
}

namespace Components {
  export const ContextSelector = ({ app, context, setContext }: {
    app: any
    context: string
    setContext: (value: string) => void
  }) => {
    const contexts = Operation.contexts(app)

    return (
      <Select.Root value={context} onValueChange={setContext} disabled={!contexts.length}>
        <Select.Trigger className={s.trigger}>
          <Stack>
            <Icon name={Context.icon(Context.findByName(app, context) ?? {} as λContext)} />
            <p>{context || 'Select context'}</p>
          </Stack>
        </Select.Trigger>
        <Select.Content>
          {contexts.map(c => (
            <Select.Item key={c.name} value={c.name}>{c.name}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }

  export const FilePreview = ({ file, settings, updateSettings }: {
    file: File
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
  }) => {
    const { app } = useApplication();
    const methods = Mapping.methods(app, settings.plugin || '')
    const mappings = Mapping.mappings(app, settings.plugin || '', settings.method || '')

    useEffect(() => {
      if (methods.length === 1) updateSettings({ method: methods[0] })
      if (mappings.length === 1) updateSettings({ mapping: mappings[0] })
    }, [methods, mappings])

    return (
      <Stack className={s.filePreview} gap={16}>
        <Stack>
          <Icon name="File" size={14} fromGeist />
          <p className={s.weight}>{formatBytes(file.size)}</p>
          <Popover>
            <PopoverTrigger asChild>
              <p className={s.filename}>{file.name}</p>
            </PopoverTrigger>
            <PopoverContent className={s.popover}>{file.name}</PopoverContent>
          </Popover>
        </Stack>
        <Stack gap={0}>
          <Separator orientation="vertical" style={{ height: 28 }} color="var(--gray-400)" />
          <PluginSelector {...{ settings, updateSettings, app }} />
          <Separator orientation="vertical" style={{ height: 28 }} color="var(--gray-400)" />
          <MethodSelector {...{ settings, updateSettings, app, methods }} />
          <Separator orientation="vertical" style={{ height: 28 }} color="var(--gray-400)" />
          <MappingSelector {...{ settings, updateSettings, mappings }} />
        </Stack>
      </Stack>
    )
  }

  const PluginSelector = ({ settings, updateSettings, app }: {
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
    app: any
  }) => (
    <Select.Root
      value={settings.plugin}
      onValueChange={plugin => updateSettings({ plugin })}
    >
      <Select.Trigger>
        <Select.Value placeholder="Select plugin">
          {settings.plugin}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {Mapping.plugins(app).map(p => (
          <Select.Item key={p} value={p}>{p}</Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )

  const MethodSelector = ({ settings, updateSettings, methods }: {
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
    methods: string[]
  }) => (
    <Select.Root
      value={settings.method}
      onValueChange={method => updateSettings({ method })}
      disabled={methods.length < 2}
    >
      <Select.Trigger>
        <Select.Value placeholder={methods.length ? "Select method" : "No methods"}>
          {settings.method}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {methods.map(m => (
          <Select.Item key={m} value={m}>{m}</Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )

  const MappingSelector = ({ settings, updateSettings, mappings }: {
    settings: FileEntity.Settings
    updateSettings: (update: Partial<FileEntity.Settings>) => void
    mappings: string[]
  }) => (
    <Select.Root
      value={settings.mapping}
      onValueChange={mapping => updateSettings({ mapping })}
      disabled={mappings.length < 2}
    >
      <Select.Trigger>
        <Select.Value placeholder={mappings.length ? "Select mapping" : "No mappings"}>
          {settings.mapping}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {mappings.map(m => (
          <Select.Item key={m} value={m}>{m}</Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

export function UploadBanner() {
  const { Info, app, spawnBanner } = useApplication()
  const [files, setFiles] = useState<FileList>([] as unknown as FileList)
  const [context, setContext] = useState<FileEntity.IngestOptions['context']>('')
  const [loading, setLoading] = useState(false)
  const [useExistingContext, setUseExistingContext] = useState(false)
  const [chunkSize, setChunkSize] = useState(2)
  const [customFrame, setCustomFrame] = useState(false)
  const [frame, setFrame] = useState<FileEntity.IngestOptions['frame']>(MinMaxBase)

  const { settings, updateSettings } = UploadLogic.useFileSettings(files)

  const handleSubmit = useCallback(async () => {
    setLoading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      Info.file_ingest({
        context,
        file,
        start: 0,
        size: chunkSize,
        index: i,
        settings: settings[file.name],
        frame: customFrame ? frame : undefined
      })
    }

    await Info.sync()

    setLoading(false)

    spawnBanner(<SelectFiles.Banner />)
  }, [files, settings, context, chunkSize, customFrame, frame])

  const isValidSettings = Object.values(settings).every(s =>
    s.plugin &&
    (!Mapping.methods(app, s.plugin).length || s.method) &&
    (!Mapping.mappings(app, s.plugin, s.method!).length || s.mapping)
  )

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

  const chunkSizeInputChangeHandler = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { valueAsNumber } = event.target

    if (isNaN(valueAsNumber)) {
      return toast('Chunk size should be valid integer')
    }

    if (valueAsNumber < 1 || valueAsNumber > 1024) {
      return toast('Chunk size should be bigger than 1 and less than 1024')
    }
  }

  return (
    <Banner
      title="Upload files"
      done={DoneButton

      }>
      <Toggle
        option={['New context', 'Existing context']}
        checked={useExistingContext}
        onCheckedChange={setUseExistingContext}
      />
      {useExistingContext ? (
        <Components.ContextSelector app={app} context={context} setContext={setContext} />
      ) : (
        <Input
          variant="highlighted"
          img={Default.Icon.CONTEXT}
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="Context name"
        />
      )}
      <Stack>
        <Input
          variant="highlighted"
          type="file"
          multiple
          onChange={e => setFiles(e.target.files || {} as FileList)}
        />
        <Button variant="outline" className={s.addFiles} img="Plus">
          Add files
        </Button>
      </Stack>
      <Toggle
        option={['Ingest everything', 'Use limits']}
        checked={customFrame}
        onCheckedChange={setCustomFrame}
      />
      {customFrame ? (
        <Stack>
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
      ) : null}
      <Input
        variant="highlighted"
        type="number"
        onChange={chunkSizeInputChangeHandler}
        value={chunkSize}
        img="DataPoint"
        valid={chunkSize >= 1 && chunkSize <= 1024}
      />
      <Stack dir="column" gap={0} className={cn(s.files, !files.length && s.fill)}>
        {files.length ? [...files].map((file, i) => (
          <Components.FilePreview
            key={i}
            file={file}
            settings={settings[file.name] || {}}
            updateSettings={(update) => updateSettings(file.name, update)}
          />
        )) : <Placeholder />}
      </Stack>
    </Banner>
  )
}

function Placeholder() {
  return (
    <Stack>
      <Icon name="FileScan" />
      <p>Choose files to upload</p>
    </Stack>
  )
}