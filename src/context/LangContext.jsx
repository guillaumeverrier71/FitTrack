import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from '../i18n/translations'

const LangContext = createContext(null)

function getNestedKey(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str
  return str.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('app_lang') || 'fr'
  })

  const setLang = useCallback((newLang) => {
    localStorage.setItem('app_lang', newLang)
    setLangState(newLang)
  }, [])

  const t = useCallback((key, params) => {
    const dict = translations[lang] || translations.fr
    const val = getNestedKey(dict, key)
    if (val === undefined) {
      // fallback to fr
      const frVal = getNestedKey(translations.fr, key)
      return interpolate(frVal ?? key, params)
    }
    return interpolate(val, params)
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
