// Connexion publique à Supabase
const PUBLIC_SUPABASE_URL = "https://xlnjmhkuhjqunwvkkykh.supabase.co";
const PUBLIC_SUPABASE_KEY = "sb_publishable_cxU-UsbHYO9S6RtVHEXbJw_-Y42Tryt";

const publicSupabase = window.supabase.createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_KEY
);
// Recettes récupérées depuis Supabase
let recipes = [];

async function chargerRecettes() {
    const { data, error } = await publicSupabase
        .from("recettes")
        .select("id, titre, categorie, description, temps_preparation, temps_cuisson, image_url")
        .eq("publie", true)
        .order("date_creation", { ascending: false });

    if (error) {
        console.error("Erreur Supabase :", error.message);
        return;
    }

    recipes = (data || []).map(recette => ({
        id: recette.id,
        title: recette.titre,
        category: recette.categorie,
        time: `${(recette.temps_preparation || 0) + (recette.temps_cuisson || 0)} min`,
        image: recette.image_url || "",
        description: recette.description || ""
    }));

    showRecipes();
}
const grid=document.querySelector("#recipeGrid");
function showRecipes(query = "") {
    const recherche = query.toLocaleLowerCase("fr").trim();

    const items = recipes.filter(recette =>
        (recette.title + " " + recette.category)
            .toLocaleLowerCase("fr")
            .includes(recherche)
    );

    grid.replaceChildren();

    if (items.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Aucune recette disponible pour le moment.";
        grid.appendChild(message);
        return;
    }

    items.forEach(recette => {
        const carte = document.createElement("article");
        carte.className = "card";

        const image = document.createElement("img");
        image.src = recette.image || "images/creme.jpg";
        image.alt = recette.title;
        image.loading = "lazy";

        const contenu = document.createElement("div");
        contenu.className = "cardBody";

        const categorie = document.createElement("p");
        categorie.textContent = recette.category;

        const titre = document.createElement("h3");
        titre.textContent = recette.title;

        const temps = document.createElement("p");
        temps.textContent = "⏱️ " + recette.time;

        const description = document.createElement("p");
        description.textContent = recette.description;

        contenu.append(categorie, titre, temps, description);
        carte.append(image, contenu);
        grid.appendChild(carte);
    });
}document.querySelector("#searchForm").addEventListener("submit",e=>{e.preventDefault();showRecipes(document.querySelector("#search").value.trim());document.querySelector("#recettes").scrollIntoView({behavior:"smooth"})});
function calculate(){const q=Number(document.querySelector("#quantity").value),a=Number(document.querySelector("#fromPortions").value),b=Number(document.querySelector("#toPortions").value);document.querySelector("#portionResult").textContent=q>=0&&a>0&&b>0?`Quantité adaptée : ${new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(q*b/a)} g`:"Entre des valeurs valides."}
for(const el of document.querySelectorAll(".tools input"))el.addEventListener("input",calculate);
document.querySelector("#year").textContent = new Date().getFullYear();
chargerRecettes();