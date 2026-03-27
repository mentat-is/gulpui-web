import { Application } from '@/context/Application.context'
import { Extension } from '@/context/Extension.context'
import { Doc } from '@/entities/Doc'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button } from '@/ui/Button'
import { Select } from '@/ui/Select'
import { Stack } from '@/ui/Stack'
import { Label } from '@/ui/Label'
import { Icon } from '@impactium/icons'
import React, { useState, useRef, useCallback, useMemo } from 'react';

import s from './styles/EnrichmentBanner.module.css'

/**
 * Interface that every "send_data" type plugin MUST expose via forwardRef +
 * useImperativeHandle.
 *
 * The parent banner does not know the plugin's internal details: it only knows that,
 * when the user clicks "Done", it can call `pluginRef.current?.onDone()`.
 *
 * Communication flow:
 *  1. User selects a plugin from the dropdown.
 *  2. The banner mounts the plugin via <Extension.Component> passing the `pluginRef`.
 *  3. The plugin registers `onDone` on the ref via `useImperativeHandle`.
 *  4. User clicks "Done" → the banner calls `pluginRef.current?.onDone()`.
 *  5. The plugin executes its logic (e.g., alert, API call, etc.).
 */
export interface SendDataPluginRef {
  onDone: () => void;
}

export namespace SendData {
  export interface Props extends UIBanner.Props {
    event: Doc.Type
    onSendData?: (event: Doc.Type) => void
  }

  export function Banner({ event, onSendData, ...props }: SendData.Props) {
    const { extensions } = Extension.use()
    const [selectedPluginFilename, setSelectedPluginFilename] = useState<string | null>(null)

    /**
     * Ref to the dynamically loaded plugin component.
     * The plugin must implement `SendDataPluginRef` (via forwardRef + useImperativeHandle)
     * to be able to receive the `onDone()` call from the banner.
     */
    const pluginRef = useRef<SendDataPluginRef>(null)

    /** Filter loaded extensions for type "send_data" */
    const sendDataPlugins = useMemo(() => {
      return Object.values(extensions).filter((ext) =>
        ext.type.includes('send_data')
      )
    }, [extensions])

    const selectedPlugin = useMemo(() => {
      if (!selectedPluginFilename) return null
      return sendDataPlugins.find((p) => p.filename === selectedPluginFilename) || null
    }, [selectedPluginFilename, sendDataPlugins])

    /**
     * Callback invoked when the user clicks the "Done" button.
     *
     * Delegates the action to the currently loaded plugin via the ref.
     * This way the banner doesn't need to know the plugin's internal logic.
     */
    const handleDone = useCallback(() => {
      if (pluginRef.current) {
        pluginRef.current.onDone()
      }
    }, [])

    /** Dropdown to select the plugin to use for sending */
    const PluginSelection = useMemo(() => {
      const Trigger = () => (
        <Select.Trigger>
          <Stack gap={16}>
            <Icon variant='dimmed' name='Send' />
            {selectedPlugin
              ? selectedPlugin.display_name || selectedPlugin.filename
              : 'Select an external source'}
          </Stack>
        </Select.Trigger>
      )

      return (
        <Select.Root onValueChange={setSelectedPluginFilename}>
          <Trigger />
          <Select.Content>
            {sendDataPlugins.map((plugin) => (
              <Select.Item key={plugin.filename} value={plugin.filename}>
                {plugin.display_name || plugin.filename}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )
    }, [selectedPluginFilename, sendDataPlugins, selectedPlugin])

    /**
     * "Done" button passed to the UI Banner as the `done` prop.
     * It is visible only when a plugin is selected and loaded.
     * When clicked, it calls `handleDone`, which in turn invokes `pluginRef.current.onDone()`.
     */
    const doneButton = selectedPlugin ? (
      <Button variant='glass'
        icon='Check'
        onClick={handleDone} />
    ) : null

    return (
      <UIBanner
        title="Send data to external source"
        subtitle={<span ></span>}
        done={doneButton}
        {...props}
      >
        <Stack dir="column" ai="flex-start" gap={12} style={{ width: '100%' }}>
          {/* Dropdown to select the destination plugin */}
           <Stack ai='center' jc='space-between'>
            <Label style={{ color: 'var(--second)', fontSize: 14 }} value='Select an external source to send the event data to.' /> 
           </Stack>
        </Stack>
        <Stack dir="column" ai="flex-start" gap={12} style={{ width: '100%' }}>
          {/* Dropdown to select the destination plugin */}
          <Stack ai='center' jc='space-between'>
            {PluginSelection}
          </Stack>
        </Stack>

        {/*
         * When a plugin is selected, it is mounted dynamically.
         * The `pluginRef` is passed as a special prop so the banner
         * can call `onDone()` on the plugin at the appropriate time.
         *
         * The plugin must accept the ref via `forwardRef` and register
         * `onDone` via `useImperativeHandle`.
         */}
        {selectedPlugin && (
          <Extension.Component
            name={selectedPlugin.filename}
            props={{ event, ref: pluginRef }}
          />
        )}
      </UIBanner>
    )
  }
}
