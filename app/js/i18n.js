/*
 * EasyKitchen – Sprache (Deutsch / English).
 * Die Oberfläche ist auf Deutsch geschrieben; dieses Modul übersetzt angezeigte Texte
 * automatisch ins Englische (Wörterbuch + Muster für Texte mit Zahlen/Namen).
 * Rezeptinhalte (Titel, Zutaten, Schritte) werden NICHT übersetzt – sie sind mit translate="no" markiert.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  // =========================================================================
  // Wörterbuch: deutscher Text → englischer Text (Leerzeichen werden vor dem Nachschlagen vereinheitlicht)
  // =========================================================================
  const EN = {
    // --- Kopfzeile & Suche ---
    'Installierte Version – klicken, um nach Updates zu suchen': 'Installed version – click to check for updates',
    'Neue Version verfügbar – klicken zum Aktualisieren': 'New version available – click to update',
    'Update verfügbar': 'Update available',
    'Einstellungen': 'Settings',
    'Nicht fertig gespeicherte Rezepte': 'Recipes not yet saved',
    'Entwürfe': 'Drafts',
    '📝 Entwürfe': '📝 Drafts',
    'Wocheneinkaufsplaner: Rezepte für die Woche wählen und Einkaufsliste erstellen': 'Weekly shopping planner: pick recipes for the week and create a shopping list',
    'Wochenplan': 'Weekly plan',
    'Rezept aus Screenshot, PDF, Text oder EasyKitchen-Datei importieren': 'Import a recipe from a screenshot, PDF, text or EasyKitchen file',
    '⤓ Importieren': '⤓ Import',
    'Importieren': 'Import',
    '＋ Neues Rezept': '＋ New recipe',
    'Neues Rezept': 'New recipe',
    'Was hast du noch zu Hause?': 'What do you have at home?',
    'z. B. Rindfleisch, Paprika, Reis': 'e.g. beef, bell pepper, rice',
    'Suche leeren': 'Clear search',
    'Mehrere Zutaten mit Komma oder Leerzeichen trennen – angezeigt werden nur Rezepte, die': 'Separate several ingredients with commas or spaces – only recipes that contain',
    'alle': 'all',
    'eingegebenen Zutaten enthalten.': 'entered ingredients are shown. English and German terms both work.',
    'Filter': 'Filters',
    'Auswahl': 'Selection',
    '☆ Nur Favoriten': '☆ Favorites only',
    'Ohne Fleisch und Fisch (automatisch aus den Zutaten erkannt)': 'No meat or fish (detected automatically from the ingredients)',
    '🌱 Vegetarisch': '🌱 Vegetarian',
    'Mind. 20 g Eiweiß pro Portion und mind. 20 % der Kalorien aus Eiweiß (Richtwert aus den Zutaten)': 'At least 20 g protein per serving and at least 20 % of calories from protein (estimated from the ingredients)',
    'Art': 'Course',
    'Alle': 'All',
    'Hauptspeise': 'Main course',
    'Nebenspeise': 'Side dish',
    'Nachspeise': 'Dessert',
    'Geschmack': 'Taste',
    'Salzig': 'Savory',
    'Süß': 'Sweet',
    'Gesamtzeit': 'Total time',
    'Aufwand': 'Effort',
    'Einfach': 'Easy',
    'Mittel': 'Medium',
    'Aufwendig': 'Elaborate',
    'Kosten': 'Cost',
    '€ Günstig': '€ Cheap',
    '€€ Mittel': '€€ Medium',
    '€€€ Teuer': '€€€ Expensive',
    'Günstig': 'Cheap',
    'Teuer': 'Expensive',
    'Rezepte des Tages': 'Recipes of the day',
    'Rezept des Tages': 'Recipe of the day',
    '✨ Rezept des Tages': '✨ Recipe of the day',
    'Filter zurücksetzen': 'Reset filters',
    'Teilen / PDF': 'Share / PDF',
    'Sortieren': 'Sort',
    'Sortieren nach': 'Sort by',
    'Passend zur Suche': 'Best match',
    'Gesamtzeit (kürzeste zuerst)': 'Total time (shortest first)',
    'Name (A–Z)': 'Name (A–Z)',
    'Neueste zuerst': 'Newest first',
    'Favoriten zuerst': 'Favorites first',
    '· Entwickelt von Duc Anh Hönemann': '· Developed by Duc Anh Hönemann',
    'Schließen': 'Close',
    'Nächstes Rezept': 'Next recipe',
    'Nächstes ›': 'Next ›',
    'Ansehen ›': 'View ›',

    // --- Karten & Liste ---
    'Treffer im Namen': 'Match in name',
    'Aus dem Wochenplan entfernen': 'Remove from weekly plan',
    'Zum Wochenplan hinzufügen': 'Add to weekly plan',
    'Wochenplan umschalten': 'Toggle weekly plan',
    'Favorit entfernen': 'Remove favorite',
    'Als Favorit markieren': 'Mark as favorite',
    'Favorit umschalten': 'Toggle favorite',
    'Angezeigtes Rezept teilen oder als PDF speichern': 'Share the shown recipe or save it as PDF',
    'Vegetarisch': 'Vegetarian',
    'High Protein': 'High protein',
    '💪 High Protein': '💪 High protein',
    'Noch keine Rezepte': 'No recipes yet',
    'Leg dein erstes Rezept an – mit Zutaten, Zubereitung und optional einem Foto.': 'Create your first recipe – with ingredients, steps and an optional photo.',
    '＋ Erstes Rezept anlegen': '＋ Create first recipe',
    'Noch keine Favoriten': 'No favorites yet',
    'Markiere deine Lieblingsrezepte mit dem Stern – dann findest du sie hier.': 'Mark your favorite recipes with the star – you will find them here.',
    'Alle Rezepte zeigen': 'Show all recipes',
    'Nichts gefunden': 'Nothing found',
    'Kein Rezept passt zu deiner Suche bzw. deinen Filtern.': 'No recipe matches your search or filters.',
    'Suche & Filter zurücksetzen': 'Reset search & filters',

    // --- Detailansicht ---
    'Vorbereitung': 'Prep',
    'Zubereitung': 'Instructions',
    'Vorbereitungszeit': 'Prep time',
    'Zubereitungszeit': 'Cook time',
    'Zutaten': 'Ingredients',
    'Portionen': 'Servings',
    'Portion': 'Serving',
    'Weniger Portionen': 'Fewer servings',
    'Mehr Portionen': 'More servings',
    'Keine Zubereitung hinterlegt.': 'No preparation steps yet.',
    'Nährwerte': 'Nutrition',
    '· Richtwerte pro Portion': '· estimates per serving',
    'Löschen': 'Delete',
    '✓ Im Wochenplan': '✓ In weekly plan',
    '🛒 Zum Wochenplan': '🛒 Add to weekly plan',
    '⇪ Teilen': '⇪ Share',
    '★ Favorit': '★ Favorite',
    '☆ Als Favorit': '☆ Favorite',
    'Bearbeiten': 'Edit',
    'Kalorien': 'Calories',
    'Eiweiß': 'Protein',
    'Kohlenhydrate': 'Carbs',
    'Fett': 'Fat',
    'Sobald Zutaten mit Mengen eingetragen sind, erscheinen hier geschätzte Nährwerte.': 'Estimated nutrition appears here as soon as ingredients with amounts are entered.',
    'Nährwerte pro Portion': 'Nutrition per serving',
    '(Richtwerte)': '(estimates)',
    'Automatisch aus den Zutaten geschätzt.': 'Estimated automatically from the ingredients.',

    // --- Editor ---
    'Rezept bearbeiten': 'Edit recipe',
    'Importiertes Rezept prüfen': 'Check imported recipe',
    'Entwurf weiter bearbeiten': 'Continue draft',
    'Automatisch erkannt': 'Detected automatically',
    '– bitte Name, Mengen und Schritte kurz prüfen und bei Bedarf korrigieren.': '– please quickly check name, amounts and steps and correct them if needed.',
    'Erkannten Originaltext anzeigen': 'Show recognized original text',
    'Name des Gerichts': 'Name of the dish',
    'z. B. Rindfleisch-Paprika-Pfanne': 'e.g. beef and pepper stir-fry',
    'Foto': 'Photo',
    '(optional)': '(optional)',
    'Foto hinzufügen': 'Add photo',
    'Foto auswählen oder hierher ziehen': 'Choose a photo or drag it here',
    'Foto entfernen': 'Remove photo',
    'Zeiten': 'Times',
    'Vorbereitungszeit Regler': 'Prep time slider',
    'Zubereitungszeit Regler': 'Cooking time slider',
    'Min': 'min',
    'Automatisch': 'Automatic',
    'Ja': 'Yes',
    'Nein': 'No',
    '＋ Zutat hinzufügen': '＋ Add ingredient',
    'Bitte mindestens eine Zutat eintragen.': 'Please enter at least one ingredient.',
    'Jeder Schritt in eine eigene Zeile, z. B. Rindfleisch in Streifen schneiden Paprika anbraten …': 'One step per line, e.g. Cut the beef into strips Fry the peppers …',
    '★ Als Favorit markieren': '★ Mark as favorite',
    'Abbrechen': 'Cancel',
    'Unfertiges Rezept zwischenspeichern – oben unter „Entwürfe“ weitermachen': 'Save the unfinished recipe – continue later under “Drafts” at the top',
    '📝 Als Entwurf speichern': '📝 Save as draft',
    'Als Entwurf speichern': 'Save as draft',
    'Rezept speichern': 'Save recipe',
    'Zutat, z. B. Rindfleisch': 'Ingredient, e.g. beef',
    'Zutat entfernen': 'Remove ingredient',
    'z. B. Blätter': 'e.g. leaves',
    'Eigene Einheit': 'Custom unit',
    'Menge': 'Amount',
    'Menge Regler': 'Amount slider',
    'Einheit': 'Unit',
    'Weniger': 'Less',
    'Mehr': 'More',
    'Als Entwurf gespeichert – oben unter „Entwürfe“ ✓': 'Saved as draft – find it under “Drafts” at the top ✓',
    'Bitte gib dem Rezept einen Namen.': 'Please give the recipe a name.',
    'Rezept aktualisiert ✓': 'Recipe updated ✓',
    'Rezept gespeichert ✓': 'Recipe saved ✓',
    'Bitte zuerst etwas eintragen – ein leerer Entwurf wird nicht gespeichert.': 'Please enter something first – an empty draft is not saved.',
    'Rezept noch nicht gespeichert': 'Recipe not saved yet',
    'Möchtest du deine Eingaben als Entwurf speichern? Du findest ihn dann oben unter „Entwürfe“ und kannst später weitermachen.': 'Do you want to save your input as a draft? You will find it under “Drafts” at the top and can continue later.',
    'Verwerfen': 'Discard',
    'Weiter bearbeiten': 'Keep editing',
    'Keine Entwürfe vorhanden.': 'No drafts.',
    'Ohne Titel': 'Untitled',
    'Diesen Entwurf wirklich löschen?': 'Really delete this draft?',
    'Neues Rezept': 'New recipe',

    // --- Einstellungen ---
    'Darstellung': 'Appearance',
    'Hell (Pastell), Dunkel oder automatisch wie in den Systemeinstellungen.': 'Light (pastel), dark or automatic like your system settings.',
    '🖥 System': '🖥 System',
    '☀︎ Hell': '☀︎ Light',
    '☾ Dunkel': '☾ Dark',
    'Sprache': 'Language',
    'Sprache der Oberfläche. Rezepte bleiben so, wie du sie geschrieben hast.': 'Language of the interface. Recipes stay exactly as you wrote them.',
    '🖥 Wie System': '🖥 Like system',
    'Updates': 'Updates',
    'EasyKitchen sucht beim Start automatisch nach Updates, sobald eine Internetverbindung besteht.': 'EasyKitchen automatically checks for updates at launch whenever an internet connection is available.',
    'Nach Updates suchen': 'Check for updates',
    'Backup': 'Backup',
    'Sichere alle Rezepte (inkl. Fotos) als JSON-Datei oder lade ein Backup. Beim Laden werden Rezepte ergänzt, nichts wird gelöscht.': 'Save all recipes (including photos) as a JSON file or load a backup. Loading adds recipes, nothing is deleted.',
    'Backup speichern': 'Save backup',
    'Backup laden': 'Load backup',
    'Backup gespeichert ✓': 'Backup saved ✓',
    'Neuigkeiten': 'What’s new',
    'Sieh dir noch einmal an, was in den letzten Versionen dazugekommen ist.': 'See again what was added in the latest versions.',
    'Was ist neu?': 'What’s new?',
    'Was ist neu': 'What’s new',
    'Speicherort': 'Storage location',
    'Deine Rezepte liegen lokal auf diesem Mac unter ~/Library/Application Support/EasyKitchen/state.json (App-Menü → „Datenordner im Finder zeigen“).': 'Your recipes are stored locally on this Mac in ~/Library/Application Support/EasyKitchen/state.json (app menu → “Show data folder in Finder”).',
    'Deine Rezepte liegen lokal im Speicher dieses Browsers. Bitte regelmäßig ein Backup speichern.': 'Your recipes are stored locally in this browser. Please save a backup regularly.',
    'Die letzten Neuerungen in EasyKitchen': 'The latest additions to EasyKitchen',
    'EasyKitchen wurde aktualisiert – das ist dazugekommen:': 'EasyKitchen was updated – here is what’s new:',
    'Willkommen! Das steckt in dieser Version:': 'Welcome! Here is what this version includes:',
    'Alles klar': 'Got it',

    // --- Import ---
    'Rezept importieren': 'Import recipe',
    'Dateien auswählen': 'Choose files',
    'Screenshots, Fotos, PDFs oder EasyKitchen-Dateien': 'Screenshots, photos, PDFs or EasyKitchen files',
    'hierher ziehen, einfügen (⌘V) oder klicken zum Auswählen': 'drag here, paste (⌘V) or click to choose',
    'PNG · JPG · HEIC · WebP · PDF · .easykitchen – mehrere Screenshots eines Rezepts auf einmal möglich': 'PNG · JPG · HEIC · WebP · PDF · .easykitchen – several screenshots of one recipe at once are possible',
    'oder Text einfügen': 'or paste text',
    'Rezepttext von einer Webseite oder aus Notizen hier einfügen …': 'Paste recipe text from a website or your notes here …',
    'Text als Rezept übernehmen': 'Use text as recipe',
    'Bitte zuerst Rezepttext einfügen.': 'Please paste recipe text first.',
    'Dateien werden gelesen…': 'Reading files…',
    'Text wird erkannt…': 'Recognizing text…',
    'Beim ersten Mal kann das bis zu 30 Sekunden dauern.': 'The first time this can take up to 30 seconds.',
    'Texterkennung für Bilder/PDFs gibt es nur in der Mac-App. Du kannst den Rezepttext aber unten einfügen.': 'Text recognition for images/PDFs is only available in the Mac app. You can paste the recipe text below instead.',
    'Text übernommen – bitte Zutaten prüfen und ergänzen': 'Text added – please check and complete the ingredients',
    'Doppelt in dieser Datei – wird übersprungen': 'Duplicate in this file – will be skipped',
    'Schon vorhanden – wird übersprungen': 'Already exists – will be skipped',
    '✓ identisch': '✓ identical',
    'Vergleichen': 'Compare',
    'Unterschiede ansehen': 'View differences',
    'Alles schon vorhanden': 'Everything already exists',
    '1 neues Rezept importieren': 'Import 1 new recipe',
    'Alle Rezepte dieser Datei sind bereits in deiner Sammlung. Es wird nichts doppelt angelegt.': 'All recipes in this file are already in your collection. Nothing will be duplicated.',
    'Rezepte mit Unterschieden stehen oben. Per Klick vergleichst du beide Fassungen und kannst die importierte als neues Rezept übernehmen oder das vorhandene damit ersetzen.': 'Recipes with differences are listed first. Click to compare both versions and import the new one as a separate recipe or replace the existing one.',
    '✓ Vorhandenes Rezept ersetzt': '✓ Existing recipe replaced',
    '✓ Als neues Rezept importiert': '✓ Imported as new recipe',
    'Keine gültige EasyKitchen-Datei.': 'Not a valid EasyKitchen file.',
    'Bitte eine Bilddatei auswählen.': 'Please choose an image file.',
    'Bild konnte nicht gelesen werden.': 'The image could not be read.',
    'Dieses Bildformat wird nicht unterstützt.': 'This image format is not supported.',
    'Datei konnte nicht gelesen werden.': 'The file could not be read.',
    'PDF konnte nicht geöffnet werden.': 'The PDF could not be opened.',

    // --- Vergleich ---
    'Allgemein': 'General',
    'Titel': 'Title',
    'kein Foto': 'no photo',
    'Kalorien / Portion': 'Calories / serving',
    'Importiert': 'Imported',
    'Vorhanden': 'Existing',
    'Ebenfalls in der Datei': 'Also in the file',
    'abweichend': 'different',
    'nur im importierten': 'only in imported',
    'nur im vorhandenen': 'only in existing',
    'nur im anderen': 'only in the other',
    'Nur Unterschiede zeigen': 'Show differences only',
    'Keine Unterschiede – die Rezepte sind inhaltlich gleich.': 'No differences – the recipes have the same content.',
    'Trotzdem übernehmen – Name des Rezepts': 'Import anyway – recipe name',
    'Du kannst den Namen ändern oder gleich lassen. Das andere Rezept der Datei bleibt unverändert.': 'You can change the name or keep it. The other recipe in the file stays unchanged.',
    'Du kannst den Namen ändern oder gleich lassen. „Als neues Rezept importieren“ behält beide Fassungen. „Vorhandenes ersetzen“ überschreibt das vorhandene Rezept mit der importierten Fassung – Favorit und Wochenplan bleiben erhalten.': 'You can change the name or keep it. “Import as new recipe” keeps both versions. “Replace existing” overwrites the existing recipe with the imported version – favorite and weekly plan are kept.',
    'Nicht importieren': 'Don’t import',
    'Vorhandenes ersetzen': 'Replace existing',
    'Als neues Rezept importieren': 'Import as new recipe',

    // --- Teilen ---
    'Teilen & exportieren': 'Share & export',
    'PDF': 'PDF',
    'Im EasyKitchen-Layout zum Ansehen, Drucken und Weitergeben – für alle. EasyKitchen-Nutzer können die PDF außerdem direkt importieren.': 'In the EasyKitchen layout to view, print and pass on – for everyone. EasyKitchen users can also import the PDF directly.',
    'Teilen…': 'Share…',
    'Speichern': 'Save',
    'PDF erstellen': 'Create PDF',
    'EasyKitchen-Datei': 'EasyKitchen file',
    'Für andere EasyKitchen-Nutzer: Doppelklick auf die Datei – und das Rezept ist inklusive Foto importiert.': 'For other EasyKitchen users: double-click the file and the recipe is imported, photo included.',
    'Keine Rezepte zum Teilen.': 'No recipes to share.',
    'PDF wird vorbereitet…': 'Preparing PDF…',
    'PDF wird erstellt…': 'Creating PDF…',
    'Bitte Pop-ups erlauben, um die PDF zu erstellen.': 'Please allow pop-ups to create the PDF.',
    'EasyKitchen-Datei gespeichert ✓': 'EasyKitchen file saved ✓',
    'Erstellt mit EasyKitchen – mit EasyKitchen lässt sich diese PDF direkt als Rezept importieren.': 'Made with EasyKitchen – this PDF can be imported directly as a recipe with EasyKitchen.',
    'Erstellt mit EasyKitchen': 'Made with EasyKitchen',

    // --- Wochenplan & Einkaufsliste ---
    '🛒 Wocheneinkaufsplaner': '🛒 Weekly shopping planner',
    'Rezepte auswählen': 'Choose recipes',
    'Rezept oder Zutat suchen …': 'Search recipe or ingredient …',
    'Portionen anpassen': 'Adjust servings',
    'Einkaufsliste': 'Shopping list',
    'Kopieren': 'Copy',
    '⇪ Teilen / Exportieren…': '⇪ Share / export…',
    'Häkchen zurücksetzen': 'Clear checkmarks',
    'Neue Woche starten': 'Start new week',
    'Fertig': 'Done',
    'Entfernen': 'Remove',
    'Wähle oben die Rezepte für deine Woche aus (oder tippe bei einem Rezept auf 🛒) – hier legst du dann die Portionen fest.': 'Choose the recipes for your week above (or tap 🛒 on a recipe) – then set the servings here.',
    'Sobald du Rezepte für die Woche auswählst, entsteht hier automatisch deine Einkaufsliste – gleiche Zutaten werden zusammengefasst.': 'As soon as you choose recipes for the week, your shopping list appears here automatically – identical ingredients are combined.',
    'Keine passenden Rezepte.': 'No matching recipes.',
    'Obst & Gemüse': 'Fruit & vegetables',
    'Fleisch & Fisch': 'Meat & fish',
    'Milchprodukte & Eier': 'Dairy & eggs',
    'Nudeln, Reis & Backen': 'Pasta, rice & baking',
    'Konserven, Saucen & Brühe': 'Canned goods, sauces & stock',
    'Gewürze & Öle': 'Spices & oils',
    'Getränke': 'Drinks',
    'Sonstiges': 'Other',
    'nach Bedarf': 'as needed',
    '(nach Bedarf)': '(as needed)',
    '🛒 Einkaufsliste (EasyKitchen)': '🛒 Shopping list (EasyKitchen)',
    'Einkaufsliste für die Woche': 'Shopping list for the week',
    'Einkaufsliste teilen': 'Share shopping list',
    'Als Text': 'As text',
    'Für WhatsApp, Nachrichten, Notizen, AirDrop & Co. – Menge zuerst, nach Bereichen sortiert.': 'For WhatsApp, Messages, Notes, AirDrop & co. – amount first, sorted by section.',
    'Als Bild': 'As image',
    'Übersichtliches Bild im Handy-Format – praktisch zum Weiterschicken oder für den Sperrbildschirm.': 'A clear image in phone format – handy for sending on or as a lock screen.',
    'Als PDF': 'As PDF',
    'Zum Ausdrucken, mit Kästchen zum Abhaken.': 'For printing, with boxes to tick off.',
    'Einkaufsliste kopiert ✓': 'Shopping list copied ✓',
    'Kopieren nicht möglich': 'Copying not possible',
    'Einkaufsliste wird vorbereitet…': 'Preparing shopping list…',
    'Bild gespeichert ✓': 'Image saved ✓',
    'Neue Woche starten? Alle geplanten Rezepte und Häkchen werden entfernt.': 'Start a new week? All planned recipes and checkmarks will be removed.',
    'Zum Wochenplan hinzugefügt 🛒': 'Added to weekly plan 🛒',
    'Aus dem Wochenplan entfernt': 'Removed from weekly plan',
    'Als Favorit markiert ★': 'Marked as favorite ★',
    'Favorit entfernt': 'Favorite removed',
    'Rezept gelöscht': 'Recipe deleted',

    // --- Updates ---
    'Prüfe GitHub auf eine neue Version…': 'Checking GitHub for a new version…',
    'Update-Server gerade nicht erreichbar (z. B. offline) – EasyKitchen versucht es automatisch erneut.': 'Update server not reachable right now (e.g. offline) – EasyKitchen will retry automatically.',
    'Keine Internetverbindung – Update-Prüfung erfolgt automatisch, sobald du online bist.': 'No internet connection – EasyKitchen will check for updates as soon as you are online.',
    'Update fehlgeschlagen.': 'Update failed.',
    'Erneut versuchen': 'Try again',
    'Aktualisiere…': 'Updating…',
    'Installiere & starte neu…': 'Installing & restarting…',
    'Lade Update…': 'Downloading update…',
    'Verbesserungen und Fehlerbehebungen. Deine Rezepte bleiben beim Update vollständig erhalten.': 'Improvements and bug fixes. Your recipes are fully kept during the update.',
    'Starte Download…': 'Starting download…',
    'Starte Update…': 'Starting update…',
    '⤓ Direkt herunterladen': '⤓ Download directly',
    'Heruntergeladene DMG installieren': 'Install downloaded DMG',
    'Neues Update verfügbar': 'New update available',
    'Version überspringen': 'Skip version',
    'Später': 'Later',
    'Jetzt aktualisieren & neu starten': 'Update & restart now',
    'Neue Version herunterladen': 'Download new version',
    'Bereits heruntergeladene EasyKitchen.dmg auswählen': 'Choose an already downloaded EasyKitchen.dmg',
    'EasyKitchen aktualisieren': 'Update EasyKitchen',
    'Die Update-Prüfung hat gerade nicht geklappt – meist ist kurz keine Internetverbindung da. Du kannst es erneut versuchen oder die neueste Version direkt laden:': 'The update check didn’t work just now – usually the internet connection was briefly gone. You can try again or download the latest version directly:',
    '↻ Erneut nach Updates suchen': '↻ Check for updates again',
    '⤓ Neueste Version direkt herunterladen': '⤓ Download latest version directly',
    'Danach: heruntergeladene EasyKitchen.dmg installieren': 'Then: install the downloaded EasyKitchen.dmg',
    'Download gestartet – danach „Heruntergeladene DMG installieren“': 'Download started – then use “Install downloaded DMG”',
    'Automatische Installation nicht möglich – siehe Hinweisfenster.': 'Automatic installation not possible – see the message window.',

    // --- Einheiten (Auswahlliste) ---
    'Stück': 'pcs', 'EL': 'tbsp', 'TL': 'tsp', 'Prise': 'pinch', 'Bund': 'bunch', 'Dose': 'can', 'Packung': 'pack',
    'Zehe': 'clove', 'Tasse': 'cup', 'Becher': 'tub', 'Glas': 'jar', 'Scheibe': 'slice', 'Zweig': 'sprig',
    'Handvoll': 'handful', 'Messerspitze': 'knife tip', 'Eigenes …': 'Custom …', 'nach Geschmack': 'to taste'
  };

  // Einheiten: Einzahl/Mehrzahl auf Englisch
  const UNIT_EN = {
    g: ['g', 'g'], kg: ['kg', 'kg'], ml: ['ml', 'ml'], l: ['l', 'l'], stk: ['pc', 'pcs'], el: ['tbsp', 'tbsp'],
    tl: ['tsp', 'tsp'], prise: ['pinch', 'pinches'], bund: ['bunch', 'bunches'], dose: ['can', 'cans'], pck: ['pack', 'packs'],
    zehe: ['clove', 'cloves'], tasse: ['cup', 'cups'], becher: ['tub', 'tubs'], glas: ['jar', 'jars'], scheibe: ['slice', 'slices'],
    zweig: ['sprig', 'sprigs'], handvoll: ['handful', 'handfuls'], msp: ['knife tip', 'knife tips'], custom: ['Custom …', 'Custom …'],
    ng: ['to taste', 'to taste']
  };

  const n2 = n => (Number(n) === 1 ? '' : 's');
  const q = s => '“' + s + '”';
  // „…“ → “…” in Namen innerhalb übersetzter Texte
  const quotes = s => String(s).replace(/„([^“]*)“/g, '“$1”');

  // =========================================================================
  // Muster für Texte mit Zahlen oder Namen (ganzer Text eines Elements)
  // =========================================================================
  const PATTERNS = [
    // Liste & Suche
    [/^Sortieren: (.+)$/, (m, t) => `Sort: ${tr(t)}`],
    [/^„([^„“]+)“$/, (m, t) => q(t)],
    [/^(≤ )?(\d+) Min$/, (m, le, n) => `${le || ''}${n} min`],
    [/^(\d+) Std(?: (\d+) Min)?$/, (m, h, mi) => `${h} h${mi ? ` ${mi} min` : ''}`],
    [/^✓ (\d+) von (\d+) Zutaten da$/, (m, a, b) => `✓ ${a} of ${b} ingredients at hand`],
    [/^Alle (\d+) angezeigten Rezepte teilen oder als PDF speichern$/, (m, n) => `Share all ${n} shown recipes or save them as PDF`],
    [/^(\d+) teilen \/ PDF$/, (m, n) => `Share ${n} / PDF`],
    [/^(\d+) Rezepte? (mit allen Zutaten: |mit )(.+) (in deinen Rezepten|unter deinen Favoriten)$/, (m, n, all, terms, where) =>
      `${n} recipe${n2(n)} with ${all.includes('allen') ? 'all ingredients: ' : ''}${quotes(terms.replace(/“ und „/g, '“ and „'))} ${where.startsWith('in') ? 'in your recipes' : 'in your favorites'}`],
    [/^(\d+) Rezepte? (in deinen Rezepten|unter deinen Favoriten)$/, (m, n, where) => `${n} recipe${n2(n)} ${where.startsWith('in') ? 'in your recipes' : 'in your favorites'}`],
    [/^Kein Rezept enthält alle gesuchten Zutaten \((.+)\)\.(?: (\d+) (?:Rezept enthält|Rezepte enthalten) zumindest einen Teil davon – entferne eine Zutat aus der Suche, um (?:es|sie) zu sehen\.)?$/,
      (m, terms, p) => `No recipe contains all searched ingredients (${quotes(terms.replace(/“ und „/g, '“ and „'))}).${p ? ` ${p} recipe${n2(p)} contain${p === '1' ? 's' : ''} at least some of them – remove an ingredient from the search to see ${p === '1' ? 'it' : 'them'}.` : ''}`],
    // Detail & Portionen
    [/^(\d+) Portion(en)?$/, (m, n) => `${n} serving${n2(n)}`],
    [/^Original \((\d+)\)$/, (m, n) => `Original (${n})`],
    [/^(\d+) Rezepte des Tages$/, (m, n) => `${n} recipes of the day`],
    [/^✨ (\d+) Rezepte des Tages$/, (m, n) => `✨ ${n} recipes of the day`],
    [/^Rezept (\d+)$/, (m, n) => `Recipe ${n}`],
    [/^(\d+) Zutat(en)?$/, (m, n) => `${n} ingredient${n2(n)}`],
    [/^Änderungen an „(.+)“$/, (m, t) => `Changes to ${q(t)}`],
    [/^heute, (.+)$/, (m, t) => `today, ${t}`],
    [/^„(.+)“ wirklich löschen\?$/, (m, t) => `Really delete ${q(t)}?`],
    [/^Deine Änderungen an „(.+)“ sind noch nicht gespeichert\. Als Entwurf sichern\? Du findest ihn dann oben unter „Entwürfe“\.$/,
      (m, t) => `Your changes to ${q(t)} are not saved yet. Save them as a draft? You will find it under “Drafts” at the top.`],
    [/^Einheit korrigiert: (.+)$/, (m, t) => `Unit corrected: ${t}`],
    [/^Backup geladen: (\d+) neu, (\d+) aktualisiert ✓$/, (m, a, b) => `Backup loaded: ${a} new, ${b} updated ✓`],
    [/^Was ist neu in v([\d.]+)\?$/, (m, v) => `What’s new in v${v}?`],
    [/^Richtwerte pro Portion \((\d+) Portion(?:en)?\), automatisch aus den Zutaten geschätzt\. Prozent = Anteil am Tagesbedarf eines Erwachsenen \(2\.000 kcal\)\.$/,
      (m, n) => `Estimates per serving (${n} serving${n2(n)}), calculated automatically from the ingredients. Percent = share of an adult’s daily needs (2,000 kcal).`],
    [/^Nicht berücksichtigt: (.+)\.$/, (m, t) => `Not included: ${t}.`],
    [/^Automatisch aus den Zutaten geschätzt; nicht berücksichtigt: (.+)\.$/, (m, t) => `Estimated automatically from the ingredients; not included: ${t}.`],
    // Import
    [/^(.+) konnte nicht gelesen werden\.$/, (m, f) => `${f} could not be read.`],
    [/^(.+): keine gültige EasyKitchen-Datei$/, (m, f) => `${f}: not a valid EasyKitchen file`],
    [/^(.+): kein Text gefunden$/, (m, f) => `${f}: no text found`],
    [/^Text wird erkannt \((\d+) Dateien\)…(.*)$/, (m, n, rest) => `Recognizing text (${n} files)…${rest ? ' ' + tr(rest.trim()) : ''}`],
    [/^Text wird erkannt…(.+)$/, (m, rest) => `Recognizing text… ${tr(rest.trim())}`],
    [/^Rezept erkannt \((\d+) Zutaten\) – bitte kurz prüfen$/, (m, n) => `Recipe recognized (${n} ingredients) – please check quickly`],
    [/^● (\d+) Unterschiede?$/, (m, n) => `● ${n} difference${n2(n)}`],
    [/^● (\d+) mit Unterschieden$/, (m, n) => `● ${n} with differences`],
    [/^✓ (\d+) identisch$/, (m, n) => `✓ ${n} identical`],
    [/^(\d+) neue Rezepte importieren$/, (m, n) => `Import ${n} new recipes`],
    [/^(\d+) importieren$/, (m, n) => `Import ${n}`],
    [/^Alle (\d+) Rezepte dieser Datei sind bereits in deiner Sammlung\. Es wird nichts doppelt angelegt\.$/, (m, n) => `All ${n} recipes in this file are already in your collection. Nothing will be duplicated.`],
    [/^(1 Rezept ist|(\d+) Rezepte sind) schon vorhanden und (?:wird|werden) übersprungen$/, (m, one, n) => n ? `${n} recipes already exist and will be skipped` : '1 recipe already exists and will be skipped'],
    [/^(\d+) Zutaten · (.+) gesamt$/, (m, n, t) => `${n} ingredient${n2(n)} · ${t} total`],
    [/^(\d+) Rezepte? importiert ✓(?: · (\d+) übersprungen)?$/, (m, n, s) => `${n} recipe${n2(n)} imported ✓${s ? ` · ${s} skipped` : ''}`],
    // Vergleich
    [/^(\d+) Unterschiede? gefunden – farbig markiert\.$/, (m, n) => `${n} difference${n2(n)} found – highlighted in color.`],
    [/^Zutaten \((\d+) \/ (\d+)\)$/, (m, a, b) => `Ingredients (${a} / ${b})`],
    [/^Zubereitung \((\d+) \/ (\d+) Schritte\)$/, (m, a, b) => `Instructions (${a} / ${b} steps)`],
    [/^Hinweis: Die Mengen gelten für (\d+) bzw\. (\d+) Portionen\.$/, (m, a, b) => `Note: the amounts are for ${a} and ${b} servings respectively.`],
    [/^„(.+)“ als neues Rezept importiert ✓$/, (m, t) => `${q(t)} imported as new recipe ✓`],
    [/^„(.+)“ ersetzt ✓$/, (m, t) => `${q(t)} replaced ✓`],
    [/^„(.+)“ durch die importierte Fassung ersetzen\?\s+Die bisherige Fassung \(Zutaten, Schritte, Foto …\) wird überschrieben\.$/,
      (m, t) => `Replace ${q(t)} with the imported version?\n\nThe current version (ingredients, steps, photo …) will be overwritten.`],
    // Teilen & Einkaufsliste
    [/^(\d+) Rezepte$/, (m, n) => `${n} recipes`],
    [/^Rezept · (.+)$/, (m, d) => `Recipe · ${d}`],
    [/^EasyKitchen – (\d+) Rezepte$/, (m, n) => `EasyKitchen – ${n} recipes`],
    [/^Einkaufsliste · (.+)$/, (m, d) => `Shopping list · ${d}`],
    [/^für (.+)$/, (m, t) => `for ${t}`],
    [/^Für: (.+)$/, (m, t) => `For: ${t.replace(/ \((\d+) P\.\)/g, ' ($1 serv.)')}`],
    [/^(.+) \(nach Bedarf\)$/, (m, t) => `${t} (as needed)`],
    // Updates
    [/^Neue Version v([\d.]+) verfügbar\.$/, (m, v) => `New version v${v} available.`],
    [/^Update auf v([\d.]+) verfügbar$/, (m, v) => `Update to v${v} available`],
    [/^v([\d.]+) – aktuellste Version installiert \(klicken, um erneut zu prüfen\)$/, (m, v) => `v${v} – latest version installed (click to check again)`],
    [/^Du hast die aktuellste Version \(v([\d.]+)\)\.$/, (m, v) => `You have the latest version (v${v}).`],
    [/^EasyKitchen ist auf dem neuesten Stand \(v([\d.]+)\) ✓$/, (m, v) => `EasyKitchen is up to date (v${v}) ✓`],
    [/^✨ Update v([\d.]+) ist verfügbar – oben auf den Hinweis klicken$/, (m, v) => `✨ Update v${v} is available – click the notice at the top`],
    [/^Version v([\d.]+) ist da \(installiert: v([\d.]+)\)\. Deine Rezepte bleiben beim Update vollständig erhalten\.$/,
      (m, a, b) => `Version v${a} is here (installed: v${b}). Your recipes are fully kept during the update.`],
    [/^Version v([\d.]+) wird übersprungen$/, (m, v) => `Version v${v} will be skipped`],
    [/^Update auf v([\d.]+) installiert ✓$/, (m, v) => `Updated to v${v} ✓`]
  ];

  // =========================================================================
  // Kern
  // =========================================================================
  let pref = 'auto';
  let lang = 'de';

  function systemLang() {
    const s = String(window.__EK_SYSTEM_LANG || (navigator.languages && navigator.languages[0]) || navigator.language || 'de').toLowerCase();
    return s.startsWith('de') ? 'de' : 'en';
  }
  function resolve(p) { return p === 'de' || p === 'en' ? p : systemLang(); }

  /** Deutschen Text in die aktuelle Sprache übersetzen (unbekannte Texte bleiben unverändert). */
  function tr(s) {
    if (lang === 'de' || s == null) return s;
    s = String(s);
    const lead = s.match(/^\s*/)[0];
    const trail = s.match(/\s*$/)[0];
    const core = s.trim().replace(/\s+/g, ' ');
    if (!core || !/[A-Za-zÄÖÜäöüß]/.test(core)) return s;
    let out = EN[core];
    if (out == null) {
      for (const [re, rep] of PATTERNS) {
        if (re.test(core)) { out = core.replace(re, rep); break; }
      }
    }
    // Zusammengesetzte Zeilen („⏱ 30 Min · Einfach · ★ Favorit“) Teil für Teil
    if (out == null && core.includes(' · ')) {
      const parts = core.split(' · ');
      const done = parts.map(p => tr(p));
      if (done.some((p, i) => p !== parts[i])) out = done.join(' · ');
    }
    if (out == null && /^[^\wÄÖÜäöüß„]+ /.test(core)) {           // führendes Symbol: „✓ Im Wochenplan“
      const sym = core.match(/^[^\wÄÖÜäöüß„]+ /)[0];
      const rest = tr(core.slice(sym.length));
      if (rest !== core.slice(sym.length)) out = sym + rest;
    }
    return out == null ? s : lead + out + trail;
  }

  // ---------- DOM automatisch übersetzen ----------
  const TEXT = new WeakMap();   // Textknoten → { orig, set }
  const ATTR = new WeakMap();   // Element → { [attr]: { orig, set } }
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const SKIP = 'script, style, textarea, [translate="no"], [contenteditable="true"]';

  function skipped(el) { return !el || (el.closest && el.closest(SKIP)); }

  function translateText(node) {
    const cur = node.nodeValue;
    let rec = TEXT.get(node);
    if (!rec || rec.set !== cur) { rec = { orig: cur }; TEXT.set(node, rec); }
    // Elemente mit eigener englischer Beschriftung (data-en), z. B. „Zubereitung“ als Zeitangabe = „Cook time“
    const ctx = node.parentElement && node.parentElement.getAttribute('data-en');
    const out = lang === 'de' ? rec.orig : (ctx && rec.orig.trim() ? rec.orig.replace(rec.orig.trim(), ctx) : tr(rec.orig));
    rec.set = out;
    if (out !== cur) node.nodeValue = out;
  }

  function translateAttrs(el) {
    let recs = ATTR.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      if (!recs) { recs = {}; ATTR.set(el, recs); }
      let rec = recs[a];
      if (!rec || rec.set !== cur) { rec = { orig: cur }; recs[a] = rec; }
      const out = lang === 'de' ? rec.orig : tr(rec.orig);
      rec.set = out;
      if (out !== cur) el.setAttribute(a, out);
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) translateText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && skipped(root)) return;
    if (root.nodeType === 1) translateAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: n => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) translateText(n);
      else translateAttrs(n);
    }
  }

  let observer = null;
  function observe() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach(translateTree);
        else if (m.type === 'characterData') { if (!skipped(m.target.parentElement)) translateText(m.target); }
        else if (m.type === 'attributes' && !skipped(m.target)) translateAttrs(m.target);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /** HTML-Text (z. B. für PDF) übersetzen. */
  function translateHTML(html) {
    if (lang === 'de') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    translateTree(doc.body);
    doc.documentElement.lang = 'en';
    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  // ---------- Formate ----------
  function locale() { return lang === 'en' ? 'en-GB' : 'de-DE'; }
  function unitLabel(unit, amount) {
    if (!unit) return '';
    if (lang === 'en') { const e = UNIT_EN[unit.id]; if (e) return amount > 1 ? e[1] : e[0]; }
    return amount > 1 && unit.plural ? unit.plural : unit.label;
  }
  function unitOptionLabel(unit) {
    if (lang === 'en') { const e = UNIT_EN[unit.id]; if (e) return e[0]; }
    return unit.label;
  }

  // ---------- Sprache setzen ----------
  const listeners = [];
  function apply() {
    document.documentElement.lang = lang;
    translateTree(document.body);
    document.title = 'EasyKitchen';
    try {
      const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeSetLanguage;
      if (h) h.postMessage({ lang, pref });
    } catch (e) { /* nur im Browser */ }
  }

  function setPreference(p) {
    pref = ['de', 'en', 'auto'].includes(p) ? p : 'auto';
    if (ns.Data) ns.Data.setSetting('language', pref);
    const before = lang;
    lang = resolve(pref);
    apply();
    if (before !== lang) listeners.forEach(fn => { try { fn(lang); } catch (e) { console.error(e); } });
  }

  function init() {
    pref = (ns.Data && ns.Data.getSetting('language', 'auto')) || 'auto';
    lang = resolve(pref);
    observe();
    apply();
  }

  ns.I18n = {
    init, tr, translateTree, translateHTML, setPreference, onChange: fn => listeners.push(fn),
    get lang() { return lang; }, get preference() { return pref; },
    locale, unitLabel, unitOptionLabel
  };
})(window.EasyKitchen);
