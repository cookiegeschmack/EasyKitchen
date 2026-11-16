/*
 * EasyKitchen – Änderungsprotokoll für den „Was ist neu“-Dialog.
 * Neueste Version oben. publish_release.sh ergänzt einen fehlenden Eintrag
 * automatisch aus der Release-Beschreibung und nutzt die Punkte als GitHub-Release-Notizen.
 */
window.EasyKitchen = window.EasyKitchen || {};
window.EasyKitchen.CHANGELOG = [
  // @@CHANGELOG_START@@
  {
    version: '1.5.0',
    date: '2026-11-16',
    title: 'Besserer Import, Nachspeisen & stimmige Nährwerte',
    items: [
      '🍰 Neue Art „Nachspeise“: Desserts, Kuchen & Süßes werden automatisch erkannt – mit eigenem Filter.',
      '🔢 Import & Anzeige: Vorhandene Nummerierungen in den Zubereitungsschritten (1. / 1) / ① / „Schritt 1:“ …) werden erkannt und entfernt – keine doppelten Nummern mehr, auch bei bereits gespeicherten Rezepten.',
      '📄 Deutlich besserer Import aus PDFs & Screenshots: Kopf- und Fußzeilen, „Hilfsmittel“, Zeitangaben und Seitenumbrüche werden richtig erkannt, fett gedruckte Texte entziffert und Zutaten mit Alternativen übernommen.',
      '🥛 Stimmige Nährwerte: Verwechslungen wie „500 l Milch“ werden als ml erkannt, beim Wechsel der Einheit (ml ↔ l, g ↔ kg) wird die Menge umgerechnet, und weitere Zutaten (z. B. Kekse/Oreos, Mirin, Nektarinen) sind bekannt.'
    ]
  },
  {
    version: '1.4.2',
    date: '2026-11-16',
    title: 'Flüssigere Updates',
    items: [
      '🔄 Updates laufen jetzt in einem Rutsch: Nach dem Bestätigen speichert EasyKitchen deine Rezepte, schließt sich, installiert die neue Version und startet genau einmal neu – kein hängendes oder doppeltes Fenster mehr.'
    ]
  },
  {
    version: '1.4.1',
    date: '2026-11-16',
    title: 'Update-Hinweis live & keine doppelten Rezepte',
    items: [
      '🔔 Neue Versionen erscheinen jetzt auch während der Nutzung oben als Hinweis (mit LED) – ohne Neustart. Ein Klick darauf startet das Update.',
      '📥 Beim Importieren werden bereits vorhandene Rezepte (gleicher Name oder schon importiert) automatisch übersprungen – es kommen nur die neuen dazu.'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-11-16',
    title: 'Neue Filter, Portionsregler & genauere Suche',
    items: [
      '🔍 Genauere Suche: „Zwiebel“ findet keine Frühlingszwiebeln mehr, „Tomaten“ kein Tomatenmark – ebenso Paprikapulver, Zitronensaft, Reisessig, Kokosmilch & Co.',
      '🍽 Portionsregler in jedem Rezept: Portionen per Regler anpassen, die Mengen rechnen sich automatisch um. Deine Wahl wird pro Rezept gemerkt – das Rezept selbst bleibt unverändert.',
      '🌱 Neue Filter: Vegetarisch, 💪 High Protein, Hauptspeise/Nebenspeise und Süß/Salzig. Alles wird automatisch erkannt und lässt sich im Rezept-Editor anpassen.',
      '✨ Rezept des Tages zeigt jetzt ausschließlich Hauptspeisen.'
    ]
  },
  {
    version: '1.3.3',
    date: '2026-11-16',
    title: 'Test-Update',
    items: [
      '🧪 Dies ist ein Test-Update ohne neue Funktionen – es prüft, ob die automatische Aktualisierung bei dir funktioniert. Deine Rezepte bleiben unverändert erhalten.'
    ]
  },
  {
    version: '1.3.2',
    date: '2026-11-15',
    title: 'Läuft jetzt auf mehr Macs',
    items: [
      '🍏 EasyKitchen läuft jetzt auf allen Macs mit Apple-Chip (M1, M2, M3, M4 …) ab macOS 11 Big Sur – bisher war versehentlich die neueste macOS-Version nötig.',
      '🛠 Darstellung und Bild-Export funktionieren jetzt auch unter älteren macOS-Versionen.'
    ]
  },
  {
    version: '1.3.1',
    date: '2026-11-15',
    title: 'Neues Logo',
    items: [
      '🍳 Das EasyKitchen-Logo erscheint jetzt in der grünen Grundfarbe – im Dock, im Finder, in der App und in den PDFs.'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-11-15',
    title: 'Wocheneinkaufsplaner, Grün & Pastell',
    items: [
      '🛒 Wocheneinkaufsplaner: Rezepte für die Woche auswählen (🛒 auf der Rezeptkarte, in der Detailansicht oder direkt im Planer) und Portionen anpassen.',
      '📝 Daraus entsteht automatisch eine Einkaufsliste: gleiche Zutaten werden zusammengefasst und auf deine Portionen umgerechnet, sortiert nach Supermarkt-Bereichen – zum Abhaken, Kopieren, Teilen oder als PDF.',
      '📤 Einkaufsliste teilen: als Text (Menge zuerst) direkt an WhatsApp, Nachrichten, AirDrop & Co., als Bild im Handy-Format oder als PDF.',
      '🎨 Neue Grundfarbe Grün und ein helles Design in sanften Pastellfarben.',
      '🌗 In den Einstellungen wählst du jetzt selbst: System, Hell oder Dunkel.',
      '🔄 Automatische Update-Suche: beim Start, sobald eine Internetverbindung besteht (auch wenn sie erst später kommt) und regelmäßig während die App läuft. Neue Versionen werden direkt angezeigt.'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-11-15',
    title: 'Rezepte des Tages, Favoriten & Nährwerte',
    items: [
      '✨ Rezept(e) des Tages: Oben läuft eine kleine Diashow mit zufällig gewählten Lieblingsrezepten – alle 10 Sekunden das nächste, mit Ladebalken und „Nächstes“-Knopf. Ab 30 Rezepten sind es zwei, ab 40 drei.',
      '★ Favoriten statt Watchlist: Alle Rezepte auf einer Seite, Lieblingsrezepte mit dem Stern markieren und mit „Nur Favoriten“ filtern.',
      '🔢 Die installierte Version steht jetzt oben neben dem Namen – ist ein Update verfügbar, erscheint dort direkt ein Hinweis.',
      '↕ Neues Sortier-Menü als Symbol und ein richtiger „Teilen / PDF“-Knopf über der Rezeptliste.',
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
