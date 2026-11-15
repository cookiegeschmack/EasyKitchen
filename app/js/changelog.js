/*
 * EasyKitchen – Änderungsprotokoll für den „Was ist neu“-Dialog.
 * Neueste Version oben. publish_release.sh ergänzt einen fehlenden Eintrag
 * automatisch aus der Release-Beschreibung und nutzt die Punkte als GitHub-Release-Notizen.
 */
window.EasyKitchen = window.EasyKitchen || {};
window.EasyKitchen.CHANGELOG = [
  // @@CHANGELOG_START@@
  {
    version: '1.2.0',
    date: '2026-11-15',
    title: 'Zeiten-Tabelle & Nährwerte',
    items: [
      '⏱ Zeiten getrennt nach Vorbereitung und Zubereitung – die Gesamtzeit wird automatisch berechnet und übersichtlich als Tabelle angezeigt (auch in der PDF). Bestehende Rezepte wurden übernommen.',
      '📊 Nährwerte: Kalorien, Eiweiß, Kohlenhydrate und Fett pro Portion werden aus den Zutaten geschätzt und als Balkendiagramm unten am Rezept angezeigt – schon live beim Eintragen der Zutaten.',
      '📄 In der PDF stehen die Nährwerte kurz ganz unten.',
      '🛠 Behoben: EasyKitchen hat sich nach dem Erstellen oder Teilen einer PDF von selbst geschlossen.',
      '🛠 Behoben: Deine gespeicherten Rezepte haben unter Umständen einen älteren Stand angezeigt.'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-11-15',
    title: 'Teilen, PDF-Export & Rezept-Import',
    items: [
      '📄 Rezepte als PDF exportieren – im einheitlichen EasyKitchen-Layout, einzeln oder mehrere auf einmal.',
      '📤 Neuer „Teilen“-Knopf: per AirDrop, Nachrichten oder Mail an andere schicken.',
      '🍳 EasyKitchen-Dateien: Andere EasyKitchen-Nutzer importieren geteilte Rezepte per Doppelklick – inklusive Foto. Auch geteilte EasyKitchen-PDFs lassen sich 1:1 importieren.',
      '📸 Rezepte importieren aus Screenshots, Fotos und PDFs anderer Anbieter: Der Text wird automatisch erkannt und als Rezept vorausgefüllt – du musst nur noch kurz prüfen.',
      '📋 Rezepttext von Webseiten einfach einfügen und daraus ein Rezept machen.',
      '✨ Dieser „Was ist neu“-Hinweis zeigt dir ab jetzt nach jedem Update, was dazugekommen ist.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-11-15',
    title: 'Erste Version',
    items: [
      'Rezepte mit Zutaten, Zubereitung und optionalem Foto speichern.',
      'Reste-Suche: Rezepte finden, die zu deinen vorhandenen Zutaten passen.',
      'Filter nach Kochzeit, Aufwand und Kosten sowie eine Watchlist.',
      'Backup und automatische 1-Klick-Updates.'
    ]
  }
];
