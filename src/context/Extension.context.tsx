import { createContext, lazy, ReactNode, Suspense, useContext, useEffect, useState } from "react";
import * as esbuild from 'esbuild-wasm';
import { useApplication } from "./Application.context";
import React from "react";
import { GulpDataset } from "@/class/Info";
import { Logger } from "@/dto/Logger.class";
import { Skeleton } from "@impactium/components";

const __component = Symbol('λ_extension_component');

const KNOWN_EXTENSIONS: Record<string, Pick<Extension.Interface, 'type'>> = {
  'SigmaZip.banner': {
    type: []
  },
  'ExportTimeline.banner': {
    type: ['menu']
  }
} as const;

export function ExtensionProvider({ children }: Extension.Provider.Props) {
  const { Info, app } = useApplication();
  const { banner } = useApplication();
  const [extensions, setExtensions] = useState<Record<string, Extension.Interface>>({});
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    const new_extensions: typeof extensions = {};
    const plugins = Info.app.target.plugins.filter(p => p.tags.includes('extension'))
    for (const index in plugins) {
      const plugin = plugins[index];

      remote(plugin).then(e => {
        if (!e) {
          return;
        }

        new_extensions[plugin.filename] = e;
      });
    }

    for (const plugin in KNOWN_EXTENSIONS) {
      const extension = KNOWN_EXTENSIONS[plugin];
      const Component = Extension.safe(() => import(`@/plugins/${plugin}`));

      const Compiled = <Component />;
      if (Compiled) {
        Logger.log(`Component ${plugin} has been successfully loaded and memorized`);
      }

      new_extensions[plugin] = {
        ...extension,
        [__component]: Component
      }
    }

    setExtensions(new_extensions);
  }, [app.target.plugins]);

  const initialize = async () => {
    if (initialized)
      return;

    await esbuild.initialize({
      wasmURL: "/esbuild.wasm",
      worker: true
    })

    setInitialized(true);
  };

  const parse = async (raw: string): Promise<React.LazyExoticComponent<React.ComponentType<any>>> => {
    await initialize();

    const { code } = await esbuild.transform(raw, {
      loader: 'tsx',
      jsx: "transform",
      target: "es2017"
    });

    const blob = new Blob([code], { type: 'application/javascript' });

    const url = URL.createObjectURL(blob);

    return React.lazy(() => import(/* webpackIgnore: true */ url));
  }

  const remote = async (plugin: GulpDataset.PluginList.Interface): Promise<Extension.Interface | undefined> => {
    const { type, content } = await api<{
      type: Extension.Type[],
      content: string,
    }>(`/extension_chunk`, {
      method: 'GET',
      query: {
        plugin: plugin.filename
      }
    });

    const component = await parse(content);

    return {
      type,
      [__component]: component,
    };
  }

  // const local = async (name: string): Promise<Extension.Interface | undefined> => {
  //   try {
  //     const response2 = await fetch(`/plugins/${name}.tsx`);

  //     const data2 = await response2.text();

  //     const component = await parse(data2);

  //     return {
  //       type: ['menu'],
  //       [__component]: component,
  //     };
  //   } catch (e: any) {
  //     Logger.error(e);
  //   }
  // }

  const extensionProps: Extension.Export = {
    extensions
  };

  return (
    <Extension.Context.Provider value={extensionProps}>
      {children}
      {banner}
    </Extension.Context.Provider>
  );
};

export namespace Extension {
  export type Type = 'menu' | 'banner';

  export interface Interface {
    type: Type[]
    [__component]: React.LazyExoticComponent<React.ComponentType<any>> | ((props: any) => React.JSX.Element);
  }

  export const Context = createContext<Extension.Export | undefined>(undefined);

  export interface Export {
    extensions: Record<string, Extension.Interface>
  }

  export const use = () => {
    const ctx = useContext(Extension.Context);
    if (!ctx) throw new Error("Extension.Context not found");
    return ctx;
  };

  export namespace Provider {
    export interface Props {
      children: ReactNode
    }
  }

  export const safe = (func: () => Promise<{ default: React.ComponentType<any> }>) => lazy(async () => {
    try {
      return await func();
    } catch (error) {
      Logger.log('Component not found or failed to load:', String(error));
      return { default: () => null };
    }
  })

  export namespace Component {
    export interface Props {
      name: string;
    }
  }

  export function Component({ name }: Extension.Component.Props) {
    const { extensions } = Extension.use();
    const extension = extensions[name];
    if (!extension) {
      Logger.error(`Extenstion ${name} not found in plugin list. Skipping...`)
      return null;
    }

    const Component = extension[__component];
    if (!Component) {
      Logger.error(`Extenstion ${name} was found in plugin list, but there is no component. Skipping...`)
      return null;
    }

    return (
      <Component useApplication={useApplication} />
    )
  }

  export namespace Components {
    export interface Props {
      type: Type
    }
  }

  export function Components({ type }: Components.Props) {
    const { extensions } = Extension.use();

    return Object.keys(extensions).filter(name => extensions[name].type.includes(type)).map(name => <Extension.Component name={name} />);
  }
}
