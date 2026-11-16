/*
 * EasyKitchen – Rezept-Eigenschaften für Filter:
 * vegetarisch, High Protein, Haupt-/Nebenspeise, süß/salzig.
 * Gesetzte Werte im Rezept haben Vorrang; sonst wird automatisch erkannt.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  const D = ns.Data;

  // ---------- Fleisch & Fisch (auch versteckt) ----------
  // lange Begriffe: dürfen irgendwo im Wort stehen (Komposita)
  const MEAT_ANY = ['fleisch', 'hack', 'rind', 'schwein', 'hahnchen', 'huhn', 'huhner', 'pute', 'speck', 'bacon',
    'schinken', 'wurst', 'salami', 'chorizo', 'lachs', 'fisch', 'thunfisch', 'garnele', 'shrimp', 'scampi', 'krabbe',
    'kabeljau', 'seelachs', 'forelle', 'zander', 'dorsch', 'roulade', 'steak', 'schnitzel', 'gulasch', 'mett',
    'pancetta', 'gelatine', 'sardelle', 'anchovi', 'austernsauce', 'austernsosse', 'kalb', 'hirsch', 'wildschwein',
    'gefluegel', 'geflugel', 'leber', 'kotelett', 'filet', 'keule', 'schenkel', 'nacken', 'bauchspeck', 'krebs',
    'muschel', 'tintenfisch', 'calamari', 'oktopus', 'hering', 'makrele', 'sardine', 'pangasius', 'tilapia'];
  // kurze Begriffe: nur als ganzes Wort bzw. Wortanfang (sonst z. B. „Ente“ in „Polenta“)
  const MEAT_WORD = ['ente', 'gans', 'lamm', 'reh', 'wild', 'schmalz', 'schweineschmalz', 'ganseschmalz', 'brate'];
  // trotz Treffer vegetarisch
  const VEG_EXCEPTIONS = ['fleischtomate', 'huhnerei', 'huhnereier', 'butterschmalz', 'wildreis', 'wildkrauter',
    'gemusebruhe', 'gemusefond', 'tomatenmark', 'sojahack', 'veggie', 'vegan', 'vegetarisch', 'tofu', 'seitan',
    'jackfruit', 'erbsenprotein', 'gehackt', 'zimtrinde', 'teigkeule'];

  function isMeatIngredient(name) {
    const n = D.norm(name);
    if (!n) return false;
    const words = n.split(' ');
    if (words.some(w => VEG_EXCEPTIONS.some(x => w.startsWith(x)))) return false;
    if (/\b(vegan|vegetarisch|veggie|pflanzlich)\b/.test(n)) return false;
    return words.some(w => MEAT_ANY.some(k => w.includes(k)) || MEAT_WORD.some(k => w === k || w.startsWith(k + 'n') || (k.length >= 4 && w.startsWith(k))));
  }

  // ---------- Hilfslisten ----------
  // herzhafte Beilagen/Extras (Süßes wird über „süß“ automatisch zur Nebenspeise)
  const SIDE_TITLE = /\b(dip|dips|sauce|sosse|sose|dressing|pesto|butter|krauterbutter|guacamole|salsa|aioli|hummus|beilage|brot|brotchen|fullung|marinade|snack|chutney|relish|topping|salat)\b/;
  const SAVORY_STRONG = /(zwiebel|knoblauch|speck|schinken|kase|parmesan|feta|lauch|schalotte|bruhe|fond|chili|pfeffer|senf)/;
  const SWEET_TITLE = /(kuchen|torte|cake|cheesecake|dessert|nachtisch|mousse|pudding|muffin|keks|platzchen|tiramisu|panna cotta|kompott|crema catalana|creme brulee|pfannkuchen|kaiserschmarrn|waffel|crepe|eis\b|susse|suss|schoko|brownie|cookie|marmelade|konfiture|smoothie|milchreis|griessbrei|nektarine|obstsalat)/;
  const SUGAR = /^(zucker|puderzucker|rohrzucker|brauner zucker|vanillezucker|honig|ahornsirup|sirup|agavendicksaft|schokolade|kakao|marmelade|konfiture)/;
  const SAVORY = /(zwiebel|knoblauch|bruhe|fond|sojasosse|sojasauce|senf|pfeffer|paprikapulver|curry|kase|parmesan|speck|schalotte|lauch|tomatenmark|chili|fischsauce|oliven|kapern|essig)/;
  const STARCH = /(nudel|spaghetti|pasta|penne|tagliatelle|lasagne|gnocchi|reis|kartoffel|spatzle|couscous|bulgur|quinoa|knodel|risotto|tortilla|wrap|pizza|burger|brot|polenta|linsen|kichererbsen|bohnen)/;
  const MAIN_TITLE = /(curry|eintopf|suppe|auflauf|pfanne|bowl|gratin|lasagne|risotto|pizza|burger|braten|gulasch|chili|dal\b|ramen|pho|bolognese|schnitzel|roulade|frikadelle|tacos|wrap|quiche|flammkuchen|zwiebelkuchen|hauptgericht)/;

  const cache = new Map();

  function compute(r) {
    const ings = r.ingredients || [];
    const names = ings.map(i => D.norm(i.name));
    const title = D.norm(r.title);

    // vegetarisch
    const autoVeg = !ings.some(i => isMeatIngredient(i.name));
    const veg = r.diet === 'veg' ? true : r.diet === 'nonveg' ? false : autoVeg;

    // Nährwerte → High Protein
    let protein = 0, kcal = 0;
    if (ns.Nutrition) {
      const n = ns.Nutrition.calculate(r);
      protein = n.perServing.protein || 0;
      kcal = n.perServing.kcal || 0;
    }
    const highProtein = kcal > 0 && protein >= 20 && (protein * 4) / kcal >= 0.2;

    // süß / salzig
    const hasSugar = names.some(n => SUGAR.test(n));
    const hasSavory = names.some(n => SAVORY.test(n)) || !autoVeg;
    const savoryStrong = !autoVeg || names.some(n => SAVORY_STRONG.test(n));
    // Titel wie „…kuchen“ zählt nur als süß, wenn nichts Herzhaftes drin ist (Zwiebelkuchen, Flammkuchen)
    const autoTaste = (SWEET_TITLE.test(title) && !savoryStrong) || (hasSugar && !hasSavory) ? 'sweet' : 'savory';
    const taste = r.taste === 'sweet' || r.taste === 'savory' ? r.taste : autoTaste;

    // Haupt- / Neben- / Nachspeise (Süßes = Nachspeise)
    let autoCourse;
    if (autoTaste === 'sweet') autoCourse = 'dessert';
    else if (SIDE_TITLE.test(title) && !MAIN_TITLE.test(title)) autoCourse = 'side';
    else if (!autoVeg || MAIN_TITLE.test(title) || names.some(n => STARCH.test(n)) || kcal >= 350 || protein >= 15) autoCourse = 'main';
    else autoCourse = 'side';
    const course = ['main', 'side', 'dessert'].includes(r.course) ? r.course : autoCourse;

    return { veg, autoVeg, highProtein, protein, taste, autoTaste, course, autoCourse };
  }

  /** Eigenschaften eines Rezepts (zwischengespeichert, bis sich das Rezept ändert). */
  function of(r) {
    const key = r.id + ':' + r.updatedAt + ':' + (r.course || '') + (r.taste || '') + (r.diet || '');
    let v = cache.get(r.id);
    if (!v || v.key !== key) { v = { key, ...compute(r) }; cache.set(r.id, v); }
    return v;
  }

  /** Für Entwürfe im Editor (ohne Zwischenspeicher). */
  function preview(r) { return compute(r); }

  const LABELS = {
    course: { main: 'Hauptspeise', side: 'Nebenspeise', dessert: 'Nachspeise' },
    taste: { savory: 'Salzig', sweet: 'Süß' }
  };

  ns.Classify = { of, preview, isMeatIngredient, LABELS };
})(window.EasyKitchen);
