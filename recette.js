// ==========================================
// LE GESTE DU CHEF
// Affichage d'une fiche de recette complète
// ==========================================

// 1. CONNEXION À SUPABASE

const SUPABASE_URL = "https://xlnjmhkuhjqunwvkkykh.supabase.co";

const SUPABASE_KEY = "sb_publishable_cxU-UsbHYO9S6RtVHEXbJw_-Y42Tryt";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// 2. ÉLÉMENTS DE LA PAGE

const recetteDetail = document.getElementById("recetteDetail");

document.getElementById("year").textContent =
    new Date().getFullYear();

// 3. RÉCUPÉRER L'IDENTIFIANT DE LA RECETTE

const params = new URLSearchParams(window.location.search);
const recetteId = params.get("id");

// 4. CRÉER UN ÉLÉMENT HTML

function creerElement(balise, texte, classe = "") {
    const element = document.createElement(balise);

    element.textContent = texte;

    if (classe) {
        element.className = classe;
    }

    return element;
}

// 5. AFFICHER LES INGRÉDIENTS OU LES ÉTAPES

function creerListe(elements, ordonnee = false) {
    const liste = document.createElement(
        ordonnee ? "ol" : "ul"
    );

    if (!Array.isArray(elements) || elements.length === 0) {
        liste.appendChild(
            creerElement("li", "Informations à venir.")
        );

        return liste;
    }

    elements.forEach(element => {
        let texte = "";

        if (typeof element === "string") {
            texte = element;
        } else if (element && typeof element === "object") {
            texte = [
                element.quantite,
                element.unite,
                element.nom
            ].filter(valeur => valeur !== undefined && valeur !== null)
             .join(" ");

            if (!texte.trim()) {
                texte = element.description || element.texte || "";
            }
        }

        if (texte.trim()) {
            liste.appendChild(creerElement("li", texte));
        }
    });

    return liste;
}

// 6. CHARGER LA RECETTE DEPUIS SUPABASE

