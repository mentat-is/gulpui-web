import { createContext, ReactNode, useContext } from "react";

export function PluginProvider({ children }: Plugin.Provider.Props) {
  const pluginProps: Plugin.Export = {
  };

  return (
    <Plugin.Context.Provider value={pluginProps}>
      {children}
    </Plugin.Context.Provider>
  );
};

export namespace Plugin {
  export const Context = createContext<Plugin.Export | undefined>(undefined);

  export interface Export {
  }

  export interface RequiredExport extends Plugin.Export {
    user: null
  }

  export const use = <T extends Plugin.Export = Plugin.Export>() => useContext(Plugin.Context)! as T;

  export namespace Provider {
    export interface Props {
      children: ReactNode
    }
  }
}