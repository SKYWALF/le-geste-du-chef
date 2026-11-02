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
        /^(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l|œufs?|oeufs?|pièces?|unités?|gousses?)?\b?\s*(.*)$/i
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

function arrondirQuantite(quantite, unite, nom) {

    const uniteNormalisee = unite.toLowerCase();

    const nomNormalise = nom.toLowerCase();

    // Œufs : arrondi au quart d'œuf
    if (
        nomNormalise.includes("œuf") ||
        nomNormalise.includes("oeuf")
    ) {

        return Math.round(quantite * 4) / 4;
    }

    // Petites quantités : conserver une décimale
    if (
        nomNormalise.includes("levure") ||
        nomNormalise.includes("sel") ||
        nomNormalise.includes("agar") ||
        nomNormalise.includes("gélatine") ||
        nomNormalise.includes("gelatine")
    ) {

        return Math.round(quantite * 10) / 10;
    }

    // Grammes et millilitres : arrondir à l'entier
    if (
        uniteNormalisee === "g" ||
        uniteNormalisee === "ml"
    ) {

        return Math.round(quantite);
    }

    // Kilogrammes, litres et centilitres
    if (
        ["kg", "l", "cl"].includes(uniteNormalisee)
    ) {

        return Math.round(quantite * 100) / 100;
    }

    // Autres ingrédients
    return Math.round(quantite * 100) / 100;
}

// ==========================================
// 10. AFFICHER LES QUANTITÉS
// ==========================================

function formaterQuantite(quantite, nom) {

    const nomNormalise = nom.toLowerCase();

    // Fractions pour les œufs
    if (
        nomNormalise.includes("œuf") ||
        nomNormalise.includes("oeuf")
    ) {

        const entier = Math.floor(quantite);

        const fraction = Math.round(
            (quantite - entier) * 4
        );

        const fractions = {
            0: "",
            1: "¼",
            2: "½",
            3: "¾"
        };

        if (fraction === 4) {
            return String(entier + 1);
        }

        if (entier === 0) {
            return fractions[fraction] || "0";
        }

        if (fraction === 0) {
            return String(entier);
        }

        return entier + " " + fractions[fraction];
    }

    return quantite.toLocaleString("fr-FR", {
        maximumFractionDigits: 2
    });
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

    const portionsOriginales = Math.max(
        1,
        Math.round(Number(recette.portions) || 1)
    );

    [
        `🍽️ ${recette.categorie || "Cuisine"}`,
        `🔪 Préparation : ${preparation} min`,
        `🔥 Cuisson : ${cuisson} min`,
        `👥 ${portionsOriginales} portion(s)`
    ].forEach(info => {

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

    const minimumPortions =
        Math.min(MIN_PORTIONS, portionsOriginales);

    nombrePortions.min = minimumPortions;

    nombrePortions.max = MAX_PORTIONS;

    nombrePortions.step = "1";

    nombrePortions.value = portionsOriginales;

    selecteurPortions.append(
        labelPortions,
        nombrePortions
    );

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

    blocPreparation.appendChild(
        creerListe(recette.etapes, true)
    );

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
        contenu
    );
}

// ==========================================
// 24. DÉMARRAGE
// ==========================================

chargerRecette();