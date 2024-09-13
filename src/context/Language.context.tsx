import { locale } from './locale';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { cookieSettings } from '../decorator/cookieSettings';
import Cookies from 'universal-cookie'
interface Translations {
  [key: string]:
    | string
    | string[]
    | Record<string, string>
    | any;
}

interface ILanguageContext {
  lang: Translations;
  setLanguage: (language: string) => void;
  language: string;
  refreshLanguage: () => void;
}

const LanguageContext = createContext<ILanguageContext | undefined>(undefined) || (() => { throw new Error('Хуй') })();

export const useLanguage = (): ILanguageContext => useContext(LanguageContext)!;

function validate(languageCode?: string) {
  return !languageCode || !['us', 'it'].includes(languageCode) ? 'us' : languageCode;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const cookie = new Cookies()
  const [language, setLanguage] = useState<string>(cookie.get('_language') || validate());

  useEffect(() => {
    cookie.set('_language', language, cookieSettings)
  }, [language]);

  const refreshLanguage = () => setLanguage(cookie.get('_language') || 'us');

  function getLanguagePack(languageCode: string = 'us'): Translations {
    const translations: Translations = {};
    languageCode = validate(languageCode);
  
    for (const key in locale) {
      const prop: any = locale[key];
  
      if (Array.isArray(prop)) {
        translations[key] = prop.map((item: any) => item[languageCode]);
      } else if (typeof prop === 'string') {
        translations[key] = prop;
      } else if (typeof prop === 'object' && prop?.[languageCode]) {
        translations[key] = prop[languageCode];
      } else {
        const nestedTranslations: Record<string, string> = {};
        for (const nestedKey in prop) {
          if (prop?.[nestedKey]?.[languageCode]) {
            nestedTranslations[nestedKey] = prop[nestedKey][languageCode];
          }
        }
        translations[key] = nestedTranslations;
      }
    }
    return translations;
  }

  const props: ILanguageContext = {
    lang: getLanguagePack(language),
    setLanguage,
    refreshLanguage,
    language
  };

  return (
    <LanguageContext.Provider value={props}>
      {children}
    </LanguageContext.Provider>
  );
};