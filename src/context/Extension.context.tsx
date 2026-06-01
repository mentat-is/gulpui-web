import { createContext, lazy, ReactNode, useContext, useEffect, useState, useRef } from "react";
import { Application } from "./Application.context";
import React from "react";
import { Version } from "@/dto/Dataset";
import { Icon } from "@impactium/icons";

const __component = Symbol('__extension_component');

let extensionsPromise: Promise<Record<string, Extension.Interface>> | null = null;

function _({ children }: Extension.Provider.Props) {
  const { app } = Application.use();
  const { banner } = Application.use();
  const [extensions, setExtensions] = useState<Record<string, Extension.Interface>>({});

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      extensionsPromise = (async () => {
        const plugins = await api<Extension.Interface[]>('/ui_plugin_list');
        if (!Array.isArray(plugins)) {
          console.error(`Backend returned unexpected type of ${plugins}. Expected array of plugins, but got ${typeof plugins}`, 'Extension.Provider', {
            richColors: true,
            icon: <Icon name='Warning' />
          });
          return {};
        }

        const new_extensions: Record<string, Extension.Interface> = {};

        await Promise.all(
          plugins.map(async (plugin) => {
            try {
              console.log(`Loading extension: ${plugin.filename}`, _);
              const Component = Extension.safe(() => import(`@/plugins/${plugin.filename}`));
              const component = await Component();

              if (!component) {
                console.error(`Failed to load component ${plugin.filename}: component is null`, _);
                return;
              }

              if (component.default) {
                console.log(`Component ${plugin.filename} has been successfully loaded and memorized`, _);
              } else {
                console.warn(`Component ${plugin.filename} loaded but has no default export`, _);
              }

              new_extensions[plugin.filename] = {
                ...plugin,
                type: Array.isArray(plugin.type) ? plugin.type : (plugin.type ? [plugin.type] : []),
                [__component]: component.default,
              };
            } catch (err) {
              console.error(`Failed to load component ${plugin.filename}: ${err}`, _);
            }
          })
        );

        return new_extensions;
      })();

      try {
        const data = await extensionsPromise;
        if (isMounted) {
          setExtensions(data);
        }
      } catch (err) {
        console.error('Failed to resolve extensions promise:', err);
      }
    };

    if (!extensionsPromise) {
      load();
    } else {
      extensionsPromise.then((data) => {
        if (isMounted) {
          setExtensions(data);
        }
      });
    }

    const handleServerChanged = () => {
      extensionsPromise = null;
      load();
    };

    window.addEventListener('gulp-server-changed', handleServerChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('gulp-server-changed', handleServerChanged);
    };
  }, []);


  const extensionProps: Extension.Export = {
    extensions
  };

  return (
    <Extension.Context.Provider value={extensionProps}>
      {children}
      {banner?.target === 'main' && banner.node}
    </Extension.Context.Provider>
  );
};

export namespace Extension {
  export type Type = 'menu' | 'banner' | 'send_data';

  export interface Interface {
    display_name: string,
    plugin: string,
    extension: boolean,
    version: Version,
    desc: string,
    path: string,
    filename: string
    type: Type[]
    [__component]: React.ComponentType<any> | ((props: any) => React.JSX.Element);
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

  export const Provider = _;

  export const safe = (func: () => Promise<{ default: React.ComponentType<any> }>) => async () => {
    try {
      return await func();
    } catch (error) {
      console.log('Component not found or failed to load:', String(error));
      return null;
    }
  }

  export namespace Component {
    export interface Props {
      name: string;
      props?: any;
    }
  }

  export function Component({ name, props }: Extension.Component.Props) {
    const { extensions } = Extension.use();
    const extension = extensions[name];
    if (!extension) {
      console.warn(`Extenstion ${name} not found in plugin list. Skipping...`)
      return null;
    }

    const Component = extension[__component];
    if (!Component) {
      console.error(`Extenstion ${name} was found in plugin list, but there is no component. Skipping...`)
      return null;
    }

    return (
      <Component {...props} />
    )
  }

  export namespace Optional {
    export interface Props {
      name: string;
      children: React.ReactNode;
    }
  }

  export function Optional({ name, children }: Extension.Optional.Props) {
    const { extensions } = Extension.use();
    const extension = extensions[name];
    if (!extension) {
      return null;
    }

    return children;
  }

  export namespace Components {
    export interface Props {
      type: Type
    }
  }

  export function Components({ type }: Components.Props) {
    const { extensions } = Extension.use();

    return Object.keys(extensions).filter(name => extensions[name].type.includes(type)).map(name => <Extension.Component key={name} name={name} />);
  }
}
