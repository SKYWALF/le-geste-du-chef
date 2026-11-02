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

    if (document.body.dataset.page === "catalogue") {
        const q = new URLSearchParams(location.search).get("q") || "";
        if (searchInput) searchInput.value = q;
        showRecipes(q);
    } else {
        showRecipes();
    }
}

// 4. AFFICHAGE DES RECETTES

function showRecipes(query = "") {
    const recherche = query.trim().toLocaleLowerCase("fr");

    let items = recipes.filter(recette => {
        const texte = [
            recette.title,
            recette.category,
            recette.description
        ].join(" ").toLocaleLowerCase("fr");

        return texte.includes(recherche);
    });

    if (document.body.dataset.page !== "catalogue") {
        items = [...items].sort(() => Math.random() - 0.5).slice(0, 3);
    }

    grid.replaceChildren();

    resultInfo.textContent = document.body.dataset.page === "catalogue"
        ? `${items.length} recette${items.length > 1 ? "s" : ""} disponible${items.length > 1 ? "s" : ""}`
        : `${recipes.length} recettes disponibles · 3 à découvrir`;

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

    if (document.body.dataset.page === "catalogue") {
        showRecipes(searchInput.value);
    } else {
        window.location.href = `recettes.html?q=${encodeURIComponent(searchInput.value.trim())}`;
    }
});

// ==========================================
// LE FRIGO DU CHEF
// Recherche de recettes par ingrédients
// ==========================================

const ingredientsFrigo = document.getElementById("ingredientsFrigo");
const chercherRecettes = document.getElementById("chercherRecettes");
const resultatsFrigo = document.getElementById("resultatsFrigo");

// Simplifier les mots pour faciliter la comparaison
// ==========================================
// RECONNAISSANCE INTELLIGENTE DES INGRÉDIENTS
// ==========================================

function normaliserIngredient(texte) {

    let resultat = String(texte)
        .toLowerCase()
        .replace(/œ/g, "oe")
        .replace(/æ/g, "ae")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, " ")
        .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
        .replace(/\b(kg|g|mg|l|cl|ml)\b/g, " ")
        .replace(/\b(de|du|des|d|la|le|les)\b/g, " ")
        .replace(/[^\p{L}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Supprimer les pluriels simples
    resultat = resultat
        .split(" ")
        .map(mot => {
            if (mot.length > 3 && mot.endsWith("s")) {
                return mot.slice(0, -1);
            }

            return mot;
        })
        .join(" ");

    return resultat;
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
// Comparer deux ingrédients plus précisément
function ingredientsCorrespondent(ingredientRecette, ingredientFrigo) {

    const recette = normaliserIngredient(ingredientRecette);
    const frigo = normaliserIngredient(ingredientFrigo);

    if (!recette || !frigo) {
        return false;
    }

    // Correspondance exacte
    if (recette === frigo) {
        return true;
    }

    // Comparer les mots complets
    const motsRecette = recette.split(" ");
    const motsFrigo = frigo.split(" ");

    return motsFrigo.every(mot => motsRecette.includes(mot)) &&
           motsRecette.length === motsFrigo.length;
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
        ingredientsCorrespondent(ingredient, saisi)
    )
);

const manquants = ingredientsRecette.filter(ingredient =>
    !ingredientsSaisis.some(saisi =>
        ingredientsCorrespondent(ingredient, saisi)
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
if (chercherRecettes && ingredientsFrigo && resultatsFrigo) {
chercherRecettes.addEventListener("click", rechercherDansFrigo);

// Activer la touche Entrée
ingredientsFrigo.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        rechercherDansFrigo();
    }
});
}

// 8. ANNÉE AUTOMATIQUE

if (document.getElementById("year")) document.getElementById("year").textContent =
    new Date().getFullYear();

// 9. INITIALISATION

chargerRecettes();
// Afficher le bouton Administration uniquement aux administrateurs
async function verifierBoutonAdministration() {
    const bouton = document.getElementById("boutonAdministration");

    if (!bouton) return;

    bouton.style.display = "none";

    // Utiliser le client Supabase déjà configuré sur le site
if (typeof publicSupabase === "undefined") return;

const { data: { user }, error: erreurConnexion } =
    await publicSupabase.auth.getUser();

    if (erreurConnexion || !user) return;
const { data, error } = await publicSupabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

    if (error) {
        console.error("Vérification administrateur :", error.message);
        return;
    }

    if (data) {
        bouton.style.display = "inline-block";
    }
}

document.addEventListener("DOMContentLoaded", verifierBoutonAdministration);