import { useEffect, useState, useMemo } from 'react'
import { Popover } from '@/ui/Popover'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { Label } from '@/ui/Label'
import { Input } from '@/ui/Input'
import { Checkbox } from '@/ui/Checkbox'
import { toast } from 'sonner'
import { Separator } from '@/ui/Separator'
import { Select } from '@/ui/Select'
import { Application } from '@/context/Application.context'
import { Mapping } from '@/entities/Mapping'
import { Icon } from '@impactium/icons'
import { MethodSelector, MappingSelector } from '@/banners/Upload.banner'
import { CustomParameters } from './CustomParameters'
import { SummaryTable } from './AdvancedPluginParams/SummaryTable'
import { MappingPanel, MappingData } from './AdvancedPluginParams/MappingPanel'
import { SigmaMappingPanel, SigmaMappingData } from './AdvancedPluginParams/SigmaMappingPanel'

import { Textarea } from '@/ui/Textarea'

/**
 * AdvancedPluginParams component provides a comprehensive UI for configuring 
 * complex plugin ingestion and query parameters beyond basic settings.
 * It manages state for global overrides, mapping configurations, sigma mappings, 
 * and custom parameters, providing a unified modal interface.
 */
interface AdvancedPluginParamsProps {
  pluginParams: Record<string, any>
  updatePluginParams: (params: Record<string, any>) => void
  plugin?: any
  showStoreFile?: boolean
  customParamsMode?: 'auto' | 'textarea'
  triggerText?: string
  triggerIcon?: any
  triggerVariant?: any
  applyText?: string
  onReset?: () => void
}

