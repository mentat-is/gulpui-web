import { λIcon } from "@/ui/utils";

export type Engine = 'height' | 'graph' | 'apache' | 'default';

export interface EngineMap {
  img: λIcon;
  title: string;
  plugin: Engine;
}

export const enginesBase: EngineMap[] = [
  {
    img: 'Barcode',
    title: 'Default',
    plugin: 'default'
  },
  {
    img: 'AreaChart',
    title: 'HeightMap',
    plugin: 'height'
  },
  {
    img: 'Waypoints',
    title: 'Graph',
    plugin: 'graph'
  },
  {
    img: 'CodeXml',
    title: 'Status codes',
    plugin: 'apache'
  }
]
