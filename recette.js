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

    // CONTENU PRINCIPAL

    const contenu = document.createElement("div");
    contenu.className = "recette-contenu";

    // INGRÉDIENTS

    const blocIngredients = document.createElement("section");

    blocIngredients.appendChild(
        creerElement("h2", "Ingrédients")
    );

    blocIngredients.appendChild(
        creerListe(recette.ingredients)
    );

    // PRÉPARATION

    const blocPreparation = document.createElement("section");

    blocPreparation.appendChild(
        creerElement("h2", "Préparation")
    );

    blocPreparation.appendChild(
        creerListe(recette.etapes, true)
    );

    // ASSEMBLAGE

    contenu.append(blocIngredients, blocPreparation);

    recetteDetail.append(
        photo,
        titre,
        description,
        infos,
        contenu
    );
}

// 8. DÉMARRAGE

chargerRecette();