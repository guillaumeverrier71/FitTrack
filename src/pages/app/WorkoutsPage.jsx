import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useSession } from '../../context/SessionContext'
import TemplateCard from '../../components/workouts/TemplateCard'
import CreateTemplateModal from '../../components/workouts/CreateTemplateModal'
import ProgressTab from '../../components/workouts/ProgressTab'
import HistoryTab from '../../components/workouts/HistoryTab'
import { useLang } from '../../context/LangContext'

export default function WorkoutsPage() {
  const { templates, defaultTemplates, loading, refetch } = useWorkouts()
  const { startSession } = useSession()
  const { t } = useLang()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState('seances')
  const [search, setSearch] = useState('')

  const tabs = [
    { key: 'seances', label: t('workouts.tabSessions') },
    { key: 'progression', label: t('workouts.tabProgress') },
    { key: 'historique', label: t('workouts.tabHistory') },
  ]

  const filteredTemplates = search.trim()
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates
  const filteredDefaults = search.trim()
    ? defaultTemplates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : defaultTemplates

  return (
    <div className="pb-24 bg-gray-950 min-h-screen">
      <div className="flex items-center p-4">
        <h1 className="text-2xl font-bold text-white">{t('workouts.title')}</h1>
      </div>

      <div className="px-4 mb-4">
        <div className="relative flex bg-gray-900 rounded-2xl p-1">
          <div
            className="absolute top-1 bottom-1 w-1/3 bg-indigo-600 rounded-xl transition-transform duration-300 ease-in-out"
            style={{ transform: tab === 'seances' ? 'translateX(0)' : tab === 'progression' ? 'translateX(100%)' : 'translateX(200%)' }}
          />
          {tabs.map(tabItem => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 rounded-xl ${
                tab === tabItem.key ? 'text-white' : 'text-gray-500'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'seances' ? (
        <div className="px-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {(templates.length > 0 || defaultTemplates.length > 0) && (
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder={t('workouts.searchPlaceholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-gray-900 text-white rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm placeholder-gray-500"
                  />
                </div>
              )}

              {filteredTemplates.length > 0 && (
                <div className="flex flex-col gap-3">
                  {defaultTemplates.length > 0 && (
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{t('workouts.mySessions')}</p>
                  )}
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onStart={() => startSession(template)}
                      onDelete={refetch}
                      onDuplicate={refetch}
                    />
                  ))}
                </div>
              )}

              {filteredDefaults.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-1">{t('workouts.defaultSessions')}</p>
                  {filteredDefaults.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onStart={() => startSession(template)}
                      onDelete={refetch}
                      onDuplicate={refetch}
                    />
                  ))}
                </div>
              )}

              {search.trim() && filteredTemplates.length === 0 && filteredDefaults.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">{t('workouts.noSessionsFound', { search })}</p>
              )}

              {templates.length === 0 && defaultTemplates.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-20 gap-3">
                  <p className="text-gray-400 text-center">{t('workouts.noSessions')}</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
                  >
                    {t('workouts.createFirst')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : tab === 'progression' ? (
        <ProgressTab />
      ) : (
        <HistoryTab />
      )}

      {tab === 'seances' && templates.length + defaultTemplates.length > 0 && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg z-40 flex items-center gap-2 overflow-hidden transition-all duration-300 p-4 rounded-full hover:px-5 group"
        >
          <Plus size={24} className="shrink-0" />
          <span className="font-medium text-sm whitespace-nowrap max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden">
            {t('workouts.newSession')}
          </span>
        </button>
      )}

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}
