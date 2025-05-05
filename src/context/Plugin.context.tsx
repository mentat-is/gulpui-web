import { createContext, ReactNode, Suspense, useContext, useEffect, useState } from "react";
import * as esbuild from 'esbuild-wasm';
import { toast } from "sonner";
import { useApplication } from "./Application.context";
import React from "react";

const __component = Symbol('λ_plugin_component');

export function PluginProvider({ children }: Plugin.Provider.Props) {
  const x = ['some_crazy_plugin'];

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

  const load = async (name: string) => {
    try {
      const response = await fetch(`/plugins/${name}/mapping.json`);

      const data = await response.json();

      const { mapping, error } = validate(data)
      if (error !== null) {
        error();
        return void 0;
      }

      const response2 = await fetch(`/plugins/${name}/${mapping.entry}`);

      const data2 = await response2.text();

      const component = await parse(mapping, data2);

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
    const plugins: Plugin.Interface[] = []
    for (const key in x) {
      const name = x[key];

      const plugin = await load(name);

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
  export interface Interface extends Mapping {
    [__component]: React.LazyExoticComponent<React.ComponentType<any>>;
  }

  export interface Mapping {
    name: string;
    entry: string;
    type: 'menu'
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

  export function All({ type }: {
    type: Mapping['type']
  }) {
    const { plugins } = Plugin.use();

    return plugins
      .filter(plugin => plugin.type === type)
      .map(plugin => <Plugin.Component plugin={plugin} />);
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
