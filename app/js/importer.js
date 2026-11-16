/*
 * EasyKitchen – Rezept-Import.
 * • .easykitchen-Dateien & EasyKitchen-PDFs → exakte Übernahme
 * • Screenshots, Fotos, fremde PDFs → Texterkennung (macOS Vision) → Rezept-Entwurf zum Korrigieren
 * • eingefügter Text (z. B. von Webseiten) → Rezept-Entwurf
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data, UI = ns.UI;
  const $ = UI.$, esc = UI.esc;
  const native = name => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[name];

  // =========================================================================
  // Text → Rezept
  // =========================================================================

  const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅕': 0.2 };
  const FRAC_CHARS = Object.keys(FRACTIONS).join('');

  // [Muster, Einheit, Faktor, Namens-Präfix]
  const UNIT_WORDS = [
    [/^(g|gr|gramm)$/, 'g', 1],
    [/^(kg|kilo|kilogramm)$/, 'kg', 1],
    [/^(ml|milliliter)$/, 'ml', 1],
    [/^(cl|zentiliter)$/, 'ml', 10],
    [/^(dl|deziliter)$/, 'ml', 100],
    [/^(l|ltr|liter)$/, 'l', 1],
    [/^(el|essl|esslöffel|eßlöffel|tbsp|tbs|tablespoons?)$/, 'el', 1],
    [/^(tl|teel|teelöffel|tsp|teaspoons?)$/, 'tl', 1],
    [/^(prisen?|pinch)$/, 'prise', 1],
    [/^(bund|bündel|bunch)$/, 'bund', 1],
    [/^(dosen?|ds|can|cans)$/, 'dose', 1],
    [/^(pck|pkg|pkt|päckchen|päckch|packung|packungen|pack|pckg|päckchen)$/, 'pck', 1],
    [/^(zehen?|cloves?)$/, 'zehe', 1],
    [/^(knoblauchzehen?)$/, 'zehe', 1, 'Knoblauch'],
    [/^(tassen?|cups?)$/, 'tasse', 1],
    [/^(becher)$/, 'becher', 1],
    [/^(glas|gläser|gläschen)$/, 'glas', 1],
    [/^(scheiben?|slices?)$/, 'scheibe', 1],
    [/^(zweige?|zweiglein|sprigs?)$/, 'zweig', 1],
    [/^(handvoll)$/, 'handvoll', 1],
    [/^(msp|messerspitzen?)$/, 'msp', 1],
    [/^(stk|stck|stück|stücke|st|pieces?|pcs|pc)$/, 'stk', 1]
  ];
  // Einheiten ohne feste Entsprechung → „Eigenes …“ mit dem Wort aus dem Rezept
  const CUSTOM_UNIT = /^(blatt|blätter|stange|stangen|stängel|stiel|stiele|würfel|tropfen|spritzer|schuss|kugel|kugeln|kopf|köpfe|knolle|knollen|beutel|btl|tüte|tüten|flasche|flaschen|rolle|rollen|platte|platten|tafel|tafeln|schale|schalen|riegel|ecke|ecken|kästchen|schote|schoten|tube|tuben|rispe|rispen|stückchen|portion|portionen|kapsel|kapseln|blättchen)$/i;
  // Zahlwörter am Zeilenanfang („eine Zwiebel“, „zwei Eier“, „eine halbe Zitrone“)
  const NUM_WORDS = { ein: 1, eine: 1, einen: 1, einer: 1, eins: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, sechs: 6, sieben: 7, acht: 8,
    neun: 9, zehn: 10, elf: 11, 'zwölf': 12, halb: 0.5, halbe: 0.5, halber: 0.5, halbes: 0.5, eineinhalb: 1.5, anderthalb: 1.5, zweieinhalb: 2.5,
    viertel: 0.25, dreiviertel: 0.75 };

  const ING_HEADER = /^(zutaten|zutatenliste|die zutaten|ingredients|du brauchst|das brauchst du|was du brauchst|einkaufsliste)\b/i;
  const STEP_HEADER = /^(zubereitung|zubereitungsschritte|anleitung|anleitungen|so geht'?s|so wird'?s gemacht|so gehts|schritte|arbeitsschritte|how to make|instructions|directions|method|preparation|steps)\b/i;
  // Reine Schrittmarke in eigener Zeile: „Schritt“, „Schritt 1“, „SCHRITT 2/5“, „Schritt 3 von 6“, „1. Schritt“, „Step 4“
  const STEP_MARK = /^(?:(?:arbeits|zubereitungs)?schritt|step)(?:\s*(?:nr\.?\s*)?\d{1,2}(?:\s*(?:\/|von|of)\s*\d{1,2})?)?\s*[:.)\-–]?$|^\d{1,2}\s*\.\s*(?:arbeits)?schritt\s*:?$/i;
  // Hinweise/Tipps nach den Schritten: Überschrift weglassen, Inhalt als letzten Schritt behalten
  const NOTES_HEADER = /^(notizen|notiz|hinweis|hinweise|tipp|tipps|tip|tips|notes)\b/i;
  const END_HEADER = /^(kommentare|bewertungen|ähnliche rezepte|das könnte dich|weitere rezepte|nährwerte|nährwert|naehrwerte|nährwerte pro portion|anzeige|werbung|reviews|comments|nutrition|tipps? (?:und|&) tricks|hilfsmittel|utensilien|küchenutensilien|equipment|das solltest du haben|das brauchst du an geräten|was meinst du|hast du das rezept|das rezept findest du|mehr (?:einfache )?rezepte)\b/i;
  const NOISE = /^(drucken|teilen|speichern|merken|rezept speichern|zum rezept|anmelden|einloggen|kommentieren|foto hochladen|fotos?|bilder|video|jetzt ansehen|mehr anzeigen|weiterlesen|zurück|menü|suche|abonnieren|print|share|save|jump to recipe|portionen anpassen|einkaufsliste|auf die einkaufsliste|zur einkaufsliste hinzufügen|\+|-|–|•)$/i;

  /** Fett gedruckte PDF-Texte liefern jeden Buchstaben doppelt („ZZUUTTAATTEENN“) → zurückführen. */
  function undoubleWord(w) {
    // Satzzeichen am Rand abtrennen („bbeerreeiitt,“ / „..ttoopp..“) und Kern prüfen
    const m = w.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    const core = m ? m[2] : w;
    if (core.length < 4 || core.length % 2) return w;
    for (let i = 0; i < core.length; i += 2) if (core[i] !== core[i + 1]) return w;
    const half = s2 => s2.length >= 2 && s2.length % 2 === 0 && [...s2].every((c, i, a) => i % 2 || c === a[i + 1]) ? s2.replace(/(.)\1/g, '$1') : s2;
    return half(m[1]) + core.replace(/(.)\1/g, '$1') + half(m[3]);
  }
  function undouble(l) {
    const words = l.split(/(\s+)/);
    const toks = words.filter(w => w.trim());
    const doubled = toks.filter(w => w.length >= 4 && undoubleWord(w) !== w).length;
    // nur, wenn die Zeile überwiegend so aussieht (nicht einzelne Wörter wie „Kaffee“ verändern)
    if (!doubled || doubled < Math.ceil(toks.filter(w => w.length >= 4).length / 2)) {
      // Teilstücke innerhalb normaler Zeilen: „sscchhnniibbbbeellsstt Du …“ → Wort für Wort, aber nur ≥ 6 Zeichen
      return words.map(w => (w.length >= 6 && undoubleWord(w) !== w ? undoubleWord(w) : w)).join('');
    }
    return words.map(w => (w.trim() ? undoubleWord(w) : w)).join('');
  }

  function cleanLine(l) {
    return undouble(String(l || ''))
      .replace(/ /g, ' ')
      .replace(/^[\s•·▪︎▪●○◦■□☐☑✓✔*>\-–—]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isNoise(l) {
    if (/^\(?\d{1,2}[.)]?\)?$/.test(l || '')) return false;          // einzelne Schrittnummer behalten
    if (!l || l.length < 2) return true;
    if (NOISE.test(l)) return true;
    if (/^(https?:\/\/|www\.)/i.test(l)) return true;
    if (/^[\w.-]+\.(de|com|at|ch|net|org|io|eu|co|uk|fr|it)(\/\S*)?$/i.test(l)) return true;   // Domain
    if (/^(portionen|personen|portion|servings?)\s*[:\-]?\s*\d+$/i.test(l)) return true;
    if (/^\d{1,2}:\d{2}(\s|$)/.test(l) && l.length < 14) return true;            // Uhrzeit der Statusleiste
    if (/^\d{1,3}\s?%$/.test(l)) return true;                                       // Akku
    if (/^[\d.,]+\s*\(\d+\)$/.test(l)) return true;                                 // Bewertung „4,5 (123)“
    if (/^[★☆✩✪⭐️\s]+$/.test(l)) return true;
    if (/^((vorbereitungs|zubereitungs|koch|back|gesamt|arbeits|ruhe)zeit|portionen:?|kalorien pro portion|\s)+$/i.test(l)) return true;
    if (/https?:\/\/|www\.[a-z]/i.test(l) && l.length > 25) return true;                // Kopfzeile mit Webadresse
    if (/^(seite\s*)?\d+\s*(von|\/)\s*\d+\b/i.test(l)) return true;                     // „Seite 1 von 2“, „1 von 2 …“
    if (/\b\d{1,2}\.\d{1,2}\.\d{2,4},?\s*\d{1,2}:\d{2}\b/.test(l) && l.length < 40) return true;   // Druckdatum
    if (/^([\d.,]+\s*(von\s*\d+\s*)?)?\d*\s*bewertung(en)?$/i.test(l)) return true;           // „4.58 von 14 Bewertungen“
    if (/^(autor|rezept|von|by)\s*:?\s+\S/i.test(l) && l.length < 40 && !/\d/.test(l)) return true;  // „Autor Malene“, „Rezept: …“
    if (/findest du (auch )?(auf|unter)|foodblog|newsletter|instagram|pinterest/i.test(l) && l.length < 120) return true;
    if (!/[a-zäöüß]/i.test(l) && !/\d/.test(l)) return true;
    return false;
  }

  function headerKey(l) { return l.toLowerCase().replace(/[:.]+$/, '').trim(); }

  function parseNumber(s) {
    s = String(s || '').trim();
    if (!s) return NaN;
    let total = 0, found = false;
    for (const ch of s) if (FRACTIONS[ch] != null) { total += FRACTIONS[ch]; found = true; }
    s = s.replace(new RegExp(`[${FRAC_CHARS}]`, 'g'), ' ').trim();
    if (!s) return found ? total : NaN;
    let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (m) return total + Number(m[1]) + Number(m[2]) / Number(m[3]);
    m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (m) return total + Number(m[1]) / Number(m[2]);
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? total + n : NaN;
  }

  // Menge am Zeilenanfang: „200“, „1,5“, „1/2“, „1 1/2“, „½“, „1½“, „2-3“, „ca. 200“
  const QTY = `(?:ca\\.?|etwa|circa|approx\\.?)?\\s*((?:\\d+\\s+\\d+\\s*\\/\\s*\\d+)|(?:\\d+\\s*\\/\\s*\\d+)|(?:\\d+(?:[.,]\\d+)?\\s*[${FRAC_CHARS}]?)|(?:[${FRAC_CHARS}]))(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?`;
  const LEAD_QTY = new RegExp(`^${QTY}\\s*(.*)$`, 'i');
  const TRAIL_QTY = new RegExp(`^(.*?[a-zäöüß)].*?)\\s+${QTY}\\s*([a-zäöüß.]{0,14})$`, 'i');

  function matchUnit(token) {
    const raw = String(token || '').replace(/\.$/, '');
    const t = raw.toLowerCase();
    for (const [re, unit, factor, prefix] of UNIT_WORDS) if (re.test(t)) return { unit, factor, prefix };
    if (CUSTOM_UNIT.test(t)) return { unit: 'custom', factor: 1, custom: raw.charAt(0).toUpperCase() + raw.slice(1) };
    return null;
  }

  /** Zutat inkl. eigener Einheit zusammenbauen. */
  function mkIng(name, amount, u) {
    const ing = { name, amount: Number.isFinite(amount) ? Number((amount * (u ? u.factor : 1)).toFixed(2)) : 0, unit: u ? u.unit : 'stk' };
    if (u && u.custom) ing.customUnit = u.custom;
    return ing;
  }

  /** Mengenangaben vereinheitlichen, bevor die Zeile zerlegt wird. */
  function normalizeQty(l) {
    l = l.replace(/(\d)\s*\u2044\s*(\d)/g, '$1/$2')                 // 1⁄2 → 1/2
      .replace(/(\d)([½¼¾⅓⅔⅛⅕])/g, '$1 $2');
    // Zahlwörter: „eine halbe Zitrone“ / „zwei Eier“ / „1 halbe Gurke“
    l = l.replace(/^(?:(\d+)\s+)?(ein|eine|einen|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|eineinhalb|anderthalb|zweieinhalb|dreiviertel)?\s*(halbe[rs]?|halb|viertel)?(?=\s+\S)/i, (m, num, w1, w2) => {
      if (!w1 && !w2) return m;
      let v = num ? Number(num) : 0;
      if (w1) v = v ? v * NUM_WORDS[w1.toLowerCase()] : NUM_WORDS[w1.toLowerCase()];
      if (w2) v = v ? v * NUM_WORDS[w2.toLowerCase()] : NUM_WORDS[w2.toLowerCase()];
      return v ? String(v).replace('.', ',') : m;
    });
    // „gestr. TL“, „gehäufter EL“, „knapp 200 g“ → Zusatz weglassen
    l = l.replace(/^([\d.,\/½¼¾⅓⅔⅛\s-]+)\s*(?:gestr\.?|gestrichene[rns]?|gehäufte[rns]?|gehäuft|leicht gehäufte[rns]?|knappe[rns]?|gute[rns]?|große[rns]?(?=\s+(?:el|tl|prise|tasse|handvoll|schuss|spritzer)\b))\s+/i, '$1 ');
    l = l.replace(/^(?:knapp|gut|ca\.?|etwa|circa|rund|ungefähr)\s+(?=[\d½¼¾])/i, '');
    // Doppelte Angaben: „200 g / 7 oz Mehl“, „250 ml (1 cup) Milch“
    l = l.replace(/^([\d.,\/½¼¾\s-]+\s*[a-zäöü.]{0,8})\s*(?:\/|\()\s*[\d.,\/½¼¾\s]+\s*(?:oz|ounces?|cups?|lbs?|pounds?|tbsp|tsp|fl\.? ?oz)\.?\)?\s*/i, '$1 ');
    return l;
  }

  function tidyName(n) {
    return n
      .replace(/\((n|en|e|s|er|nen)\)/gi, '')            // Chefkoch-Stil: „Zwiebel(n)“
      .replace(/^(von|vom|of)\s+/i, '')
      .replace(/\s*[,:;]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Eine Zutatenzeile zerlegen → { name, amount, unit } oder null. */
  function parseIngredient(line) {
    let l = cleanLine(line);
    if (STEP_MARK.test(l)) return null;                      // „Schritt 1“ ist keine Zutat
    // „Mirin - Alternativ trockener Weißwein …“ / „Hähnchenbrust – oder Schenkel“ → „Mirin (alternativ …)“
    l = l.replace(/\s[-–]\s((?:alternativ|oder|bzw\.?|z\.\s?b\.)\b.*)$/i, (m, alt) => ` (${alt.charAt(0).toLowerCase() + alt.slice(1)})`);
    if (l.length > 110) l = l.slice(0, 110).replace(/\s\S*$/, '');
    if (!l || l.length > 120) return null;
    l = l.replace(/^(nach bedarf|nach belieben|nach geschmack|etwas|evtl\.?|optional)\s+/i, m => (m.trim() + ' ')).replace(/^(nach bedarf|nach belieben|nach geschmack)\s+(.+)$/i, '$2');
    l = normalizeQty(l);
    // Menge in Klammern oder hinter Doppelpunkt: „Mehl (200 g)“, „Mehl: 200 g“, „Mehl – 200 g“
    const pm = l.match(new RegExp(`^([^\\d(]*?[a-zäöüß][^\\d(]*?)\\s*(?:\\(|:|\\s[-–]\\s)\\s*${QTY}\\s*([a-zäöüß.]{0,14})\\s*\\)?\\s*(.*)$`, 'i'));
    if (pm) {
      const u = matchUnit(pm[3]);
      const amount = parseNumber(pm[2]);
      if (Number.isFinite(amount) && (u || !pm[3])) {
        const extra = pm[4].replace(/^[,;\s]+/, '').trim();
        const name = tidyName(pm[1] + (extra ? ` (${extra.replace(/^\(|\)$/g, '')})` : ''));
        if (name) return mkIng(name, amount, u);
      }
    }
    // Einheit ohne Zahl: „Prise Salz“, „Bund Petersilie“, „Spritzer Zitronensaft“ → 1
    const um = l.match(/^([a-zäöüß]+\.?)\s+(.{2,})$/i);
    if (um) {
      const u = matchUnit(um[1]);
      if (u && !['g', 'kg', 'ml', 'l'].includes(u.unit) && !/^(st|ds|pc|pck|pkg)$/i.test(um[1].replace('.', ''))) {
        const name = tidyName((u.prefix ? u.prefix + ' ' : '') + um[2]);
        if (name) return mkIng(name, 1, u);
      }
    }
    const vague = /\b(etwas|nach belieben|nach geschmack|n\.\s?b\.|evtl\.?|optional|zum bestreuen|zum anbraten|zum garnieren|to taste)\b/gi;

    let m = l.match(LEAD_QTY);
    if (m && m[1] && m[2] !== undefined) {
      const amount = parseNumber(m[1]);
      let rest = m[2].trim();
      // Einheit direkt am Zahlwert („200g“) oder als nächstes Wort
      const tok = rest.match(/^([a-zäöüß]+\.?)(?:\s+|$)(.*)$/i);
      let u = null, name = rest;
      if (tok) {
        u = matchUnit(tok[1]);
        if (u) name = (u.prefix ? u.prefix + ' ' : '') + tok[2];
      }
      // „1 Dose (400 g) Kichererbsen“ → „Kichererbsen (400 g)“
      name = name.replace(/^\(([^)]*)\)\s*(.+)$/, '$2 ($1)');
      name = tidyName(name);
      if (!name) return null;
      if (/^knoblauchzehen?$/i.test(name) && !u) { name = 'Knoblauch'; u = { unit: 'zehe', factor: 1 }; }
      return mkIng(name, amount, u);
    }

    m = l.match(TRAIL_QTY);
    if (m) {
      const u = matchUnit(m[3]);
      const amount = parseNumber(m[2]);
      if (Number.isFinite(amount) && (u || !m[3])) return mkIng(tidyName(m[1].replace(/[:\-–]\s*$/, '')), amount, u);
    }

    const name = tidyName(l.replace(vague, '').replace(/\(\s*\)/g, ''));
    if (!name || !/[a-zäöüß]{2}/i.test(name)) return null;
    return { name, amount: 0, unit: 'ng' };
  }

  function parseDuration(s) {
    const h = s.match(/(\d+(?:[.,]\d+)?)\s*(?:std\.?|stunden?|stunde|h\b|hrs?\b|hours?)/i);
    const m = s.match(/(\d+)\s*(?:min\.?|minuten|mins?\b|minutes?)/i);
    const total = (h ? parseFloat(h[1].replace(',', '.')) * 60 : 0) + (m ? Number(m[1]) : 0);
    return Math.round(total);
  }

  function looksLikeIngredient(l) {
    return l.length <= 60 && (LEAD_QTY.test(l) && /^\s*(ca\.?\s*)?[\d½¼¾⅓⅔⅛]/.test(l)) && !/[.!?]$/.test(l);
  }

  // ---------- Zutat oder Zubereitungsschritt? ----------
  const VERB_END = /(geben|fügen|rühren|schneiden|hacken|kochen|braten|backen|garen|mischen|mengen|würzen|schmecken|servieren|erhitzen|schälen|waschen|lassen|stellen|legen|teilen|streuen|köcheln|pürieren|schlagen|heben|ziehen|gießen|füllen|formen|rollen|wenden|heizen|weichen|marinieren|reiben|kleinern|dünsten|schwitzen|löschen|reduzieren|quirlen|kneten|streichen|halbieren|würfeln|vierteln|garnieren|richten|kühlen|ruhen|trocknen|tupfen|zupfen|pressen|schmelzen|lassen|spülen|putzen|entkernen|hobeln|raspeln|mixen|dämpfen|frittieren|grillen|toasten|rösten|nehmen|bereiten|decken|setzen|abtropfen|abgießen|einkochen|aufkochen|zerlassen|bestreichen|belegen|platzieren|verrühren|vermengen|vermischen|verquirlen|unterheben|anbraten|anrösten|einrühren|zugeben|dazugeben|hinzugeben|abschmecken|auftauen|aufschlagen|schwenken|ablöschen|umrühren|abkühlen|einfetten|bestäuben|portionieren|dekorieren|anrichten)$/;
  const IMPERATIVE = /^(gib|gebe|rühre?|schneide|hacke|koche|brate|backe|mische|würze|erhitze|schäle|wasche|lass|lasse|stelle|lege|verteile|streue|gieße|fülle|forme|rolle|wende|heize|reibe|knete|nimm|mach|mache|füge|setze|decke|gare|serviere|vermische|verrühre|vermenge|püriere|schlage|hebe|zerlasse|bestreiche|belege|dünste|lösche|würfle|halbiere|garniere|richte|dann|danach|anschließend|nun|jetzt|zuerst|zunächst|zum schluss|inzwischen|währenddessen|sobald|sofort|alles|alle zutaten|in einer|in einem|im ofen|den ofen|backofen|ofen|die pfanne|eine pfanne|einen topf|den topf)\b/i;

  /** Kochverb im Satz (Phrasen wie „zum Braten“ / „zum Bestreuen“ zählen nicht). */
  function hasCookVerb(l) {
    const t = l.toLowerCase().replace(/\b(zum|zur|für das|für die|für den|nach dem|zum)\s+[a-zäöüß]+/g, ' ');
    if (IMPERATIVE.test(t)) return true;
    return t.split(/[^a-zäöüß]+/).some(w => w.length >= 5 && VERB_END.test(w));
  }

  /** Sieht nach Zubereitungsschritt aus (Satz mit Kochverb, lang oder nummeriert). */
  function isStepLike(l) {
    if (l.length > 90) return true;
    const verb = hasCookVerb(l);
    const sentence = /[.!]$/.test(l) && l.split(/\s+/).length > 4;
    if (verb && (sentence || l.length > 30 || /[.!]$/.test(l))) return true;
    if (sentence && l.length > 45) return true;
    if (verb && D.stripStepNumber(l).numbered && !looksLikeIngredient(l)) return true;
    return false;
  }

  /** Sieht nach Zutat aus (Menge + Name, oder kurzer bekannter Lebensmittelname). */
  function isIngLike(l) {
    if (isStepLike(l)) return false;
    if (/[.!?]$/.test(l) && l.split(/\s+/).length > 3) return false;
    if (looksLikeIngredient(l) && !hasCookVerb(l)) return true;
    if (l.length > 50 || l.split(/\s+/).length > 7) return false;
    const p = parseIngredient(l);
    if (p && p.amount > 0) return true;
    return !!(ns.Nutrition && ns.Nutrition.lookup(l.replace(/\(.*?\)/g, '')) && l.length <= 40);
  }

  /**
   * Mengen und Namen in getrennten Zeilen (Tabellen-Layout in Screenshots/PDFs) zusammenführen:
   * „200 g“ + „Mehl“ → „200 g Mehl“, „Mehl“ + „200 g“ → „Mehl 200 g“, oder Block aller Mengen + Block aller Namen.
   */
  const QTY_ONLY = new RegExp(`^${QTY}\\s*([a-zäöüß.]{0,14})$`, 'i');
  function isQtyOnly(l) {
    const m = normalizeQty(l).match(QTY_ONLY);
    return !!(m && (!m[2] || matchUnit(m[2])));
  }
  function mergeSplitQty(lines) {
    const isQ = isQtyOnly;
    const isN = l => !isQ(l) && !/^\s*(ca\.?\s*)?[\d½¼¾⅓⅔⅛]/.test(l) && /[a-zäöüß]{2}/i.test(l) && l.length <= 70;
    if (lines.filter(isQ).length < 1) return lines;
    // Block-Layout: k Mengen hintereinander, dann genau k Namen
    for (let i = 0; i < lines.length; i++) {
      if (!isQ(lines[i])) continue;
      let k = 0; while (i + k < lines.length && isQ(lines[i + k])) k++;
      if (k >= 3) {
        let n = 0; while (i + k + n < lines.length && isN(lines[i + k + n])) n++;
        if (n === k) {
          const merged = [];
          for (let j = 0; j < k; j++) merged.push(lines[i + j] + ' ' + lines[i + k + j]);
          return lines.slice(0, i).concat(merged, mergeSplitQty(lines.slice(i + 2 * k)));
        }
      }
      break;
    }
    // Paarweise: Richtung danach wählen, welche Nachbarschaft häufiger vorkommt
    let fwd = 0, bwd = 0;
    for (let i = 0; i + 1 < lines.length; i++) {
      if (isQ(lines[i]) && isN(lines[i + 1])) fwd++;
      if (isN(lines[i]) && isQ(lines[i + 1])) bwd++;
    }
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const a = lines[i], b = lines[i + 1];
      if (b !== undefined && fwd >= bwd && isQ(a) && isN(b)) { out.push(a + ' ' + b); i++; continue; }
      if (b !== undefined && bwd > fwd && isN(a) && isQ(b)) { out.push(a + ' ' + b); i++; continue; }
      out.push(a);
    }
    return out;
  }

  /** Erkannten Text in einen Rezept-Entwurf umwandeln. */
  function parseRecipeText(text) {
    const raw = String(text || '').split(/\r?\n/).map(cleanLine);
    const lines = raw.filter(l => !isNoise(l));
    const draft = { title: '', time: 0, effort: 1, cost: 1, servings: 0, ingredients: [], steps: '' };
    const svLine = raw.find(l => /^(portionen|personen|portion|servings?)\s*[:\-]?\s*\d+$/i.test(l));
    if (svLine) draft.servings = Number(svLine.match(/\d+/)[0]);

    // Abschnitte
    let section = 'head';
    const head = [], ing = [], steps = [], other = [];
    for (let li = 0; li < lines.length; li++) {
      const l = lines[li];
      const k = headerKey(l);
      // „Zubereitung“ / „Zubereitung 20 Min.“ ist oft nur ein Zeit-Label, keine Überschrift
      const next = lines[li + 1] || '';
      const DUR_ONLY = /^(ca\.?\s*)?\d+(?:[.,]\d+)?\s*(min\.?|minuten|std\.?|stunden?|h)(\s*\d+\s*(min\.?|minuten))?\.?$/i;
      if (STEP_HEADER.test(k) && (parseDuration(l) || (DUR_ONLY.test(next) && section !== 'ing'))) {
        if (parseDuration(l)) { (section === 'steps' ? steps : head).push(l.replace(/^zubereitung/i, 'Zubereitungszeit')); continue; }
        head.push('Zubereitungszeit ' + next); li++; continue;
      }
      if (NOTES_HEADER.test(k) && l.length < 30 && section === 'steps') {
        const rest = l.replace(NOTES_HEADER, '').replace(/^[:\s]+/, '');
        if (rest) steps.push('§NOTE§' + rest); else steps.push('§NOTE§');
        continue;
      }
      // Schrittmarke: hier beginnt (spätestens) die Zubereitung – nie eine Zutat
      if (STEP_MARK.test(l)) {
        if (section === 'ing') section = 'steps';
        (section === 'steps' ? steps : section === 'head' ? head : other).push(l);
        continue;
      }
      if (ING_HEADER.test(k) && l.length < 60) {
        section = 'ing';
        const sv = l.match(/(\d+)\s*(portion|person|stück|serving)/i) || l.match(/für\s+(\d+)/i);
        if (sv) draft.servings = Number(sv[1]);
        continue;
      }
      if (STEP_HEADER.test(k) && l.length < 50) { section = 'steps'; continue; }
      if (END_HEADER.test(k) && l.length < 60) { section = 'end'; continue; }
      if (section === 'head') head.push(l);
      else if (section === 'ing') ing.push(l);
      else if (section === 'steps') steps.push(l);
      else other.push(l);
    }

    // Ohne Überschriften: Zeilen nach Art einsortieren
    if (!ing.length && !steps.length) {
      const pool = head.splice(0);
      let firstFound = false, inSteps = false;
      pool.forEach((l, i) => {
        if (STEP_MARK.test(l)) { if (firstFound) { steps.push(l); inSteps = true; } return; }
        if (!firstFound) {
          // erste Zutat: Mengenzeile, oder Mengen-/Namenspaar über zwei Zeilen
          if ((looksLikeIngredient(l) || (isQtyOnly(l) && pool[i + 1])) && !isStepLike(l)) { ing.push(l); firstFound = true; }
          else head.push(l);
          return;
        }
        if (inSteps) { steps.push(l); return; }
        if (STEP_MARK.test(l) || isStepLike(l)) { steps.push(l); inSteps = true; return; }
        if (isIngLike(l) || isQtyOnly(l) || (l.length <= 40 && !/[.!?]$/.test(l))) { ing.push(l); return; }
        steps.push(l); inSteps = true;
      });
    } else if (!steps.length && ing.length) {
      // Zutaten-Überschrift, aber keine Zubereitungs-Überschrift: lange Sätze sind Schritte
      const keep = [];
      let inSteps = false;
      ing.forEach(l => {
        if (!inSteps && (isStepLike(l) || l.length > 60 || (/[.!?]$/.test(l) && l.split(' ').length > 6))) inSteps = true;
        (inSteps ? steps : keep).push(l);
      });
      ing.splice(0, ing.length, ...keep);
    }

    // Beide Abschnitte vorhanden: falsch einsortierte Zeilen umhängen
    // (Screenshots mit zwei Spalten mischen Zutaten und Schritte oft durcheinander)
    if (ing.length && steps.length) {
      const toSteps = ing.filter(l => isStepLike(l) && !looksLikeIngredient(l) && !isQtyOnly(l));
      if (toSteps.length && toSteps.length < ing.length) {
        ing.splice(0, ing.length, ...ing.filter(l => !toSteps.includes(l)));
        steps.unshift(...toSteps);
      }
      const haveKeys = new Set(ing.map(l => { const p = parseIngredient(l); return p ? D.norm(p.name) : ''; }));
      const numbered = steps.filter(l => D.stripStepNumber(l).numbered).length >= 2;
      for (let i = 0; i < steps.length; i++) {
        const l = steps[i];
        if (l.startsWith('§NOTE§') || l.length > 45 || hasCookVerb(l) || /[.!?]$/.test(l)) continue;
        if (numbered && D.stripStepNumber(l).numbered && !/^\d+\s*(g|kg|ml|l|el|tl|stk|stück|prise|dose|pck|bund)\b/i.test(l)) continue;
        const prev = steps[i - 1], next = steps[i + 1] || '';
        if (prev && !/[.!?:]$/.test(prev)) continue;              // mitten in einem umbrochenen Satz
        if (/^[a-zäöüß]/.test(next)) continue;                    // Satz geht in der nächsten Zeile weiter
        if (!looksLikeIngredient(l)) continue;
        const p = parseIngredient(l);
        if (!p || haveKeys.has(D.norm(p.name))) continue;
        ing.push(l); steps.splice(i, 1); i--;
      }
    }

    // Metadaten (nur Kopfbereich & beschriftete Zeilen, nicht aus den Schritten)
    const metaLines = head.concat(other, ing.filter(l => /zeit|portion|schwierig/i.test(l)));
    const findLabeled = re => {
      for (let i = 0; i < metaLines.length; i++) {
        const hit = metaLines[i].match(re);
        if (hit) {
          // nur den Teil hinter dem Label lesen („Arbeitszeit 15 Min. Gesamtzeit 55 Min.“)
          const after = metaLines[i].slice(hit.index + hit[0].length).split(/\b(?:arbeitszeit|vorbereitung|zubereitungszeit|kochzeit|koch-\/backzeit|backzeit|garzeit|ruhezeit|gesamtzeit|gesamt)\b/i)[0];
          const same = parseDuration(after);
          if (same) return same;
          const next = metaLines[i + 1] ? parseDuration(metaLines[i + 1]) : 0;
          if (next) return next;
        }
      }
      return 0;
    };
    const total = findLabeled(/gesamt|total|insgesamt|dauer|fertig in/i);
    const work = findLabeled(/arbeitszeit|vorbereitung|prep/i);
    const cook = findLabeled(/kochzeit|backzeit|garzeit|cook|bake|zubereitungszeit/i);
    const rest = findLabeled(/ruhezeit/i);
    draft.prepTime = work;
    draft.cookTime = cook + rest;
    // „50 Min. 1 Std. 30 Min. 2 Std. 20 Min.“ (Beschriftung steht woanders): a + b = c → Vorb./Zub.
    if (!draft.prepTime && !draft.cookTime) {
      for (const l of head.concat(ing.slice(0, 3))) {
        const chunks = l.match(/\d+(?:[.,]\d+)?\s*(?:std|stunden?|h)\.?(?:\s*\d+\s*min\.?)?|\d+\s*min\.?/gi) || [];
        if (chunks.length === 3) {
          const [a, b, c] = chunks.map(parseDuration);
          if (a && b && Math.abs(a + b - c) <= 1) { draft.prepTime = a; draft.cookTime = b; break; }
        }
      }
    }
    if (!draft.cookTime && total) draft.cookTime = Math.max(0, total - work);
    if (!draft.prepTime && !draft.cookTime) {
      const firstDur = head.map(parseDuration).find(Boolean);
      if (firstDur) draft.cookTime = firstDur;
    }

    const all = metaLines.join('\n');
    if (!draft.servings) {
      const sv = all.match(/(\d+)\s*(portionen|portion|personen|person|pers\.|servings?)/i) || all.match(/portionen\s*:?\s*(\d+)/i);
      if (sv) draft.servings = Number(sv[1]);
    }
    const effortLine = metaLines.find(l => /schwierig|niveau|level|aufwand|difficulty/i.test(l)) || all;
    if (/\b(pfiffig|schwer|aufwendig|aufwändig|anspruchsvoll|hard|difficult)\b/i.test(effortLine)) draft.effort = 3;
    else if (/\b(normal|mittel|medium)\b/i.test(effortLine)) draft.effort = 2;
    else draft.effort = 1;
    const costLine = metaLines.find(l => /kosten|preis|budget|cost/i.test(l)) || '';
    if (/\b(teuer|exklusiv|hoch|expensive)\b/i.test(costLine)) draft.cost = 3;
    else if (/\b(mittel|normal|medium)\b/i.test(costLine)) draft.cost = 2;

    // Titel: erste sinnvolle Zeile im Kopfbereich
    const isMeta = l => /\b(min|minuten|std|stunden|portion|personen|schwierig|arbeitszeit|kochzeit|backzeit|gesamtzeit|ruhezeit|kcal|bewertung|rezept von|von\s+\w+$)\b/i.test(l);
    const titleCandidates = (head.length ? head : lines).filter(l =>
      l.length >= 3 && l.length <= 90 && /[a-zäöüß]{3}/i.test(l) && !isMeta(l) && !looksLikeIngredient(l));
    let title = titleCandidates[0] || '';
    // über zwei Zeilen umbrochener Titel („Chicken Teriyaki selber“ + „machen“)
    const tIdx = lines.indexOf(title);
    const tNext = tIdx >= 0 ? lines[tIdx + 1] || '' : '';
    if (tNext && /^[a-zäöüß]/.test(tNext) && tNext.length <= 30 && !/\d/.test(tNext)) title += ' ' + tNext;
    draft.title = title.replace(/\s*[-–|]\s*(rezept|chefkoch|recipe).*$/i, '').trim();

    // PDF-Layouts liefern Zutaten manchmal erst nach den Überschriften direkt vor Schritt 1:
    // kurze Zeilen ohne Satzende VOR dem ersten nummerierten Schritt gehören zu den Zutaten.
    const firstNum = steps.findIndex(l => !l.startsWith('§NOTE§') && D.stripStepNumber(l).numbered);
    if (firstNum > 0) {
      const pre = steps.slice(0, firstNum);
      if (pre.filter(l => looksLikeIngredient(l)).length >= 2) {
        steps.splice(0, firstNum);
        pre.filter(l => l.length <= 120 && !/[.!?]$/.test(l)).forEach(l => ing.push(l));
      }
    }
    // Zutaten (Zwischenüberschriften wie „Für den Teig:“ oder „FÜR DIE SOSSE“ überspringen)
    draft.ingredients = mergeSplitQty(ing
      .filter(l => !STEP_MARK.test(l))
      .filter(l => !(l === l.toUpperCase() && /[A-ZÄÖÜ]{3}/.test(l) && !/^\s*[\d½¼¾]/.test(l)))
      .filter(l => !(/:$/.test(l) && !/\d/.test(l)))
      .filter(l => !/^(für|for)\s+(die|den|das)\s/i.test(l) || /\d/.test(l))
      .filter(l => !/^(für|for)\s.{2,30}:?$/i.test(l) || /\d/.test(l)))
      .map(parseIngredient)
      .filter(Boolean)
      .filter(i => i.name.length <= 110);

    // Schritte: umbrochene Zeilen zusammenfügen, Nummerierung entfernen
    const out = [];
    let buf = '';
    const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ''; };
    const stepLines = steps.flatMap(l => D.splitInlineSteps(l));
    const numberedSteps = stepLines.filter(l => !l.startsWith('§NOTE§') && D.stripStepNumber(l).numbered).length >= 2;
    let inNotes = false;
    stepLines.forEach(l => {
      // Notizen/Tipps: eigener letzter Schritt
      if (l.startsWith('§NOTE§')) { flush(); inNotes = true; const t = l.slice(6).trim(); if (t) buf = t; return; }
      if (inNotes) { buf = buf ? buf + (/[.!?:]$/.test(buf) ? ' ' : ' ') + l : l; return; }
      // reine Schrittmarke in eigener Zeile: „3“, „3.“, „(3)“, „Schritt 3“, „③“, „3️⃣“
      if (STEP_MARK.test(l) || /^\(?\d{1,2}[.):]?\)?$/.test(l) || /^[①-⑳]$/.test(l) || /^\d\uFE0F?\u20E3$/.test(l)) { flush(); return; }
      const st = D.stripStepNumber(l);
      if (st.numbered) { flush(); buf = st.text; return; }      // nummerierte Zeile = neuer Schritt
      if (!buf) { buf = l; return; }
      // Mit Nummerierung: Zeilen ohne Nummer setzen den Schritt fort (auch über Satzenden/Seitenumbrüche)
      if (!numberedSteps && /[.!?:]$/.test(buf)) { flush(); buf = l; return; }
      if (numberedSteps && /[.!?:]$/.test(buf)) { buf += ' ' + l; return; }
      buf = /-$/.test(buf) ? buf.slice(0, -1) + l : buf + ' ' + l;
    });
    flush();
    draft.steps = D.cleanSteps(out.join('\n'));

    if (!draft.servings) draft.servings = 2;
    if (!draft.prepTime && !draft.cookTime) draft.cookTime = 30;
    return draft;
  }

  // =========================================================================
  // Dateien einlesen
  // =========================================================================

  const pending = {};
  let warmedUp = false;

  function extOf(name) { return (String(name || '').match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || ''; }

  function b64ToText(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function readFile(f) {
    // f: File oder { name, base64 } (von macOS „Öffnen mit“)
    return new Promise((resolve, reject) => {
      const ext = extOf(f.name);
      const isText = ['easykitchen', 'json', 'txt', 'text', 'md'].includes(ext);
      if (f.base64 != null) {
        resolve(isText ? { name: f.name, ext, text: b64ToText(f.base64) } : { name: f.name, ext, base64: f.base64 });
        return;
      }
      const r = new FileReader();
      r.onerror = () => reject(new Error(`${f.name} konnte nicht gelesen werden.`));
      if (isText) {
        r.onload = () => resolve({ name: f.name, ext, text: r.result });
        r.readAsText(f);
      } else {
        r.onload = () => resolve({ name: f.name, ext, base64: String(r.result).split(',')[1] || '' });
        r.readAsDataURL(f);
      }
    });
  }

  function recognizeNative(files) {
    return new Promise(resolve => {
      const id = 'rec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      pending[id] = resolve;
      native('nativeRecognize').postMessage({ id, files: files.map(f => ({ name: f.name, base64: f.base64 })) });
    });
  }

  function onRecognizeResult(res) {
    const cb = res && pending[res.id];
    if (!cb) return;
    delete pending[res.id];
    cb(res.results || []);
  }

  function setBusy(text) {
    const el = $('import-busy');
    if (!el) return;
    el.hidden = !text;
    $('import-busy-text').textContent = text || '';
    $('import-drop').classList.toggle('busy', !!text);
  }

  /** Haupteinstieg: beliebige Dateien importieren. */
  async function handleFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    if (UI.topModal() !== 'import-modal') UI.openModal('import-modal');
    setBusy('Dateien werden gelesen…');

    const recipes = [];
    const texts = [];
    const errors = [];
    const toRecognize = [];

    for (const f of files) {
      try {
        const item = await readFile(f);
        if (item.text != null) {
          const list = D.parseShare(item.text);
          if (list && list.length) recipes.push(...list);
          else if (item.ext === 'easykitchen' || item.ext === 'json') errors.push(`${item.name}: keine gültige EasyKitchen-Datei`);
          else texts.push(item.text);
        } else {
          toRecognize.push(item);
        }
      } catch (e) { errors.push(e.message); }
    }

    if (toRecognize.length) {
      if (native('nativeRecognize')) {
        setBusy((toRecognize.length === 1 ? 'Text wird erkannt…' : `Text wird erkannt (${toRecognize.length} Dateien)…`) +
          (warmedUp ? '' : ' Beim ersten Mal kann das bis zu 30 Sekunden dauern.'));
        const results = await recognizeNative(toRecognize);
        warmedUp = true;
        results.forEach(r => {
          if (r.error) errors.push(`${r.name}: ${r.error}`);
          else if (r.kind === 'easykitchen') {
            const list = D.parseShare(r.text);
            if (list && list.length) recipes.push(...list);
          } else if (r.text && r.text.trim()) texts.push(r.text);
          else errors.push(`${r.name}: kein Text gefunden`);
        });
      } else {
        errors.push('Texterkennung für Bilder/PDFs gibt es nur in der Mac-App. Du kannst den Rezepttext aber unten einfügen.');
      }
    }
    setBusy('');

    if (errors.length) UI.toast(errors[0]);
    if (recipes.length) {
      confirmImport(recipes, () => { if (texts.length) openDraft(texts.join('\n\n')); });
    } else if (texts.length) {
      openDraft(texts.join('\n\n'));
    }
  }

  function openDraft(text) {
    const draft = parseRecipeText(text);
    UI.closeModal('import-modal');
    ns.App.openEditor(null, { draft, source: text });
    const found = draft.ingredients.length;
    UI.toast(found ? `Rezept erkannt (${found} Zutaten) – bitte kurz prüfen` : 'Text übernommen – bitte Zutaten prüfen und ergänzen');
  }

  function importItem(r, dupe, idx) {
    const dupeText = dupe && (dupe.inFile ? 'Doppelt in dieser Datei – wird übersprungen' : 'Schon vorhanden – wird übersprungen');
    return `
      <li class="${dupe ? 'is-dupe' : ''}" ${dupe ? `data-dupe-idx="${idx}"` : ''}>
        ${r.image ? `<img src="${r.image}" alt="">` : `<div class="import-noimg">${esc(r.title.charAt(0).toUpperCase())}</div>`}
        <div class="import-item-text"><strong>${esc(r.title)}</strong><span class="muted">${dupe ? dupeText : `${r.ingredients.length} Zutaten · ${esc(UI.fmtTime(r.time))} gesamt`}</span></div>
        ${dupe ? `<button type="button" class="btn btn-secondary btn-sm" data-compare="${idx}">Unterschiede ansehen</button>` : ''}
      </li>`;
  }

  /**
   * Bestätigungsdialog: nur neue Rezepte werden übernommen.
   * Schon vorhandene (gleiche Kennung oder gleicher Name) werden übersprungen –
   * so entstehen keine Doppelten, wenn jemand seine ganze Liste erneut schickt.
   */
  function confirmImport(recipes, after) {
    const { fresh, dupes } = D.splitImport(recipes);
    const n = fresh.length;
    const title = !n ? 'Alles schon vorhanden'
      : n === 1 ? '1 neues Rezept importieren' : `${n} neue Rezepte importieren`;
    $('import-confirm-card').innerHTML = `
      <div class="modal-head">
        <h2>${title}</h2>
        <button type="button" class="icon-btn" data-close="import-confirm" aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        ${n ? `<ul class="import-list">${fresh.map(r => importItem(r, null)).join('')}</ul>`
            : `<p class="import-all-dupes">Alle ${dupes.length === 1 ? 'Rezepte dieser Datei sind' : `${dupes.length} Rezepte dieser Datei sind`} bereits in deiner Sammlung. Es wird nichts doppelt angelegt.</p>`}
        ${dupes.length ? `
          <details class="import-dupes" ${!n || dupes.length <= 3 ? 'open' : ''}>
            <summary>${dupes.length === 1 ? '1 Rezept ist' : `${dupes.length} Rezepte sind`} schon vorhanden und ${dupes.length === 1 ? 'wird' : 'werden'} übersprungen</summary>
            <p class="import-dupes-hint muted">Unter „Unterschiede ansehen“ vergleichst du beide Fassungen und kannst sie trotzdem als neues Rezept übernehmen.</p>
            <ul class="import-list">${dupes.map((d, i) => importItem(d.r, d, i)).join('')}</ul>
          </details>` : ''}
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" data-close="import-confirm">${n ? 'Abbrechen' : 'Schließen'}</button>
        ${n ? `<button type="button" class="btn btn-primary" id="import-confirm-btn">${n === 1 ? 'Importieren' : `${n} importieren`}</button>` : ''}
      </div>`;
    // Doppelte vergleichen und auf Wunsch doch als neues Rezept übernehmen
    $('import-confirm-card').querySelectorAll('[data-compare]').forEach(b => b.addEventListener('click', () => {
      const d = dupes[Number(b.dataset.compare)];
      ns.Compare.open(d.r, d.match, {
        inFile: d.inFile,
        onImported: rec => {
          const li = b.closest('li');
          li.classList.remove('is-dupe'); li.classList.add('is-imported');
          li.querySelector('.import-item-text').innerHTML = `<strong>${esc(rec.title)}</strong><span class="muted">✓ Als neues Rezept importiert</span>`;
          b.remove();
        }
      });
    }));
    const btn = $('import-confirm-btn');
    if (btn) btn.addEventListener('click', () => {
      const res = D.importRecipes(fresh);
      UI.closeModal('import-confirm');
      UI.closeModal('import-modal');
      ns.App.renderList();
      UI.toast(`${res.added} ${res.added === 1 ? 'Rezept' : 'Rezepte'} importiert ✓` +
        (dupes.length ? ` · ${dupes.length} übersprungen` : ''));
      if (fresh.length === 1) ns.App.openDetail(fresh[0].id);
      if (after) after();
    });
    else if (after) document.querySelector('#import-confirm [data-close]').addEventListener('click', after, { once: true });
    UI.openModal('import-confirm');
  }

  function openImportModal() {
    // Texterkennungs-Modell im Hintergrund vorladen (erster Aufruf ist sonst langsam)
    if (!warmedUp && native('nativeRecognize')) {
      native('nativeRecognize').postMessage({ id: 'warmup', files: [] });
      warmedUp = true;
    }
    setBusy('');
    $('import-text').value = '';
    UI.openModal('import-modal');
  }

  function wire() {
    const drop = $('import-drop');
    const input = $('import-input-files');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => handleFiles(e.dataTransfer.files));

    $('import-text-btn').addEventListener('click', () => {
      const t = $('import-text').value.trim();
      if (!t) { UI.toast('Bitte zuerst Rezepttext einfügen.'); $('import-text').focus(); return; }
      const list = D.parseShare(t);
      if (list && list.length) confirmImport(list);
      else openDraft(t);
    });

    // Dateien irgendwo auf die Startseite ziehen → Import
    const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    document.addEventListener('dragover', e => { if (!UI.topModal() && hasFiles(e)) { e.preventDefault(); document.body.classList.add('drop-target'); } });
    document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('drop-target'); });
    document.addEventListener('drop', e => {
      document.body.classList.remove('drop-target');
      if (!UI.topModal() && hasFiles(e)) { e.preventDefault(); handleFiles(e.dataTransfer.files); }
    });

    // Screenshot aus der Zwischenablage einfügen, solange der Import-Dialog offen ist
    document.addEventListener('paste', e => {
      if (UI.topModal() !== 'import-modal' || document.activeElement === $('import-text')) return;
      const files = [...(e.clipboardData ? e.clipboardData.items : [])]
        .filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean)
        .map((f, i) => f.name && f.name !== 'image.png' ? f : new File([f], `Zwischenablage-${i + 1}.png`, { type: f.type }));
      if (files.length) { e.preventDefault(); handleFiles(files); }
    });
  }

  ns.Importer = { parseRecipeText, parseIngredient, handleFiles, onRecognizeResult, openImportModal, wire };
})(window.EasyKitchen);
