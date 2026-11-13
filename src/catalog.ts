// Copie de secours du catalogue (40 premiers produits de Firestore, collectés sur Pinduoduo) : affichée avant
// l'arrivée de Firestore, et seule source de données sur le web (où React Native Firebase n'est pas initialisé).
// k : identifiant · b : photo (URL) · o : origine (kin = stock Kinshasa, cn = import Chine) · c : rayon
// n : nom · p : prix détail · t : paliers [quantité min, prix unitaire] · m : minimum gros · s : vendus
// h : étiquette du fournisseur (vide si aucune) · kd : famille (tailles) · pr : [prix, ancien prix, libellé, promo?]
export interface CatItem {
  k: string; b: string; o: 'kin' | 'cn'; c: string; n: string; p: number;
  t: [number, number][]; m: number; s: string; h: string; kd: string;
  pr?: [number, number, string, number];
  order?: number;
}

/** Prix courant : le premier palier porte toujours le prix réellement facturé. */
export const currentPrice = (p: CatItem) => p.t[0]?.[1] ?? p.p;
/** Une promo n'est active que si le flag `pr[3]` vaut 1 et que l'ancien prix est supérieur au prix courant. */
export const isPromoActive = (p: CatItem) => !!p.pr && p.pr[3] === 1 && p.pr[1] > currentPrice(p);
/** Remise d'une promo active, en pourcentage entier (0 sans promo). */
export const promoPercent = (p: CatItem) => (isPromoActive(p) && p.pr ? Math.round((1 - currentPrice(p) / p.pr[1]) * 100) : 0);

/** Tailles proposées à la commande, selon la famille du produit ; les autres familles se commandent sans taille. */
export const SIZES: Record<string, { label: string; values: string[] }> = {
  vet: { label: 'Taille', values: ['S', 'M', 'L', 'XL', 'XXL'] },
  chauss: { label: 'Pointure', values: ['39', '40', '41', '42', '43', '44'] },
};

/** Texte comparable : minuscules, sans accents (« Téléphone » et « telephone » se trouvent). */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Rayons du catalogue (champ `category` des produits Firestore), dans l'ordre d'affichage.
 * `subs` : sous-rayons [libellé, motif cherché dans le nom du produit] ; seuls ceux qui ont un produit s'affichent.
 */
