import { createContext, useContext, useState } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null)
  const [sessionVisible, setSessionVisible] = useState(false)

  const startSession = (template) => {
    setActiveSession(template)
    setSessionVisible(true)
  }

  const minimizeSession = () => setSessionVisible(false)
  const resumeSession = () => setSessionVisible(true)

  const closeSession = () => {
    setActiveSession(null)
    setSessionVisible(false)
  }

  return (
    <SessionContext.Provider value={{ activeSession, sessionVisible, startSession, minimizeSession, resumeSession, closeSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
