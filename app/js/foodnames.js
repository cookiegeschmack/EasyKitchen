/*
 * EasyKitchen – Zutaten-Wörterbuch Englisch ↔ Deutsch für die Suche.
 * „tomato onion“ findet Rezepte mit „Tomaten“ und „Zwiebeln“ – und umgekehrt
 * findet „Zwiebel“ auch englisch geschriebene Rezepte mit „onion“.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  // englisch (Einzahl) → deutsche Suchbegriffe
  const EN_DE = {
    // Gemüse & Kräuter
    tomato: ['tomate'], 'cherry tomato': ['kirschtomate', 'cocktailtomate'], onion: ['zwiebel'], 'red onion': ['rote zwiebel'],
    'spring onion': ['fruhlingszwiebel', 'lauchzwiebel'], scallion: ['fruhlingszwiebel', 'lauchzwiebel'], 'green onion': ['fruhlingszwiebel'],
    shallot: ['schalotte'], garlic: ['knoblauch'], leek: ['lauch', 'porree'], potato: ['kartoffel'], 'sweet potato': ['susskartoffel'],
    carrot: ['karotte', 'mohre', 'mohrrube'], 'bell pepper': ['paprika'], pepper: ['paprika', 'pfeffer'], paprika: ['paprikapulver', 'paprika'],
    chili: ['chili', 'peperoni'], chilli: ['chili', 'peperoni'], cucumber: ['gurke', 'salatgurke'], zucchini: ['zucchini'], courgette: ['zucchini'],
    eggplant: ['aubergine'], aubergine: ['aubergine'], mushroom: ['pilz', 'champignon'], spinach: ['spinat'], lettuce: ['salat', 'kopfsalat'],
    salad: ['salat'], rocket: ['rucola'], arugula: ['rucola'], cabbage: ['kohl', 'weisskohl'], 'red cabbage': ['rotkohl'], kale: ['grunkohl'],
    broccoli: ['brokkoli', 'broccoli'], cauliflower: ['blumenkohl'], 'brussels sprout': ['rosenkohl'], celery: ['sellerie', 'staudensellerie'],
    pumpkin: ['kurbis'], squash: ['kurbis'], corn: ['mais'], pea: ['erbse'], bean: ['bohne'], 'green bean': ['grune bohne', 'bohne'],
    'kidney bean': ['kidneybohne'], chickpea: ['kichererbse'], lentil: ['linse'], asparagus: ['spargel'], fennel: ['fenchel'], radish: ['radieschen'],
    beetroot: ['rote bete'], beet: ['rote bete'], avocado: ['avocado'], olive: ['olive'], ginger: ['ingwer'], parsley: ['petersilie'],
    chives: ['schnittlauch'], chive: ['schnittlauch'], basil: ['basilikum'], coriander: ['koriander'], cilantro: ['koriander'], dill: ['dill'],
    thyme: ['thymian'], rosemary: ['rosmarin'], mint: ['minze'], sage: ['salbei'], oregano: ['oregano'], 'bay leaf': ['lorbeer', 'lorbeerblatt'],
    herb: ['krauter'], kohlrabi: ['kohlrabi'], sauerkraut: ['sauerkraut'],
    // Obst
    apple: ['apfel'], pear: ['birne'], banana: ['banane'], lemon: ['zitrone'], lime: ['limette'], orange: ['orange'], strawberry: ['erdbeere'],
    raspberry: ['himbeere'], blueberry: ['heidelbeere', 'blaubeere'], berry: ['beere'], cherry: ['kirsche'], grape: ['traube', 'weintraube'],
    peach: ['pfirsich'], nectarine: ['nektarine'], apricot: ['aprikose'], plum: ['pflaume'], mango: ['mango'], pineapple: ['ananas'],
    melon: ['melone'], watermelon: ['wassermelone'], kiwi: ['kiwi'], coconut: ['kokos', 'kokosnuss'], raisin: ['rosine'], date: ['dattel'],
    // Fleisch & Fisch
    meat: ['fleisch'], beef: ['rind', 'rindfleisch'], 'ground beef': ['rinderhack', 'hackfleisch'], 'minced meat': ['hackfleisch', 'hack'],
    mince: ['hackfleisch', 'hack'], pork: ['schwein', 'schweinefleisch'], chicken: ['hahnchen', 'huhn', 'hahnchenbrust'],
    'chicken breast': ['hahnchenbrust', 'hahnchenbrustfilet'], turkey: ['pute', 'truthahn'], lamb: ['lamm'], veal: ['kalb'], duck: ['ente'],
    bacon: ['speck', 'bacon'], ham: ['schinken'], sausage: ['wurst', 'wurstchen'], salami: ['salami'], steak: ['steak'], fish: ['fisch'],
    salmon: ['lachs'], tuna: ['thunfisch'], cod: ['kabeljau', 'dorsch'], shrimp: ['garnele', 'shrimp', 'krabbe'], prawn: ['garnele'],
    // Milch & Eier
    egg: ['ei'], milk: ['milch'], butter: ['butter'], cream: ['sahne', 'schlagsahne'], 'sour cream': ['saure sahne', 'schmand'],
    'creme fraiche': ['creme fraiche'], yogurt: ['joghurt'], yoghurt: ['joghurt'], cheese: ['kase'], 'cream cheese': ['frischkase'],
    parmesan: ['parmesan'], mozzarella: ['mozzarella'], feta: ['feta', 'schafskase'], quark: ['quark'], tofu: ['tofu'],
    // Vorrat
    rice: ['reis'], pasta: ['nudel', 'pasta', 'spaghetti'], noodle: ['nudel'], spaghetti: ['spaghetti'], flour: ['mehl'], sugar: ['zucker'],
    'brown sugar': ['brauner zucker', 'rohrzucker'], 'powdered sugar': ['puderzucker'], 'icing sugar': ['puderzucker'], 'vanilla sugar': ['vanillezucker'],
    honey: ['honig'], salt: ['salz'], oil: ['ol'], 'olive oil': ['olivenol'], vinegar: ['essig'], mustard: ['senf'], ketchup: ['ketchup'],
    mayonnaise: ['mayonnaise'], 'soy sauce': ['sojasosse', 'sojasauce'], stock: ['bruhe', 'fond'], broth: ['bruhe'], bread: ['brot'],
    breadcrumb: ['paniermehl', 'semmelbrosel'], yeast: ['hefe'], 'baking powder': ['backpulver'], 'baking soda': ['natron'],
    starch: ['starke', 'speisestarke'], cornstarch: ['speisestarke'], oat: ['haferflocken'], oats: ['haferflocken'], nut: ['nuss'],
    almond: ['mandel'], walnut: ['walnuss'], hazelnut: ['haselnuss'], peanut: ['erdnuss'], 'peanut butter': ['erdnussbutter'],
    sesame: ['sesam'], chocolate: ['schokolade'], cocoa: ['kakao'], cinnamon: ['zimt'], nutmeg: ['muskat'], cumin: ['kreuzkummel'],
    curry: ['curry', 'currypulver'], turmeric: ['kurkuma'], vanilla: ['vanille'], 'tomato paste': ['tomatenmark'], 'tomato puree': ['tomatenmark'],
    'coconut milk': ['kokosmilch'], wine: ['wein'], 'red wine': ['rotwein'], 'white wine': ['weisswein'], water: ['wasser'], beer: ['bier'],
    juice: ['saft'], tortilla: ['tortilla', 'wrap'], couscous: ['couscous'], quinoa: ['quinoa'], gnocchi: ['gnocchi'], 'puff pastry': ['blatterteig'],
    gelatin: ['gelatine'], gelatine: ['gelatine'], cookie: ['keks'], biscuit: ['keks']
  };

  const norm = s => ns.Data.norm(s);
  // deutsch → englisch (für englisch geschriebene Rezepte)
  const DE_EN = {};
  Object.entries(EN_DE).forEach(([en, des]) => des.forEach(de => { (DE_EN[de] = DE_EN[de] || []).push(en); }));

  /** Englische Mehrzahl → Einzahl („tomatoes“ → „tomato“, „berries“ → „berry“, „leaves“ → „leaf“). */
  function enSingular(w) {
    if (EN_DE[w]) return w;
    const cands = [];
    if (/ies$/.test(w)) cands.push(w.slice(0, -3) + 'y');
    if (/ves$/.test(w)) cands.push(w.slice(0, -3) + 'f');
    if (/(oes|ches|shes|xes|sses)$/.test(w)) cands.push(w.slice(0, -2));
    if (/s$/.test(w)) cands.push(w.slice(0, -1));
    return cands.find(c => EN_DE[c]) || w;
  }

  /** Weitere Suchbegriffe für ein Suchwort (in der anderen Sprache). */
  function alternatives(term) {
    const t = norm(term);
    if (!t) return [];
    const out = new Set();
    const en = enSingular(t);
    (EN_DE[en] || []).forEach(x => out.add(x));
    // deutsch → englisch: über Wortstamm („zwiebeln“ → „zwiebel“)
    const stems = [t, t.replace(/(en|n|e|s)$/, ''), t.replace(/(n|e|s)$/, ''), t === 'eier' ? 'ei' : t];
    stems.forEach(s => (DE_EN[s] || []).forEach(x => out.add(x)));
    out.delete(t);
    return [...out];
  }

  const isPhrase = p => !!EN_DE[enSingular(norm(p))] || !!EN_DE[norm(p)];

  ns.FoodNames = { alternatives, isPhrase };
})(window.EasyKitchen);
