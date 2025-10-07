import { Default, Selectable } from '@/dto/Dataset'
import { UUID } from 'crypto'
import { Glyph } from './Glyph'
import { User } from './User'
import { App } from './App'
import { Logger } from '@/dto/Logger.class'
import { Parser } from './addon/Parser'
import { Context } from './Context'
import { Refractor } from '@/ui/utils'
import { Internal } from './addon/Internal'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select as UISelect } from '@/ui/Select'
import { Button } from '@/ui/Button'
import s from './styles/Operation.module.css'
import { SelectFiles } from '@/banners/SelectFiles.banner'
import { Input } from '@/ui/Input'
import { Application } from '@/context/Application.context'
import { Skeleton } from '@/ui/Skeleton'
import { Stack } from '@/ui/Stack'
import { useState, useEffect } from 'react'
import { Label } from '@/ui/Label'
import { toast } from 'sonner'
import { Icon } from '@impactium/icons'

export namespace Operation {
  export const name = 'Operation'
  const _ = Symbol(Operation.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type extends Selectable {
    glyph_id: Glyph.Id;
    granted_user_group_ids: User.Id[];
    granted_user_ids: string[];
    id: Id;
    index: string;
    name: string;
    description: string;
    owner_user_id: User.Id;
    time_created: number;
    time_updated: number;
    type: 'operation';
  }

  export class Entity {
    public static icon = Internal.IconExtractor.activate<Operation.Type | null>(
      Default.Icon.OPERATION,
    )

    public static reload = (newOperations: Operation.Type[], app: App.Type) => Operation.Entity.select(newOperations, Operation.Entity.selected(app)?.id)

    public static selected = (app: App.Type): Operation.Type | undefined =>
      Logger.assert(app.target.operations.find((o) => o.selected), 'No operation selected', Operation.name)

    public static id = (use: App.Type, id: Operation.Id): Operation.Type =>
      Parser.use(use, 'operations').find((o) => o.id === id) as Operation.Type

    public static findByName = (
      app: App.Type,
      name: Operation.Type['name'],
    ): Operation.Type | undefined =>
      app.target.operations.find((o) => o.name === name)

    public static select = (use: App.Type | Operation.Type[], operation: Operation.Id | undefined): Operation.Type[] => Refractor.array(...Parser.use(use, 'operations').map((o) => o.id === operation ? Operation.Entity._select(o) : Operation.Entity._unselect(o)));

    public static contexts = (app: App.Type): Context.Type[] =>
      app.target.contexts.filter(
        (c) => c.operation_id === Operation.Entity.selected(app)?.id,
      )

    private static _select = (o: Operation.Type): Operation.Type => ({
      ...o,
      selected: true,
    })

    private static _unselect = (o: Operation.Type): Operation.Type => ({
      ...o,
      selected: false,
    })
  }

  export namespace Select {
    export namespace Banner {
      export interface Props extends UIBanner.Props { }
    }

    export function Banner({ ...props }: Operation.Select.Banner.Props) {
      const { Info, app, spawnBanner } = Application.use()

      const InitializeNewOperaion = () => (
        <Button
          variant='tertiary'
          onClick={() =>
            spawnBanner(
              <Operation.CreateOrUpdate.Banner
                back={() => spawnBanner(<Operation.Select.Banner />)}
              />,
            )
          }
          icon='BookPlus'
        />
      )

      const DoneButton = () => (
        <Button
          disabled={!Operation.Entity.selected(Info.app)}
          onClick={() =>
            spawnBanner(
              <SelectFiles.Banner
                back={() => spawnBanner(<Operation.Select.Banner />)}
              />,
            )
          }
          shape='icon'
          variant='glass'
          icon='Check'
        />
      )

      const NoOperations = () => (
        <UISelect.Item value='X' disabled>There is no operations</UISelect.Item>
      )

      const SelectTrigger = () => {
        const selected = Operation.Entity.selected(Info.app)

        return (
          <UISelect.Trigger>
            <UISelect.Icon name={Operation.Entity.icon((selected || {}) as Operation.Type)} />
            {selected ? selected.name : 'Select operation or create new one'}
          </UISelect.Trigger>
        )
      }

      const [loading, setLoading] = useState<boolean>(Info.app.target.operations.length === 0);

      useEffect(() => {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }, [loading])

      return (
        <UIBanner
          title='Choose operation'
          option={<InitializeNewOperaion />}
          done={<DoneButton />}
          loading={loading}
          {...props}
        >
          {loading ? (
            <Skeleton width='full' height='default' />
          ) : (
            <UISelect.Root
              defaultValue={Operation.Entity.selected(Info.app)?.id}
              onValueChange={(id) => Info.operations_select(id as Operation.Id)}>
              <SelectTrigger />
              <UISelect.Content>
                {Info.app.target.operations.length ? (
                  Info.app.target.operations.map((operation) => (
                    <UISelect.Item key={operation.id} value={operation.id}>
                      <UISelect.Icon name={Operation.Entity.icon(operation)} />
                      {operation.name}
                    </UISelect.Item>
                  ))
                ) : (
                  <NoOperations />
                )}
              </UISelect.Content>
            </UISelect.Root>
          )}
        </UIBanner>
      )
    }
  }

  export namespace CreateOrUpdate {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        operation?: Operation.Type;
      }
    }

    export function Banner({ operation = {} as Operation.Type, ...props }: Operation.CreateOrUpdate.Banner.Props) {
      const { Info, spawnBanner } = Application.use();
      const [name, setName] = useState<string>(operation.name ?? '');
      const [icon, setIcon] = useState<Glyph.Id | null>(operation.glyph_id ?? Glyph.getIdByName(Default.Icon.OPERATION));
      const [description, setDescription] = useState<string>(operation.description ?? '');
      const [loading, setLoading] = useState<boolean>(false);

      const createOperation = () => {
        api<Operation.Type>('/operation_create', {
          method: 'POST',
          setLoading,
          query: { name },
          body: { description },
        }, operation => updateOperation(operation.id).then(Info.sync)).then(() => {
          spawnBanner(<Operation.Select.Banner />)
        });
      }

      const updateOperation = (id?: Operation.Id) => api<any>('/operation_update', {
        method: 'PATCH',
        setLoading,
        query: {
          operation_id: id ?? operation.id,
          glyph_id: icon,
        },
        body: { description, glyph_id: icon },
      }, Info.sync)
        .then(() => {
          Logger.log(`Operation ${operation.name} has been successfully updated`, 'Operation.CreateOrUpdate.Banner.updateOperation', {
            icon: <Icon name='Check' />,
            richColors: true
          })
          spawnBanner(<Operation.Select.Banner />)
        });

      const DoneButton = () => {
        const doneButtonClickHandler = () => {
          if (operation.id) {
            updateOperation();
          } else {
            createOperation();
          }
        };
        return (
          <Button
            variant='glass'
            disabled={!name || !description}
            loading={loading}
            icon='Check'
            onClick={doneButtonClickHandler} />
        )
      }

      return (
        <UIBanner title={operation.id ? 'Update operation' : 'Create new operation'} done={<DoneButton />} className={s.wrapper} {...props}>
          {operation.id ? null : <Input
            label='Name'
            value={name}
            variant='highlighted'
            icon='TextTitle'
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder='Name of operation'
          />}
          <Input
            label='Description'
            value={description}
            variant='highlighted'
            icon='Question'
            onChange={(e) => setDescription(e.currentTarget.value)}
            placeholder='Description of operation'
          />
          <Glyph.Chooser icon={icon} setIcon={setIcon} label='Operation icon' />
        </UIBanner>
      )
    }
  }
}
