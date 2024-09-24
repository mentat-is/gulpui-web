import { useApplication } from '@/context/Application.context';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import s from './styles/PluginsViewerBanner.module.css';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from '@/ui/Select';
import { useState } from 'react';
import { PluginEntity } from '@/dto/Plugin.dto';
import { Icon } from '@/ui/Icon';

export function PluginsViewerBanner() {
  const { app } = useApplication();
  const [plugin, setPlugin] = useState<PluginEntity | undefined>(app.target.plugins_map[0]);

  return (  
    <Banner title='Review plugins'>
      <Select onValueChange={name => setPlugin(app.target.plugins_map.find(p => p.display_name === name))}>
        <SelectTrigger>
          {plugin?.display_name || 'There is no plugins'}
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Ingestion</SelectLabel>
            {app.target.plugins_map.filter(p => p.type === 'ingestion').map(p => <SelectItem key={p.display_name} value={p.display_name}>{p.display_name}</SelectItem>)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Sigma</SelectLabel>
            {app.target.plugins_map.filter(p => p.type === 'sigma').map(p => <SelectItem key={p.display_name} value={p.display_name}>{p.display_name}</SelectItem>)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Extension</SelectLabel>
            {app.target.plugins_map.filter(p => p.type === 'extension').map(p => <SelectItem key={p.display_name} value={p.display_name}>{p.display_name}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className={s.content}>
        <div className={s.param}>
          <span><Icon name='Heading1' />Name:</span>
          <p>{plugin?.display_name}</p>
        </div>
        <div className={s.param}>
          <span><Icon name='File' />Filename:</span>
          <p>{plugin?.filename}</p>
        </div>
      </div>
    </Banner>
  )
}