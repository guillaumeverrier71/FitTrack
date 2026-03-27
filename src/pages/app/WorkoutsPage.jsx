import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useWorkouts } from '../../hooks/useWorkouts'
import TemplateCard from '../../components/workouts/TemplateCard'
import CreateTemplateModal from '../../components/workouts/CreateTemplateModal'
import WorkoutSession from '../../components/workouts/WorkoutSession'
import ProgressTab from '../../components/workouts/ProgressTab'

export default function WorkoutsPage() {
  const { templates, defaultTemplates, loading, refetch } = useWorkouts()
  const [showCreate, setShowCreate] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [tab, setTab] = useState('seances')
  const [fabExpanded, setFabExpanded] = useState(false)

  const handleFabClick = () => {
    setFabExpanded(true)
    setTimeout(() => {
      setShowCreate(true)
      setFabExpanded(false)
    }, 300)
  }

  if (activeSession) {
    return (
      <WorkoutSession
        template={activeSession}
        onFinish={() => setActiveSession(null)}
      />
    )
  }

  return (
    <div className="pb-24 bg-gray-950 min-h-screen">
      <div className="flex items-center p-4">
        <h1 className="text-2xl font-bold text-white">Entraînement</h1>
      </div>

      <div className="flex gap-2 px-4 mb-4">
        {[
          { key: 'seances', label: 'Séances' },
          { key: 'progression', label: 'Progression' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-900 text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'seances' ? (
        <div className="px-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-gray-400">Chargement...</p>
          ) : (
            <>
              {/* Séances types */}
              {defaultTemplates.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Séances types</p>
                  {defaultTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onStart={() => setActiveSession(template)}
                      onDelete={refetch}
                      onDuplicate={refetch}
                    />
                  ))}
                </div>
              )}

              {/* Séances personnelles */}
              {templates.length > 0 && (
                <div className="flex flex-col gap-3">
                  {defaultTemplates.length > 0 && (
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-1">Mes séances</p>
                  )}
                  {templates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onStart={() => setActiveSession(template)}
                      onDelete={refetch}
                      onDuplicate={refetch}
                    />
                  ))}
                </div>
              )}

              {/* État vide (pas de séances perso, pas de modèles) */}
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

      {/* Bouton flottant */}
      {tab === 'seances' && (
        <button
          onClick={handleFabClick}
          className={`fixed bottom-24 right-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg z-40 flex items-center gap-2 transition-all duration-300 ${
            fabExpanded
              ? 'px-5 py-4 rounded-full'
              : 'p-4 rounded-full'
          }`}
        >
          <Plus size={24} />
          {fabExpanded && <span className="font-medium text-sm whitespace-nowrap">Nouvelle séance</span>}
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