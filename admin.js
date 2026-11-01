// Connexion à Supabase
const SUPABASE_URL = "https://xlnjmhkuhjqunwvkkykh.supabase.co";
const SUPABASE_KEY = "sb_publishable_cxU-UsbHYO9S6RtVHEXbJw_-Y42Tryt";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    message.textContent = "Connexion en cours...";

    // Connexion avec Supabase Auth
    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        message.textContent = "Connexion impossible : " + error.message;
        return;
    }

    // Vérifier les droits administrateur
    const { data: admin, error: adminError } =
        await supabaseClient
            .from("admins")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

    if (adminError || !admin) {
        await supabaseClient.auth.signOut();
        message.textContent = "Accès réservé à l'administrateur.";
        return;
    }

    // Connexion réussie : afficher le tableau de bord
message.textContent = "";

document.querySelector(".container").style.display = "none";
document.getElementById("dashboard").style.display = "block";
await afficherRecettes();
});
// Déconnexion administrateur
document.getElementById("deconnexion").addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Erreur lors de la déconnexion : " + error.message);
        return;
    }

    document.getElementById("dashboard").style.display = "none";
    document.querySelector(".container").style.display = "block";

    document.getElementById("loginForm").reset();

    message.textContent = "Vous êtes déconnecté.";
});
// Afficher ou masquer le formulaire de recette
document.getElementById("ajouterRecette").addEventListener("click", () => {
    const formulaire = document.getElementById("formulaireRecette");

    formulaire.style.display =
        formulaire.style.display === "none" ? "block" : "none";
});

// Enregistrer une recette dans Supabase
document.getElementById("recetteForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const messageRecette = document.getElementById("messageRecette");
    const bouton = event.submitter;

    bouton.disabled = true;
    messageRecette.textContent = "Enregistrement en cours...";

    // Transformer les lignes en listes
    const lireLignes = (id) => {
        return document.getElementById(id).value
            .split("\n")
            .map(ligne => ligne.trim())
            .filter(ligne => ligne.length > 0);
    };

    const recette = {
        titre: document.getElementById("titreRecette").value.trim(),
        categorie: document.getElementById("categorieRecette").value,
        description: document.getElementById("descriptionRecette").value.trim(),
        temps_preparation: Number(document.getElementById("preparationRecette").value),
        temps_cuisson: Number(document.getElementById("cuissonRecette").value),
        portions: Number(document.getElementById("portionsRecette").value),
        ingredients: lireLignes("ingredientsRecette"),
        etapes: lireLignes("etapesRecette"),
        image_url: document.getElementById("imageRecette").value.trim() || null,
        publie: document.getElementById("publieRecette").checked
    };

    const { error } = await supabaseClient
        .from("recettes")
        .insert([recette]);

    bouton.disabled = false;

    if (error) {
        messageRecette.textContent =
            "Erreur lors de l'enregistrement : " + error.message;
        return;
    }

    messageRecette.textContent = "✅ Recette enregistrée avec succès !";
    await afficherRecettes();

    document.getElementById("recetteForm").reset();
});
// Afficher les recettes enregistrées dans Supabase
async function afficherRecettes() {
    const liste = document.getElementById("listeRecettes");

    liste.textContent = "Chargement des recettes...";

    const { data: recettes, error } = await supabaseClient
        .from("recettes")
        .select("id, titre, categorie, publie, date_creation")
        .order("date_creation", { ascending: false });

    if (error) {
        liste.textContent = "Erreur : " + error.message;
        return;
    }

    liste.replaceChildren();

    if (!recettes || recettes.length === 0) {
        liste.textContent = "Aucune recette enregistrée.";
        return;
    }

    recettes.forEach(recette => {
        const carte = document.createElement("div");

        carte.style.cssText = `
            padding: 20px;
            margin: 15px 0;
            background: #f7f5f0;
            border-radius: 8px;
            border-left: 4px solid #b59458;
        `;

        const titre = document.createElement("h3");
        titre.textContent = recette.titre;

        const categorie = document.createElement("p");
        categorie.textContent = "Catégorie : " + recette.categorie;

        const statut = document.createElement("p");
        statut.textContent = recette.publie
            ? "🟢 Publiée"
            : "🟠 Brouillon";

        carte.append(titre, categorie, statut);
        liste.appendChild(carte);
    });
}