export function AdvancedPluginParams({
  pluginParams,
  updatePluginParams,
  plugin,
  showStoreFile,
  customParamsMode = 'auto',
  triggerText = 'Advanced',
  triggerIcon = 'Code',
  triggerVariant = 'tertiary',
  applyText = 'Apply Changes',
  onReset
}: AdvancedPluginParamsProps) {
  const { app } = Application.use()
  const [open, setOpen] = useState(false)

  // Global Settings
  const [overrideChunkSize, setOverrideChunkSize] = useState('')
  const [overrideAllowUnmappedFields, setOverrideAllowUnmappedFields] = useState(false)
  const [timestampOffsetMsec, setTimestampOffsetMsec] = useState('')
  const [storeFile, setStoreFile] = useState(false)
  
  // Mapping Parameters
  const [mappingFile, setMappingFile] = useState('')
  const [mappingId, setMappingId] = useState('')
  const [additionalMappingFiles, setAdditionalMappingFiles] = useState('')
  const [mappings, setMappings] = useState<MappingData[]>([])
  const [additionalMappings, setAdditionalMappings] = useState<MappingData[]>([])
  const [sigmaMappings, setSigmaMappings] = useState<SigmaMappingData[]>([])

  const methods = useMemo(() => plugin ? Mapping.Entity.methods(app, plugin.filename) : [], [app, plugin])
  const mappingsList = useMemo(() => plugin && mappingFile ? Mapping.Entity.mappings(app, plugin.filename, mappingFile) : [], [app, plugin, mappingFile])

  // Custom Parameters
  const [customParams, setCustomParams] = useState<any>({})

  // Panel States
  const [isMappingPanelOpen, setIsMappingPanelOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<MappingData | null>(null)
  const [editingMappingIndex, setEditingMappingIndex] = useState<number | null>(null)
  const [editingMappingType, setEditingMappingType] = useState<'mappings' | 'additional'>('mappings')

  const [isSigmaPanelOpen, setIsSigmaPanelOpen] = useState(false)
  const [editingSigma, setEditingSigma] = useState<SigmaMappingData | null>(null)
  const [editingSigmaIndex, setEditingSigmaIndex] = useState<number | null>(null)

  // Auto-selection logic: automatically sets the first available mapping file 
  // when a plugin is selected and no manual choice has been made.
  useEffect(() => {
    if (!plugin) return

    if (methods.length === 0) {
      setMappingFile('')
    } else if (methods.length === 1) {
      setMappingFile(methods[0])
    } else if (mappingFile && !methods.includes(mappingFile)) {
      setMappingFile('')
    }
  }, [plugin, methods])

  // Auto-selection logic: automatically sets the first available mapping ID 
  // when a mapping file is selected and no manual choice has been made.
  useEffect(() => {
    if (!plugin) return

    if (mappingsList.length === 0 || !mappingFile) {
      setMappingId('')
    } else if (mappingsList.length === 1) {
      setMappingId(mappingsList[0])
    } else if (mappingId && !mappingsList.includes(mappingId)) {
      setMappingId('')
    }
  }, [plugin, mappingFile, mappingsList])

  // Initializing local state from the passed pluginParams prop when the modal opens.
  // This ensures the UI reflects current configuration values.
  useEffect(() => {
    if (open) {
      setOverrideChunkSize(pluginParams?.override_chunk_size !== undefined ? String(pluginParams.override_chunk_size) : '')
      setOverrideAllowUnmappedFields(pluginParams?.override_allow_unmapped_fields || false)
      setTimestampOffsetMsec(pluginParams?.offset !== undefined && pluginParams?.offset !== 0 ? String(pluginParams.offset) : '')
      setStoreFile(pluginParams?.store_file || false)
      
      const currentMethods = plugin ? Mapping.Entity.methods(app, plugin.filename) : []

      let initMappingFile = pluginParams?.method || ''
      if (!initMappingFile && currentMethods.length === 1) {
        initMappingFile = currentMethods[0]
      }
      setMappingFile(initMappingFile)

      let initMappingId = pluginParams?.mapping || ''
      if (!initMappingId) {
        const currentMappings = plugin && initMappingFile ? Mapping.Entity.mappings(app, plugin.filename, initMappingFile) : []
        if (currentMappings.length === 1) {
          initMappingId = currentMappings[0]
        }
      }
      setMappingId(initMappingId)
      
      setAdditionalMappingFiles(pluginParams?.additional_mapping_files || '')

      const parseMappings = (obj: Record<string, any> = {}): MappingData[] => {
        return Object.entries(obj).map(([id, data]) => ({ id, ...data } as MappingData))
      }

      setMappings(parseMappings(pluginParams?.mappings))
      setAdditionalMappings(parseMappings(pluginParams?.additional_mappings))

      const parsedSigma: SigmaMappingData[] = []
      if (pluginParams?.sigma_mappings) {
        Object.entries(pluginParams.sigma_mappings).forEach(([name, data]: [string, any]) => {
          parsedSigma.push({ name, service_field: data.service_field, service_values: data.service_values || [] })
        })
      }
      setSigmaMappings(parsedSigma)

      let initCustomParams = pluginParams?.custom_parameters || {};
      if (customParamsMode === 'textarea') {
        if (typeof initCustomParams === 'object' && Object.keys(initCustomParams).length > 0) {
          initCustomParams = JSON.stringify(initCustomParams, null, 2);
        } else if (typeof initCustomParams === 'object') {
          initCustomParams = '';
        } else {
          initCustomParams = String(initCustomParams);
        }
      }
      setCustomParams(initCustomParams)
    }
  }, [open, pluginParams, plugin, app])

  const isCustomParamsJsonValid = useMemo(() => {
    if (customParamsMode !== 'textarea') return true;
    if (typeof customParams !== 'string' || customParams.trim() === '') return true;
    try {
      const parsed = JSON.parse(customParams);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, [customParams, customParamsMode]);

  const handleSaveMapping = (data: MappingData) => {
    if (editingMappingType === 'mappings') {
      if (editingMappingIndex !== null) {
        const newArr = [...mappings]
        newArr[editingMappingIndex] = data
        setMappings(newArr)
      } else {
        setMappings([...mappings, data])
      }
    } else {
      if (editingMappingIndex !== null) {
        const newArr = [...additionalMappings]
        newArr[editingMappingIndex] = data
        setAdditionalMappings(newArr)
      } else {
        setAdditionalMappings([...additionalMappings, data])
      }
    }
  }

  const handleSaveSigma = (data: SigmaMappingData) => {
    if (editingSigmaIndex !== null) {
      const newArr = [...sigmaMappings]
      newArr[editingSigmaIndex] = data
      setSigmaMappings(newArr)
    } else {
      setSigmaMappings([...sigmaMappings, data])
    }
  }

  /**
   * Orchestrates the transformation of UI state into a flat 'settings' object structure.
   * It handles conditional deletions of empty parameters, number conversions, 
   * and object mapping transformations before calling the update callback.
   */
  const apply = () => {
    try {
      // Transforming list-based UI states back into keyed objects used by the backend.
      const mappingsObj: Record<string, any> = {}
      mappings.forEach(m => {
        const { id, ...rest } = m
        mappingsObj[id] = rest
      })

      const additionalMappingsObj: Record<string, any> = {}
      additionalMappings.forEach(m => {
        const { id, ...rest } = m
        additionalMappingsObj[id] = rest
      })

      const sigmaObj: Record<string, any> = {}
      sigmaMappings.forEach(s => {
        sigmaObj[s.name] = { service_field: s.service_field, service_values: s.service_values }
      })

      const payload: Record<string, any> = {
        ...pluginParams
      }

      // Explicitly setting or deleting parameters based on UI input values.
      if (overrideChunkSize) payload.override_chunk_size = Number(overrideChunkSize)
      else delete payload.override_chunk_size

      if (overrideAllowUnmappedFields) payload.override_allow_unmapped_fields = true
      else delete payload.override_allow_unmapped_fields

      if (storeFile) payload.store_file = true
      else delete payload.store_file

      if (timestampOffsetMsec) payload.offset = Number(timestampOffsetMsec)
      else delete payload.offset

      if (mappingFile) payload.method = mappingFile
      else delete payload.method

      if (mappingId) payload.mapping = mappingId
      else delete payload.mapping

      if (additionalMappingFiles) payload.additional_mapping_files = additionalMappingFiles
      else delete payload.additional_mapping_files

      if (Object.keys(mappingsObj).length > 0) payload.mappings = mappingsObj
      else delete payload.mappings

      if (Object.keys(additionalMappingsObj).length > 0) payload.additional_mappings = additionalMappingsObj
      else delete payload.additional_mappings

      if (Object.keys(sigmaObj).length > 0) payload.sigma_mappings = sigmaObj
      else delete payload.sigma_mappings

      if (customParamsMode === 'textarea') {
        let parsed = customParams;
        if (typeof customParams === 'string' && customParams.trim() !== '') {
            try { parsed = JSON.parse(customParams) } catch { parsed = customParams; }
        }
        if (parsed !== '' && parsed !== undefined && (typeof parsed !== 'object' || Object.keys(parsed).length > 0)) {
            payload.custom_parameters = parsed;
        } else {
            delete payload.custom_parameters;
        }
      } else {
        if (customParams && typeof customParams === 'object' && Object.keys(customParams).length > 0) payload.custom_parameters = customParams
        else delete payload.custom_parameters
      }

      // Removing legacy/internal keys that might have leaked into the state object.
      delete payload.timestamp_offset_msec
      delete payload.mapping_parameters

      updatePluginParams(payload)
      toast.success('Plugin params applied!')
      setOpen(false)
    } catch {
      toast.error('Failed to apply configuration')
    }
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      updatePluginParams({})
      toast.success('Configuration reset successfully')
    }
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant={triggerVariant as any} icon={triggerIcon as any} style={{ width: '100%' }}>
          {triggerText}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 50 }} />
        <Dialog.Content 
          aria-describedby={undefined}
          style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            minWidth: 600, 
            maxWidth: 800, 
            maxHeight: '80vh', 
            overflow: 'auto', 
            padding: 24,
            backgroundColor: 'var(--background-100)',
            borderRadius: 8,
            border: '1px solid var(--gray-alpha-400)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 51
          }}
        >
        <Stack dir='column' gap={24} ai='stretch'>
          <Stack dir='row' jc='space-between' ai='center'>
            <Dialog.Title style={{ fontSize: 18, fontWeight: 'bold', margin: 0, color: 'var(--gray-900)' }}>
              Advanced Plugin Parameters
            </Dialog.Title>
            <Button variant='tertiary' icon='Trash' onClick={handleReset} style={{ color: 'var(--red-500)' }}>Reset / Delete</Button>
          </Stack>
          
          <Separator />

          {/* Global Settings */}
          <Stack dir='column' gap={12} ai='stretch'>
            <Label value='Global Settings' style={{ fontWeight: 'bold' }} />
            <Stack dir='column' gap={12} ai='stretch'>
              <Input 
                icon='ChartColumn' 
                variant='highlighted' 
                label='Override Chunk Size' 
                placeholder='e.g. 1000' 
                type='number' 
                value={overrideChunkSize} 
                onChange={e => setOverrideChunkSize(e.target.value)} 
              />
              <Input
                icon='LayoutShift' 
                variant='highlighted' 
                placeholder='0 milliseconds' 
                label='Offset'                 
                type='number' 
                value={timestampOffsetMsec} 
                onChange={e => setTimestampOffsetMsec(e.target.value)} 
              />
            </Stack>
            <Stack ai="center" gap={8} style={{ padding: '8px 0' }}>
              <Checkbox id="override_allow_unmapped_fields" checked={overrideAllowUnmappedFields} onCheckedChange={(c) => setOverrideAllowUnmappedFields(!!c)} />
              <Label htmlFor="override_allow_unmapped_fields" value="Override Allow Unmapped Fields" cursor="pointer" />
            </Stack>
            {showStoreFile && (
              <Stack ai="center" gap={8} style={{ padding: '8px 0' }}>
                <Checkbox id="store_file" checked={storeFile} onCheckedChange={(c) => setStoreFile(!!c)} />
                <Label htmlFor="store_file" value="Store File" cursor="pointer" />
              </Stack>
            )}
          </Stack>

          <Separator />

          {/* Mapping Parameters */}
          <Stack dir='column' gap={16} ai='stretch'>
            <Label value='Mapping Parameters' style={{ fontWeight: 'bold' }} />
            
            <Stack dir='column' gap={16} ai='stretch'>
              {methods.length > 0 && (
                <MethodSelector 
                  settings={{ method: mappingFile, offset: 0, custom_parameters: {} }} 
                  updateSettings={(update) => {
                    if (update.method !== undefined) {
                      setMappingFile(update.method)
                      setMappingId('')
                    }
                  }} 
                  methods={methods} 
                />
              )}
              {mappingsList.length > 0 && (
                <MappingSelector 
                  settings={{ mapping: mappingId, offset: 0, custom_parameters: {} }} 
                  updateSettings={(update) => {
                    if (update.mapping !== undefined) {
                      setMappingId(update.mapping)
                    }
                  }} 
                  mappings={mappingsList} 
                />
              )}
            </Stack>

            <Stack dir='row' jc='space-between' ai='center' style={{ marginTop: 8 }}>
              <Label value='Mappings' />
              <Button variant='secondary' onClick={() => { setEditingMappingType('mappings'); setEditingMapping(null); setEditingMappingIndex(null); setIsMappingPanelOpen(true) }}>
                Add Mapping
              </Button>
            </Stack>
            <SummaryTable 
              columns={[{ key: 'id', label: 'Mapping ID' }, { key: 'agent_type', label: 'Agent Type' }, { key: 'description', label: 'Description' }]} 
              data={mappings}
              onEdit={(item, index) => { setEditingMappingType('mappings'); setEditingMapping(item); setEditingMappingIndex(index); setIsMappingPanelOpen(true) }}
              onDelete={(_, index) => setMappings(mappings.filter((__, i) => i !== index))}
            />

            <Input 
              label='Additional Mapping Files (comma separated)' 
              placeholder='filename1/mapping_id1, filename2/mapping_id2' 
              value={additionalMappingFiles} 
              onChange={e => setAdditionalMappingFiles(e.target.value)} 
            />

            <Stack dir='row' jc='space-between' ai='center' style={{ marginTop: 8 }}>
              <Label value='Additional Mappings' />
              <Button variant='secondary' onClick={() => { setEditingMappingType('additional'); setEditingMapping(null); setEditingMappingIndex(null); setIsMappingPanelOpen(true) }}>
                Add Additional Mapping
              </Button>
            </Stack>
            <SummaryTable 
              columns={[{ key: 'id', label: 'Mapping ID' }, { key: 'agent_type', label: 'Agent Type' }, { key: 'description', label: 'Description' }]} 
              data={additionalMappings}
              onEdit={(item, index) => { setEditingMappingType('additional'); setEditingMapping(item); setEditingMappingIndex(index); setIsMappingPanelOpen(true) }}
              onDelete={(_, index) => setAdditionalMappings(additionalMappings.filter((__, i) => i !== index))}
            />

            <Stack dir='row' jc='space-between' ai='center' style={{ marginTop: 8 }}>
              <Label value='Sigma Mappings' />
              <Button variant='secondary' onClick={() => { setEditingSigma(null); setEditingSigmaIndex(null); setIsSigmaPanelOpen(true) }}>
                Add Sigma Mapping
              </Button>
            </Stack>
            <SummaryTable 
              columns={[
                { key: 'name', label: 'Name' }, 
                { key: 'service_field', label: 'Service Field' },
                { key: 'service_values', label: 'Service Values', render: (val) => Array.isArray(val) ? val.join(', ') : val }
              ]} 
              data={sigmaMappings}
              onEdit={(item, index) => { setEditingSigma(item); setEditingSigmaIndex(index); setIsSigmaPanelOpen(true) }}
              onDelete={(_, index) => setSigmaMappings(sigmaMappings.filter((__, i) => i !== index))}
            />
          </Stack>

          <Separator />

          {/* Custom Parameters */}
          <Stack dir='column' gap={8} ai='stretch'>
            <Label value='Custom Parameters' style={{ fontWeight: 'bold' }} />
            <Stack dir='column' gap={8} ai='stretch'>
            {customParamsMode === 'auto' && plugin && (
              <CustomParameters.Editor 
                plugin={plugin} 
                customParameters={customParams} 
                setCustomParameters={(update) => {
                  setCustomParams((prev: any) => {
                    const next = typeof update === 'function' ? update(prev) : update;
                    return { ...next };
                  })
                }} 
              />
            )}
            {customParamsMode === 'textarea' && (
              <Textarea 
                value={typeof customParams === 'string' ? customParams : ''}
                onChange={e => setCustomParams(e.target.value)}
                placeholder="Enter custom parameters..."
                style={{ minHeight: 150 }}
                error={!isCustomParamsJsonValid}
              />
            )}
            </Stack>
          </Stack>

          <Stack dir='row' gap={8} style={{ width: '100%', marginTop: 16 }}>
            <Button variant='glass' style={{ width: '100%' }} onClick={apply} icon="Check" disabled={!isCustomParamsJsonValid}>
              {applyText}
            </Button>
          </Stack>
        </Stack>

        <MappingPanel 
          open={isMappingPanelOpen} 
          setOpen={setIsMappingPanelOpen} 
          onSave={handleSaveMapping} 
          initialData={editingMapping} 
        />
        <SigmaMappingPanel 
          open={isSigmaPanelOpen} 
          setOpen={setIsSigmaPanelOpen} 
          onSave={handleSaveSigma} 
          initialData={editingSigma} 
        />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
