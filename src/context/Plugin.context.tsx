import { createContext, ReactNode, Suspense, useContext, useEffect, useState } from "react";
import * as esbuild from 'esbuild-wasm';
import { toast } from "sonner";
import { useApplication } from "./Application.context";
import React from "react";

const __component = Symbol('λ_plugin_component');

export function PluginProvider({ children }: Plugin.Provider.Props) {
  const { Info } = useApplication();
  const { banner } = useApplication();
  const [plugins, setPlugins] = useState<Plugin.Interface[]>([]);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (Info.User.isAuthorized()) {
      Info.plugin_list();
    }
  }, [Info.app.general.id]);

  const initialize = async () => {
    if (initialized)
      return;

    await esbuild.initialize({
      wasmURL: "/esbuild.wasm",
      worker: true
    })

    setInitialized(true);
  };

  const get = () => {

  }

  const parse = async (mapping: Plugin.Mapping, raw: string): Promise<React.LazyExoticComponent<React.ComponentType<any>>> => {
    await initialize();

    const { code } = await esbuild.transform(raw, {
      loader: mapping.entry.endsWith('.jsx') ? 'jsx' : 'tsx',
      jsx: "transform",
      target: "es2017"
    });

    const blob = new Blob([code], { type: 'application/javascript' });

    const url = URL.createObjectURL(blob);

    return React.lazy(() => import(/* webpackIgnore: true */ url));
  }

  const validate = (object: Record<string, string>): {
    mapping: Plugin.Mapping,
    error: (() => void) | null;
  } => {
    const mapping = object as unknown as Plugin.Mapping;

    return { mapping, error: null };
  }

  const error = (error: string) => {
    toast.error(error.toString(), {
      richColors: true
    });
  }

  const load = async (name: string): Promise<Plugin.Interface | undefined> => {
    try {
      const mapping = await api<Plugin.Mapping>(`/client_plugin_package/${name}`);

      const response2 = await api<string>(`/client_plugin_data/${name}`, {
        raw: true
      });

      const component = await parse(mapping, response2.data as string);

      return {
        ...mapping,
        [__component]: component,
      };
    } catch (e: any) {
      console.error(e);
      error(e);
    }
  }

  const loadAll = async () => {
    const app_plugins = Info.app.target.plugins.filter(p => p.tags.includes('extension'))
    for (const key in app_plugins) {
      const name = app_plugins[key];

      const plugin = await load(name.path);

      if (plugin) {
        plugins.push(plugin);
      }
    }

    setPlugins(plugins);
  }

  useEffect(() => {
    // loadAll()
  }, []);

  const pluginProps: Plugin.Export = {
    parse,
    plugins,
    add: function (plugin: Plugin.Interface): void {
      throw new Error("Function not implemented.");
    }
  };

  return (
    <Plugin.Context.Provider value={pluginProps}>
      {children}
      {banner}
    </Plugin.Context.Provider>
  );
};

export namespace Plugin {
  export interface Interface extends Mapping {
    [__component]: React.LazyExoticComponent<React.ComponentType<any>>;
  }

  export interface Mapping {
    name: string;
    entry: string;
    type: string;
    placement: 'menu'
  }

  export const Context = createContext<Plugin.Export | undefined>(undefined);

  export interface Export {
    add: (plugin: Plugin.Interface) => void;
    parse: (mapping: Plugin.Mapping, raw: string) => Promise<Function>;
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

  export namespace Component {
    export interface Props {
      plugin: Plugin.Interface;
    }
  }

  export function Component({ plugin }: Plugin.Component.Props) {
    const Component = plugin[__component];
    if (!Component) {
      return null;
    }

    return <Component React={React} useApplication={useApplication} />
  }
}
