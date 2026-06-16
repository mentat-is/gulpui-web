import { Application } from "@/context/Application.context";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const defaultLanguage = "en";
export type Language = string;
export type LocaleDir = "ltr" | "rtl";

export interface LocaleDefinition {
  code: Language;
  label: string;
  dir: LocaleDir;
}

type LocaleTable = Record<string, string>;

declare const require: {
  context: (path: string, deep?: boolean, filter?: RegExp) => {
    keys: () => string[];
    <T = unknown>(id: string): T;
  };
};

const localeContext = () =>
  require.context("./", false, /^\.\/.+\.json$/);

function codeFromFile(file: string): Language {
  return file.replace(/^\.\//, "").replace(/\.json$/, "");
}

function normalizeModule(module: LocaleTable | { default: LocaleTable }): LocaleTable {
  const maybeDefault = (module as { default?: unknown }).default;
  return maybeDefault && typeof maybeDefault === "object" ? maybeDefault as LocaleTable : module as LocaleTable;
}

function normalizeDir(value: string | undefined): LocaleDir {
  return value === "rtl" ? "rtl" : "ltr";
}

function titleCaseCode(code: string): string {
  return code.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function loadLocaleTablesFromDirectory() {
  const context = localeContext();
  const tables: Record<Language, LocaleTable> = {};
  const locales = context.keys().map((file) => {
    const code = codeFromFile(file);
    const table = normalizeModule(context<LocaleTable | { default: LocaleTable }>(file));
    tables[code] = table;
    return {
      code,
      label: table["@label"] ?? titleCaseCode(code),
      dir: normalizeDir(table["@dir"]),
    };
  }).sort((left, right) => {
    if (left.code === defaultLanguage) return -1;
    if (right.code === defaultLanguage) return 1;
    return left.label.localeCompare(right.label);
  });

  return { tables, locales };
}

const loadedLocales = loadLocaleTablesFromDirectory();
const tables = loadedLocales.tables;
export const localeList: LocaleDefinition[] = loadedLocales.locales;
const localeByCode = Object.fromEntries(localeList.map((locale) => [locale.code, locale])) as Record<Language, LocaleDefinition>;

if (!tables[defaultLanguage]) {
  throw new Error(`Missing default locale: ${defaultLanguage}`);
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in tables;
}

export function resolveMessage(language: Language, key: string): string {
  return tables[language]?.[key] ?? tables[defaultLanguage][key] ?? key;
}

function formatMessage(message: string, vars?: Record<string, string | number>) {
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match));
}

export namespace Locale {
  export interface ContextValue {
    language: Language;
    dir: LocaleDir;
    setLanguage: (language: Language) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
  }

  export const Context = createContext<ContextValue>({
    language: defaultLanguage,
    dir: "ltr",
    setLanguage: () => {},
    t: (key) => resolveMessage(defaultLanguage, key),
  });

  export function Provider({ children }: { children: ReactNode }) {
    const { app, Info } = Application.use();
    const userLanguage = app.general.user?.user_data?.ui_language;
    const [language, setLanguageState] = useState<Language>(() => isLanguage(userLanguage) ? userLanguage : defaultLanguage);

    useEffect(() => {
      setLanguageState(isLanguage(userLanguage) ? userLanguage : defaultLanguage);
    }, [userLanguage]);

    const locale = localeByCode[language] ?? localeByCode[defaultLanguage] ?? { code: defaultLanguage, label: defaultLanguage, dir: "ltr" };

    useEffect(() => {
      document.documentElement.lang = language;
      document.documentElement.dir = locale.dir;
    }, [language, locale.dir]);

    const setLanguage = useCallback((next: Language) => {
      if (!isLanguage(next)) return;
      setLanguageState(next);
      if (app.general.user) {
        void Info.user_set_data("ui_language", next);
      }
    }, [Info, app.general.user]);

    const t = useCallback<ContextValue["t"]>(
      (key, vars) => formatMessage(resolveMessage(language, key), vars),
      [language],
    );

    const value = useMemo(() => ({
      language,
      dir: locale.dir,
      setLanguage,
      t,
    }), [language, locale.dir, setLanguage, t]);

    return <Locale.Context.Provider value={value}>{children}</Locale.Context.Provider>;
  }

  export const use = () => useContext(Locale.Context);
}