async function chargerRecette() {

    if (!recetteId) {
        recetteDetail.textContent = "Aucune recette sélectionnée.";
        return;
    }

    const { data: recette, error } = await supabaseClient
        .from("recettes")
        .select(`
            id,
            titre,
            description,
            categorie,
            temps_preparation,
            temps_cuisson,
            portions,
            ingredients,
            etapes,
            image_url
        `)
        .eq("id", recetteId)
        .eq("publie", true)
        .maybeSingle();

    if (error) {
        console.error("Erreur Supabase :", error.message);

        recetteDetail.textContent =
            "Impossible de charger cette recette.";

        return;
    }

    if (!recette) {
        recetteDetail.textContent =
            "Cette recette est introuvable ou n'est pas publiée.";

        return;
    }

    // 7. PRÉPARER LA PAGE

    recetteDetail.replaceChildren();

    document.title =
        `${recette.titre} | Le Geste du Chef`;

    // PHOTO

    const photo = document.createElement("img");

    photo.className = "recette-photo";
    photo.src = recette.image_url || "images/creme.jpg";
    photo.alt = recette.titre || "Photo de la recette";

    photo.addEventListener("error", () => {
        if (!photo.src.endsWith("/images/creme.jpg")) {
            photo.src = "images/creme.jpg";
        }
    });

    // TITRE

    const titre = creerElement(
        "h1",
        recette.titre || "Recette",
        "recette-titre"
    );

    // DESCRIPTION

    const description = creerElement(
        "p",
        recette.description || ""
    );

    // INFORMATIONS

    const infos = document.createElement("div");
    infos.className = "recette-infos";

    const preparation = Number(recette.temps_preparation) || 0;
    const cuisson = Number(recette.temps_cuisson) || 0;

    [
        `🍽️ ${recette.categorie || "Cuisine"}`,
        `🔪 Préparation : ${preparation} min`,
        `🔥 Cuisson : ${cuisson} min`,
        `👥 ${recette.portions || 1} portion(s)`
    ].forEach(info => {
        infos.appendChild(creerElement("span", info));
    });
// ==========================================
// SÉLECTEUR DU NOMBRE DE PORTIONS
// ==========================================

const selecteurPortions = document.createElement("div");
selecteurPortions.className = "selecteur-portions";

const labelPortions = document.createElement("label");
labelPortions.textContent = "🍽️ Nombre de personnes : ";
labelPortions.htmlFor = "nombrePortions";

const nombrePortions = document.createElement("input");
nombrePortions.type = "number";
nombrePortions.id = "nombrePortions";
nombrePortions.min = "1";
nombrePortions.max = "100";
nombrePortions.value = recette.portions || 1;

selecteurPortions.append(labelPortions, nombrePortions);
    // CONTENU PRINCIPAL

    const contenu = document.createElement("div");
    contenu.className = "recette-contenu";

    // INGRÉDIENTS

    const blocIngredients = document.createElement("section");

    blocIngredients.appendChild(
        creerElement("h2", "Ingrédients")
    );

   let listeIngredients = creerListe(recette.ingredients);

blocIngredients.appendChild(listeIngredients);
// ==========================================
// CALCUL AUTOMATIQUE DES PORTIONS
// ==========================================

const portionsOriginales = Number(recette.portions) || 1;

nombrePortions.addEventListener("input", () => {

    const nouvellesPortions = Number(nombrePortions.value);

    if (!Number.isInteger(nouvellesPortions) ||
        nouvellesPortions < 1 ||
        nouvellesPortions > 100) {
        return;
    }

    const coefficient = nouvellesPortions / portionsOriginales;

    const ingredientsAjustes = (recette.ingredients || []).map(ingredient => {

        // Ingrédient enregistré sous forme de texte
        if (typeof ingredient === "string") {

            return ingredient.replace(
                /^(\d+(?:[.,]\d+)?)(?=\s|$)/,
                (nombre) => {
                    const quantite = Number(nombre.replace(",", "."));
                    const resultat = Math.round(quantite * coefficient * 100) / 100;

                    return String(resultat).replace(".", ",");
                }
            );
        }

        // Ingrédient enregistré avec une quantité séparée
        if (ingredient && typeof ingredient === "object") {

            const quantite = Number(
                String(ingredient.quantite).replace(",", ".")
            );

            if (Number.isFinite(quantite)) {
                return {
                    ...ingredient,
                    quantite: Math.round(quantite * coefficient * 100) / 100
                };
            }
        }

        return ingredient;
    });

    listeIngredients.replaceWith(
        creerListe(ingredientsAjustes)
    );

    // Garder la référence vers la nouvelle liste
    listeIngredients = blocIngredients.querySelector("ul");
});
// ==========================================
// AFFICHAGE DU COÛT DE LA RECETTE
// ==========================================

const blocPrix = document.createElement("section");
blocPrix.className = "bloc-prix";

const titrePrix = creerElement(
    "h2",
    "💰 Coût estimé de la recette"
);

const resultatPrix = creerElement(
    "p",
    "Chargement des prix..."
);

blocPrix.append(titrePrix, resultatPrix);

// Charger les prix depuis Supabase
const prixIngredients = await chargerPrixIngredients();

function actualiserPrix() {

    const portions = Number(nombrePortions.value);

    if (!Number.isInteger(portions) || portions < 1 || portions > 100) {
        return;
    }

    const coefficient = portions / portionsOriginales;

    let total = 0;
    let ingredientsConnus = 0;

    const ingredients = Array.isArray(recette.ingredients)
        ? recette.ingredients
        : [];

    ingredients.forEach(ingredient => {

        const prix = calculerPrixIngredient(
            ingredient,
            prixIngredients
        );

        if (prix !== null && Number.isFinite(prix)) {
            total += prix * coefficient;
            ingredientsConnus++;
        }
    });

    if (ingredientsConnus === 0) {
        resultatPrix.textContent =
            "Prix indisponible : aucun ingrédient reconnu.";
        return;
    }

    const euros = montant => montant.toLocaleString(
        "fr-FR",
        {
            style: "currency",
            currency: "EUR"
        }
    );

    resultatPrix.textContent =
        `Coût connu : ${euros(total)} | ` +
        `Par personne : ${euros(total / portions)} ` +
        `(${ingredientsConnus}/${ingredients.length} ingrédients calculés)`;
}

// Actualiser lorsque le nombre de personnes change
nombrePortions.addEventListener("input", actualiserPrix);

// Premier calcul
actualiserPrix();
    // PRÉPARATION

    const blocPreparation = document.createElement("section");

    blocPreparation.appendChild(
        creerElement("h2", "Préparation")
    );

    blocPreparation.appendChild(
        creerListe(recette.etapes, true)
    );

    // ASSEMBLAGE

  contenu.append(blocIngredients, blocPrix, blocPreparation);

    recetteDetail.append(
        photo,
        titre,
        description,
      infos,
    selecteurPortions,
    contenu
    );
}
// ==========================================
// RÉCUPÉRATION DES PRIX DES INGRÉDIENTS
// ==========================================

