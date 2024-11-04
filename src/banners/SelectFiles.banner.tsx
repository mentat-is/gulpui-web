import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Banner } from "@/ui/Banner";
import { Checkbox } from "@/ui/Checkbox";
import s from './styles/SelectFilesBanner.module.css';
import { Badge } from "@/ui/Badge";
import { Label } from "@/ui/Label";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Button } from "@/ui/Button";
import { Context, Plugin, Operation, File, Event } from "@/class/Info";
import { UUID } from "crypto";
import { useState } from "react";
import { Input } from "@/ui/Input";
import React from "react";
import { Separator } from "@/ui/Separator";
import { LimitsBanner } from "./Limits.banner";

export function SelectFilesBanner() {
  const { app, destroyBanner, Info, spawnBanner } = useApplication();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handle = (checked: CheckedState, cu: Array<UUID>, pu?: Array<UUID>, fu?: Array<UUID>): void => {
    if (fu) {
      const files = app.target.files.map(f =>
        fu.includes(f.uuid) ? { ...f, selected: !!checked } : f
      );
  
      const plugins = app.target.plugins.map(p =>
        files.some(f => f._uuid === p.uuid) ? { ...p, selected: true } : { ...p, selected: false }
      );
  
      const contexts = app.target.contexts.map(c =>
        plugins.some(p => p._uuid === c.uuid) ? { ...c, selected: true } : { ...c, selected: false }
      );
  
      Info.files_set(files);
      Info.plugins_set(plugins);
      Info.contexts_set(contexts);
      return;
    }
  
    if (pu) {
      const plugins = app.target.plugins.map(p =>
        pu.includes(p.uuid) ? { ...p, selected: !!checked } : p
      );
  
      const files = app.target.files.map(f =>
        Plugin.selected(plugins).some(p => p.uuid === f._uuid) ? { ...f, selected: true } : { ...f, selected: false }
      );
  
      const contexts = app.target.contexts.map(c =>
        Context.plugins(app, c).some(p => p._uuid === c.uuid) ? { ...c, selected: true } : { ...c, selected: false }
      );
  
      Info.plugins_set(plugins);
      Info.files_set(files);
      Info.contexts_set(contexts);
      return;
    }

    const contexts = app.target.contexts.map(c => {
      if (cu.includes(c.uuid)) {
        return ({...c, selected: !!checked })
      } else {
        return c
      }
    })

    Info.contexts_set(contexts);

    const plugins = app.target.plugins.map(p =>
      Context.selected(contexts).some(c => c.uuid === p._uuid) ? { ...p, selected: true } : { ...p, selected: false }
    );
  
    Info.plugins_set(plugins);
  
    const files = app.target.files.map(f =>
      Plugin.selected(plugins).some(p => p.uuid === f._uuid) ? { ...f, selected: true } : { ...f, selected: false }
    );
  
    Info.files_set(files);
  };
 
  const selectAll = () => {
    if (filter) {
      const files = app.target.files.filter(file => file.name.toLowerCase().includes(filter.toLowerCase()));
      const fu = files.map(file => file.uuid);
      const pu = files.map(file => file._uuid);
      const cu = pu.map(p => Context.findByPugin(app, p)!.uuid);
      return handle(true, cu, pu, fu);
    }
    handle(true, app.target.contexts.map(context => context.uuid));
  }

  const save = () => {
    setLoading(true);
    const unfetched = File.selected(app).filter(file => Event.get(app, file.uuid).length === 0).map(file => file.uuid || Event.get(app, file.uuid).length < file.doc_count);

    if (unfetched.length && app.target.bucket.selected) {
      return Info.refetch({
        uuids: unfetched
      }).then(destroyBanner);
    }

    spawnBanner(<LimitsBanner />);
  }

  return (
    <Banner title={lang.select_context.title} loading={!Operation.selected(app)?.contexts} fixed={loading}>
    <div className={s.wrapper}>
      <Input img='Search' placeholder='Filter files by name' value={filter} onChange={(e) => setFilter(e.target.value)} />
      {!filter.length ? Operation.contexts(app).map(context => (
        <div className={s.context} key={context.uuid}>
          <div className={s.contextHeading}>
            <Checkbox id={context.name} checked={Context.plugins(app, context).every(p => p.selected) ? true : (Context.plugins(app, context).some(p => p.selected) ? 'indeterminate' : false)} onCheckedChange={checked => handle(checked, [context.uuid])} />
            <Label htmlFor={context.name}>{context.name}</Label>
            <Badge value='Context' />
          </div>
          {Context.plugins(app, context).map(plugin => (
            <div className={s.plugin} key={plugin.uuid}>
              <div className={s.pluginHeading}>
                <Checkbox id={plugin.name} checked={Plugin.files(app, plugin).map(f => f.selected).filter(f => !!f).length === Plugin.files(app, plugin).length ? true : Plugin.files(app, plugin).map(f => f.selected).filter(f => !!f).length > 0 ? 'indeterminate' : false} onCheckedChange={checked => handle(checked, [context.uuid], [plugin.uuid])} />
                <Label htmlFor={plugin.name}>{plugin.name}</Label>
                <Badge value='Plugin' variant='secondary' />
              </div>
              {Plugin.files(app, plugin).map((file, i) => (
                <React.Fragment key={i}>
                  {i !== 0 && <Separator color='var(--accent-3)' />}
                  <div key={file.uuid} className={s.file}>
                    <Checkbox id={file.name} checked={file.selected} onCheckedChange={checked => handle(checked, [context.uuid], [plugin.uuid], [file.uuid])} />
                    <Label htmlFor={file.name}>{file.name}</Label>
                    <Badge value='File' variant='outline' />
                  </div>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      )) : app.target.files.filter(file => file.name.toLowerCase().includes(filter.toLowerCase())).map(file => (
        <div key={file.uuid} className={s.file}>
          <Checkbox id={file.name} checked={file.selected} onCheckedChange={checked => handle(checked, [Context.findByPugin(app, file._uuid)!.uuid], [file._uuid], [file.uuid])} />
          <Label htmlFor={file.name}>{file.name}</Label>
          <Badge value='File' variant='outline' />
      </div>
      ))}
      </div>
      <div className={s.group}>
        <Button variant='outline' onClick={selectAll}>Select all</Button>
        <Button loading={loading} onClick={save}>Save</Button>
      </div>
    </Banner>
  );
}
