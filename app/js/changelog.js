/*
 * EasyKitchen – Änderungsprotokoll für den „Was ist neu“-Dialog.
 * Neueste Version oben. publish_release.sh ergänzt einen fehlenden Eintrag
 * automatisch aus der Release-Beschreibung und nutzt die Punkte als GitHub-Release-Notizen.
 */
window.EasyKitchen = window.EasyKitchen || {};
window.EasyKitchen.CHANGELOG = [
  // @@CHANGELOG_START@@
  {
    version: '1.7.1',
    date: '2026-11-17',
    title: 'Zutaten-Reihenfolge, Tropfen & Foto zuschneiden',
    items: [
      "↕️ Zutaten in deine Reihenfolge bringen: Im Editor jede Zutat am Griff ⠿ an die gewünschte Stelle ziehen (oder mit ↑/↓ verschieben).",
      "⇅ „Automatisch sortieren“: große Mengen zuerst, Gewürze und Kleinmengen (Prise, Messerspitze, nach Geschmack) ans Ende.",
      "💧 Neue Einheit „Tropfen“ – z. B. für Zitronensaft oder Aromen. Der Import erkennt „5 Tropfen“ automatisch.",
      "✂️ Fotos zuschneiden: Nach dem Auswählen Ausschnitt verschieben und zoomen – mit Live-Vorschau, wie das Foto auf der Rezeptkarte und in der Rezeptansicht aussieht. Über „Zuschneiden“ lässt sich der Ausschnitt jederzeit ändern."
    ],
    en: {
      title: "Ingredient order, drops & photo cropping",
      items: [
        "↕️ Put ingredients in your own order: in the editor, drag each ingredient by its ⠿ handle (or move it with ↑/↓).",
        "⇅ “Sort automatically”: large amounts first, spices and small amounts (pinch, knife tip, to taste) last.",
        "💧 New unit “drops” – e.g. for lemon juice or flavorings. The import recognizes “5 drops” automatically.",
        "✂️ Crop photos: after choosing a photo, move and zoom the section – with a live preview of how it looks on the recipe card and in the recipe view. Use “Crop” to change the section at any time."
      ]
    }
  },
  {
    version: '1.7.0',
    date: '2026-11-16',
    title: 'Englisch, zweisprachige Suche & einfachere Installation',
    items: [
      "🌍 EasyKitchen spricht jetzt Englisch: In den Einstellungen unter „Sprache“ wählst du Deutsch, English oder „Wie System“. Menüs, Hinweise, PDF und Einkaufsliste wechseln mit – deine Rezepte bleiben so, wie du sie geschrieben hast.",
      "🔎 Die Zutatensuche versteht beide Sprachen: „tomato onion“ findet deine Rezepte mit Tomaten und Zwiebeln – und umgekehrt.",
      "📦 Einfachere Installation: Das Installationsfenster zeigt klar „EasyKitchen → Applications“. Wird die App trotzdem direkt aus dem Fenster oder aus „Downloads“ gestartet, bietet sie an, sich mit einem Klick in den Programme-Ordner zu verschieben.",
      "🥄 „Msp.“ heißt jetzt ausgeschrieben „Messerspitze“."
    ],
    en: {
      title: "English, bilingual search & easier installation",
      items: [
        "🌍 EasyKitchen now speaks English: choose Deutsch, English or “Like system” under “Language” in the settings. Menus, messages, PDF and shopping list switch too – your recipes stay exactly as you wrote them.",
        "🔎 The ingredient search understands both languages: “tomato onion” finds your recipes with Tomaten and Zwiebeln – and vice versa.",
        "📦 Easier installation: the installer window clearly shows “EasyKitchen → Applications”. If the app is still started directly from that window or from “Downloads”, it offers to move itself to the Applications folder with one click.",
        "🥄 “Msp.” is now written out as “Messerspitze” (knife tip)."
      ]
    }
  },
  {
    version: '1.6.4',
    date: '2026-11-16',
    title: 'Zutatensuche mit UND',
    items: [
      '🔎 Die Zutatensuche zeigt jetzt nur noch Rezepte, die ALLE eingegebenen Zutaten enthalten – „Tomaten Zwiebeln“ findet nur Rezepte mit beidem. Füllwörter wie „und“ oder „mit“ werden ignoriert.',
      '💡 Findet die Suche nichts, siehst du, wie viele Rezepte zumindest einen Teil der Zutaten enthalten.'
    ],
    en: {
      title: "Ingredient search with AND",
      items: [
        "🔎 The ingredient search now only shows recipes that contain ALL entered ingredients – “tomatoes onions” only finds recipes with both. Filler words like “and” or “with” are ignored.",
        "💡 If the search finds nothing, you can see how many recipes contain at least some of the ingredients."
      ]
    }
  },
  {
    version: '1.6.3',
    date: '2026-11-16',
    title: 'Zuverlässige Updates & Unterschiede auf einen Blick',
    items: [
      '🔄 Updates hängen nicht mehr in einer Schleife: Die neue Version wird erst daneben installiert und geprüft, bevor sie die alte ersetzt. Klappt das nicht (z. B. weil macOS das Ändern von Apps blockiert), bleibt die App intakt und erklärt, wie es weitergeht – inklusive manueller Installation mit einem Klick.',
      '🧭 Wurde versehentlich eine alte Kopie geöffnet (z. B. aus der DMG oder „Downloads“), weist EasyKitchen darauf hin und öffnet auf Wunsch die aktuelle Version.',
      '🔍 Beim Import siehst du sofort, welche schon vorhandenen Rezepte Unterschiede haben („● 3 Unterschiede“) und welche identisch sind („✓ identisch“) – Rezepte mit Unterschieden stehen oben.'
    ],
    en: {
      title: "Reliable updates & differences at a glance",
      items: [
        "🔄 Updates no longer get stuck in a loop: the new version is installed next to the old one and checked before replacing it. If that fails (e.g. because macOS blocks changes to apps), the app stays intact and explains what to do – including a one-click manual installation.",
        "🧭 If an old copy was opened by mistake (e.g. from the DMG or “Downloads”), EasyKitchen points it out and opens the current version on request.",
        "🔍 When importing, you can see right away which existing recipes differ (“● 3 differences”) and which are identical (“✓ identical”) – recipes with differences are listed first."
      ]
    }
  },
  {
    version: '1.6.2',
    date: '2026-11-16',
    title: 'Doppelte Rezepte ersetzen',
    items: [
      '🔁 Im Vergleich doppelter Rezepte gibt es jetzt „Vorhandenes ersetzen“: Die importierte Fassung überschreibt das bestehende Rezept (nach Rückfrage) – Favorit und Wochenplan bleiben erhalten.'
    ],
    en: {
      title: "Replace duplicate recipes",
      items: [
        "🔁 When comparing duplicate recipes there is now “Replace existing”: the imported version overwrites the existing recipe (after confirmation) – favorite and weekly plan are kept."
      ]
    }
  },
  {
    version: '1.6.1',
    date: '2026-11-16',
    title: 'Klügerer Import & eigene Einheiten',
    items: [
      '🧠 Der Import unterscheidet Zutaten und Zubereitungsschritte deutlich zuverlässiger – auch ohne Überschriften, wenn Screenshots beides durcheinanderwerfen oder Schritte mit „Schritt 1“, „SCHRITT 2/5“ usw. beschriftet sind.',
      '📋 Auch schlichte Notizen werden verstanden: eine Liste von Zutaten ohne Mengen und darunter Schritte als Spiegelstriche oder Zeilen ohne Punkt – jede Zeile wird zu einem eigenen Schritt.',
      '⚖️ Mengen werden besser erkannt und direkt in die Felder eingetragen: z. B. „Mehl (200 g)“, „Butter: 50 g“, „eine halbe Zitrone“, „1 gehäufter EL“, „200 g / 7 oz“ – und Mengen, die in einer eigenen Zeile über oder unter der Zutat stehen.',
      '✏️ Neue Einheit „Eigenes …“: Einheit frei benennen, z. B. Blätter, Stangen, Tropfen oder Würfel. Der Import nutzt sie automatisch für solche Angaben; auch Einkaufsliste, PDF und Portionsregler kennen sie.'
    ],
    en: {
      title: "Smarter import & custom units",
      items: [
        "🧠 The import tells ingredients and preparation steps apart much more reliably – even without headings, when screenshots mix both up or steps are labeled “Step 1”, “STEP 2/5” etc.",
        "📋 Simple notes are understood too: a list of ingredients without amounts followed by steps as dashes or lines without periods – each line becomes its own step.",
        "⚖️ Amounts are recognized better and filled in directly, e.g. “flour (200 g)”, “butter: 50 g”, “half a lemon”, “1 heaped tbsp”, “200 g / 7 oz” – and amounts on their own line above or below the ingredient.",
        "✏️ New unit “Custom …”: name the unit freely, e.g. leaves, stalks, drops or cubes. The import uses it automatically for such amounts; shopping list, PDF and serving slider know it too."
      ]
    }
  },
  {
    version: '1.6.0',
    date: '2026-11-16',
    title: 'Entwürfe & Unterschiede bei doppelten Rezepten',
    items: [
      '📝 Nichts geht mehr verloren: Klickst du beim Erstellen oder Bearbeiten eines Rezepts daneben (oder drückst Esc/Abbrechen), fragt EasyKitchen nach – als Entwurf speichern, verwerfen oder weiter bearbeiten. Im Editor gibt es dafür auch direkt den Knopf „Als Entwurf speichern“.',
      '🗂️ Neuer Button „Entwürfe“ oben in der Leiste: Dort findest du alle angefangenen Rezepte und machst mit einem Klick weiter. Wird die App mit offenem Editor beendet, landet der Stand automatisch dort.',
      '🔍 Doppelte Rezepte vergleichen: Beim Import zeigt „Unterschiede ansehen“ das importierte und das vorhandene Rezept nebeneinander – abweichende Zutaten, Mengen, Schritte und Angaben sind farbig markiert.',
      '➕ Trotzdem übernehmen: Aus dem Vergleich heraus lässt sich das importierte Rezept als neues Rezept speichern – mit gleichem oder eigenem Namen. Das vorhandene bleibt unverändert.'
    ],
    en: {
      title: "Drafts & differences between duplicate recipes",
      items: [
        "📝 Nothing gets lost anymore: if you click outside while creating or editing a recipe (or press Esc/Cancel), EasyKitchen asks – save as draft, discard or keep editing. The editor also has a “Save as draft” button.",
        "🗂️ New “Drafts” button at the top: find all unfinished recipes there and continue with one click. If the app is closed with the editor open, your work is saved there automatically.",
        "🔍 Compare duplicate recipes: when importing, “View differences” shows the imported and the existing recipe side by side – different ingredients, amounts, steps and details are highlighted.",
        "➕ Import anyway: from the comparison, the imported recipe can be saved as a new recipe – with the same or a new name. The existing one stays unchanged."
      ]
    }
  },
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
