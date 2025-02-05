import { λGlyph } from '@/dto/Dataset';
import { Icon } from '@impactium/icons';
import { μ } from '@/class/Info';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Button } from '@impactium/components';
import s from './styles/Glyph.module.css';

export function Glyph({ glyph, ...props }: Glyph.Props) {
  const icon = Glyph.List.get(glyph);

  if (icon) {
    return <Icon name={icon} {...props} />
  }

  return <Icon name='Bookmark' {...props} />
}

export namespace Glyph {
  export interface Props extends Omit<Icon.Props, 'name'> {
    glyph: λGlyph['id'];
  }

  export const Raw = Object.keys(Icon.icons).slice(0, 50) as Icon.Name[];

  export const List: Map<μ.Glyph, Icon.Name> = new Map();

  export const Fields = (name: string): Icon.Name => {
    const mapping: Record<string, Icon.Name> = {
      "@timestamp": 'Clock',
      // "agent.type": 'Stat',
      // "event.category": "keyword",
      // "event.code": "keyword",
      // "event.duration": "long",
      // "event.original": "text",
      // "event.sequence": "long",
      // "event.type": "keyword",
      // "gulp.context_id": "keyword",
      // "gulp.event_code": "long",
      // "gulp.operation_id": "keyword",
      // "gulp.source_id": "keyword",
      // "gulp.timestamp": "long",
      // "gulp.unmapped.AccountExpires": "keyword",
      // "gulp.unmapped.ActivityID": "keyword",
      // "gulp.unmapped.AdvancedOptions": "keyword",
      // "gulp.unmapped.AlgorithmName": "keyword",
      // "gulp.unmapped.AllowedToDelegateTo": "keyword",
      // "gulp.unmapped.AuditSourceName": "keyword",
      // "gulp.unmapped.AuthenticationPackageName": "keyword",
      // "gulp.unmapped.CallerProcessId": "keyword",
      // "gulp.unmapped.CallerProcessName": "keyword",
      // "gulp.unmapped.ClientCreationTime": "keyword",
      // "gulp.unmapped.ClientProcessId": "keyword",
      // "gulp.unmapped.ConfigAccessPolicy": "keyword",
      // "gulp.unmapped.CountOfCredentialsReturned": "keyword",
      // "gulp.unmapped.DisableIntegrityChecks": "keyword",
      // "gulp.unmapped.DisplayName": "keyword",
      // "gulp.unmapped.Dummy": "keyword",
      // "gulp.unmapped.ElevatedToken": "keyword",
      // "gulp.unmapped.EventSourceId": "keyword",
      // "gulp.unmapped.FailureReason": "keyword",
      // "gulp.unmapped.FlightSigning": "keyword",
      // "gulp.unmapped.Guid": "keyword",
      // "gulp.unmapped.HandleId": "keyword",
      // "gulp.unmapped.HomeDirectory": "keyword",
      // "gulp.unmapped.HomePath": "keyword",
      // "gulp.unmapped.HypervisorDebug": "keyword",
      // "gulp.unmapped.HypervisorLaunchType": "keyword",
      // "gulp.unmapped.HypervisorLoadOptions": "keyword",
      // "gulp.unmapped.Identity": "keyword",
      // "gulp.unmapped.ImpersonationLevel": "keyword",
      // "gulp.unmapped.KernelDebug": "keyword",
      // "gulp.unmapped.KeyFilePath": "keyword",
      // "gulp.unmapped.KeyName": "keyword",
      // "gulp.unmapped.KeyType": "keyword",
      // "gulp.unmapped.Keywords": "keyword",
      // "gulp.unmapped.Level": "keyword",
      // "gulp.unmapped.LmPackageName": "keyword",
      // "gulp.unmapped.LoadOptions": "keyword",
      // "gulp.unmapped.LogonGuid": "keyword",
      // "gulp.unmapped.LogonHours": "keyword",
      // "gulp.unmapped.LogonProcessName": "keyword",
      // "gulp.unmapped.LogonType": "keyword",
      // "gulp.unmapped.MandatoryLabel": "keyword",
      // "gulp.unmapped.NewSd": "keyword",
      // "gulp.unmapped.NewTime": "keyword",
      // "gulp.unmapped.NewUacValue": "keyword",
      // "gulp.unmapped.ObjectName": "keyword",
      // "gulp.unmapped.ObjectServer": "keyword",
      // "gulp.unmapped.ObjectType": "keyword",
      // "gulp.unmapped.OldSd": "keyword",
      // "gulp.unmapped.OldUacValue": "keyword",
      // "gulp.unmapped.Operation": "keyword",
      // "gulp.unmapped.PasswordLastSet": "keyword",
      // "gulp.unmapped.PreviousTime": "keyword",
      // "gulp.unmapped.PrimaryGroupId": "keyword",
      // "gulp.unmapped.PrivilegeList": "keyword",
      // "gulp.unmapped.ProcessCreationTime": "keyword",
      // "gulp.unmapped.ProfilePath": "keyword",
      // "gulp.unmapped.PuaPolicyId": "keyword",
      // "gulp.unmapped.ReadOperation": "keyword",
      // "gulp.unmapped.RemoteCredentialGuard": "keyword",
      // "gulp.unmapped.RemoteEventLogging": "keyword",
      // "gulp.unmapped.Resource": "keyword",
      // "gulp.unmapped.RestrictedAdminMode": "keyword",
      // "gulp.unmapped.ReturnCode": "keyword",
      // "gulp.unmapped.SamAccountName": "keyword",
      // "gulp.unmapped.Schema": "keyword",
      // "gulp.unmapped.SchemaFriendlyName": "keyword",
      // "gulp.unmapped.ScriptPath": "keyword",
      // "gulp.unmapped.SidHistory": "keyword",
      // "gulp.unmapped.Status": "keyword",
      // "gulp.unmapped.SubStatus": "keyword",
      // "gulp.unmapped.SystemTime": "keyword",
      // "gulp.unmapped.TargetInfo": "keyword",
      // "gulp.unmapped.TargetLinkedLogonId": "keyword",
      // "gulp.unmapped.TargetLogonGuid": "keyword",
      // "gulp.unmapped.TargetName": "keyword",
      // "gulp.unmapped.TargetOutboundDomainName": "keyword",
      // "gulp.unmapped.TargetOutboundUserName": "keyword",
      // "gulp.unmapped.TargetProcessId": "keyword",
      // "gulp.unmapped.TargetProcessName": "keyword",
      // "gulp.unmapped.TargetServerName": "keyword",
      // "gulp.unmapped.TargetSid": "keyword",
      // "gulp.unmapped.TargetUserName": "keyword",
      // "gulp.unmapped.TargetUserSid": "keyword",
      // "gulp.unmapped.Task": "keyword",
      // "gulp.unmapped.TestSigning": "keyword",
      // "gulp.unmapped.TokenElevationType": "keyword",
      // "gulp.unmapped.TransmittedServices": "keyword",
      // "gulp.unmapped.Type": "keyword",
      // "gulp.unmapped.UserAccountControl": "keyword",
      // "gulp.unmapped.UserParameters": "keyword",
      // "gulp.unmapped.UserPrincipalName": "keyword",
      // "gulp.unmapped.UserWorkstations": "keyword",
      // "gulp.unmapped.Version": "keyword",
      // "gulp.unmapped.VirtualAccount": "keyword",
      // "gulp.unmapped.VsmLaunchType": "keyword",
      // "gulp.unmapped.Workstation": "keyword",
      "log.file.path": "FileBox",
      // "powershell.provider.name": "keyword",
      // "process.executable": "keyword",
      // "process.parent.name": "keyword",
      // "process.pid": "long",
      // "process.thread.id": "long",
      // "source.domain": "keyword",
      "source.ip": "Location",
      // "user.domain": "keyword",
      // "user.id": "keyword",
      // "user.name": "keyword",
      // "winlog.channel": "keyword",
      // "winlog.computer_name": "keyword",
      // "winlog.logon.id": "keyword",
      // "winlog.record_id": "keyword"
    }

    return mapping[name] || 'Status';
  }

  export namespace Chooser {
    export interface Props {
      icon: λGlyph['id'] | null,
      setIcon: React.Dispatch<React.SetStateAction<λGlyph['id'] | null>>
    }
  }

  export const Chooser = ({ icon, setIcon }: Chooser.Props) => {
    const uploadGlyph = () => {
      toast.info('This is paid feature', {
        description: 'Leave 5 bucks in the disk drive of your PC',
      });
    }
  
    const map: Array<[λGlyph['id'] | null | undefined, Icon.Name]> = Array.from(Glyph.List.entries());
  
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={s.trigger}>
            <Button variant='ghost'>{icon ? Glyph.List.get(icon) : 'Choose icon'}</Button>
            <Button variant='glass' img={icon ? Glyph.List.get(icon) : 'SquareDashed'} />
          </div>
        </PopoverTrigger>
        <PopoverContent align='end' className={s.map}>
          {map.map(([k, n]) => {
            return <Button
              key={n}
              variant={k === icon ? 'default' : 'outline'}
              img={n}
              onClick={() => setIcon(k!)}
            />
          })}
          <Button className={s.upload} variant='hardline' img='Plus' onClick={uploadGlyph}>Upload</Button>
        </PopoverContent>
      </Popover>
    );
  }
}

