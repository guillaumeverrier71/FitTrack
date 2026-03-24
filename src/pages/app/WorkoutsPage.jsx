import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useWorkouts } from '../../hooks/useWorkouts'
import TemplateCard from '../../components/workouts/TemplateCard'
import CreateTemplateModal from '../../components/workouts/CreateTemplateModal'
import WorkoutSession from '../../components/workouts/WorkoutSession'
import ProgressTab from '../../components/workouts/ProgressTab'

export default function WorkoutsPage() {
  const { templates, loading, refetch } = useWorkouts()
  const [showCreate, setShowCreate] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [tab, setTab] = useState('seances')

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
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold text-white">Entraînement</h1>
        {tab === 'seances' && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors"
          >
            <Plus size={22} />
          </button>
        )}
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
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 gap-3">
              <p className="text-gray-400 text-center">Aucune séance pour l'instant.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                Créer ma première séance
              </button>
            </div>
          ) : (
            templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onStart={() => setActiveSession(template)}
                onDelete={refetch}
              />
            ))
          )}
        </div>
      ) : (
        <ProgressTab />
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