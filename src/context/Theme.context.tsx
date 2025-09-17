import { Color } from '@/entities/Color';
import { Switch } from '@/ui/Switch';
import { SwitchProps } from '@radix-ui/react-switch';
import { ThemeProvider, useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'

export function ThemeProviders({ children }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider defaultTheme='dark'>
      {children}
    </ThemeProvider>
  )
}

export namespace Theme {
  export function Switcher({ ...props }: Theme.Switcher.Props) {
    const { theme, setTheme, ...p } = useTheme();

    const themeSwitchHandler = useCallback((isDark: boolean) => {
      const theme = isDark ? 'light' : 'dark';
      setTheme(theme);
      Color.Themer.setTheme(theme);
    }, [setTheme]);

    return (
      <Switch onCheckedChange={themeSwitchHandler} checked={theme === 'light'} icons={['Sun', 'Moon']} {...props} />
    )
  }

  export namespace Switcher {
    export interface Props extends SwitchProps { };
  }
}
