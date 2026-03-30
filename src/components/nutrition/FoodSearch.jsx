import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, X, Clock, Globe, Loader, Camera, AlertCircle } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import { useLang } from '../../context/LangContext'

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

async function fetchByBarcode(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const n = p.nutriments || {}
    return {
      id: `off_${barcode}`,
      name: p.product_name || p.product_name_fr || null,
      calories_per_100g: Math.round(n['energy-kcal_100g'] || 0),
      proteins_per_100g: Math.round((n.proteins_100g || 0) * 10) / 10,
      carbs_per_100g: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      fats_per_100g: Math.round((n.fat_100g || 0) * 10) / 10,
      unit: 'g',
      _off: true,
      _code: barcode,
    }
  } catch {
    return null
  }
}

export default function FoodSearch({ category, onAdd, onClose }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [localResults, setLocalResults] = useState([])
  const [offResults, setOffResults] = useState([])
  const [offLoading, setOffLoading] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('100')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeError, setBarcodeError] = useState(null)
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
      const { data } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10)
      setLocalResults(data || [])

      setOffLoading(true)
      const off = await searchOpenFoodFacts(query)
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
    setSelecting(true)
    try {
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
        // Use inserted (valid DB id) or food without id to avoid FK violation
        handleSelect(inserted ? inserted : { ...food, id: null })
      }
    } finally {
      setSelecting(false)
    }
  }

  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false)
    setBarcodeError(null)
    const food = await fetchByBarcode(barcode)
    if (food) {
      food.name = food.name || t('nutrition.foodScanned')
      handleSelectOFF(food)
    } else {
      setBarcodeError(t('nutrition.foodNotFound', { code: barcode }))
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

  if (showScanner) {
    return <BarcodeScanner onDetect={handleBarcodeScan} onClose={() => setShowScanner(false)} />
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div className="bg-gray-900 w-full rounded-t-3xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold capitalize">{t('nutrition.foodSearchTitle', { cat: category })}</h2>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        {selected ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-white font-semibold mb-1">{selected.name}</p>
              <p className="text-gray-400 text-xs">
                {isUnit ? t('nutrition.foodForUnit') : t('nutrition.foodFor100g')} : {selected.calories_per_100g} kcal · {selected.proteins_per_100g}g {t('nutrition.foodProt')} · {selected.carbs_per_100g}g {t('nutrition.foodGluc')} · {selected.fats_per_100g}g {t('nutrition.foodLip')}
              </p>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">
                {isUnit ? t('nutrition.foodQuantityUnits') : t('nutrition.foodQuantityG')}
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
                { label: t('nutrition.foodCaloriesLabel'), value: Math.round(calcMacro(selected.calories_per_100g, parseFloat(quantity) || 0, isUnit)), unit: 'kcal', color: 'text-orange-400' },
                { label: t('nutrition.foodProteinsLabel'), value: calcMacro(selected.proteins_per_100g, parseFloat(quantity) || 0, isUnit), unit: 'g', color: 'text-blue-400' },
                { label: t('nutrition.foodCarbsLabel'), value: calcMacro(selected.carbs_per_100g, parseFloat(quantity) || 0, isUnit), unit: 'g', color: 'text-yellow-400' },
                { label: t('nutrition.foodFatsLabel'), value: calcMacro(selected.fats_per_100g, parseFloat(quantity) || 0, isUnit), unit: 'g', color: 'text-red-400' },
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
                {t('common.back')}
              </button>
              <button onClick={handleAdd} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">
                {t('nutrition.addMeal')}
              </button>
            </div>
          </div>
        ) : showCustomForm ? (
          <div className="flex flex-col gap-3 p-4 overflow-y-auto">
            <p className="text-gray-400 text-sm">{t('nutrition.foodCustomValues')}</p>
            <input type="text" placeholder={t('nutrition.foodCustomName')} value={customName} onChange={e => setCustomName(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <input type="number" placeholder={t('nutrition.foodCustomCals')} value={customCals} onChange={e => setCustomCals(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder={t('nutrition.foodCustomProteins')} value={customProteins} onChange={e => setCustomProteins(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder={t('nutrition.foodCustomCarbs')} value={customCarbs} onChange={e => setCustomCarbs(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder={t('nutrition.foodCustomFats')} value={customFats} onChange={e => setCustomFats(e.target.value)}
              className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-2">
              <button onClick={() => setShowCustomForm(false)} className="flex-1 bg-gray-800 text-gray-400 font-semibold py-3 rounded-xl">
                {t('common.back')}
              </button>
              <button onClick={handleAddCustom} disabled={!customName || !customCals}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
                {t('nutrition.foodCreate')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-3 flex-1">
                  <Search size={18} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    placeholder={t('nutrition.foodSearch') + '...'}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setBarcodeError(null) }}
                    className="bg-transparent text-white outline-none flex-1 placeholder-gray-500"
                    autoFocus
                  />
                  {offLoading && <Loader size={16} className="text-gray-500 animate-spin shrink-0" />}
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-3 rounded-xl transition-colors shrink-0"
                  title={t('nutrition.foodScanBarcode')}
                >
                  <Camera size={20} />
                </button>
              </div>

              {barcodeError && (
                <div className="flex items-center gap-2 text-orange-400 text-xs px-1">
                  <AlertCircle size={13} />
                  <span>{barcodeError}</span>
                </div>
              )}

              <button onClick={() => setShowCustomForm(true)} className="flex items-center gap-2 text-indigo-400 text-sm">
                <Plus size={16} /> {t('nutrition.foodAddCustom')}
              </button>
            </div>

            {selecting && (
              <div className="flex items-center justify-center py-4 gap-2 text-gray-400 text-sm">
                <Loader size={16} className="animate-spin" />
                {t('common.loading')}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
              {showRecent && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-gray-500 text-xs">{t('nutrition.foodRecent')}</span>
                  </div>
                  {recent.map(food => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelect} t={t} />
                  ))}
                </>
              )}

              {hasQuery && localResults.length > 0 && localResults.map(food => (
                <FoodRow key={food.id} food={food} onSelect={handleSelect} t={t} />
              ))}

              {hasQuery && offResults.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-2 mb-1">
                    <Globe size={14} className="text-indigo-500" />
                    <span className="text-indigo-400 text-xs">OpenFoodFacts</span>
                  </div>
                  {offResults.map(food => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelectOFF} t={t} />
                  ))}
                </>
              )}

              {hasQuery && !offLoading && !hasAnyResults && (
                <p className="text-gray-500 text-sm text-center py-4">{t('nutrition.foodNoResults', { query })}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, onSelect, t }) {
  return (
    <button
      onClick={() => onSelect(food)}
      className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 text-left hover:bg-gray-700 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{food.name}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {food.calories_per_100g} kcal · {food.proteins_per_100g}g {t('nutrition.foodProt')} · {food.carbs_per_100g}g {t('nutrition.foodGluc')} · {food.fats_per_100g}g {t('nutrition.foodLip')}
          {food.unit === 'unité' ? ` ${t('nutrition.foodPerUnit')}` : ` ${t('nutrition.foodPer100g')}`}
        </p>
      </div>
      <Plus size={18} className="text-indigo-400 ml-3 shrink-0" />
    </button>
  )
}
