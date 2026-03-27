import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useSession } from '../../context/SessionContext'
import TemplateCard from '../../components/workouts/TemplateCard'
import CreateTemplateModal from '../../components/workouts/CreateTemplateModal'
import ProgressTab from '../../components/workouts/ProgressTab'

export default function WorkoutsPage() {
  const { templates, defaultTemplates, loading, refetch } = useWorkouts()
  const { startSession } = useSession()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState('seances')

  return (
    <div className="pb-24 bg-gray-950 min-h-screen">
      <div className="flex items-center p-4">
        <h1 className="text-2xl font-bold text-white">Entraînement</h1>
      </div>

      <div className="px-4 mb-4">
        <div className="relative flex bg-gray-900 rounded-2xl p-1">
          <div
            className="absolute top-1 bottom-1 w-1/2 bg-indigo-600 rounded-xl transition-transform duration-300 ease-in-out"
            style={{ transform: tab === 'seances' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          {[
            { key: 'seances', label: 'Séances' },
            { key: 'progression', label: 'Progression' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 rounded-xl ${
                tab === t.key ? 'text-white' : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'seances' ? (
        <div className="px-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-gray-400">Chargement...</p>
          ) : (
            <>
              {templates.length > 0 && (
                <div className="flex flex-col gap-3">
                  {defaultTemplates.length > 0 && (
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Mes séances</p>
                  )}
                  {templates.map(template => (
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

              {defaultTemplates.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-1">Séances types</p>
                  {defaultTemplates.map(template => (
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

              {templates.length === 0 && defaultTemplates.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-20 gap-3">
                  <p className="text-gray-400 text-center">Aucune séance pour l'instant.</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
                  >
                    Créer ma première séance
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <ProgressTab />
      )}

      {tab === 'seances' && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg z-40 flex items-center gap-2 overflow-hidden transition-all duration-300 p-4 rounded-full hover:px-5 group"
        >
          <Plus size={24} className="shrink-0" />
          <span className="font-medium text-sm whitespace-nowrap max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden">
            Nouvelle séance
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
