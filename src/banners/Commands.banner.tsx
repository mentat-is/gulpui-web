import { Banner as UIBanner } from '@/ui/Banner';
import { cn } from '@impactium/utils';
import s from './styles/CommandsBanner.module.css';
import { Application } from '@/context/Application.context';
import { Input } from '@/ui/Input';
import { ChangeEvent, useMemo, useState } from 'react';
import { Icon } from '@impactium/icons';
import { SetState } from '@/class/API';
import { SelectFiles } from './SelectFiles.banner';
import { Enrichment } from './Enrichment.banner';
import { FilterFileBanner } from './FilterFile.banner';
import { Frame } from './Frame.banner';
import { GlobalQuery } from './GlobalQuery.banner';
import { QueryExternal } from './QueryExternal.banner';
import { Requests } from './Requests.banner';
import { UploadBanner } from './Upload.banner';
import { Sigma } from './UploadSigmaRule.banner';
import { Session } from './Session.banner';
import { Permissions } from './Permissions.banner';
import { Stack } from '@/ui/Stack';
import { Button } from '@/ui/Button';
import { Operation } from '@/entities/Operation';

export namespace Commands {
  export type Prefix = 'direct' | 'banner';

  export interface Entity {
    name: string;
    onClick: () => void;
    icon: Icon.Name;
  }

  export namespace Banner {
    export interface Props extends UIBanner.Props { }
  }

  export function Banner({ className, ...props }: Banner.Props) {
    const { app, spawnBanner } = Application.use();
    const [search, setSearch] = useState<string>('');

    const commands: Commands.Entity[] = useMemo(() => [
      {
        name: "Upload files",
        icon: "Upload",
        onClick: () => spawnBanner(<UploadBanner />)
      },
      {
        name: "Query external source",
        icon: "ServerCrash",
        onClick: () => spawnBanner(<QueryExternal.Banner />)
      },
      {
        name: "Upload sigma rule",
        icon: "Sigma",
        onClick: () => spawnBanner(<Sigma.Banner />)
      },
      {
        name: "Select files and contexts",
        icon: "FileStack",
        onClick: () => spawnBanner(<SelectFiles.Banner />)
      },
      {
        name: "Change workflow frame",
        icon: "AlignHorizontalSpaceAround",
        onClick: () => spawnBanner(<Frame.Banner />)
      },
      {
        name: "Global query",
        icon: "Globe",
        onClick: () => spawnBanner(<GlobalQuery.Banner />)
      },
      {
        name: "Apply filters",
        icon: "Filter",
        onClick: () => spawnBanner(<FilterFileBanner files={[]} />)
      },
      {
        name: "Enrichment",
        icon: "PrismColor",
        onClick: () => spawnBanner(<Enrichment.Banner />)
      },
      {
        name: 'Requests list',
        icon: 'AcronymHttp',
        onClick: () => spawnBanner(<Requests.Banner />)
      },

      {
        name: "Manage Permissions",
        icon: "UserSettings",
        onClick: () => spawnBanner(<Permissions.Banner />)
      },
      {
        name: "Back to operations",
        icon: "Undo2",
        onClick: () => spawnBanner(<Operation.Select.Banner />)
      },
      {
        icon: "LogOut",
        name: "Logout",
        onClick: () => spawnBanner(<Session.Save.Banner />)
      },
    ].filter(entity => entity.name.toLowerCase().startsWith(search.toLowerCase())) as Entity[], [search, app]);

    return (
      <UIBanner title="Commands" className={cn(className, s.banner)} {...props}>
        <Input
          variant="highlighted"
          icon="MagnifyingGlass"
          placeholder='searchInput'
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          value={search}
        />
        <Stack dir="column" gap={0}>
          {commands.map((command) => (
            <Commands.Component
              key={command.name}
              command={command}
              search={search}
              setSearch={setSearch}
            />
          ))}
        </Stack>
      </UIBanner>
    );
  }

  export namespace Component {
    export interface Props {
      command: Commands.Entity;
      search: string;
      setSearch: SetState<string>;
    }
  }

  export function Component({ command, search, setSearch }: Commands.Component.Props) {

    return (
      <Button className={s.command} icon={command.icon} variant="tertiary" onClick={command.onClick}>
        {command.name}
      </Button>
    );
  }
}
