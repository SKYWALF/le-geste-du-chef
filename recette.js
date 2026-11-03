// ==========================================
// LE GESTE DU CHEF
// FICHE RECETTE - VERSION AMÉLIORÉE
// ==========================================

// ==========================================
// 1. CONNEXION À SUPABASE
// ==========================================

const SUPABASE_URL =
    "https://xlnjmhkuhjqunwvkkykh.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_cxU-UsbHYO9S6RtVHEXbJw_-Y42Tryt";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// 2. ÉLÉMENTS DE LA PAGE
// ==========================================

const recetteDetail =
    document.getElementById("recetteDetail");

const annee = document.getElementById("year");

if (annee) {
    annee.textContent = new Date().getFullYear();
}

// ==========================================
// 3. IDENTIFIANT DE LA RECETTE
// ==========================================

const params = new URLSearchParams(
    window.location.search
);

const recetteId = params.get("id");

// ==========================================
// 4. CRÉER UN ÉLÉMENT HTML
// ==========================================

function creerElement(balise, texte, classe = "") {

    const element = document.createElement(balise);

    element.textContent = texte;

    if (classe) {
        element.className = classe;
    }

    return element;
}
// ==========================================
// CONVERTIR LES MINUTES EN HEURES
// ==========================================

function formaterDuree(valeur) {

    if (valeur === null || valeur === undefined || valeur === "") {
        return "Non renseigné";
    }

    const total = Math.round(Number(valeur));

    if (!Number.isFinite(total) || total < 0) {
        return "Non renseigné";
    }

    const heures = Math.floor(total / 60);
    const minutes = total % 60;

    if (heures === 0) {
        return `${minutes} min`;
    }

    if (minutes === 0) {
        return `${heures} h`;
    }

    return `${heures} h ${minutes} min`;
}
// ==========================================
// 5. TRANSFORMER UN INGRÉDIENT EN TEXTE
// ==========================================

function texteIngredient(ingredient) {

    if (typeof ingredient === "string") {
        return ingredient;
    }

    if (ingredient && typeof ingredient === "object") {

        const texte = [
            ingredient.quantite,
            ingredient.unite,
            ingredient.nom
        ]
            .filter(valeur =>
                valeur !== undefined &&
                valeur !== null
            )
            .join(" ");

        return texte.trim() ||
            ingredient.description ||
            ingredient.texte ||
            "";
    }

    return "";
}

// ==========================================
// 6. CRÉER UNE LISTE
// ==========================================

function creerListe(elements, ordonnee = false) {

    const liste = document.createElement(
        ordonnee ? "ol" : "ul"
    );

    if (
        !Array.isArray(elements) ||
        elements.length === 0
    ) {

        liste.appendChild(
            creerElement(
                "li",
                "Informations à venir."
            )
        );

        return liste;
    }

    elements.forEach(element => {

        const texte = texteIngredient(element);

        if (texte.trim()) {

            liste.appendChild(
                creerElement("li", texte)
            );
        }
    });

    return liste;
}

// ==========================================
// 7. CONFIGURATION DES PORTIONS
// ==========================================

// Nombre minimum de personnes
const MIN_PORTIONS = 2;

// Nombre maximum
const MAX_PORTIONS = 100;

// ==========================================
// 8. RECONNAÎTRE LES QUANTITÉS
// ==========================================

function analyserIngredient(ingredient) {

    const texte = texteIngredient(ingredient).trim();

    // Reconnaître :
    // 500g de farine
    // 500 g de farine
    // 230ml eau
    // 1,33 œufs
    // 2 kg de sucre

    const resultat = texte.match(
    /^(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l|œufs?|oeufs?|pièces?|unités?|gousses?)?\s*(.*)$/i
);

    if (!resultat) {
        return null;
    }

    const quantite = Number(
        resultat[1].replace(",", ".")
    );

    if (!Number.isFinite(quantite)) {
        return null;
    }

    let unite = resultat[2] || "";
    let nom = resultat[3] || "";

    // Corriger le cas des œufs
    if (/^(œufs?|oeufs?)$/i.test(unite)) {

        nom = unite + (nom ? " " + nom : "");
        unite = "";
    }

    return {
        quantite,
        unite: unite.trim(),
        nom: nom.trim()
    };
}

