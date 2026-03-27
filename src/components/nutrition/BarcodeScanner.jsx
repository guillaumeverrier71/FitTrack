import { useEffect, useRef, useState } from 'react'
import { X, Camera, ImageIcon } from 'lucide-react'

const SUPPORTED = 'BarcodeDetector' in window

export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const fileInputRef = useRef(null)
  const [error, setError] = useState(null)
  const [detected, setDetected] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Caméra en streaming (Android/Chrome)
  useEffect(() => {
    if (!SUPPORTED) return

    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    })

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    }).then(stream => {
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan)
          return
        }
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            setDetected(true)
            navigator.vibrate?.(100)
            cancelAnimationFrame(rafRef.current)
            streamRef.current?.getTracks().forEach(t => t.stop())
            onDetect(barcodes[0].rawValue)
            return
          }
        } catch {}
        rafRef.current = requestAnimationFrame(scan)
      }
      rafRef.current = requestAnimationFrame(scan)
    }).catch(() => {
      setError('Impossible d\'accéder à la caméra. Vérifie les permissions.')
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Fallback iOS : photo → décodage avec @zxing/browser
  const handleFileCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError(null)

    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageElement(img)
      URL.revokeObjectURL(url)
      navigator.vibrate?.(100)
      onDetect(result.getText())
    } catch {
      URL.revokeObjectURL(url)
      setError('Code-barres non reconnu. Essaie de reprendre la photo en tenant le produit bien stable.')
      setScanning(false)
    }
  }

  // UI iOS (fallback)
  if (!SUPPORTED) {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex flex-col">
        <div className="flex items-center justify-between p-4 shrink-0">
          <h2 className="text-white font-semibold">Scanner un code-barres</h2>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center">
            <Camera size={36} className="text-indigo-400" />
          </div>

          <div className="text-center">
            <p className="text-white font-semibold mb-2">Prendre une photo du code-barres</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Pointe l'appareil photo vers le code-barres du produit, en t'assurant qu'il est bien net et éclairé.
            </p>
          </div>

          {error && (
            <p className="text-orange-400 text-sm text-center">{error}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileCapture}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-8 py-4 rounded-2xl transition-colors"
          >
            {scanning ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Décodage en cours...
              </>
            ) : (
              <>
                <ImageIcon size={20} />
                Prendre une photo
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // UI streaming (Android/Chrome)
  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      <div className="flex items-center justify-between p-4 shrink-0">
        <h2 className="text-white font-semibold">Scanner un code-barres</h2>
        <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-gray-400 text-center text-sm leading-relaxed">{error}</p>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-40">
              {detected ? (
                <div className="absolute inset-0 border-4 border-green-400 rounded-xl" />
              ) : (
                <>
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
                  <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-0.5 bg-indigo-400/50 animate-pulse" />
                </>
              )}
            </div>
          </div>

          <p className="absolute bottom-10 left-0 right-0 text-center text-sm text-gray-300 px-4">
            {detected ? 'Code détecté !' : 'Pointez la caméra vers le code-barres'}
          </p>
        </div>
      )}
    </div>
  )
}
