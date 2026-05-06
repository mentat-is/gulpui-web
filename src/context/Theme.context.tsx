import { Color } from '@/entities/Color';
import { Switch } from '@/ui/Switch';
import { Select } from '@/ui/Select';
import { loadThemesFromDirectory, getThemeNames } from '@/themes/index';
import { SwitchProps } from '@radix-ui/react-switch';
import { ThemeProvider, useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'

const THEMES: string[] = getThemeNames();

const DEFAULT_THEME = THEMES.includes('solarized-light')
  ? 'solarized-light'
  : THEMES[0] ?? 'solarized-light';

/** Syncs Color.Themer with the active next-themes value on mount and changes. */
function ThemeInitializer() {
  const { theme } = useTheme();

  useEffect(() => {
    loadThemesFromDirectory();
  }, []);

  useEffect(() => {
    if (theme) Color.Themer.setTheme(theme);
  }, [theme]);

  return null;
}

function _({ children }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider attribute="data-theme" defaultTheme={DEFAULT_THEME} themes={THEMES}>
      <ThemeInitializer />
      {children}
    </ThemeProvider>
  )
}

export namespace Theme {
  export function Switcher({ ...props }: Theme.Switcher.Props) {
    const { theme, setTheme } = useTheme();
    const activeTheme = theme ?? DEFAULT_THEME;
    const activeIndex = THEMES.indexOf(activeTheme);
    const safeIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextTheme = THEMES[(safeIndex + 1) % THEMES.length];

    const themeSwitchHandler = useCallback(() => {
      setTheme(nextTheme);
      Color.Themer.setTheme(nextTheme);
    }, [nextTheme, setTheme]);

    return (
      <Switch onCheckedChange={themeSwitchHandler} checked={safeIndex > 0} icons={['Sun', 'Moon']} {...props} />
    )
  }

  export namespace Switcher {
    export interface Props extends SwitchProps { };
  }

  export function Selector() {
    const { theme, setTheme } = useTheme();

    const handleThemeChange = useCallback((value: string) => {
      setTheme(value);
      Color.Themer.setTheme(value);
    }, [setTheme]);

    return (
      <Select.Root value={theme ?? DEFAULT_THEME} onValueChange={handleThemeChange}>
        <Select.Trigger data-no-icon>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {THEMES.map(name => (
            <Select.Item key={name} value={name}>{name}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  }

  export const Provider = _;
}
