import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [error, setError] = useState(null)
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setError('Le scan de code-barres n\'est pas supporté sur ce navigateur. Utilise Chrome sur Android.')
      return
    }

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
            // Stop scanning
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
      setError('Impossible d\'accéder à la caméra. Vérifie les permissions de l\'application.')
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

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

          {/* Scan overlay */}
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
