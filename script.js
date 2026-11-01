// ==========================================
// LE GESTE DU CHEF
// Fonctionnalités de la page d'accueil
// ==========================================

// 1. CONNEXION À SUPABASE

// Clé publique : ne jamais utiliser de clé secrète ici.
const PUBLIC_SUPABASE_URL = "https://xlnjmhkuhjqunwvkkykh.supabase.co";
const PUBLIC_SUPABASE_KEY = "sb_publishable_cxU-UsbHYO9S6RtVHEXbJw_-Y42Tryt";

const publicSupabase = window.supabase.createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_KEY
);

// 2. ÉLÉMENTS DE LA PAGE

const grid = document.getElementById("recipeGrid");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("search");
const resultInfo = document.getElementById("resultInfo");

let recipes = [];

// 3. CHARGEMENT DES RECETTES PUBLIÉES

async function chargerRecettes() {
    resultInfo.textContent = "Chargement des recettes...";

    const { data, error } = await publicSupabase
        .from("recettes")
        .select(`
    id,
    titre,
    categorie,
    description,
    ingredients,
    temps_preparation,
    temps_cuisson,
    image_url
`)
        .eq("publie", true)
        .order("date_creation", { ascending: false });

    if (error) {
        console.error("Erreur Supabase :", error.message);

        resultInfo.textContent =
            "Impossible de charger les recettes pour le moment.";

        return;
    }

    recipes = (data || []).map(recette => ({
        id: recette.id,
        title: recette.titre || "Recette sans titre",
        category: recette.categorie || "Autre",
        description: recette.description || "",
        ingredients: recette.ingredients || [],
        preparation: recette.temps_preparation || 0,
        cuisson: recette.temps_cuisson || 0,
        image: recette.image_url || "images/creme.jpg"
    }));

    showRecipes();
}

// 4. AFFICHAGE DES RECETTES

function showRecipes(query = "") {
    const recherche = query.trim().toLocaleLowerCase("fr");

    const items = recipes.filter(recette => {
        const texte = [
            recette.title,
            recette.category,
            recette.description
        ].join(" ").toLocaleLowerCase("fr");

        return texte.includes(recherche);
    });

    grid.replaceChildren();

    resultInfo.textContent =
        `${items.length} recette${items.length > 1 ? "s" : ""} disponible${items.length > 1 ? "s" : ""}`;

    if (items.length === 0) {
        const message = document.createElement("p");

        message.textContent = recherche
            ? "Aucune recette ne correspond à ta recherche."
            : "De nouvelles recettes arrivent bientôt.";

        grid.appendChild(message);
        return;
    }

    items.forEach(recette => {
        // Carte
        const carte = document.createElement("article");
        carte.className = "card";

        // Photo
        const image = document.createElement("img");
        image.src = recette.image;
        image.alt = recette.title;
        image.loading = "lazy";

        image.addEventListener("error", () => {
            if (!image.src.endsWith("/images/creme.jpg")) {
                image.src = "images/creme.jpg";
            }
        });

        // Contenu
        const contenu = document.createElement("div");
        contenu.className = "cardBody";

        // Catégorie
        const categorie = document.createElement("p");
        categorie.className = "muted";
        categorie.textContent = recette.category;

        // Titre
        const titre = document.createElement("h3");
        titre.textContent = recette.title;

        // Temps total
        const tempsTotal = recette.preparation + recette.cuisson;

        const temps = document.createElement("p");
        temps.textContent = `⏱️ ${tempsTotal} min`;

        // Description
        const description = document.createElement("p");
        description.textContent = recette.description;

        // Lien vers la fiche complète
        const lien = document.createElement("a");
        lien.className = "button";
        lien.href = `recette.html?id=${encodeURIComponent(recette.id)}`;
        lien.textContent = "Voir la recette →";

        // Assemblage
        contenu.append(
            categorie,
            titre,
            temps,
            description,
            lien
        );

        carte.append(image, contenu);
        grid.appendChild(carte);
    });
}

// 5. RECHERCHE

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    showRecipes(searchInput.value);

    document.getElementById("recettes").scrollIntoView({
        behavior: "smooth"
    });
});

// ==========================================
// LE FRIGO DU CHEF
// Recherche de recettes par ingrédients
// ==========================================

const ingredientsFrigo = document.getElementById("ingredientsFrigo");
const chercherRecettes = document.getElementById("chercherRecettes");
const resultatsFrigo = document.getElementById("resultatsFrigo");

// Simplifier les mots pour faciliter la comparaison
function normaliserIngredient(texte) {
    return String(texte)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Récupérer le nom d'un ingrédient
function nomIngredient(ingredient) {
    if (typeof ingredient === "string") {
        return ingredient;
    }

    if (ingredient && typeof ingredient === "object") {
        return ingredient.nom ||
               ingredient.description ||
               ingredient.texte ||
               "";
    }

    return "";
}

// Rechercher les recettes
function rechercherDansFrigo() {

    resultatsFrigo.replaceChildren();

    const ingredientsSaisis = ingredientsFrigo.value
        .split(",")
        .map(normaliserIngredient)
        .filter(Boolean);

    if (ingredientsSaisis.length === 0) {
        resultatsFrigo.textContent =
            "🥕 Indique au moins un ingrédient.";
        return;
    }

    const correspondances = recipes.map(recette => {

        const ingredientsRecette = recette.ingredients
            .map(nomIngredient)
            .map(normaliserIngredient)
            .filter(Boolean);

        const disponibles = ingredientsRecette.filter(ingredient =>
            ingredientsSaisis.some(saisi =>
                ingredient.includes(saisi)
            )
        );

        const manquants = ingredientsRecette.filter(ingredient =>
            !ingredientsSaisis.some(saisi =>
                ingredient.includes(saisi)
            )
        );

        return {
            recette,
            disponibles,
            manquants
        };

    }).filter(resultat => resultat.disponibles.length > 0);

    correspondances.sort((a, b) =>
        b.disponibles.length - a.disponibles.length
    );

    if (correspondances.length === 0) {
        resultatsFrigo.textContent =
            "Aucune recette trouvée avec ces ingrédients.";
        return;
    }

    correspondances.forEach(resultat => {

        const carte = document.createElement("article");
        carte.className = "frigo-carte";

        const titre = document.createElement("h3");
        titre.textContent = resultat.recette.title;

        const disponibles = document.createElement("p");
        disponibles.textContent =
            `✅ ${resultat.disponibles.length} ingrédient(s) disponible(s)`;

        const manquants = document.createElement("p");

        manquants.textContent =
            resultat.manquants.length === 0
                ? "🎉 Tu as tous les ingrédients !"
                : `🛒 Il manque : ${resultat.manquants.join(", ")}`;

        const lien = document.createElement("a");
        lien.className = "button";
        lien.href =
            `recette.html?id=${encodeURIComponent(resultat.recette.id)}`;
        lien.textContent = "Voir la recette →";

        carte.append(titre, disponibles, manquants, lien);
        resultatsFrigo.appendChild(carte);

    });
}

// Activer le bouton
chercherRecettes.addEventListener("click", rechercherDansFrigo);

// Activer la touche Entrée
ingredientsFrigo.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        rechercherDansFrigo();
    }
});

// 8. ANNÉE AUTOMATIQUE

document.getElementById("year").textContent =
    new Date().getFullYear();

// 9. INITIALISATION

chargerRecettes();