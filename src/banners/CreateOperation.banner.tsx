import { useCallback, useState } from 'react';
import { Banner } from '../ui/Banner';
import { Button, Input } from '@impactium/components';
import { useApplication } from '../context/Application.context';
import { Stack } from '@impactium/components';
import s from './styles/CreateOperationBanner.module.css'
import { Default, λGlyph } from '@/dto/Dataset';
import { Index, Operation } from '@/class/Info';
import { OperationBanner } from './Operation.banner';
import { Glyph } from '@/ui/Glyph';
import { λIndex } from '@/dto/Index.dto';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/Select';
import { Icon } from '@impactium/icons';

export function CreateOperationBanner() {
  const { app, Info, spawnBanner } = useApplication();
  const [name, setName] = useState<string>('');
  const [index, setIndex] = useState<λIndex['name'] | null>(null);
  const [icon, setIcon] = useState<λGlyph['id'] | null>(Glyph.List.keys().next().value || null);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createOperation = () => {
    if (!index) {
      return;
    }

    api<any>('/operation_create', {
      method: 'POST',
      setLoading,
      query: {
        name,
        index,
      },
      deassign: true,
      body: description.toString(),
    }, Info.sync).then(() => {
      spawnBanner(<OperationBanner />);
    });
  };

  const DoneButton = useCallback(() => {
    return (
      <Button
        variant='glass'
        disabled={!name || !description || !index}
        loading={loading}
        img='Check'
        onClick={createOperation} />
    )
  }, [name, description, loading, index]);

  const selectIndexHandler = (value: string) => {
    setIndex(value as λIndex['name']);
  } 

  return (
    <Banner title='Create an Operation' done={<DoneButton />}>
      <Stack ai='center'>
        <p className={s.paramName}>Operation name:</p>
        <Input
          variant='highlighted'
          className={s.input}
          img={icon ? Glyph.List.get(icon) : Default.Icon.OPERATION}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder='Operation name' />
      </Stack>
      <Select onValueChange={selectIndexHandler}>
        <SelectTrigger defaultValue={app.target.indexes[0]?.name || ''} value={index || ''}>
          <Stack>
            <Icon name={Default.Icon.INDEX} />
            <p>{index}</p>
          </Stack>
        </SelectTrigger>
        <SelectContent>
          {app.target.indexes.map(index => {
            return <SelectItem value={index.name}>{index.name}</SelectItem>
          })}
        </SelectContent>
      </Select>
      <Stack ai='center'>
        <p className={s.paramName}>Operation description:</p>
        <Input
          className={s.input}
          variant='highlighted'
          img='Text'
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          placeholder='Operation description' />
      </Stack>
      <Stack ai='center'>
        <p className={s.paramName}>Operation icon:</p>
        <Glyph.Chooser icon={icon} setIcon={setIcon} />
      </Stack>
    </Banner>
  )
}