export type Engine = 'heatmap' | 'graph' | 'apache' | 'default';

export interface EngineMap {
  img: string;
  title: string;
  plugin: Engine;
}

export const enginesBase: EngineMap[] = [
  {
    img: 'bar/left',
    title: 'Default',
    plugin: 'default'
  },
  {
    img: 'chart/vertical',
    title: 'Heatmap',
    plugin: 'heatmap'
  },
  {
    img: 'share/android',
    title: 'Graph',
    plugin: 'graph'
  },
  {
    img: 'specific/code',
    title: 'Status codes',
    plugin: 'apache'
  }
]