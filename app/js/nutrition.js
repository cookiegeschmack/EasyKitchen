/*
 * EasyKitchen – Nährwert-Schätzung (Richtwerte).
 * Offline-Tabelle mit gängigen Zutaten: kcal, Eiweiß, Kohlenhydrate, Fett je 100 g (bzw. 100 ml)
 * sowie typische Gewichte für Stück, Löffel, Dose usw. Werte gerundet nach üblichen
 * Nährwerttabellen – gedacht als Orientierung, nicht als exakte Angabe.
 */
window.EasyKitchen = window.EasyKitchen || {};
(function (ns) {
  'use strict';

  // [Suchbegriffe (|-getrennt), kcal, Eiweiß, Kohlenhydrate, Fett, Gewichte/Dichte]
  // Gewichte in g: stk, el, tl, bund, dose, pck, becher, glas, scheibe, zehe, handvoll, tasse; d = Dichte (g/ml)
  const DB = [
    // Fleisch & Wurst
    ['rindfleisch|rind|rindernacken|rinderbrust|rinderschulter|brisket|rinderwade|beinscheibe|rinderroulade|roulade|rindersteak|steak|rinderhuft|gulasch|rinderfilet|rinderbraten|tafelspitz', 150, 21, 0, 7, { stk: 180, scheibe: 170 }],
    ['hackfleisch|hack|gehacktes|gemischtes hack', 250, 18, 0, 20, { pck: 500 }],
    ['rinderhack|rinderhackfleisch', 210, 20, 0, 14, { pck: 500 }],
    ['schweinehack|mett', 270, 17, 0, 22, { pck: 500 }],
    ['hahnchenbrust|huhnerbrust|hahnchenbrustfilet|hahnchenfilet|putenbrust|putenschnitzel|putenfilet|hahnchengeschnetzeltes', 110, 23, 0, 1.5, { stk: 150 }],
    ['hahnchenschenkel|hahnchenkeule|huhnerschenkel|keule|unterschenkel', 190, 18, 0, 13, { stk: 200 }],
    // ganzes Huhn: Gewicht wie gekauft (mit Knochen, ca. 65 % essbar)
    ['hahnchen|huhn|brathahnchen|maishahnchen|maishanchen|stubenkuken|suppenhuhn', 140, 16, 0, 8.5, { stk: 1200 }],
    ['pute|putenfleisch', 150, 22, 0, 7, { stk: 300 }],
    ['schweinefleisch|schwein|schnitzel|schweineschnitzel|schweinefilet|kotelett|schweinenacken|nackensteak|schweinebauch', 160, 20, 0, 9, { stk: 150, scheibe: 150 }],
    ['lamm|lammfleisch|lammkeule', 200, 19, 0, 14, { stk: 200 }],
    ['speck|bacon|bauchspeck|schinkenspeck|speckwurfel|pancetta', 400, 13, 0, 39, { scheibe: 15, pck: 125 }],
    ['schinken|kochschinken|gekochter schinken', 110, 19, 1, 3.5, { scheibe: 20, pck: 150 }],
    ['rohschinken|serrano|parmaschinken', 250, 27, 0, 16, { scheibe: 15 }],
    ['salami|chorizo|pepperoni', 380, 22, 1, 32, { scheibe: 8 }],
    ['wurst|wurstchen|bratwurst|wiener|frankfurter|bockwurst|cabanossi', 280, 13, 1, 25, { stk: 100 }],
    // Fisch
    ['lachs|lachsfilet|raucherlachs', 200, 20, 0, 13, { stk: 125, scheibe: 20 }],
    ['thunfisch', 110, 25, 0, 1, { dose: 150 }],
    ['garnelen|shrimps|krabben|scampi', 70, 16, 0, 1, { stk: 15 }],
    ['fisch|kabeljau|seelachs|dorsch|forelle|zander|fischfilet|pangasius|tilapia', 85, 18, 0, 1, { stk: 150 }],
    // Milchprodukte & Eier
    ['milch|vollmilch', 64, 3.4, 4.8, 3.5, { d: 1.03, tasse: 245 }],
    ['sahne|schlagsahne|kochsahne|rahm|cremefine', 300, 2.4, 3.2, 31, { becher: 200, d: 1 }],
    ['schmand', 240, 2.5, 3.5, 24, { becher: 200 }],
    ['creme fraiche|crème fraîche|creme fraiche', 290, 2.4, 2.6, 30, { becher: 200 }],
    ['saure sahne|sauerrahm', 115, 3, 4, 10, { becher: 200 }],
    ['joghurt|griechischer joghurt|naturjoghurt', 70, 4, 4.5, 4, { becher: 150 }],
    ['quark|magerquark|speisequark|skyr', 75, 12, 4, 0.5, { pck: 250, becher: 250 }],
    ['frischkase|doppelrahmfrischkase|mascarpone|ricotta', 260, 6, 3.5, 25, { pck: 200 }],
    ['butter', 740, 0.7, 0.6, 83, { el: 12, tl: 5, pck: 250, stk: 250 }],
    ['butterschmalz|schmalz|ghee', 900, 0, 0, 99.8, { el: 12, tl: 5 }],
    ['margarine', 720, 0.2, 0.4, 80, { el: 12, tl: 5 }],
    ['kase|gouda|emmentaler|bergkase|cheddar|edamer|gratinkase|reibekase|raclette|appenzeller|gruyere|tilsiter', 360, 25, 0, 28, { scheibe: 20, pck: 200, handvoll: 30, el: 8 }],
    ['parmesan|pecorino|grana padano', 400, 35, 0, 29, { el: 6, pck: 100 }],
    ['mozzarella|burrata', 250, 18, 1, 19, { stk: 125, pck: 125 }],
    ['feta|schafskase|hirtenkase|halloumi', 270, 17, 1, 21, { pck: 200 }],
    ['ei|eier', 145, 12.5, 0.7, 10, { stk: 60 }],
    ['eigelb', 330, 16, 0.3, 29, { stk: 18 }],
    // Getreide, Teigwaren, Kartoffeln
    ['mehl|weizenmehl|dinkelmehl|vollkornmehl', 340, 10, 72, 1, { el: 10, tl: 3, tasse: 120 }],
    ['speisestarke|starke|maisstarke|mondamin', 350, 0.3, 86, 0, { el: 10, tl: 3 }],
    ['zucker|rohrzucker|puderzucker|brauner zucker|vanillezucker', 400, 0, 100, 0, { el: 15, tl: 5, pck: 8, prise: 0.5 }],
    ['honig', 305, 0.4, 80, 0, { el: 20, tl: 7 }],
    ['ahornsirup|agavendicksaft|sirup', 260, 0, 67, 0, { el: 20, tl: 7 }],
    ['reis|basmatireis|jasminreis|risottoreis|milchreis|vollkornreis', 350, 7, 78, 0.6, { tasse: 185, pck: 125 }],
    ['nudeln|spaghetti|pasta|penne|tagliatelle|fusilli|farfalle|makkaroni|lasagneplatten|lasagne|spatzle|rigatoni|linguine|bandnudeln|eiernudeln|mie nudeln|glasnudeln', 355, 12.5, 71, 1.5, { pck: 500 }],
    ['couscous', 360, 12, 73, 1, { tasse: 175 }],
    ['bulgur', 340, 12, 69, 1.5, { tasse: 140 }],
    ['quinoa', 360, 14, 64, 6, { tasse: 170 }],
    ['haferflocken|hafer|musli', 370, 13.5, 59, 7, { el: 10, tasse: 90 }],
    ['brot|bauernbrot|vollkornbrot|baguette|ciabatta|graubrot', 245, 8, 46, 1.5, { scheibe: 40, stk: 250 }],
    ['toast|toastbrot', 265, 8, 49, 4, { scheibe: 25 }],
    ['brotchen|semmel|weckle|schrippe', 270, 9, 52, 2, { stk: 60 }],
    ['paniermehl|semmelbrosel|panko', 370, 12, 72, 2, { el: 10 }],
    ['kartoffel|kartoffeln|drillinge|frühkartoffeln', 75, 2, 15.5, 0.1, { stk: 150 }],
    ['susskartoffel|susskartoffeln', 86, 1.6, 20, 0.1, { stk: 250 }],
    ['gnocchi|schupfnudeln', 150, 3.5, 32, 0.5, { pck: 500 }],
    ['blatterteig', 390, 6, 32, 26, { pck: 275, stk: 275 }],
    ['pizzateig|hefeteig|quicheteig|murbeteig', 270, 7, 48, 5, { pck: 400, stk: 400 }],
    ['tortilla|wrap|fladenbrot|naan|pita', 300, 8, 50, 7, { stk: 60 }],
    // Gemüse
    ['zwiebel|zwiebeln|rote zwiebel', 40, 1.2, 8, 0.3, { stk: 100 }],
    ['schalotte|schalotten', 72, 2.5, 15, 0.1, { stk: 30 }],
    ['knoblauch|knoblauchzehe', 140, 6, 28, 0.5, { zehe: 4, stk: 4, tl: 4 }],
    ['fruhlingszwiebel|lauchzwiebel|frühlingszwiebeln', 30, 1.8, 5, 0.2, { stk: 15, bund: 100 }],
    ['tomate|tomaten|strauchtomate|fleischtomate|romatomate', 18, 0.9, 3, 0.2, { stk: 120 }],
    ['kirschtomate|kirschtomaten|cocktailtomate|cherrytomate|datteltomate', 20, 1, 3.5, 0.3, { stk: 15, handvoll: 80 }],
    ['gehackte tomaten|passierte tomaten|tomaten aus der dose|geschalte tomaten|stuckige tomaten|passata|dosentomaten', 22, 1.2, 3.5, 0.2, { dose: 400, pck: 500 }],
    ['tomatenmark', 80, 4.3, 13, 0.5, { el: 15, tl: 5, dose: 70 }],
    ['getrocknete tomaten', 210, 5, 23, 11, { stk: 8, glas: 200 }],
    ['paprika|paprikaschote|spitzpaprika', 30, 1, 5, 0.3, { stk: 160 }],
    ['paprikapulver|rosenpaprika', 330, 14, 55, 13, { tl: 2.5, el: 7 }],
    ['karotte|karotten|mohre|mohren|mohrrube', 36, 0.9, 7, 0.2, { stk: 80 }],
    ['sellerie|knollensellerie|sellerieknolle', 25, 1.5, 4.5, 0.3, { stk: 500 }],
    ['staudensellerie|stangensellerie|selleriestange', 15, 0.7, 2, 0.2, { stk: 40 }],
    ['lauch|porree', 30, 2, 5, 0.3, { stk: 200 }],
    ['suppengrun', 30, 1.3, 5, 0.3, { bund: 400, pck: 400, stk: 400 }],
    ['zucchini', 20, 1.5, 3, 0.4, { stk: 250 }],
    ['aubergine', 20, 1, 3, 0.2, { stk: 300 }],
    ['gurke|salatgurke', 13, 0.6, 2, 0.2, { stk: 400 }],
    ['gewurzgurke|essiggurke|cornichon|gewürzgurken', 20, 0.5, 3, 0.2, { stk: 40, glas: 300 }],
    ['brokkoli|broccoli', 34, 3, 4, 0.4, { stk: 400 }],
    ['blumenkohl', 25, 2, 3, 0.3, { stk: 700 }],
    ['rosenkohl', 40, 4.5, 3.5, 0.3, { handvoll: 80 }],
    ['spinat|blattspinat|babyspinat', 23, 2.9, 1.5, 0.4, { handvoll: 30, pck: 450 }],
    ['salat|rucola|feldsalat|eisbergsalat|kopfsalat|romana|blattsalat|salatherz', 17, 1.5, 2, 0.3, { handvoll: 30, stk: 300 }],
    ['champignon|champignons|pilze|steinpilze|pfifferlinge|kraterseitlinge|shiitake|egerlinge', 22, 3, 0.6, 0.3, { stk: 20, pck: 250, handvoll: 60 }],
    ['erbsen', 80, 5.5, 12, 0.5, { tasse: 145, dose: 280 }],
    ['mais|zuckermais', 90, 3, 16, 1.2, { dose: 285 }],
    ['grune bohnen|bohnen|brechbohnen|prinzessbohnen|buschbohnen', 32, 2, 5, 0.2, { handvoll: 80 }],
    ['kidneybohnen|weisse bohnen|schwarze bohnen|borlottibohnen', 110, 8, 15, 0.5, { dose: 250 }],
    ['kichererbsen', 120, 7, 16, 2.5, { dose: 240 }],
    ['linsen|rote linsen|berglinsen|belugalinsen', 330, 24, 50, 1.5, { tasse: 190, dose: 265 }],
    ['weisskohl|rotkohl|wirsing|spitzkohl|kohl|chinakohl|pak choi', 25, 1.4, 4, 0.2, { stk: 1000 }],
    ['sauerkraut', 20, 1.5, 1, 0.3, { dose: 500, glas: 500, pck: 500 }],
    ['kurbis|hokkaido|butternut', 25, 1, 5, 0.1, { stk: 1000 }],
    ['avocado', 160, 2, 2, 15, { stk: 150 }],
    ['ingwer', 80, 1.8, 15, 0.8, { stk: 20, tl: 2, el: 6 }],
    ['chili|chilischote|peperoni|jalapeno', 40, 2, 7, 0.4, { stk: 10 }],
    ['petersilie|schnittlauch|basilikum|koriander|dill|krauter|thymian|rosmarin|minze|salbei|oregano frisch|estragon|kerbel', 40, 3, 5, 0.7, { bund: 30, zweig: 1, handvoll: 15, el: 3, tl: 1, pck: 25 }],
    ['oliven', 145, 1, 4, 14, { el: 10, stk: 4, glas: 150, handvoll: 40 }],
    ['kapern', 25, 2, 5, 0.9, { el: 10, tl: 3 }],
    ['rote bete|rote beete', 43, 1.6, 9, 0.2, { stk: 150, pck: 500 }],
    ['spargel', 20, 2, 2, 0.2, { stk: 25, bund: 500 }],
    ['fenchel', 31, 1.2, 7, 0.2, { stk: 250 }],
    ['radieschen', 16, 0.7, 3.4, 0.1, { stk: 10, bund: 150 }],
    // Obst
    ['nektarine|nektarinen|pfirsich|pfirsiche|aprikose|aprikosen|kirschen|kirsche|pflaume|pflaumen|zwetschgen', 45, 1, 10, 0.3, { stk: 140, handvoll: 80 }],
    ['apfel|apfel', 52, 0.3, 14, 0.2, { stk: 150 }],
    ['banane', 89, 1.1, 23, 0.3, { stk: 120 }],
    ['zitrone|limette', 29, 1.1, 9, 0.3, { stk: 100 }],
    ['zitronensaft|limettensaft', 22, 0.4, 7, 0.2, { el: 15, tl: 5, d: 1 }],
    ['orange|mandarine|clementine', 47, 0.9, 12, 0.1, { stk: 180 }],
    ['erdbeeren|himbeeren|beeren|brombeeren|johannisbeeren', 35, 0.8, 7.5, 0.3, { handvoll: 70, pck: 250 }],
    ['heidelbeeren|blaubeeren', 57, 0.7, 14, 0.3, { handvoll: 70, pck: 125 }],
    ['birne', 57, 0.4, 15, 0.1, { stk: 170 }],
    ['ananas', 50, 0.5, 13, 0.1, { stk: 900, dose: 340 }],
    ['mango', 60, 0.8, 15, 0.4, { stk: 300 }],
    ['rosinen|cranberries getrocknet|datteln', 300, 3, 72, 0.5, { el: 12, handvoll: 30 }],
    // Öle, Fette, Saucen
    ['ol|olivenol|rapsol|sonnenblumenol|sesamol|pflanzenol|kokosol|bratol|erdnussol|walnussol|leinol', 884, 0, 0, 100, { el: 12, tl: 4.5, d: 0.92 }],
    ['kokosmilch', 197, 2, 3, 20, { dose: 400, d: 1 }],
    ['mayonnaise|mayo|remoulade', 680, 1, 1.5, 75, { el: 14, tl: 5 }],
    ['ketchup', 110, 1.5, 25, 0.2, { el: 17, tl: 6 }],
    ['senf|dijon senf|dijonsenf|dijon', 70, 4.5, 5, 4, { el: 15, tl: 5 }],
    ['sojasosse|sojasauce|soja sauce|sojasose|tamari', 60, 8, 6, 0.5, { el: 16, tl: 6, d: 1.15 }],
    ['essig|weissweinessig|apfelessig|rotweinessig|reisessig', 20, 0, 1, 0, { el: 15, tl: 5, d: 1 }],
    ['balsamico|aceto balsamico|balsamessig', 88, 0.5, 17, 0, { el: 16, tl: 5, d: 1.06 }],
    ['pesto', 450, 5, 6, 45, { el: 15, tl: 5, glas: 190 }],
    ['currypaste', 100, 2, 10, 6, { el: 15, tl: 5 }],
    ['mirin|sake|reiswein|shaoxing', 230, 0.3, 43, 0, { el: 18, tl: 6, d: 1.15 }],
    ['worcestersosse|worcestershire|fischsosse|fischsauce|austernsosse', 80, 3, 15, 0.5, { el: 16, tl: 5, d: 1.1 }],
    ['tahin|tahini|erdnussbutter|mandelmus', 600, 22, 15, 50, { el: 16, tl: 6 }],
    ['ajvar|tomatensosse|tomatensauce|pastasosse|salsa', 60, 1.5, 8, 2.5, { el: 15, glas: 350 }],
    // Nüsse, Samen, Süßes
    ['nusse|mandeln|walnusse|haselnusse|cashew|cashewkerne|pistazien|pekannusse|mandelblattchen|gemahlene mandeln|gemahlene haselnusse|walnusskerne', 600, 18, 10, 52, { el: 8, handvoll: 30, pck: 200 }],
    ['erdnusse|erdnuss', 590, 25, 12, 49, { el: 9, handvoll: 30 }],
    ['sesam|leinsamen|chiasamen|sonnenblumenkerne|kurbiskerne', 570, 20, 12, 48, { el: 9, tl: 3 }],
    ['pinienkerne', 670, 14, 13, 68, { el: 9, pck: 50 }],
    ['kekse|keks|oreo|oreos|butterkeks|butterkekse|vollkornkeks|vollkornkekse|loffelbiskuit|loffelbiskuits|biskuit|cookies|cookie|amarettini|spekulatius|knusperkeks', 480, 6, 68, 20, { pck: 154, stk: 11, handvoll: 40 }],
    ['puddingpulver|vanillepuddingpulver|vanillepudding pulver|sossenpulver|tortenguss', 350, 0.3, 86, 0.1, { pck: 37, el: 10 }],
    ['kondensmilch|gezuckerte kondensmilch', 320, 8, 55, 8, { dose: 397, el: 20, d: 1.3 }],
    ['crepe|crepes|pfannkuchen fertig', 220, 6, 30, 8, { stk: 50 }],
    ['marzipan|nougat|nutella|nuss-nougat-creme|schokoaufstrich', 530, 6, 57, 31, { el: 20, tl: 7, glas: 400 }],
    ['schokolade|zartbitterschokolade|kuvertüre|kuvertüre|schokotropfen', 540, 6, 57, 31, { stk: 100, pck: 100 }],
    ['kakao|kakaopulver|backkakao', 360, 20, 11, 22, { el: 6, tl: 2 }],
    // Getränke & Flüssigkeiten
    ['rotwein|weisswein|wein|sherry|portwein|marsala', 80, 0.1, 2.6, 0, { d: 0.99, glas: 150 }],
    ['bier|malzbier', 43, 0.5, 3.5, 0, { d: 1, glas: 330, stk: 500 }],
    ['saft|orangensaft|apfelsaft|traubensaft|kirschsaft|ananassaft', 45, 0.5, 10, 0.1, { d: 1.04, glas: 200 }],
    ['bruhe|fond|gemusebruhe|rinderbruhe|huhnerbruhe|fleischbruhe|kalbsfond|wildfond|bratenfond|bouillon|gemusefond', 5, 0.5, 0.3, 0.2, { d: 1, tl: 3, el: 9, glas: 400 }],
    ['wasser|eiswasser|mineralwasser', 0, 0, 0, 0, { d: 1 }],
    // Würzmittel ≈ 0 (zählen als bekannt)
    ['salz|pfeffer|meersalz|chiliflocken|cayennepfeffer|muskat|muskatnuss|zimt|kreuzkummel|kurkuma|curry|currypulver|oregano|majoran|lorbeer|lorbeerblatt|lorbeerblatter|nelken|piment|wacholder|wacholderbeeren|kummel|garam masala|gewurz|gewurze|kräuter der provence|krauter der provence|italienische krauter|vanille|vanilleschote|backpulver|natron|hefe|trockenhefe|gelatine|kuchengarn|zahnstocher|eis|eiswurfel|lebensmittelfarbe|brühwurfel|bruhwurfel|senfkorner|fenchelsamen|koriandersamen|anis|sternanis|kardamom|safran|knoblauchpulver|zwiebelpulver|chilipulver|rauchsalz|tabasco|sambal|maggi|maggi wurze|wurze|rub|bbq rub|gewurzmischung|seasoning|seasoning mix|five spice|furikake', 0, 0, 0, 0, { tl: 2, el: 6 }],
    ['tofu|räuchertofu|rauchertofu|seitan|tempeh', 130, 13, 2, 7.5, { pck: 200 }]
  ];

  // Tagesreferenzwerte (EU, Erwachsene)
  const RI = { kcal: 2000, protein: 50, carbs: 260, fat: 70 };

  const DEFAULT_GRAMS = { el: 15, tl: 5, prise: 0.5, msp: 0.3, tasse: 240, zehe: 4, bund: 30, dose: 400,
    pck: 250, becher: 200, glas: 350, scheibe: 25, zweig: 1, handvoll: 30 };

  let index = null;
  function buildIndex() {
    const norm = ns.Data.norm;
    index = [];
    DB.forEach(([keys, kcal, protein, carbs, fat, w]) => {
      const entry = { kcal, protein, carbs, fat, w: w || {} };
      keys.split('|').forEach(k => {
        const nk = norm(k);
        if (nk) index.push({ key: nk, entry });
      });
    });
    // längste Begriffe zuerst („paprikapulver“ vor „paprika“, „kokosmilch“ vor „milch“)
    index.sort((a, b) => b.key.length - a.key.length);
  }

  /** Passenden Eintrag für einen Zutatennamen finden (Wortanfang/-ende, auch in Komposita). */
  function lookup(name) {
    if (!index) buildIndex();
    const n = ns.Data.norm(String(name || '').replace(/\(.*?\)/g, ' ').split(',')[0]);
    if (!n) return null;
    const words = n.split(' ');
    for (const { key, entry } of index) {
      if (key.includes(' ')) { if (n.includes(key)) return entry; continue; }
      for (const w of words) {
        if (w === key) return entry;
        // Plural/Komposita: „tomaten“, „rinderrouladen“, „hahnchenbrustfilets“, „kirschtomaten“
        if (key.length >= 4 && (w.startsWith(key) || w.endsWith(key)) && w.length - key.length <= Math.max(4, w.length * 0.6)) return entry;
      }
    }
    return null;
  }

  function gramsFor(ing, entry) {
    ing = ns.Data.fixUnitMixup ? ns.Data.fixUnitMixup(ing) : ing;   // „500 l Milch“ → 500 ml
    const a = Number(ing.amount) || 0;
    const w = entry.w || {};
    const d = w.d || 1;
    switch (ing.unit) {
      case 'ng': return 0;
      case 'g': return a;
      case 'kg': return a * 1000;
      case 'ml': return a * d;
      case 'l': return a * 1000 * d;
      case 'stk': return w.stk != null ? a * w.stk : null;
      default: {
        const per = w[ing.unit] != null ? w[ing.unit] : DEFAULT_GRAMS[ing.unit];
        return per != null ? a * per : null;
      }
    }
  }

  /**
   * Schätzt die Nährwerte eines Rezepts.
   * Rückgabe: { perServing, total, matched, unknown[], noAmount[], servings }
   */
  function calculate(recipe) {
    const servings = Math.max(1, Number(recipe.servings) || 1);
    const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const unknown = [], noAmount = [];
    let matched = 0;
    (recipe.ingredients || []).forEach(ing => {
      if (!ing || !String(ing.name || '').trim()) return;
      const entry = lookup(ing.name);
      if (!entry) { unknown.push(ing.name); return; }
      if (ing.unit !== 'ng' && !(Number(ing.amount) > 0)) {
        if (entry.kcal > 0) noAmount.push(ing.name); else matched++;
        return;
      }
      const g = gramsFor(ing, entry);
      if (g == null) { noAmount.push(ing.name); return; }
      matched++;
      const f = g / 100;
      total.kcal += entry.kcal * f;
      total.protein += entry.protein * f;
      total.carbs += entry.carbs * f;
      total.fat += entry.fat * f;
    });
    const perServing = {};
    Object.keys(total).forEach(k => { perServing[k] = total[k] / servings; });
    return { perServing, total, matched, unknown, noAmount, servings, count: matched + unknown.length + noAmount.length };
  }

  const ROWS = [
    { key: 'kcal', label: 'Kalorien', unit: 'kcal', cls: 'n-kcal' },
    { key: 'protein', label: 'Eiweiß', unit: 'g', cls: 'n-protein' },
    { key: 'carbs', label: 'Kohlenhydrate', unit: 'g', cls: 'n-carbs' },
    { key: 'fat', label: 'Fett', unit: 'g', cls: 'n-fat' }
  ];

  function fmt(v, unit) {
    const n = unit === 'kcal' ? Math.round(v) : (v < 10 ? Math.round(v * 10) / 10 : Math.round(v));
    return `${n.toLocaleString(ns.I18n ? ns.I18n.locale() : 'de-DE')} ${unit}`;
  }

  /** Balkendiagramm (App) – pro Portion, Balken = Anteil am Tagesbedarf. */
  function renderBars(recipe) {
    const esc = ns.UI.esc;
    const res = calculate(recipe);
    if (!res.matched || res.total.kcal < 1) {
      return `<div class="nutri-empty muted">Sobald Zutaten mit Mengen eingetragen sind, erscheinen hier geschätzte Nährwerte.</div>`;
    }
    const missing = res.unknown.concat(res.noAmount);
    return `
      <div class="nutri-bars">
        ${ROWS.map(r => {
          const v = res.perServing[r.key];
          const pct = Math.round(v / RI[r.key] * 100);
          return `
            <div class="nutri-row">
              <span class="nutri-label">${r.label}</span>
              <div class="nutri-track"><div class="nutri-fill ${r.cls}" style="width:${Math.min(100, Math.max(2, pct))}%"></div></div>
              <span class="nutri-value">${fmt(v, r.unit)}</span>
              <span class="nutri-pct">${pct} %</span>
            </div>`;
        }).join('')}
      </div>
      <p class="nutri-note">Richtwerte pro Portion (${res.servings} ${res.servings === 1 ? 'Portion' : 'Portionen'}), automatisch aus den Zutaten geschätzt. Prozent = Anteil am Tagesbedarf eines Erwachsenen (2.000 kcal).
        ${missing.length ? `<br>Nicht berücksichtigt: ${missing.map(esc).join(', ')}.` : ''}</p>`;
  }

  /** Kompakte Tabelle für die PDF. */
  function renderPrintTable(recipe) {
    const esc = ns.UI.esc;
    const res = calculate(recipe);
    if (!res.matched || res.total.kcal < 1) return '';
    const missing = res.unknown.concat(res.noAmount);
    return `
      <div class="nutri">
        <h3>Nährwerte pro Portion <span>(Richtwerte)</span></h3>
        <table><tr>${ROWS.map(r => `<td><span>${r.label}</span><strong>${fmt(res.perServing[r.key], r.unit)}</strong></td>`).join('')}</tr></table>
        <p>Automatisch aus den Zutaten geschätzt${missing.length ? `; nicht berücksichtigt: ${missing.map(esc).join(', ')}` : ''}.</p>
      </div>`;
  }

  ns.Nutrition = { calculate, lookup, renderBars, renderPrintTable, RI };
})(window.EasyKitchen);