async function chargerPrixIngredients() {

    const { data, error } = await supabaseClient
        .from("prix_ingredients")
        .select("ingredient, prix_unitaire, unite, source");

    if (error) {
        console.error("Erreur de récupération des prix :", error.message);
        return [];
    }

    return data || [];

}
// ==========================================
// CALCUL DU PRIX D'UN INGRÉDIENT
// ==========================================

// ==========================================
// CALCUL DU PRIX D'UN INGRÉDIENT
// ==========================================

function calculerPrixIngredient(ingredient, prixIngredients) {
        // ==========================================
    // RECONNAÎTRE LES ŒUFS ET LES JAUNES D'ŒUFS
    // ==========================================

    let nomIngredient = "";

    if (typeof ingredient === "string") {
        nomIngredient = ingredient;
    } else if (ingredient && typeof ingredient === "object") {
        nomIngredient = [
            ingredient.quantite,
            ingredient.unite,
            ingredient.nom
        ].filter(valeur => valeur != null).join(" ");
    }

    const texteOeuf = nomIngredient
        .toLowerCase()
        .trim()
        .replace(/œ/g, "oe")
        .replace(/’/g, "'");

    const correspondanceOeuf = texteOeuf.match(
        /^(\d+(?:[.,]\d+)?)\s+(?:(?:jaunes?|blancs?)\s+d[' ]?)?oeufs?$/
    );

    if (correspondanceOeuf) {

        const quantite = Number(
            correspondanceOeuf[1].replace(",", ".")
        );

        const prixOeuf = prixIngredients.find(
            p => p.ingredient.toLowerCase().trim() === "oeuf"
        );

        if (prixOeuf && prixOeuf.unite.toLowerCase().trim() === "unité") {
            return quantite * Number(prixOeuf.prix_unitaire);
        }
    }

    let texte = "";

    if (typeof ingredient === "string") {
        texte = ingredient;
    } else if (ingredient && typeof ingredient === "object") {
        texte = [
            ingredient.quantite,
            ingredient.unite,
            ingredient.nom
        ].filter(valeur => valeur != null).join(" ");
    }

    // Exemple : "80 g de sucre"
    const resultat = texte.trim().match(
        /^(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l|pièces?|unités?|gousses?)\s+(?:de\s+|du\s+|d['’])?(.*)$/i
    );

    if (!resultat) {
        return null;
    }

    const quantite = Number(resultat[1].replace(",", "."));
    const unite = resultat[2].toLowerCase();

const nom = resultat[3]
    .toLowerCase()
    .trim()
    .replace(/^(de\s+|du\s+|d['’])/, "")
    .replace(/\s+pour\s+.*$/, "")
    .trim();

  // Rechercher le prix correspondant à l'ingrédient
const prix = prixIngredients.find(p =>
    p.ingredient.toLowerCase().trim() === nom
);
// Cas particulier : une gousse de vanille
if (unite === "gousse" || unite === "gousses") {

    if (nom === "vanille") {

        const prixVanille = prixIngredients.find(p =>
            p.ingredient.toLowerCase().trim() === "vanille"
        );

        if (prixVanille) {
            return quantite * Number(prixVanille.prix_unitaire);
        }
    }
}
    if (!prix) {
        return null;
    }

    const unitePrix = prix.unite.toLowerCase().trim();

    // Convertir les unités en unités de référence
    const conversions = {
        mg: { type: "masse", facteur: 0.000001 },
        g: { type: "masse", facteur: 0.001 },
        kg: { type: "masse", facteur: 1 },

        ml: { type: "volume", facteur: 0.001 },
        cl: { type: "volume", facteur: 0.01 },
        l: { type: "volume", facteur: 1 },

        pièce: { type: "unite", facteur: 1 },
        pièces: { type: "unite", facteur: 1 },
        unité: { type: "unite", facteur: 1 },
        unités: { type: "unite", facteur: 1 },
        gousse: { type: "unite", facteur: 1 },
        gousses: { type: "unite", facteur: 1 }
    };

    const uniteRecette = conversions[unite];
    const uniteBase = conversions[unitePrix];

    if (!uniteRecette || !uniteBase) {
        return null;
    }

    // Empêcher de mélanger grammes, litres et unités
    if (uniteRecette.type !== uniteBase.type) {
        return null;
    }

    const quantiteConvertie =
        (quantite * uniteRecette.facteur) / uniteBase.facteur;

    return quantiteConvertie * Number(prix.prix_unitaire);
}
// 8. DÉMARRAGE

chargerRecette();