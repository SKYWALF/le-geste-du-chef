// ==========================================
// LE GESTE DU CHEF
// CALCUL INTELLIGENT DES PRIX
// ==========================================

// Normaliser les noms des ingrédients
function normaliserNomPrix(nom) {
    return String(nom || "")
        .toLowerCase()
        .replace(/œ/g, "oe")
        .replace(/æ/g, "ae")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, "'")
        .replace(/[^a-z0-9\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Supprimer les pluriels simples
function simplifierNomPrix(nom) {
    return normaliserNomPrix(nom)
        .split(" ")
        .map(mot => {
            if (mot === "oeufs") return "oeuf";
            if (mot.length > 3 && mot.endsWith("s")) {
                return mot.slice(0, -1);
            }
            return mot;
        })
        .join(" ");
}

// ==========================================
// CORRESPONDANCES DES INGRÉDIENTS
// ==========================================

const correspondancesIngredients = {
    "beurre": ["beurre doux"],
    "farine": ["farine de blé", "farine de ble"],
    "sucre": ["sucre blanc", "sucre en poudre"],
    "oeuf": ["oeufs", "œuf", "œufs"],
    "lait": ["lait entier", "lait demi-écrémé"],
    "chocolat noir": ["chocolat noir pâtissier"],
    "creme liquide": ["crème liquide entière"],
    "sel": ["sel fin"]
};

// ==========================================
// INGRÉDIENTS GRATUITS
// ==========================================

const ingredientsGratuits = [
    "eau",
    "eau du robinet"
];

// ==========================================
// CONVERSION DES UNITÉS
// ==========================================

const conversionsPrix = {
    mg: { type: "masse", facteur: 0.000001 },
    g: { type: "masse", facteur: 0.001 },
    kg: { type: "masse", facteur: 1 },

    ml: { type: "volume", facteur: 0.001 },
    cl: { type: "volume", facteur: 0.01 },
    l: { type: "volume", facteur: 1 },

    pièce: { type: "unite", facteur: 1 },
    pièces: { type: "unite", facteur: 1 },
    piece: { type: "unite", facteur: 1 },
    pieces: { type: "unite", facteur: 1 },
    unité: { type: "unite", facteur: 1 },
    unités: { type: "unite", facteur: 1 },
    unite: { type: "unite", facteur: 1 },
    unites: { type: "unite", facteur: 1 },

    gousse: { type: "unite", facteur: 1 },
    gousses: { type: "unite", facteur: 1 }
};

// ==========================================
// TROUVER UN PRIX
// ==========================================

function trouverPrixIngredient(nom, prixIngredients) {

    const recherche = simplifierNomPrix(nom);

    // 1. Correspondance exacte prioritaire
    let prix = prixIngredients.find(p =>
        simplifierNomPrix(p.ingredient) === recherche
    );

    if (prix) return prix;

    // 2. Correspondances connues
    const nomsAlternatifs =
        correspondancesIngredients[recherche] || [];

    for (const alternatif of nomsAlternatifs) {

        prix = prixIngredients.find(p =>
            simplifierNomPrix(p.ingredient) ===
            simplifierNomPrix(alternatif)
        );

        if (prix) return prix;
    }

    return null;
}

// ==========================================
// CALCUL DU PRIX
// ==========================================

function calculerPrixIngredient(ingredient, prixIngredients) {

    let texte = "";

    if (typeof ingredient === "string") {
        texte = ingredient;
    } else if (ingredient && typeof ingredient === "object") {
        texte = [
            ingredient.quantite,
            ingredient.unite,
            ingredient.nom
        ].filter(v => v != null).join(" ");
    }

    texte = texte
        .trim()
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/œ/g, "oe")
        .replace(/’/g, "'");

    // ======================================
    // CAS DES ŒUFS, JAUNES ET BLANCS
    // ======================================

    const oeuf = texte.match(
        /^(\d+(?:[.,]\d+)?)\s+(?:(?:jaunes?|blancs?)\s+d[' ]?)?oeufs?$/i
    );

    if (oeuf) {

        const quantite = Number(
            oeuf[1].replace(",", ".")
        );

        const prixOeuf = trouverPrixIngredient(
            "oeuf",
            prixIngredients
        );

        if (prixOeuf) {

            const unitePrix = normaliserNomPrix(prixOeuf.unite);

            if (
                ["unite", "unites", "piece", "pieces"]
                    .includes(unitePrix)
            ) {
                return quantite *
                    Number(prixOeuf.prix_unitaire);
            }
        }
    }

    // ======================================
    // EXTRAIRE QUANTITÉ, UNITÉ ET NOM
    // ======================================

    const resultat = texte.match(
        /^(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l|pièces?|unités?|gousses?)\s+(?:de\s+|du\s+|d['’])?(.*)$/i
    );

    if (!resultat) return null;

    const quantite = Number(
        resultat[1].replace(",", ".")
    );

    const unite = normaliserNomPrix(resultat[2]);

    const nom = normaliserNomPrix(
        resultat[3]
            .replace(/^(de\s+|du\s+|d['’])/, "")
            .replace(/\s+pour\s+.*$/i, "")
    );

    // ======================================
    // EAU GRATUITE
    // ======================================

    if (ingredientsGratuits.includes(nom)) {
        return 0;
    }

    // ======================================
    // RECHERCHER LE PRIX
    // ======================================

    const prix = trouverPrixIngredient(
        nom,
        prixIngredients
    );

    if (!prix) return null;

    const unitePrix = normaliserNomPrix(prix.unite);

    const uniteRecette = conversionsPrix[unite];
    const uniteBase = conversionsPrix[unitePrix];

    if (!uniteRecette || !uniteBase) {
        return null;
    }

    // Empêcher les conversions incompatibles
    if (uniteRecette.type !== uniteBase.type) {
        return null;
    }

    const prixUnitaire = Number(prix.prix_unitaire);

    if (!Number.isFinite(prixUnitaire)) {
        return null;
    }

    const quantiteConvertie =
        (quantite * uniteRecette.facteur) /
        uniteBase.facteur;

    return quantiteConvertie * prixUnitaire;
}

// Rendre la fonction accessible à admin.js
window.calculerPrixIngredient = calculerPrixIngredient;