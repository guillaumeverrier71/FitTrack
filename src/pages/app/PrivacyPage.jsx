import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useLang } from '../../context/LangContext'

export default function PrivacyPage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const isFr = lang !== 'en'

  return (
    <div className="p-4 pb-24 bg-gray-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">
          {isFr ? 'Politique de confidentialité' : 'Privacy Policy'}
        </h1>
      </div>

      <div className="flex flex-col gap-6 text-gray-400 text-sm leading-relaxed">
        {isFr ? (
          <>
            <p className="text-gray-500 text-xs">Dernière mise à jour : mars 2026</p>

            <section>
              <h2 className="text-white font-semibold mb-2">1. Données collectées</h2>
              <p>BodyPilot collecte uniquement les données que tu saisis volontairement : adresse e-mail, prénom, poids, taille, objectifs, séances d'entraînement, repas et pas quotidiens. Aucune donnée n'est collectée sans ton consentement explicite.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">2. Utilisation des données</h2>
              <p>Tes données sont utilisées exclusivement pour faire fonctionner l'application : afficher ta progression, calculer tes besoins caloriques, et te proposer des suggestions personnalisées. Elles ne sont jamais vendues ni partagées avec des tiers à des fins commerciales.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">3. Hébergement</h2>
              <p>Les données sont stockées de manière sécurisée via Supabase (infrastructure cloud conforme aux standards RGPD) et hébergées sur des serveurs en Europe ou aux États-Unis selon la configuration Supabase choisie.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">4. Tes droits</h2>
              <p>Tu peux à tout moment demander l'accès, la modification ou la suppression de tes données en supprimant ton compte depuis les paramètres de l'application, ou en nous contactant directement. La suppression du compte entraîne la suppression définitive de toutes tes données.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">5. Cookies et stockage local</h2>
              <p>L'application utilise le stockage local de ton appareil (localStorage) uniquement pour mémoriser tes préférences de langue, d'unités et tes tokens d'authentification. Aucun cookie de tracking n'est utilisé.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">6. Sécurité</h2>
              <p>Les échanges entre l'application et nos serveurs sont chiffrés via HTTPS/TLS. Les mots de passe sont hashés et ne sont jamais accessibles en clair.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">7. Contact</h2>
              <p>Pour toute question relative à tes données personnelles, contacte-nous à l'adresse indiquée sur le store ou via le dépôt GitHub de l'application.</p>
            </section>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-xs">Last updated: March 2026</p>

            <section>
              <h2 className="text-white font-semibold mb-2">1. Data Collected</h2>
              <p>BodyPilot only collects data you voluntarily enter: email address, first name, weight, height, goals, workout sessions, meals, and daily steps. No data is collected without your explicit consent.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">2. Use of Data</h2>
              <p>Your data is used exclusively to operate the app: displaying your progress, calculating caloric needs, and providing personalized suggestions. It is never sold or shared with third parties for commercial purposes.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">3. Hosting</h2>
              <p>Data is stored securely via Supabase (GDPR-compliant cloud infrastructure) and hosted on servers in Europe or the United States depending on the Supabase configuration.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">4. Your Rights</h2>
              <p>You can request access, modification, or deletion of your data at any time by deleting your account from the app settings, or by contacting us directly. Account deletion results in the permanent deletion of all your data.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">5. Cookies & Local Storage</h2>
              <p>The app uses your device's local storage (localStorage) only to remember your language preferences, unit preferences, and authentication tokens. No tracking cookies are used.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">6. Security</h2>
              <p>All communication between the app and our servers is encrypted via HTTPS/TLS. Passwords are hashed and are never accessible in plain text.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold mb-2">7. Contact</h2>
              <p>For any questions regarding your personal data, contact us at the address listed on the store or via the app's GitHub repository.</p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
