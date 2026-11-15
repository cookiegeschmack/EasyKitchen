/*
 * EasyKitchen – Änderungsprotokoll für den „Was ist neu“-Dialog.
 * Neueste Version oben. publish_release.sh ergänzt einen fehlenden Eintrag
 * automatisch aus der Release-Beschreibung und nutzt die Punkte als GitHub-Release-Notizen.
 */
window.EasyKitchen = window.EasyKitchen || {};
window.EasyKitchen.CHANGELOG = [
  // @@CHANGELOG_START@@
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
