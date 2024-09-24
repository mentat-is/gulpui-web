import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Banner } from "@/ui/Banner";
import { Checkbox } from "@/ui/Checkbox";
import s from './styles/SelectContextBanner.module.css';
import { Badge } from "@/ui/Badge";
import { Label } from "@/ui/Label";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Button } from "@/ui/Button";
import { Context, Plugin, Operation, Arrayed } from "@/class/Info";
import { UUID } from "crypto";
import { IngestBanner } from "./IngestBanner";
import { useEffect } from "react";

export function SelectContextBanner() {
  const { app, spawnBanner, destroyBanner, Info } = useApplication();
  const { lang } = useLanguage();

  useEffect(() => {
    if (!app.general.ingest.length) {
      Info.mapping_file_list();
    }
  }, [app.general.ingest])

  const handle = (checked: CheckedState, cu: Arrayed<UUID>, pu?: UUID, fu?: UUID): void => {
    if (fu) {
      const files = app.target.files.map(f =>
        f.uuid === fu ? { ...f, selected: !!checked } : f
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
        p.uuid === pu ? { ...p, selected: !!checked } : p
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
    handle(true, app.target.contexts.map(context => context.uuid));
    destroyBanner();
  }

  return (
    <Banner title={lang.select_context.title} loading={!Operation.selected(app)?.contexts}>
    <div className={s.wrapper}>
      {Operation.contexts(app).length ? Operation.contexts(app).map(context => (
        <div className={s.context} key={context.name}>
          <div className={s.contextHeading}>
            <Checkbox id={context.name} checked={Context.plugins(app, context).every(p => p.selected) ? true : (Context.plugins(app, context).some(p => p.selected) ? 'indeterminate' : false)} onCheckedChange={checked => handle(checked, context.uuid)} />
            <Label htmlFor={context.name}>{context.name}</Label>
            <Badge value='Context' />
          </div>
          {Context.plugins(app, context).map((plugin, pluginIndex) => (
            <div className={s.plugin} key={pluginIndex}>
              <div className={s.pluginHeading}>
                <Checkbox id={plugin.name} checked={Plugin.files(app, plugin).map(f => f.selected).filter(f => !!f).length === Plugin.files(app, plugin).length ? true : Plugin.files(app, plugin).map(f => f.selected).filter(f => !!f).length > 0 ? 'indeterminate' : false} onCheckedChange={checked => handle(checked, context.uuid, plugin.uuid)} />
                <Label htmlFor={plugin.name}>{plugin.name}</Label>
                <Badge value='Plugin' variant='secondary' />
              </div>
              {Plugin.files(app, plugin).map((file, fileIndex) => (
                <div key={fileIndex} className={s.file}>
                  <Checkbox id={file.name} checked={file.selected} onCheckedChange={checked => handle(checked, context.uuid, plugin.uuid, file.uuid)} />
                  <Label htmlFor={file.name}>{file.name}</Label>
                  <Badge value='File' variant='outline' />
                </div>
              ))}
            </div>
          ))}
        </div>
      )) : (() => spawnBanner(<IngestBanner />) as never)()}
      </div>
      <div className={s.group}>
        <Button variant='secondary' onClick={selectAll}>Select all</Button>
        <Button onClick={destroyBanner}>Save</Button>
      </div>
    </Banner>
  );
}
