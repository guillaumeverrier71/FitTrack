import { createContext, useContext, useState, useCallback } from 'react'

const UnitContext = createContext(null)

export function useUnits() {
  return useContext(UnitContext)
}

// Conversion constants
const KG_TO_LBS = 2.20462
const LBS_TO_KG = 1 / KG_TO_LBS
const KCAL_TO_KJ = 4.184

function cmToFtIn(cm) {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${ft}'${inches}"`
}

export function UnitProvider({ children }) {
  const [weightUnit, setWeightUnitState] = useState(
    () => localStorage.getItem('unit_weight') || 'kg'
  )
  const [heightUnit, setHeightUnitState] = useState(
    () => localStorage.getItem('unit_height') || 'cm'
  )
  const [energyUnit, setEnergyUnitState] = useState(
    () => localStorage.getItem('unit_energy') || 'kcal'
  )

  const setWeightUnit = useCallback((u) => {
    localStorage.setItem('unit_weight', u)
    setWeightUnitState(u)
  }, [])

  const setHeightUnit = useCallback((u) => {
    localStorage.setItem('unit_height', u)
    setHeightUnitState(u)
  }, [])

  const setEnergyUnit = useCallback((u) => {
    localStorage.setItem('unit_energy', u)
    setEnergyUnitState(u)
  }, [])

  // Display a weight stored as kg
  const fmtWeight = useCallback((kg, decimals = 1) => {
    if (kg == null) return null
    if (weightUnit === 'lbs') {
      return `${(kg * KG_TO_LBS).toFixed(decimals)} lbs`
    }
    return `${parseFloat(kg).toFixed(decimals)} kg`
  }, [weightUnit])

  // Get raw weight value for input (stored kg → display unit)
  const toWeightDisplay = useCallback((kg) => {
    if (kg == null) return ''
    if (weightUnit === 'lbs') return (kg * KG_TO_LBS).toFixed(1)
    return parseFloat(kg).toFixed(1)
  }, [weightUnit])

  // Convert input value back to kg for storage
  const fromWeightInput = useCallback((val) => {
    const n = parseFloat(val)
    if (isNaN(n)) return null
    if (weightUnit === 'lbs') return n * LBS_TO_KG
    return n
  }, [weightUnit])

  // Display a height stored as cm
  const fmtHeight = useCallback((cm) => {
    if (cm == null) return null
    if (heightUnit === 'ftIn') return cmToFtIn(cm)
    return `${cm} cm`
  }, [heightUnit])

  // Display an energy value stored as kcal
  const fmtEnergy = useCallback((kcal) => {
    if (kcal == null) return null
    if (energyUnit === 'kj') return `${Math.round(kcal * KCAL_TO_KJ)} kJ`
    return `${Math.round(kcal)} kcal`
  }, [energyUnit])

  // Weight unit label (for placeholder/label)
  const weightLabel = weightUnit === 'lbs' ? 'lbs' : 'kg'
  // Energy unit label
  const energyLabel = energyUnit === 'kj' ? 'kJ' : 'kcal'

  return (
    <UnitContext.Provider value={{
      weightUnit, setWeightUnit,
      heightUnit, setHeightUnit,
      energyUnit, setEnergyUnit,
      fmtWeight,
      toWeightDisplay,
      fromWeightInput,
      fmtHeight,
      fmtEnergy,
      weightLabel,
      energyLabel,
    }}>
      {children}
    </UnitContext.Provider>
  )
}
