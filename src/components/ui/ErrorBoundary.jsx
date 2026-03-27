import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-bold text-xl mb-2">Quelque chose s'est mal passé</h1>
            <p className="text-gray-400 text-sm">
              Une erreur inattendue s'est produite. Tes données sont en sécurité.
            </p>
            {import.meta.env.DEV && (
              <p className="text-red-400 text-xs mt-3 font-mono bg-gray-900 rounded-xl px-3 py-2 text-left">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            <RefreshCw size={16} />
            Recharger l'application
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
