import { useState } from 'react'
import { useLang } from '../../context/LangContext'
import { useUnits } from '../../context/UnitContext'
import { ChevronRight } from 'lucide-react'

export default function FirstLaunchScreen({ onDone }) {
  const { lang, setLang } = useLang()
  const { weightUnit, setWeightUnit, heightUnit, setHeightUnit, energyUnit, setEnergyUnit } = useUnits()
  const [step, setStep] = useState(0) // 0 = lang, 1 = units

  const handleDone = () => {
    localStorage.setItem('first_launch_done', '1')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center px-6 gap-8">
      {/* Progress dots */}
      <div className="flex gap-2 mb-2">
        {[0, 1].map(i => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-gray-700'}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div
            className="w-20 h-20 rounded-2xl"
            style={{ backgroundImage: 'url(/fitnavigator-logo.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">FitNavigator</h1>
            <p className="text-gray-400 text-sm">Choose your language · Choisissez votre langue</p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setLang('fr')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-colors ${lang === 'fr' ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900'}`}
            >
              <span className="text-2xl">🇫🇷</span>
              <span className={`font-medium ${lang === 'fr' ? 'text-white' : 'text-gray-300'}`}>Français</span>
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-colors ${lang === 'en' ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900'}`}
            >
              <span className="text-2xl">🇬🇧</span>
              <span className={`font-medium ${lang === 'en' ? 'text-white' : 'text-gray-300'}`}>English</span>
            </button>
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            {lang === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight size={20} />
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <div className="text-center w-full">
            <h2 className="text-2xl font-bold text-white mb-2">
              {lang === 'fr' ? 'Unités de mesure' : 'Units of measure'}
            </h2>
            <p className="text-gray-400 text-sm">
              {lang === 'fr' ? 'Tu pourras changer ça plus tard dans ton profil.' : 'You can change this later in your profile.'}
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {/* Poids */}
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-3">{lang === 'fr' ? 'Poids' : 'Weight'}</p>
              <div className="flex gap-2">
                {['kg', 'lbs'].map(u => (
                  <button key={u} onClick={() => setWeightUnit(u)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${weightUnit === u ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Taille */}
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-3">{lang === 'fr' ? 'Taille' : 'Height'}</p>
              <div className="flex gap-2">
                {[{ v: 'cm', l: 'cm' }, { v: 'ft', l: 'ft / in' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setHeightUnit(v)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${heightUnit === v ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Énergie */}
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-3">{lang === 'fr' ? 'Énergie' : 'Energy'}</p>
              <div className="flex gap-2">
                {['kcal', 'kJ'].map(u => (
                  <button key={u} onClick={() => setEnergyUnit(u)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${energyUnit === u ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleDone}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            {lang === 'fr' ? "C'est parti !" : "Let's go!"} <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  )
}
