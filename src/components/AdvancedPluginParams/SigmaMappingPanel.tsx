import { useState, useEffect } from 'react'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { Button } from '@/ui/Button'
import * as Dialog from '@radix-ui/react-dialog'
import { Label } from '@/ui/Label'

/**
 * SigmaMappingData defines the structure for service-specific sigma detection 
 * rules within the Gulp configuration.
 */
export interface SigmaMappingData {
  name: string
  service_field: string
  service_values: string[]
}

interface SigmaMappingPanelProps {
  initialData?: SigmaMappingData | null
  onSave: (data: SigmaMappingData) => void
  open: boolean
  setOpen: (open: boolean) => void
}

/**
 * SigmaMappingPanel is a modal dialog for adding or editing Sigma mapping entries.
 * It manages the association between a service name and its corresponding 
 * service field and filter values.
 */
export function SigmaMappingPanel({ initialData, onSave, open, setOpen }: SigmaMappingPanelProps) {
  const [name, setName] = useState('')
  const [serviceField, setServiceField] = useState('')
  const [serviceValuesStr, setServiceValuesStr] = useState('')

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name)
        setServiceField(initialData.service_field || '')
        setServiceValuesStr(initialData.service_values?.join(', ') || '')
      } else {
        setName('')
        setServiceField('')
        setServiceValuesStr('')
      }
    }
  }, [open, initialData])

  /**
   * Constructs the SigmaMappingData object from local state, converting 
   * the comma-separated values string into an array.
   */
  const handleSave = () => {
    onSave({ 
      name, 
      service_field: serviceField, 
      service_values: serviceValuesStr.split(',').map(s => s.trim()).filter(Boolean) 
    })
    
    // Reset state for "Add" mode
    if (initialData) {
      setOpen(false)
    } else {
      setName('')
      setServiceField('')
      setServiceValuesStr('')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 52 }} />
        <Dialog.Content 
          aria-describedby={undefined}
          style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          minWidth: 320, 
          padding: 16, 
          zIndex: 53,
          backgroundColor: 'var(--background-100)',
          borderRadius: 8,
          border: '1px solid var(--gray-alpha-400)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
        <Stack dir="column" gap={12} ai="stretch">
          <Dialog.Title style={{ fontSize: 13, fontWeight: 'normal', margin: 0, color: 'var(--gray-900)' }}>
            {initialData ? 'Update Sigma Mapping' : 'Add Sigma Mapping'}
          </Dialog.Title>
          
          <Input 
            label="Mapping Key / Name" 
            placeholder="e.g. windefend" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
             
          />
          
          <Input 
            label="Service Field" 
            placeholder="e.g. winlog.channel" 
            value={serviceField} 
            onChange={(e) => setServiceField(e.target.value)} 
             
          />
          
          <Input 
            label="Service Values (comma separated)" 
            placeholder="e.g. Microsoft-Windows-Windows Defender" 
            value={serviceValuesStr} 
            onChange={(e) => setServiceValuesStr(e.target.value)} 
             
          />

          <Stack dir="row" gap={8} jc="flex-end" style={{ marginTop: 8 }}>
            <Button 
              variant="secondary" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="tertiary" 
              disabled={!name || !serviceField || !serviceValuesStr} 
              onClick={handleSave}
            >
              {initialData ? 'Update' : 'Add'}
            </Button>
          </Stack>
        </Stack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
