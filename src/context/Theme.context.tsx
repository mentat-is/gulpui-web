import { Color } from '@/entities/Color';
import { Switch } from '@/ui/Switch';
import { Select } from '@/ui/Select';
import { SwitchProps } from '@radix-ui/react-switch';
import { ThemeProvider, useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'

const THEMES: { value: string; label: string }[] = [
  { value: 'dark-old', label: 'Dark (Classic)' },
  { value: 'light-old', label: 'Light (Classic)' },
  { value: 'dark', label: 'Solarized Dark' },
  { value: 'light', label: 'Solarized Light' },
  { value: 'dracula', label: 'Dracula' },
];

/** Syncs Color.Themer with the active next-themes value on mount and changes. */
function ThemeInitializer() {
  const { theme } = useTheme();
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
    <ThemeProvider attribute="data-theme" defaultTheme='dark-old' themes={THEMES.map(t => t.value)}>
      <ThemeInitializer />
      {children}
    </ThemeProvider>
  )
}

export namespace Theme {
  export function Switcher({ ...props }: Theme.Switcher.Props) {
    const { theme, setTheme } = useTheme();

    const themeSwitchHandler = useCallback((isDark: boolean) => {
      const t = isDark ? 'light-old' : 'dark-old';
      setTheme(t);
      Color.Themer.setTheme(t);
    }, [setTheme]);

    return (
      <Switch onCheckedChange={themeSwitchHandler} checked={theme === 'light' || theme === 'light-old'} icons={['Sun', 'Moon']} {...props} />
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
      <Select.Root value={theme ?? 'dark-old'} onValueChange={handleThemeChange}>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {THEMES.map(t => (
            <Select.Item key={t.value} value={t.value}>{t.label}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  }

  export const Provider = _;
}
