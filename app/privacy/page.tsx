import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité de sendli et de l'extension Chrome sendli.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#111184]">
            sendli
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Retour à l&apos;app
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Politique de confidentialité
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            Dernière mise à jour : mai 2025
          </p>

          <div className="space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Présentation</h2>
              <p>
                sendli est une plateforme SaaS permettant de créer, envoyer et suivre des propales commerciales.
                La présente politique de confidentialité décrit comment sendli traite les données dans le cadre
                de l&apos;application web et de l&apos;extension Chrome sendli.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Extension Chrome sendli</h2>
              <p className="mb-3">
                L&apos;extension Chrome sendli permet aux utilisateurs de recevoir des notifications en temps réel
                sur leurs propales (ouverture, clic sur un bouton, temps passé) et d&apos;accéder rapidement à
                la création d&apos;une nouvelle propale.
              </p>
              <p className="mb-3 font-medium text-gray-900">Données collectées par l&apos;extension :</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>
                  <strong className="text-gray-800">Token d&apos;authentification</strong> — un jeton d&apos;accès
                  unique est stocké localement sur l&apos;appareil de l&apos;utilisateur via l&apos;API{" "}
                  <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">chrome.storage.local</code>.
                  Ce token est utilisé exclusivement pour authentifier les requêtes vers l&apos;API sendli.
                </li>
              </ul>
              <p className="mt-3">
                L&apos;extension <strong>ne collecte, ne transmet et ne stocke aucune autre donnée personnelle</strong>.
                Elle ne lit pas le contenu des pages web visitées, n&apos;accède pas à l&apos;historique de navigation
                et ne surveille pas l&apos;activité de l&apos;utilisateur.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Données de l&apos;application web</h2>
              <p className="mb-3">
                Dans le cadre de l&apos;utilisation de l&apos;application sendli, nous collectons uniquement les données
                nécessaires au fonctionnement du service :
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Adresse e-mail et nom (compte utilisateur)</li>
                <li>Contenu des propales créées par l&apos;utilisateur</li>
                <li>Données d&apos;analyse de propale (vues, clics, temps passé) générées par les destinataires</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Partage des données</h2>
              <p>
                sendli ne vend ni ne transfère les données des utilisateurs à des tiers à des fins commerciales.
                Les données peuvent être partagées avec des sous-traitants techniques (hébergement, base de données)
                dans le strict cadre de la fourniture du service, et uniquement avec des prestataires conformes
                au RGPD.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Conservation des données</h2>
              <p>
                Les données sont conservées pendant toute la durée de vie du compte utilisateur.
                À la suppression du compte, l&apos;ensemble des données associées est supprimé dans un délai de 30 jours.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Vos droits</h2>
              <p className="mb-3">
                Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Droit d&apos;accès et de rectification</li>
                <li>Droit à l&apos;effacement (&ldquo;droit à l&apos;oubli&rdquo;)</li>
                <li>Droit à la portabilité des données</li>
                <li>Droit d&apos;opposition au traitement</li>
              </ul>
              <p className="mt-3">
                Pour exercer ces droits, contactez-nous à{" "}
                <a href="mailto:hello@sendli.fr" className="text-[#111184] hover:underline font-medium">
                  hello@sendli.fr
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Contact</h2>
              <p>
                Pour toute question relative à cette politique de confidentialité, vous pouvez nous contacter
                à l&apos;adresse{" "}
                <a href="mailto:hello@sendli.fr" className="text-[#111184] hover:underline font-medium">
                  hello@sendli.fr
                </a>.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} sendli — Tous droits réservés
      </footer>
    </div>
  );
}