// ==========================================
// 9. ARRONDIR LES QUANTITÉS
// ==========================================

// ==========================================
// ARRONDIR TOUS LES INGRÉDIENTS
// ==========================================

function arrondirQuantite(quantite, unite, nom) {

    // Arrondir à l'entier le plus proche
    // Ne jamais afficher moins de 1
    return Math.max(1, Math.round(quantite));
}

// ==========================================
// 10. AFFICHER LES QUANTITÉS
// ==========================================

// ==========================================
// AFFICHAGE DES QUANTITÉS ARRONDIES
// ==========================================

function formaterQuantite(quantite, nom) {

    return Math.round(quantite).toLocaleString("fr-FR");
}

// ==========================================
// 11. AJUSTER UN INGRÉDIENT
// ==========================================

function ajusterIngredient(ingredient, coefficient) {

    const analyse = analyserIngredient(ingredient);

    // Si aucune quantité n'est reconnue,
    // conserver le texte original
    if (!analyse) {
        return texteIngredient(ingredient);
    }

    const nouvelleQuantite =
        analyse.quantite * coefficient;

    const quantiteArrondie = arrondirQuantite(
        nouvelleQuantite,
        analyse.unite,
        analyse.nom
    );

    const quantiteAffichee = formaterQuantite(
        quantiteArrondie,
        analyse.nom
    );

    const unite = analyse.unite
        ? " " + analyse.unite
        : "";

    const nom = analyse.nom
        ? " " + analyse.nom
        : "";

    return quantiteAffichee + unite + nom;
}

// ==========================================
// 12. CHARGER LES PRIX DES INGRÉDIENTS
// ==========================================

async function chargerPrixIngredients() {

    const { data, error } = await supabaseClient
        .from("prix_ingredients")
        .select(
            "ingredient, prix_unitaire, unite, source"
        );

    if (error) {

        console.error(
            "Erreur de récupération des prix :",
            error.message
        );

        return [];
    }

    return data || [];
}

// ==========================================
// 13. CHARGER LA RECETTE
// ==========================================

