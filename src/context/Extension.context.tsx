import { createContext, lazy, ReactNode, useContext, useEffect, useState } from "react";
import { useApplication } from "./Application.context";
import React from "react";
import { Logger } from "@/dto/Logger.class";
import { Version } from "@/dto/Dataset";

const __component = Symbol('λ_extension_component');

export function ExtensionProvider({ children }: Extension.Provider.Props) {
  const { Info, app } = useApplication();
  const { banner } = useApplication();
  const [extensions, setExtensions] = useState<Record<string, Extension.Interface>>({});

  useEffect(() => {
    api<Extension.Interface[]>('/ui_plugin_list').then(plugins => {
      const new_extensions: typeof extensions = {};

      for (const plugin of plugins) {
        const Component = Extension.safe(() => import(`@/plugins/${plugin.filename}`));

        const Compiled = <Component />;
        if (Compiled) {
          Logger.log(`Component ${plugin.filename} has been successfully loaded and memorized`, ExtensionProvider);
        }

        new_extensions[plugin.filename] = {
          ...plugin,
          type: plugin.type ?? [],
          [__component]: Component
        }
      }

      setExtensions(new_extensions);
    })
  }, [app.target.plugins]);

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
    display_name: string,
    plugin: string,
    extension: boolean,
    version: Version,
    desc: string,
    path: string,
    filename: string
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
