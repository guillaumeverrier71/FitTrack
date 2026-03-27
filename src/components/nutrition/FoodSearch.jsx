import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, X, Clock, Globe, Loader } from 'lucide-react'

async function searchOpenFoodFacts(query) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?action=process&search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&fields=product_name,nutriments,code&page_size=10&lc=fr&cc=fr`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    return (data.products || [])
      .filter(p => p.product_name?.trim() && p.nutriments?.['energy-kcal_100g'] > 0)
      .map(p => ({
        id: `off_${p.code}`,
        name: p.product_name.trim(),
        calories_per_100g: Math.round(p.nutriments['energy-kcal_100g']),
        proteins_per_100g: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
        carbs_per_100g: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
        fats_per_100g: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
        unit: 'g',
        _off: true,
        _code: p.code,
      }))
  } catch {
    return []
  }
}

export default function FoodSearch({ category, onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [localResults, setLocalResults] = useState([])
  const [offResults, setOffResults] = useState([])
  const [offLoading, setOffLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('100')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCals, setCustomCals] = useState('')
  const [customProteins, setCustomProteins] = useState('')
  const [customCarbs, setCustomCarbs] = useState('')
  const [customFats, setCustomFats] = useState('')

  useEffect(() => {
    const fetchRecent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('meal_entries')
        .select('food_id, foods(id, name, calories_per_100g, proteins_per_100g, carbs_per_100g, fats_per_100g, unit)')
        .eq('user_id', user.id)
        .not('food_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        const unique = []
        const seen = new Set()
        data.forEach(d => {
          if (d.food_id && !seen.has(d.food_id)) {
            seen.add(d.food_id)
            unique.push(d.foods)
          }
        })
        setRecent(unique.slice(0, 5))
      }
    }
    fetchRecent()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setLocalResults([])
      setOffResults([])
      return
    }

    const timeout = setTimeout(async () => {
      // Recherche locale
      const { data } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10)
      setLocalResults(data || [])

      // Recherche OpenFoodFacts
      setOffLoading(true)
      const off = await searchOpenFoodFacts(query)
      // Filtrer les doublons avec les résultats locaux
      const localNames = new Set((data || []).map(f => f.name.toLowerCase()))
      setOffResults(off.filter(f => !localNames.has(f.name.toLowerCase())))
      setOffLoading(false)
    }, 400)

    return () => clearTimeout(timeout)
  }, [query])

  const handleSelect = (food) => {
    setSelected(food)
    setQuantity(food.unit === 'unité' ? '1' : '100')
  }

  const handleSelectOFF = async (food) => {
    // Sauvegarder dans la table foods pour les prochaines recherches
    const { data: existing } = await supabase
      .from('foods')
      .select('id, name, calories_per_100g, proteins_per_100g, carbs_per_100g, fats_per_100g, unit')
      .ilike('name', food.name)
      .limit(1)

    if (existing?.[0]) {
      handleSelect(existing[0])
    } else {
      const { data: inserted } = await supabase.from('foods').insert({
        name: food.name,
        calories_per_100g: food.calories_per_100g,
        proteins_per_100g: food.proteins_per_100g,
        carbs_per_100g: food.carbs_per_100g,
        fats_per_100g: food.fats_per_100g,
        unit: 'g',
      }).select().single()
      handleSelect(inserted || food)
    }
  }

  const calcMacro = (per100g, qty, isUnit) => {
    const multiplier = isUnit ? qty : qty / 100
    return Math.round(per100g * multiplier * 10) / 10
  }

  const handleAdd = () => {
    if (!selected) return
    const qty = parseFloat(quantity) || 1
    const isUnit = selected.unit === 'unité'
    const multiplier = isUnit ? qty : qty / 100

    onAdd({
      name: isUnit ? `${selected.name} × ${qty}` : `${selected.name} (${qty}g)`,
      calories: Math.round(selected.calories_per_100g * multiplier),
      proteins: Math.round(selected.proteins_per_100g * multiplier * 10) / 10,
      carbs: Math.round(selected.carbs_per_100g * multiplier * 10) / 10,
      fats: Math.round(selected.fats_per_100g * multiplier * 10) / 10,
      quantity_g: isUnit ? qty * 100 : qty,
      food_id: selected.id || null,
      category,
    })
  }

  const handleAddCustom = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: food } = await supabase.from('foods').insert({
      name: customName,
      calories_per_100g: parseFloat(customCals) || 0,
      proteins_per_100g: parseFloat(customProteins) || 0,
      carbs_per_100g: parseFloat(customCarbs) || 0,
      fats_per_100g: parseFloat(customFats) || 0,
      is_custom: true,
      user_id: user.id,
    }).select().single()

    if (food) handleSelect(food)
    setShowCustomForm(false)
  }

  const isUnit = selected?.unit === 'unité'
  const hasQuery = query.trim().length > 0
  const showRecent = !hasQuery && recent.length > 0
  const hasAnyResults = localResults.length > 0 || offResults.length > 0

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div className="bg-gray-900 w-full rounded-t-3xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold capitalize">Ajouter — {category}</h2>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        {selected ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-white font-semibold mb-1">{selected.name}</p>
              <p className="text-gray-400 text-xs">
                Pour {isUnit ? '1 unité' : '100g'} : {selected.calories_per_100g} kcal · {selected.proteins_per_100g}g prot · {selected.carbs_per_100g}g gluc · {selected.fats_per_100g}g lip
              </p>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">
                {isUnit ? 'Nombre d\'unités' : 'Quantité (g)'}
              </label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-lg"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: Math.round(calcMacro(selected.calories_per_100g, parseFloat(quantity) || 0, isUnit)), unit: 'kcal', color: 'text-orange-400' },
                { label: 'Protéines', value: calcMacro(selected.proteins_per_100g, parseFloat(quantity) || 0, isUnit), unit: 'g', color: 'text-blue-400' },
                { label: 'Glucides', value: calcMacro(selected.carbs_per_100g, parseFloat(quantity) || 0, isUnit), unit: 'g', color: 'text-yellow-400' },
                { label: 'Lipides', value: calcMacro(selected.fats_per_100g, parseFloat(quantity) || 0, isUnit), unit: 'g', color: 'text-red-400' },
              ].map(macro => (
                <div key={macro.label} className="bg-gray-800 rounded-xl p-2 text-center">
                  <p className={`font-bold text-sm ${macro.color}`}>{macro.value}</p>
                  <p className="text-gray-500 text-xs">{macro.unit}</p>
                  <p className="text-gray-600 text-xs">{macro.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 bg-gray-800 text-gray-400 font-semibold py-3 rounded-xl">
                Retour
              </button>
              <button onClick={handleAdd} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">
                Ajouter
              </button>
            </div>
          </div>
        ) : showCustomForm ? (
          <div className="flex flex-col gap-3 p-4 overflow-y-auto">
            <p className="text-gray-400 text-sm">Valeurs pour 100g</p>
            <input type="text" placeholder="Nom de l'aliment" value={customName} onChange={e => setCustomName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <input type="number" placeholder="Calories (kcal)" value={customCals} onChange={e => setCustomCals(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Protéines (g)" value={customProteins} onChange={e => setCustomProteins(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Glucides (g)" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Lipides (g)" value={customFats} onChange={e => setCustomFats(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-2">
              <button onClick={() => setShowCustomForm(false)} className="flex-1 bg-gray-800 text-gray-400 font-semibold py-3 rounded-xl">
                Retour
              </button>
              <button onClick={handleAddCustom} disabled={!customName || !customCals}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
                Créer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-3">
                <Search size={18} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher un aliment..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-transparent text-white outline-none flex-1 placeholder-gray-500"
                  autoFocus
                />
                {offLoading && <Loader size={16} className="text-gray-500 animate-spin shrink-0" />}
              </div>
              <button onClick={() => setShowCustomForm(true)} className="flex items-center gap-2 text-indigo-400 text-sm">
                <Plus size={16} /> Ajouter un aliment personnalisé
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
              {/* Récents */}
              {showRecent && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-gray-500 text-xs">Récents</span>
                  </div>
                  {recent.map(food => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelect} />
                  ))}
                </>
              )}

              {/* Résultats locaux */}
              {hasQuery && localResults.length > 0 && (
                <>
                  {localResults.map(food => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelect} />
                  ))}
                </>
              )}

              {/* Résultats OpenFoodFacts */}
              {hasQuery && offResults.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-2 mb-1">
                    <Globe size={14} className="text-indigo-500" />
                    <span className="text-indigo-400 text-xs">OpenFoodFacts</span>
                  </div>
                  {offResults.map(food => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelectOFF} isOff />
                  ))}
                </>
              )}

              {/* Aucun résultat */}
              {hasQuery && !offLoading && !hasAnyResults && (
                <p className="text-gray-500 text-sm text-center py-4">Aucun résultat pour "{query}"</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, onSelect, isOff = false }) {
  return (
    <button
      onClick={() => onSelect(food)}
      className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 text-left hover:bg-gray-700 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{food.name}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {food.calories_per_100g} kcal · {food.proteins_per_100g}g prot · {food.carbs_per_100g}g gluc · {food.fats_per_100g}g lip
          {food.unit === 'unité' ? ' (par unité)' : ' (par 100g)'}
        </p>
      </div>
      <Plus size={18} className={`ml-3 shrink-0 ${isOff ? 'text-indigo-400' : 'text-indigo-400'}`} />
    </button>
  )
}