async function chargerRecette() {

    if (!recetteDetail) {
        return;
    }

    if (!recetteId) {

        recetteDetail.textContent =
            "Aucune recette sélectionnée.";

        return;
    }

    const { data: recette, error } =
        await supabaseClient
            .from("recettes")
.select(`
    id,
    titre,
    description,
    categorie,
    temps_preparation,
    temps_cuisson,
    temps_repos,
    portions,
    ingredients,
    etapes,
    image_url
`)
            .eq("id", recetteId)
            .eq("publie", true)
            .maybeSingle();

    if (error) {

        console.error(
            "Erreur Supabase :",
            error.message
        );

        recetteDetail.textContent =
            "Impossible de charger cette recette.";

        return;
    }

    if (!recette) {

        recetteDetail.textContent =
            "Cette recette est introuvable ou n'est pas publiée.";

        return;
    }

    // ======================================
    // 14. PRÉPARER LA PAGE
    // ======================================
seoRecette(recette);
    recetteDetail.replaceChildren();

    document.title =
        `${recette.titre} | Le Geste du Chef`;

    // ======================================
    // PHOTO
    // ======================================

    const photo = document.createElement("img");

    photo.className = "recette-photo";

    photo.src =
        recette.image_url || "images/creme.jpg";

    photo.alt =
        recette.titre || "Photo de la recette";

    photo.addEventListener("error", () => {

        if (
            !photo.src.endsWith("/images/creme.jpg")
        ) {

            photo.src = "images/creme.jpg";
        }
    });

    // ======================================
    // TITRE
    // ======================================

    const titre = creerElement(
        "h1",
        recette.titre || "Recette",
        "recette-titre"
    );

    // ======================================
    // DESCRIPTION
    // ======================================

    const description = creerElement(
        "p",
        recette.description || ""
    );

    // ======================================
    // INFORMATIONS
    // ======================================

    const infos = document.createElement("div");

    infos.className = "recette-infos";

    const preparation =
        Number(recette.temps_preparation) || 0;

    const cuisson =
        Number(recette.temps_cuisson) || 0;
        // Temps de repos facultatif
const repos = Number(recette.temps_repos) || 0;
console.log("TEST TEMPS DE REPOS :", recette.temps_repos);
console.log("REPOS CALCULÉ :", repos);

    const portionsOriginales = Math.max(
        1,
        Math.round(Number(recette.portions) || 1)
    );

// ==========================================
// INFORMATIONS DE LA RECETTE
// ==========================================

const informationsRecette = [
    `🍽️ ${recette.categorie || "Cuisine"}`,
    `🥄 Préparation : ${formaterDuree(preparation)}`,
    `🔥 Cuisson : ${formaterDuree(cuisson)}`
];

// Afficher le repos uniquement si nécessaire
if (repos > 0) {
    informationsRecette.push(
        `🕒 Repos : ${formaterDuree(repos)}`
    );
}

// Nombre de portions
informationsRecette.push(
    `👥 ${portionsOriginales} portion(s)`
);

// Afficher les informations
informationsRecette.forEach(info => {
    infos.appendChild(
        creerElement("span", info)
    );
});

    // ======================================
    // 15. SÉLECTEUR DE PORTIONS
    // ======================================

    const selecteurPortions =
        document.createElement("div");

    selecteurPortions.className =
        "selecteur-portions";

    const labelPortions =
        document.createElement("label");

    labelPortions.textContent =
        "🍽️ Nombre de personnes : ";

    labelPortions.htmlFor = "nombrePortions";

    const nombrePortions =
        document.createElement("input");

    nombrePortions.type = "number";

    nombrePortions.id = "nombrePortions";

// ==========================================
// MINIMUM AUTOMATIQUE SELON LES INGRÉDIENTS
// ==========================================

const ingredientsPourMinimum =
    Array.isArray(recette.ingredients)
        ? recette.ingredients
        : [];

let minimumPortions = 1;

ingredientsPourMinimum.forEach(ingredient => {

    const analyse = analyserIngredient(ingredient);

    if (!analyse || analyse.quantite <= 0) {
        return;
    }

    // Nombre minimum de personnes pour obtenir
    // au moins 1 unité de cet ingrédient
    const minimumIngredient = Math.ceil(
        portionsOriginales / analyse.quantite
    );

    minimumPortions = Math.max(
        minimumPortions,
        minimumIngredient
    );
});

// Ne pas dépasser le maximum autorisé
minimumPortions = Math.min(
    MAX_PORTIONS,
    minimumPortions
);

    nombrePortions.min = minimumPortions;

    nombrePortions.max = MAX_PORTIONS;

    nombrePortions.step = "1";

nombrePortions.value = Math.max(
    minimumPortions,
    portionsOriginales
);
    // ==========================================
// AFFICHER LE NOMBRE MINIMUM DE PERSONNES
// ==========================================

const messageMinimum = document.createElement("p");

messageMinimum.textContent =
    `🍽️ Cette recette nécessite un minimum de ${minimumPortions} personne${minimumPortions > 1 ? "s" : ""}.`;

messageMinimum.style.cssText = `
    margin-top: 12px;
    padding: 14px 18px;
    background: #eef7ee;
    border-left: 4px solid #4c956c;
    border-radius: 8px;
    color: #286140;
    font-size: 15px;
    font-weight: 600;
`;

   selecteurPortions.append(
    labelPortions,
    nombrePortions,
    messageMinimum
);
    // ==========================================
// AVERTISSEMENT SUR LES PROPORTIONS
// ==========================================

const avertissementProportions =
    document.createElement("p");

avertissementProportions.textContent =
    "⚠️ Attention : lorsque vous modifiez le nombre de personnes, " +
    "les quantités des ingrédients sont automatiquement recalculées " +
    "et arrondies à l'unité supérieure ou inférieure. " +
    "Ces arrondis peuvent modifier les proportions et influencer " +
    "le résultat final de la recette, notamment en pâtisserie.";

avertissementProportions.style.cssText = `
    margin-top: 12px;
    padding: 14px 18px;
    background: #fff8e8;
    border-left: 4px solid #b59458;
    border-radius: 8px;
    color: #795b2d;
    font-size: 14px;
    line-height: 1.6;
`;

    // ======================================
    // 16. CONTENU PRINCIPAL
    // ======================================

    const contenu = document.createElement("div");

    contenu.className = "recette-contenu";

    // ======================================
    // INGRÉDIENTS
    // ======================================

    const blocIngredients =
        document.createElement("section");

    blocIngredients.appendChild(
        creerElement("h2", "Ingrédients")
    );

    let listeIngredients = creerListe(
        recette.ingredients
    );

    blocIngredients.appendChild(
        listeIngredients
    );

    // ======================================
    // 17. BLOC DU COÛT MATIÈRE
    // ======================================

    const blocPrix = document.createElement("section");

    blocPrix.className = "bloc-prix";

    const titrePrix = creerElement(
        "h2",
        "💰 Coût estimé de la recette"
    );

    const mentionPrix = creerElement(
        "p",
        "ℹ️ Prix indicatifs : le coût peut varier selon les marques, les magasins et le lieu d'achat."
    );

    mentionPrix.style.fontSize = "13px";
    mentionPrix.style.color = "#777";
    mentionPrix.style.fontStyle = "italic";
    mentionPrix.style.marginTop = "10px";
    mentionPrix.style.marginBottom = "15px";

    const resultatPrix = creerElement(
        "p",
        "Chargement des prix..."
    );

    blocPrix.append(
        titrePrix,
        mentionPrix,
        resultatPrix
    );

    // ======================================
    // 18. CHARGER LES PRIX
    // ======================================

    const prixIngredients =
        await chargerPrixIngredients();

    // ======================================
    // 19. ACTUALISER LES INGRÉDIENTS
    // ======================================

    function actualiserIngredients() {

        const portions =
            Number(nombrePortions.value);

        if (
            !Number.isInteger(portions) ||
            portions < minimumPortions ||
            portions > MAX_PORTIONS
        ) {
            return;
        }

        const coefficient =
            portions / portionsOriginales;

        const ingredientsOriginaux =
            Array.isArray(recette.ingredients)
                ? recette.ingredients
                : [];

        const ingredientsAjustes =
            ingredientsOriginaux.map(ingredient =>
                ajusterIngredient(
                    ingredient,
                    coefficient
                )
            );

        const nouvelleListe =
            creerListe(ingredientsAjustes);

        listeIngredients.replaceWith(
            nouvelleListe
        );

        listeIngredients = nouvelleListe;
    }

    // ======================================
    // 20. ACTUALISER LE COÛT MATIÈRE
    // ======================================

    function actualiserPrix() {

        const portions =
            Number(nombrePortions.value);

        if (
            !Number.isInteger(portions) ||
            portions < minimumPortions ||
            portions > MAX_PORTIONS
        ) {
            return;
        }

        const coefficient =
            portions / portionsOriginales;

        let total = 0;
        let ingredientsConnus = 0;

        const ingredients =
            Array.isArray(recette.ingredients)
                ? recette.ingredients
                : [];

        ingredients.forEach(ingredient => {

            if (
                typeof window.calculerPrixIngredient
                !== "function"
            ) {
                return;
            }

            const prix =
                window.calculerPrixIngredient(
                    ingredient,
                    prixIngredients
                );

            if (
                prix !== null &&
                Number.isFinite(prix)
            ) {

                total += prix * coefficient;

                ingredientsConnus++;
            }
        });

        if (ingredientsConnus === 0) {

            resultatPrix.textContent =
                "Prix indisponible : aucun ingrédient reconnu.";

            return;
        }

        const euros = montant =>
            montant.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR"
            });

        resultatPrix.textContent =
            `Coût connu : ${euros(total)} | ` +
            `Par personne : ${euros(total / portions)} ` +
            `(${ingredientsConnus}/${ingredients.length} ingrédients calculés)`;
    }

    // ======================================
    // 21. CHANGEMENT DU NOMBRE DE PERSONNES
    // ======================================

    function actualiserPortions() {

        actualiserIngredients();

        actualiserPrix();
    }

    nombrePortions.addEventListener(
        "input",
        actualiserPortions
    );

    // Corriger une valeur trop petite ou trop grande
    nombrePortions.addEventListener("change", () => {

        let valeur = Number(nombrePortions.value);

        if (!Number.isFinite(valeur)) {
            valeur = portionsOriginales;
        }

        valeur = Math.round(valeur);

        valeur = Math.max(
            minimumPortions,
            Math.min(MAX_PORTIONS, valeur)
        );

        nombrePortions.value = valeur;

        actualiserPortions();
    });

    // Premier calcul
    actualiserPrix();

    // ======================================
    // 22. PRÉPARATION
    // ======================================

    const blocPreparation =
        document.createElement("section");

    blocPreparation.appendChild(
        creerElement("h2", "Préparation")
    );

