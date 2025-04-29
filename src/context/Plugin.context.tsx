import { ChangeEvent, createContext, lazy, ReactNode, useContext, useState } from "react";
import { Banner as UIBanner } from "@/ui/Banner";
import { Input } from "@impactium/components";
import * as esbuild from 'esbuild-wasm';
import { toast } from "sonner";
import { useApplication } from "./Application.context";

export function PluginProvider({ children }: Plugin.Provider.Props) {
  const { banner } = useApplication();
  const [plugins, setPlugins] = useState<Plugin.Interface[]>([]);
  const [initialized, setInitialized] = useState<boolean>(false);

  const initialize = async () => {
    if (initialized)
      return;

    await esbuild.initialize({
      wasmURL: "/esbuild.wasm",
      worker: true
    })

    setInitialized(true);
  };

  const add = (plugin: Plugin.Interface) => {
    setPlugins(plugins => {
      plugins.push(plugin);

      return plugins
    });
  }

  const parse = async (raw: string) => {
    await initialize();

    const result = await esbuild.transform(raw, {
      loader: "tsx",
      jsx: "transform",
      target: "es2017",
      format: "esm"
    });

    const blob = new Blob([result.code], { type: "application/javascript" })
    const url = URL.createObjectURL(blob)

    const promise = import(/* @vite-ignore */ url);

    const LazyComponent = lazy(() => promise);

    return {
      name: 'Plugin | A',
      component: <LazyComponent />,
      parent: "root",
      raw
    } satisfies Plugin.Interface;
  }

  const pluginProps: Plugin.Export = {
    add,
    parse,
    plugins
  };

  return (
    <Plugin.Context.Provider value={pluginProps}>
      {children}
      {banner}
    </Plugin.Context.Provider>
  );
};

export namespace Plugin {
  export interface Interface {
    name: string;
    component?: ReactNode;
    parent: string;
    raw: string;
  }

  export const Context = createContext<Plugin.Export | undefined>(undefined);

  export interface Export {
    add: (plugin: Plugin.Interface) => void;
    parse: (str: string) => Promise<Plugin.Interface>;
    plugins: Plugin.Interface[];
  }

  export const use = () => {
    const ctx = useContext(Plugin.Context);
    if (!ctx) throw new Error("Plugin.Context not found. Wrap your component in <PluginProvider>");
    return ctx;
  };

  export namespace Provider {
    export interface Props {
      children: ReactNode
    }
  }

  export namespace Upload {
    export namespace Banner {
      export interface Props extends UIBanner.Props {

      }
    }

    export function Banner({ ...props }: Plugin.Upload.Banner.Props) {
      const { plugins, parse, add } = Plugin.use();
      const [loading, setLoading] = useState<boolean>(false);


      const pluginInputChangeHandler = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
          return toast.error('Select plugin file with .tsx extension');
        }

        setLoading(true);

        const raw = await file.text();

        const plugin = await parse(raw);

        add(plugin);

        setLoading(false);
      }

      return (
        <UIBanner title='Upload plugin component' loading={loading} {...props}>
          <Input variant='highlighted' img='Puzzle' type='file' placeholder='Upload plugin' onChange={pluginInputChangeHandler} />
          {plugins.map(plugin => plugin.component || null)}
        </UIBanner>
      )
    }
  }
}