export interface Rayon { key: string; label: string; subs: [string, RegExp][] }
export const RAYONS: Rayon[] = [
  { key: 'hommes', label: 'Hommes',
    subs: [['T-shirts', /t-shirt|tee/i], ['Pulls & sweats', /pull|sweat|polaire/i], ['Vestes', /veste|blouson|doudoune|parka|manteau/i], ['Pantalons', /pantalon|jean|jogging|short/i], ['Chemises', /chemise|polo/i], ['Ensembles', /ensemble/i]] },
  { key: 'femmes', label: 'Femmes',
    subs: [['Robes', /robe/i], ['Hauts', /haut|t-shirt|chemisier|blouse|top/i], ['Pulls', /pull|gilet|cardigan|sweat/i], ['Manteaux', /manteau|doudoune|veste|parka/i], ['Pantalons & jupes', /pantalon|jean|jupe|legging/i], ['Ensembles', /ensemble/i]] },
  { key: 'lingerie', label: 'Sous-vêtements',
    subs: [['Soutiens-gorge', /soutien|brassière/i], ['Culottes & boxers', /culotte|slip|boxer|caleçon/i], ['Chaussettes', /chaussette|collant/i], ['Pyjamas', /pyjama|nuit|peignoir/i], ['Thermiques', /thermique|chaud/i]] },
  { key: 'chaussures', label: 'Chaussures & sacs',
    subs: [['Baskets', /basket|sneaker|running/i], ['Bottes', /botte|bottine/i], ['Sandales', /sandale|claquette|chausson|pantoufle|mule/i], ['Chaussures', /chaussure|mocassin|escarpin/i], ['Sacs à dos', /sac à dos/i], ['Sacs', /sac|sacoche|pochette|portefeuille|valise/i]] },
  { key: 'accessoires', label: 'Accessoires',
    subs: [['Bijoux', /collier|bracelet|bague|boucle|pendentif/i], ['Montres', /montre/i], ['Chapeaux', /bonnet|casquette|chapeau/i], ['Écharpes & gants', /écharpe|foulard|gant/i], ['Lunettes', /lunette/i], ['Cheveux', /cheveu|pince|barrette|chouchou/i]] },
  { key: 'beaute', label: 'Beauté',
    subs: [['Maquillage', /rouge à lèvres|mascara|fond de teint|palette|maquillage|crayon|gloss/i], ['Soins', /crème|sérum|masque|lotion|visage|nettoyant/i], ['Cheveux', /cheveu|shampo/i], ['Ongles', /ongle|vernis/i], ['Parfums', /parfum/i]] },
  { key: 'telephones', label: 'Téléphones',
    subs: [['Smartphones', /smartphone|téléphone portable/i], ['Coques', /coque|étui/i], ['Chargeurs & câbles', /chargeur|câble/i], ['Écouteurs', /écouteur|casque/i], ['Batteries', /batterie/i], ['Protections', /verre trempé|film/i]] },
  { key: 'electromenager', label: 'Électroménager',
    subs: [['Cuisine', /cuiseur|bouilloire|mixeur|blender|friteuse|four|plaque|cafeti/i], ['Chauffage & air', /ventilateur|chauffage|radiateur|climatiseur|humidificateur/i], ['Ménage', /aspirateur|nettoy|lave/i], ['Soin du corps', /sèche-cheveux|rasoir|tondeuse|épilat/i]] },
  { key: 'bricolage', label: 'Bricolage',
    subs: [['Outils', /outil|perceuse|tournevis|clé|pince|scie/i], ['Éclairage', /lampe|ampoule|led|lumière/i], ['Plomberie', /robinet|douche|évier|tuyau/i], ['Électricité', /prise|interrupteur|rallonge|câble/i], ['Fixations', /vis|crochet|adhésif|colle/i]] },
  { key: 'linge', label: 'Linge de maison',
    subs: [['Couettes & plaids', /couette|couverture|plaid/i], ['Draps', /drap|parure|housse/i], ['Oreillers & coussins', /oreiller|coussin/i], ['Rideaux', /rideau/i], ['Tapis', /tapis/i], ['Serviettes', /serviette/i]] },
  { key: 'meubles', label: 'Meubles',
    subs: [['Rangement', /étagère|rangement|armoire|commode|meuble/i], ['Tables & bureaux', /table|bureau/i], ['Chaises', /chaise|tabouret|fauteuil/i], ['Lits & matelas', /lit|matelas/i], ['Canapés', /canapé|sofa/i]] },
  { key: 'maison', label: 'Maison & bazar',
    subs: [['Cuisine', /cuisine|bol|assiette|tasse|poêle|casserole|couteau/i], ['Rangement', /boîte|rangement|panier|cintre/i], ['Nettoyage', /nettoyage|serpillière|balai|poubelle/i], ['Salle de bain', /bain|toilette|douche/i]] },
  { key: 'bebe', label: 'Bébé & maman',
    subs: [['Vêtements', /bébé|enfant|body|grenouillère/i], ['Couches & soins', /couche|lingette/i], ['Jouets', /jouet|peluche/i], ['Repas', /biberon|tétine|bavoir/i]] },
  { key: 'auto', label: 'Auto & moto',
    subs: [['Intérieur', /siège|housse|tapis|volant/i], ['Entretien', /nettoyage|lavage|cire|huile/i], ['Électronique', /chargeur|caméra|support|gps/i], ['Moto', /moto|casque|scooter/i]] },
  { key: 'sport', label: 'Sport',
    subs: [['Fitness', /fitness|haltère|yoga|musculation|élastique/i], ['Vêtements de sport', /sport|running|jogging/i], ['Ballons', /ballon|football|basket/i], ['Vélo', /vélo|cyclisme/i], ['Plein air', /camping|randonnée|pêche|tente/i]] },
];
export const RAYON_LABEL: Record<string, string> = Object.fromEntries(RAYONS.map(r => [r.key, r.label]));
/** Rayons qui ont au moins un produit, dans l'ordre de RAYONS. */
export const rayonsOf = (products: CatItem[]) => {
  const used = new Set(products.map(p => p.c));
  return RAYONS.filter(r => used.has(r.key));
};
export const CAT: CatItem[] = [{"k":"cab0a61c","b":"https://sokoni-5c824.web.app/p/cab0a61c.jpg","o":"cn","c":"hommes","n":"Pantalon de travail tactique camouflage MultiCam","p":12.39,"t":[[1,12.39],[6,11.4],[30,10.53]],"m":6,"s":"","h":"Souvent racheté","kd":"vet","order":0},
  {"k":"42832830","b":"https://sokoni-5c824.web.app/p/42832830.jpg","o":"cn","c":"femmes","n":"Ensemble femme robe tricot et manteau mi-épais","p":2.67,"t":[[1,2.67],[20,2.46],[100,2.27]],"m":20,"s":"477","h":"Top ventes","kd":"vet","pr":[2.67,4.22,"Prix promo",1],"order":1},
  {"k":"76be74d1","b":"https://sokoni-5c824.web.app/p/76be74d1.jpg","o":"cn","c":"lingerie","n":"Chaussettes coton antibactériennes homme, mi-mollet","p":3.11,"t":[[1,3.11],[12,2.86],[60,2.64]],"m":12,"s":"","h":"Tendance","kd":"vet","order":2},
  {"k":"829da3b3","b":"https://sokoni-5c824.web.app/p/829da3b3.jpg","o":"cn","c":"chaussures","n":"Chaussons homme coton, doublés polaire, antidérapants","p":0.88,"t":[[1,0.88],[20,0.81],[100,0.75]],"m":20,"s":"","h":"Tendance","kd":"chauss","order":3},
  {"k":"82391651","b":"https://sokoni-5c824.web.app/p/82391651.jpg","o":"cn","c":"accessoires","n":"Montre mécanique automatique homme, squelette","p":31.27,"t":[[1,31.27],[3,28.77],[15,26.58]],"m":3,"s":"","h":"Top ventes","kd":"montre","order":4},
  {"k":"7f78979e","b":"https://sokoni-5c824.web.app/p/7f78979e.jpg","o":"cn","c":"beaute","n":"Faux cils effet œil de renard, sans colle, multicouches","p":1.77,"t":[[1,1.77],[20,1.63],[100,1.5]],"m":20,"s":"","h":"","kd":"beaute","order":5},
  {"k":"e6fbcce5","b":"https://sokoni-5c824.web.app/p/e6fbcce5.jpg","o":"cn","c":"telephones","n":"Câble de données tressé 100 W, charge rapide","p":0.78,"t":[[1,0.78],[20,0.72],[100,0.66]],"m":20,"s":"","h":"Tendance","kd":"tech","order":6},
  {"k":"e95ebb48","b":"https://sokoni-5c824.web.app/p/e95ebb48.jpg","o":"cn","c":"electromenager","n":"Fermeuse de sacs électrique portable, rechargeable","p":38.03,"t":[[1,38.03],[3,34.99],[15,32.33]],"m":3,"s":"","h":"","kd":"sac","order":7},
  {"k":"ce626015","b":"https://sokoni-5c824.web.app/p/ce626015.jpg","o":"cn","c":"bricolage","n":"Lampadaire d'ambiance, commande vocale, télécommande","p":2.8,"t":[[1,2.8],[20,2.58],[100,2.38]],"m":20,"s":"","h":"","kd":"maison","order":8},
  {"k":"964d525c","b":"https://sokoni-5c824.web.app/p/964d525c.jpg","o":"cn","c":"linge","n":"Oreiller en latex thaï, soutien de la nuque","p":2.65,"t":[[1,2.65],[20,2.44],[100,2.25]],"m":20,"s":"32k","h":"Tendance","kd":"maison","pr":[2.65,3.07,"Prix promo",1],"order":9},
  {"k":"3fbf5972","b":"https://sokoni-5c824.web.app/p/3fbf5972.jpg","o":"cn","c":"maison","n":"Scelleuse manuelle à sachets en métal","p":9.55,"t":[[1,9.55],[12,8.79],[60,8.12]],"m":12,"s":"632","h":"Top ventes","kd":"sac","order":10},
  {"k":"c98befce","b":"https://sokoni-5c824.web.app/p/c98befce.jpg","o":"cn","c":"bebe","n":"Poupée en peluche pour mariage, en gros","p":18.31,"t":[[1,18.31],[6,16.85],[30,15.56]],"m":6,"s":"","h":"Top ventes","kd":"maison","order":11},
  {"k":"be6407d9","b":"https://sokoni-5c824.web.app/p/be6407d9.jpg","o":"cn","c":"auto","n":"Booster de batterie auto avec compresseur d'air","p":23.66,"t":[[1,23.66],[6,21.77],[30,20.11]],"m":6,"s":"128k","h":"","kd":"tech","order":12},
  {"k":"f8c3fb6e","b":"https://sokoni-5c824.web.app/p/f8c3fb6e.jpg","o":"cn","c":"sport","n":"Kit d'outils de survie multifonction pour camping","p":10.08,"t":[[1,10.08],[6,9.27],[30,8.57]],"m":6,"s":"","h":"Top ventes","kd":"maison","order":13},
  {"k":"8fc40281","b":"https://sokoni-5c824.web.app/p/8fc40281.jpg","o":"cn","c":"meubles","n":"Bureau électrique réglable en hauteur, bois massif","p":81.41,"t":[[1,81.41],[3,74.9],[15,69.2]],"m":3,"s":"","h":"Tendance","kd":"maison","order":14},
  {"k":"48a6f2e8","b":"https://sokoni-5c824.web.app/p/48a6f2e8.jpg","o":"cn","c":"hommes","n":"T-shirt manches longues homme, séchage rapide","p":3.7,"t":[[1,3.7],[12,3.4],[60,3.15]],"m":12,"s":"","h":"Top ventes","kd":"vet","order":15},
  {"k":"fef93523","b":"https://sokoni-5c824.web.app/p/fef93523.jpg","o":"cn","c":"femmes","n":"Jean femme doublé polaire, taille haute, droit","p":8.44,"t":[[1,8.44],[12,7.76],[60,7.17]],"m":12,"s":"","h":"Top ventes","kd":"vet","order":16},
  {"k":"67f2b389","b":"https://sokoni-5c824.web.app/p/67f2b389.jpg","o":"cn","c":"lingerie","n":"Écharpe femme double face, chaude, automne-hiver","p":22.25,"t":[[1,22.25],[6,20.47],[30,18.91]],"m":6,"s":"","h":"Tendance","kd":"vet","order":17},
  {"k":"86b16973","b":"https://sokoni-5c824.web.app/p/86b16973.jpg","o":"cn","c":"chaussures","n":"Mocassins de travail homme en mesh respirant","p":3.58,"t":[[1,3.58],[12,3.29],[60,3.04]],"m":12,"s":"","h":"","kd":"chauss","order":18},
  {"k":"c5a8207c","b":"https://sokoni-5c824.web.app/p/c5a8207c.jpg","o":"cn","c":"accessoires","n":"Pince-crabe requin pour cheveux, femme, simple","p":0.26,"t":[[1,0.26],[20,0.24],[100,0.22]],"m":20,"s":"","h":"","kd":"acc","order":19},
  {"k":"39fbd597","b":"https://sokoni-5c824.web.app/p/39fbd597.jpg","o":"cn","c":"beaute","n":"Shampoing solide aux herbes, anti-pelliculaire","p":5.63,"t":[[1,5.63],[12,5.18],[60,4.79]],"m":12,"s":"","h":"","kd":"beaute","order":20},
  {"k":"bb6d3e82","b":"https://sokoni-5c824.web.app/p/bb6d3e82.jpg","o":"cn","c":"telephones","n":"Écouteurs sans fil Philips TAT1420BK, Bluetooth","p":9.71,"t":[[1,9.71],[12,8.93],[60,8.25]],"m":12,"s":"","h":"","kd":"tech","order":21},
  {"k":"05b7d5bb","b":"https://sokoni-5c824.web.app/p/05b7d5bb.jpg","o":"cn","c":"electromenager","n":"Rasoir manuel homme 5 lames, lames réglables","p":0.12,"t":[[1,0.12],[20,0.11],[100,0.1]],"m":20,"s":"","h":"","kd":"tech","order":22},
  {"k":"afdb496b","b":"https://sokoni-5c824.web.app/p/afdb496b.jpg","o":"cn","c":"bricolage","n":"Pommeau de douche haute pression BSITN, douchette","p":2.48,"t":[[1,2.48],[20,2.28],[100,2.11]],"m":20,"s":"60k","h":"","kd":"maison","order":23},
  {"k":"b3c702ce","b":"https://sokoni-5c824.web.app/p/b3c702ce.jpg","o":"cn","c":"linge","n":"Fil pour machine à coudre les sacs Feiren","p":2.15,"t":[[1,2.15],[20,1.98],[100,1.83]],"m":20,"s":"","h":"","kd":"sac","order":24},
  {"k":"c0beb3bd","b":"https://sokoni-5c824.web.app/p/c0beb3bd.jpg","o":"cn","c":"maison","n":"Masque de nuit 3D anti-lumière","p":1.07,"t":[[1,1.07],[20,0.98],[100,0.91]],"m":20,"s":"","h":"Tendance","kd":"maison","order":25},
  {"k":"2641b872","b":"https://sokoni-5c824.web.app/p/2641b872.jpg","o":"cn","c":"bebe","n":"Tablette à dessin lumineuse LED pour enfant","p":11.97,"t":[[1,11.97],[6,11.01],[30,10.17]],"m":6,"s":"","h":"","kd":"maison","order":26},
  {"k":"98a2fafe","b":"https://sokoni-5c824.web.app/p/98a2fafe.jpg","o":"cn","c":"auto","n":"Bâche pare-brise anti-neige magnétique épaisse","p":3.46,"t":[[1,3.46],[12,3.18],[60,2.94]],"m":12,"s":"15k","h":"","kd":"tech","order":27},
  {"k":"3b606324","b":"https://sokoni-5c824.web.app/p/3b606324.jpg","o":"cn","c":"sport","n":"Veste de sport homme, col montant, zippée, chaude","p":25.21,"t":[[1,25.21],[6,23.19],[30,21.43]],"m":6,"s":"","h":"Top ventes","kd":"vet","order":28},
  {"k":"db79792f","b":"https://sokoni-5c824.web.app/p/db79792f.jpg","o":"cn","c":"meubles","n":"Chaise de bureau ergonomique pour longues heures","p":45.9,"t":[[1,45.9],[3,42.23],[15,39.02]],"m":3,"s":"","h":"Tendance","kd":"maison","order":29},
  {"k":"cf3f8725","b":"https://sokoni-5c824.web.app/p/cf3f8725.jpg","o":"cn","c":"hommes","n":"Pantalon de jogging large doublé polaire","p":9.51,"t":[[1,9.51],[12,8.75],[60,8.08]],"m":12,"s":"","h":"","kd":"vet","order":30},
  {"k":"f70111b9","b":"https://sokoni-5c824.web.app/p/f70111b9.jpg","o":"cn","c":"femmes","n":"Pull femme laine, col mi-montant, slim, chaud","p":15.77,"t":[[1,15.77],[6,14.51],[30,13.4]],"m":6,"s":"","h":"Tendance","kd":"vet","order":31},
  {"k":"19e7a1bc","b":"https://sokoni-5c824.web.app/p/19e7a1bc.jpg","o":"cn","c":"lingerie","n":"Lot de 5 boxers homme, respirants, séchage rapide","p":0.68,"t":[[1,0.68],[20,0.63],[100,0.58]],"m":20,"s":"","h":"","kd":"vet","order":32},
  {"k":"71e831c3","b":"https://sokoni-5c824.web.app/p/71e831c3.jpg","o":"cn","c":"chaussures","n":"Ceinture Jeep en cuir de vache homme, boucle à ardillon","p":12.54,"t":[[1,12.54],[6,11.54],[30,10.66]],"m":6,"s":"","h":"","kd":"sac","pr":[12.54,12.96,"Prix promo",1],"order":33},
  {"k":"e5b76598","b":"https://sokoni-5c824.web.app/p/e5b76598.jpg","o":"cn","c":"accessoires","n":"Lunettes de vue Moscot Lemtosh, monture jaune","p":19.58,"t":[[1,19.58],[6,18.01],[30,16.64]],"m":6,"s":"","h":"Top ventes","kd":"acc","order":34},
  {"k":"9380475c","b":"https://sokoni-5c824.web.app/p/9380475c.jpg","o":"cn","c":"beaute","n":"Mascara tube métal, volume, longueur, tenue longue","p":2.15,"t":[[1,2.15],[20,1.98],[100,1.83]],"m":20,"s":"","h":"","kd":"beaute","order":35},
  {"k":"14819683","b":"https://sokoni-5c824.web.app/p/14819683.jpg","o":"cn","c":"telephones","n":"Lecteur de cartes CFexpress B Lexar RW510, USB-C","p":21.41,"t":[[1,21.41],[6,19.7],[30,18.2]],"m":6,"s":"","h":"","kd":"tech","pr":[21.41,22.25,"Prix promo",1],"order":36},
  {"k":"b71d327a","b":"https://sokoni-5c824.web.app/p/b71d327a.jpg","o":"cn","c":"electromenager","n":"Coussin multifonction cou et taille, lit et canapé","p":8.43,"t":[[1,8.43],[12,7.76],[60,7.17]],"m":12,"s":"15k","h":"","kd":"tech","pr":[8.43,12.04,"Prix promo",1],"order":37},
  {"k":"3044f839","b":"https://sokoni-5c824.web.app/p/3044f839.jpg","o":"cn","c":"bricolage","n":"Chaussures de sécurité Stanley à embout acier","p":19.72,"t":[[1,19.72],[6,18.14],[30,16.76]],"m":6,"s":"","h":"Top ventes","kd":"chauss","order":38},
  {"k":"0d21dc02","b":"https://sokoni-5c824.web.app/p/0d21dc02.jpg","o":"cn","c":"linge","n":"Bougie d'urgence 168 h en boîte métallique","p":0.15,"t":[[1,0.15],[20,0.14],[100,0.13]],"m":20,"s":"","h":"","kd":"maison","pr":[0.15,0.86,"Prix promo",1],"order":39}];
