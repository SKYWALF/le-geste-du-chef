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

// 6. CALCULATEUR DE PORTIONS

function calculate() {
    const quantite = Number(
        document.getElementById("quantity").value
    );

    const portionsInitiales = Number(
        document.getElementById("fromPortions").value
    );

    const portionsSouhaitees = Number(
        document.getElementById("toPortions").value
    );

    const resultat = document.getElementById("portionResult");

    if (
        !Number.isFinite(quantite) ||
        quantite < 0 ||
        portionsInitiales <= 0 ||
        portionsSouhaitees <= 0
    ) {
        resultat.textContent = "Entre des valeurs valides.";
        return;
    }

    const quantiteAdaptee =
        (quantite * portionsSouhaitees) / portionsInitiales;

    resultat.textContent =
        "Quantité adaptée : " +
        new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: 1
        }).format(quantiteAdaptee) +
        " g";
}

// 7. ÉVÉNEMENTS DU CALCULATEUR

document.querySelectorAll(".tools input").forEach(input => {
    input.addEventListener("input", calculate);
});

// 8. ANNÉE AUTOMATIQUE

document.getElementById("year").textContent =
    new Date().getFullYear();

// 9. INITIALISATION

calculate();
chargerRecettes();