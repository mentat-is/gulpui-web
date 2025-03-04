import { λDetailedUser, λUser } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { Button, Input, Skeleton, Stack } from '@impactium/components'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import s from './styles/PermissaionsBanner.module.css'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/Popover'
import { capitalize } from 'lodash'
import { Switch } from '@/ui/Switch'
import { Icon } from '@impactium/icons'
import { toast } from 'sonner'
import { Glyph } from '@/ui/Glyph'
import { λGlyph, λGroup } from '@/dto/Dataset'
import { SetState } from '@/class/API'

export namespace Permissions {
  export type Role = 'admin' | 'read' | 'edit' | 'ingest' | 'delete'
  export const RolesList: Role[] = ['admin', 'edit', 'delete', 'ingest', 'read']
  export const RolesIcons: Record<Role, Icon.Name> = {
    admin: 'Crown',
    read: 'Book',
    edit: 'PenLine',
    ingest: 'Upload',
    delete: 'Trash2',
  }

  export const Banner = () => {
    const { destroyBanner } = useApplication()
    const [users, setUsers] = useState<λDetailedUser[]>([])
    const [groups, setGroups] = useState<λGroup[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    const reload = useCallback(() => {
      api<λDetailedUser[]>(
        '/user_list',
        {
          setLoading,
        },
        setUsers,
      )

      api<λGroup[]>(
        '/user_group_list',
        {
          method: 'POST',
          setLoading,
        },
        setGroups,
      )
    }, [setUsers, setGroups])

    useEffect(() => {
      reload()
    }, [])

    const update = (
      user: Pick<λDetailedUser, 'id'> & Partial<λDetailedUser>,
    ) => {
      const { glyph_id = user.glyph_id, id: user_id } = user

      const query: Record<string, string> = {
        user_id,
      }

      if (glyph_id) query.glyph_id = glyph_id

      api<λDetailedUser>(
        '/user_update',
        {
          method: 'PATCH',
          query,
          body: user,
          setLoading,
        },
        reload,
      )
    }

    const UsersList = useCallback(
      () => (
        <Stack
          dir="column"
          ai="unset"
          style={{ height: '100%', overflow: 'auto' }}
        >
          {users.length
            ? users.map((user) => (
                <User.Combination user={user} update={update} users={users} />
              ))
            : Array.from({ length: 5 }).map((_, i) => (
                <Skeleton width="full" />
              ))}
        </Stack>
      ),
      [users],
    )

    const done = <Button img="Check" variant="glass" onClick={destroyBanner} />

    return (
      <UIBanner
        title="Permissions"
        option={<User.Create.Trigger loading={loading} />}
        loading={!users.length}
        done={done}
      >
        <UsersList />
        <Button style={{ width: '100%' }} variant="glass" img="Users">
          Manage groups
        </Button>
      </UIBanner>
    )
  }

  export namespace User {
    export const UsernameRule = /^[a-zA-Z0-9_.@-]{4,16}$/
    export const PasswordRule =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-])[A-Za-z0-9!@#$%^&*()_+\-]{8,64}$/

    export namespace Combination {
      export interface Props {
        user: λDetailedUser
        update: (
          user: Pick<λDetailedUser, 'id'> & Partial<λDetailedUser>,
        ) => void
        users: λDetailedUser[]
      }
    }
    export const Combination = ({ user, update, users }: Combination.Props) => {
      const { app, spawnBanner } = useApplication()

      const changeRoles = (
        id: λUser['id'],
        role: Permissions.Role,
        add?: boolean,
      ) => {
        const user = users.find((u) => u.id === id)
        if (!user) {
          return
        }

        if (role === 'read') {
          return toast('User should have minimum one role', {
            description: 'Request has been declined by server',
          })
        }

        user.permission = user.permission.filter((p) => p !== role)
        if (add) {
          user.permission.push(role)
        }

        update({
          id,
          permission: user.permission,
        })
      }

      return (
        <Stack className={s.combination}>
          <SymmetricSvg text={user.pwd_hash} />
          <Stack
            className={s.general}
            ai="flex-start"
            jc="space-around"
            gap={-1}
            dir="column"
          >
            <p>
              {user.name}
              {user.id === app.general.id ? <span>(you)</span> : null}
            </p>
            <span>{user.id}</span>
          </Stack>
          <Stack flex />
          <Popover>
            <PopoverTrigger>
              <Button img="Gavel" variant="secondary">
                Roles /{' '}
                {user.permission
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase() || '0'}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Stack dir="column" ai="flex-start" gap={4}>
                {RolesList.map((r) => {
                  const has = user.permission.includes(r)
                  return (
                    <Stack className={s.role} gap={6}>
                      <Icon name={RolesIcons[r]} size={12} />
                      <p style={{ fontSize: 12, flex: 1 }}>{capitalize(r)}</p>
                      <Switch
                        checked={has}
                        onCheckedChange={(add) => changeRoles(user.id, r, add)}
                      />
                    </Stack>
                  )
                })}
              </Stack>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger>
              <Button img="Users" variant="secondary">
                Groups
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Stack dir="column" ai="flex-start" gap={4}>
                {RolesList.map((r) => {
                  const has = user.permission.includes(r)
                  return (
                    <Stack className={s.role} gap={6}>
                      <Icon name={RolesIcons[r]} size={12} />
                      <p style={{ fontSize: 12, flex: 1 }}>{capitalize(r)}</p>
                      <Switch
                        checked={has}
                        onCheckedChange={(add) => changeRoles(user.id, r, add)}
                      />
                    </Stack>
                  )
                })}
              </Stack>
            </PopoverContent>
          </Popover>
          <Button
            img="PenLine"
            onClick={() =>
              spawnBanner(<Permissions.User.Edit.Banner user={user} />)
            }
            variant="secondary"
          />
        </Stack>
      )
    }
    export namespace Create {
      export namespace Trigger {
        export type Props = Button.Props
      }
      export const Trigger = ({ ...props }: Trigger.Props) => {
        const { spawnBanner } = useApplication()

        return (
          <Button
            img="UserPlus"
            variant="ghost"
            onClick={() => spawnBanner(<User.Create.Banner />)}
            {...props}
          />
        )
      }
      export const Banner = () => {
        const { spawnBanner } = useApplication()
        const [loading, setLoading] = useState<boolean>(false)
        const [icon, setIcon] = useState<λGlyph['id'] | null>(null)
        const [id, setId] = useState<string>('')
        const [isIdValid, setIsIdValid] = useState<boolean>(true)
        const [password, setPassword] = useState<string>('')
        const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true)
        const [permissions, setPermisisons] = useState<string>('read')
        const [isPermissionsValid, setIsPermissionsValid] =
          useState<boolean>(true)

        const inputConstructor =
          (
            set: SetState<string>,
            setValid: SetState<boolean>,
            regexp: RegExp,
          ) =>
          (event: ChangeEvent<HTMLInputElement>) => {
            const { value } = event.target
            setValid(value.length > 3 ? true : regexp.test(value))
            set(value)
          }

        const submit = () => {
          api(
            '/user_create',
            {
              method: 'POST',
              query: {
                user_id: id,
                password,
                glyph_id:
                  icon ||
                  Array.from(Glyph.List.entries()).find(
                    (i) => i[1] === 'User',
                  )?.[0]!,
              },
              setLoading,
              body: JSON.stringify(permissions.split(',').map((v) => v.trim())),
            },
            () => spawnBanner(<Permissions.Banner />),
          )
        }

        const handlePermsChange = (event: ChangeEvent<HTMLInputElement>) => {
          const { value } = event.target
          const valid = value
            .split(',')
            .map((v) => v.trim())
            .every((v) => RolesList.includes(v as Role))

          setIsPermissionsValid(valid)
          setPermisisons(value)
        }

        const Done = () => (
          <Button
            img="Check"
            loading={loading}
            onClick={submit}
            disabled={
              id.length < 3 ||
              !isIdValid ||
              password.length < 5 ||
              !isPasswordValid ||
              !isPermissionsValid ||
              !icon
            }
            variant="glass"
          />
        )

        return (
          <UIBanner
            back={() => spawnBanner(<Permissions.Banner />)}
            title="Create user"
            done={<Done />}
          >
            <Input
              img="User"
              placeholder="User idendificator"
              variant="highlighted"
              value={id}
              valid={isIdValid}
              onChange={inputConstructor(
                setId,
                setIsIdValid,
                new RegExp(Permissions.User.UsernameRule),
              )}
            />
            <Input
              img="Key"
              placeholder="Password"
              variant="highlighted"
              value={password}
              valid={isPasswordValid}
              onChange={inputConstructor(
                setPassword,
                setIsPasswordValid,
                new RegExp(Permissions.User.PasswordRule),
              )}
            />
            <Input
              img="Gavel"
              placeholder="read, ingest, edit, delete, admin"
              variant="highlighted"
              value={permissions}
              valid={isPermissionsValid}
              onChange={handlePermsChange}
            />
            <Glyph.Chooser icon={icon} setIcon={setIcon} />
          </UIBanner>
        )
      }
    }
    export namespace Group {
      export namespace Combination {
        export interface Props {
          group: λGroup
        }
      }
      export function Combination({ group, ...props }: Combination.Props) {
        return <Stack></Stack>
      }
    }
    export namespace Edit {
      export namespace Banner {
        export interface Props extends UIBanner.Props {
          user: λDetailedUser
        }
      }
      export function Banner({ user, ...props }: Banner.Props) {
        const { spawnBanner } = useApplication()
        const [loading, setLoading] = useState<boolean>(false)
        const [icon, setIcon] = useState<λGlyph['id'] | null>(user.glyph_id)
        const [id, setId] = useState<string>(user.id)
        const [isIdValid, setIsIdValid] = useState<boolean>(true)
        const [password, setPassword] = useState<string>('')
        const [isPasswordValid, setIsPasswordValid] = useState<boolean>(true)
        const [permissions, setPermisisons] = useState<string>(
          user.permission.join(', '),
        )
        const [isPermissionsValid, setIsPermissionsValid] =
          useState<boolean>(true)

        const inputConstructor =
          (
            set: SetState<string>,
            setValid: SetState<boolean>,
            regexp: RegExp,
          ) =>
          (event: ChangeEvent<HTMLInputElement>) => {
            const { value } = event.target
            setValid(value.length > 3 ? true : regexp.test(value))
            set(value)
          }

        const submit = () => {
          api(
            '/user_update',
            {
              method: 'PATCH',
              query: {
                user_id: id,
                password,
                glyph_id:
                  icon ||
                  Array.from(Glyph.List.entries()).find(
                    (i) => i[1] === 'User',
                  )?.[0]!,
              },
              setLoading,
              body: {
                permission: JSON.stringify(
                  permissions.split(',').map((v) => v.trim()),
                ),
              },
            },
            () => spawnBanner(<Permissions.Banner />),
          )
        }

        const handlePermsChange = (event: ChangeEvent<HTMLInputElement>) => {
          const { value } = event.target
          const valid = value
            .split(',')
            .map((v) => v.trim())
            .every((v) => RolesList.includes(v as Role))

          setIsPermissionsValid(valid)
          setPermisisons(value)
        }

        const Done = () => (
          <Button
            img="Check"
            loading={loading}
            onClick={submit}
            disabled={
              id.length < 3 ||
              !isIdValid ||
              password.length < 5 ||
              !isPasswordValid ||
              !isPermissionsValid ||
              !icon
            }
            variant="glass"
          />
        )

        return (
          <UIBanner
            back={() => spawnBanner(<Permissions.Banner />)}
            title={`Edit user ${user.name}`}
            done={<Done />}
            {...props}
          >
            <Input
              img="User"
              placeholder="User idendificator"
              variant="highlighted"
              value={id}
              valid={isIdValid}
              onChange={inputConstructor(
                setId,
                setIsIdValid,
                new RegExp(Permissions.User.UsernameRule),
              )}
            />
            <Input
              img="Key"
              placeholder="Password"
              variant="highlighted"
              value={password}
              valid={isPasswordValid}
              onChange={inputConstructor(
                setPassword,
                setIsPasswordValid,
                new RegExp(Permissions.User.PasswordRule),
              )}
            />
            <Input
              img="Gavel"
              placeholder="read, ingest, edit, delete, admin"
              variant="highlighted"
              value={permissions}
              valid={isPermissionsValid}
              onChange={handlePermsChange}
            />
            <Glyph.Chooser icon={icon} setIcon={setIcon} />
          </UIBanner>
        )
      }
    }
  }
}
