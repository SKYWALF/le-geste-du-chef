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
    .replace(/\s*\([^)]*\)/g, "")
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
window.calculerPrixIngredient = calculerPrixIngredient;