const listeEtapes = creerListe(recette.etapes, true);

listeEtapes.querySelectorAll("li").forEach((etape, index) => {
    etape.id = `etape-${index + 1}`;
});

blocPreparation.appendChild(listeEtapes);

    // ======================================
    // 23. ASSEMBLAGE DE LA PAGE
    // ======================================

    contenu.append(
        blocIngredients,
        blocPreparation,
        blocPrix
    );

recetteDetail.append(
    photo,
    titre,
    description,
    infos,
    selecteurPortions,
    avertissementProportions,
    contenu
);
}

// ==========================================
// 24. DÉMARRAGE
// ==========================================

chargerRecette();

/* SEO automatique des recettes */

function seoRecette(recette) {
  const nom = String(recette.titre || "Recette").trim();
  const description = String(
    recette.description ||
    `Découvrez la recette de ${nom} sur Le Geste du Chef.`
  ).replace(/\s+/g, " ").slice(0, 160);

  const url = new URL("recette.html", location.origin);
  url.searchParams.set("id", recette.id);

  document.title = `${nom} : recette maison | Le Geste du Chef`;

  function meta(attribut, cle, valeur) {
    let element = document.head.querySelector(
      `meta[${attribut}="${cle}"]`
    );
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribut, cle);
      document.head.appendChild(element);
    }
    element.content = valeur;
  }

  meta("name", "description", description);
  meta("property", "og:title", document.title);
  meta("property", "og:description", description);
  meta("property", "og:url", url.href);

  if (recette.image_url) {
    meta("property", "og:image", recette.image_url);
  }

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url.href;

  const duree = valeur =>
    valeur == null || valeur === "" ||
    !Number.isFinite(Number(valeur)) || Number(valeur) < 0
      ? undefined
      : `PT${Math.round(Number(valeur))}M`;

  const etapeTexte = etape =>
    typeof etape === "string"
      ? etape
      : String(etape?.texte || etape?.description || etape?.etape || "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: nom,
    description,
    url: url.href,
    author: {
      "@type": "Organization",
      name: "Le Geste du Chef"
    },
    inLanguage: "fr-FR",
    recipeIngredient: Array.isArray(recette.ingredients)
      ? recette.ingredients.map(texteIngredient).filter(Boolean)
      : [],
recipeInstructions: Array.isArray(recette.etapes)
  ? recette.etapes
      .map(etapeTexte)
      .filter(Boolean)
      .map((text, index) => ({
        "@type": "HowToStep",
        name: `Étape ${index + 1}`,
        text: text,
        url: `${url.href}#etape-${index + 1}`
      }))
  : []
  };

  if (recette.image_url) schema.image = [recette.image_url];
  if (recette.categorie) schema.recipeCategory = recette.categorie;
  schema.recipeCuisine = "Française";

schema.keywords = [
    nom,
    `recette ${nom}`,
    `${nom} maison`,
    "cuisine maison"
].join(", ");
  if (Number(recette.portions) > 0) {
    schema.recipeYield = `${recette.portions} portions`;
  }

  const prep = duree(recette.temps_preparation);
  const cuisson = duree(recette.temps_cuisson);

  if (prep) schema.prepTime = prep;
  if (cuisson) schema.cookTime = cuisson;

  const temps = [
    recette.temps_preparation,
    recette.temps_cuisson,
    recette.temps_repos
  ];

  if (temps.some(v => v != null && v !== "") &&
      temps.every(v => v == null || v === "" ||
        (Number.isFinite(Number(v)) && Number(v) >= 0))) {
    schema.totalTime = duree(
      temps.reduce((total, v) => total + Number(v || 0), 0)
    );
  }

  document.getElementById("seo-recipe-json")?.remove();

  const script = document.createElement("script");
  script.id = "seo-recipe-json";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema).replace(/</g, "\\u003c");
  document.head.appendChild(script);
}
