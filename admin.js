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

    // Quitter le mode modification
    recetteEnModification = null;
    // Réinitialiser les photos
anciennePhotoRecette = null;
document.getElementById("fichierPhoto").value = "";
    document.getElementById("enregistrerRecette").textContent =
    "➕ Enregistrer la recette";

    // Vider le formulaire
    document.getElementById("recetteForm").reset();
    afficherApercuPhoto("");

    // Changer le titre
    document.getElementById("titreFormulaire").textContent =
        "➕ Nouvelle recette";

    // Effacer les anciens messages
    document.getElementById("messageRecette").textContent = "";

    // Afficher le formulaire
    const formulaire = document.getElementById("formulaireRecette");
    formulaire.style.display = "block";

    formulaire.scrollIntoView({
        behavior: "smooth"
    });

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
  image_url: null,
        publie: document.getElementById("publieRecette").checked
    };
    // Envoyer la photo vers Supabase Storage
try {
    const fichier = document.getElementById("fichierPhoto").files[0];
    const urlSaisie = document.getElementById("imageRecette").value.trim();

    if (fichier) {
        // Nouvelle photo sélectionnée
        recette.image_url = await envoyerPhoto();
    } else if (urlSaisie) {
        // Adresse URL renseignée
        recette.image_url = urlSaisie;
    } else {
        // Conserver l'ancienne photo en cas de modification
        recette.image_url = recetteEnModification
            ? anciennePhotoRecette
            : null;
    }

} catch (erreur) {
    messageRecette.textContent = "❌ " + erreur.message;
    bouton.disabled = false;
    return;
}

    // Vérifier si nous ajoutons ou modifions une recette
const modification = recetteEnModification !== null;

let resultat;

if (modification) {

    // Modifier la recette existante
    resultat = await supabaseClient
        .from("recettes")
        .update(recette)
        .eq("id", recetteEnModification)
        .select("id");

} else {

    // Ajouter une nouvelle recette
    resultat = await supabaseClient
        .from("recettes")
        .insert([recette])
        .select("id");

}

bouton.disabled = false;

// Vérifier le résultat
if (
    resultat.error ||
    !resultat.data ||
    resultat.data.length !== 1
) {
    messageRecette.textContent =
        "❌ Erreur : " +
        (resultat.error?.message || "Enregistrement non autorisé.");

    return;
}

// Afficher le message de confirmation
messageRecette.textContent = modification
    ? "✅ Recette modifiée avec succès !"
    : "✅ Recette ajoutée avec succès !";

// Quitter le mode modification
recetteEnModification = null;

// Vider le formulaire
document.getElementById("recetteForm").reset();

// Actualiser la liste
await afficherRecettes();
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
// Bouton Modifier
const boutonModifier = document.createElement("button");
boutonModifier.type = "button";
boutonModifier.textContent = "✏️ Modifier";
boutonModifier.style.marginBottom = "10px";

boutonModifier.addEventListener("click", () => {
    modifierRecette(recette.id);
});

// Bouton Publier / Dépublier
const boutonPublier = document.createElement("button");
boutonPublier.type = "button";
boutonPublier.textContent = recette.publie
    ? "🔒 Dépublier"
    : "🌐 Publier";

boutonPublier.style.marginBottom = "10px";

boutonPublier.addEventListener("click", async () => {
    const confirmation = confirm(
        recette.publie
            ? "Voulez-vous dépublier cette recette ?"
            : "Voulez-vous publier cette recette ?"
    );

    if (!confirmation) return;

    boutonPublier.disabled = true;

    const { data, error } = await supabaseClient
        .from("recettes")
        .update({ publie: !recette.publie })
        .eq("id", recette.id)
        .select("id");

    if (error || !data || data.length !== 1) {
        alert(
            "Impossible de modifier la publication : " +
            (error?.message || "Modification non autorisée.")
        );
        boutonPublier.disabled = false;
        return;
    }

    await afficherRecettes();
});

// Bouton Supprimer
const boutonSupprimer = document.createElement("button");
boutonSupprimer.type = "button";
boutonSupprimer.textContent = "🗑️ Supprimer";

boutonSupprimer.addEventListener("click", async () => {
    const confirmation = confirm(
        `Voulez-vous vraiment supprimer "${recette.titre}" ?`
    );

    if (!confirmation) return;

    boutonSupprimer.disabled = true;

    const { data, error } = await supabaseClient
        .from("recettes")
        .delete()
        .eq("id", recette.id)
        .select("id");

    if (error || !data || data.length !== 1) {
        alert(
            "Impossible de supprimer la recette : " +
            (error?.message || "Suppression non autorisée.")
        );
        boutonSupprimer.disabled = false;
        return;
    }

    await afficherRecettes();
});
        carte.append(
    titre,
    categorie,
    statut,
    boutonModifier,
    boutonPublier,
    boutonSupprimer
);
        liste.appendChild(carte);
    });
}
// ==========================================
// MODIFIER UNE RECETTE
// ==========================================

// Identifiant de la recette en cours de modification
let recetteEnModification = null;
let anciennePhotoRecette = null;

// Charger une recette dans le formulaire
async function modifierRecette(id) {

    const { data: recette, error } = await supabaseClient
        .from("recettes")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !recette) {
        alert("Impossible de charger cette recette.");
        return;
    }

    // Conserver l'identifiant pour l'enregistrement
    recetteEnModification = recette.id;
    anciennePhotoRecette = recette.image_url || null;
    // Effacer la sélection d'une ancienne photo
document.getElementById("fichierPhoto").value = "";
    document.getElementById("enregistrerRecette").textContent =
    "💾 Enregistrer les modifications";
    document.getElementById("titreFormulaire").textContent =
    "✏️ Modifier la recette";

    // Remplir le formulaire
    document.getElementById("titreRecette").value =
        recette.titre || "";

    document.getElementById("categorieRecette").value =
        recette.categorie || "";

    document.getElementById("descriptionRecette").value =
        recette.description || "";

    document.getElementById("preparationRecette").value =
        recette.temps_preparation ?? 0;

    document.getElementById("cuissonRecette").value =
        recette.temps_cuisson ?? 0;

    document.getElementById("portionsRecette").value =
        recette.portions ?? 1;

    // Une ligne par ingrédient
    document.getElementById("ingredientsRecette").value =
        Array.isArray(recette.ingredients)
            ? recette.ingredients.join("\n")
            : "";

    // Une ligne par étape
    document.getElementById("etapesRecette").value =
        Array.isArray(recette.etapes)
            ? recette.etapes.join("\n")
            : "";

    document.getElementById("imageRecette").value =
        recette.image_url || "";
        // Afficher la photo actuelle de la recette
afficherApercuPhoto(recette.image_url || "");

    document.getElementById("publieRecette").checked =
        recette.publie === true;

    // Afficher le formulaire
    const formulaire = document.getElementById("formulaireRecette");
    formulaire.style.display = "block";

    document.getElementById("messageRecette").textContent =
        "✏️ Modification de : " + recette.titre;

    // Remonter jusqu'au formulaire
    formulaire.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}
// ==========================================
// IMPORTATION DES PHOTOS VERS SUPABASE
// ==========================================

async function envoyerPhoto() {
    const champPhoto = document.getElementById("fichierPhoto");
    const fichier = champPhoto.files[0];

    // Aucune photo sélectionnée
    if (!fichier) {
        return document.getElementById("imageRecette").value.trim() || null;
    }

    // Vérifier le format
    const formatsAutorises = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!formatsAutorises.includes(fichier.type)) {
        throw new Error("Format non autorisé. Utilise JPG, PNG ou WebP.");
    }

    // Vérifier la taille (5 Mo maximum)
    if (fichier.size > 5 * 1024 * 1024) {
        throw new Error("La photo dépasse 5 Mo.");
    }

    // Créer un nom unique
    const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    }[fichier.type];

    const nomFichier = `${crypto.randomUUID()}.${extension}`;

    // Envoyer la photo
    const { error } = await supabaseClient.storage
        .from("photos-recettes")
        .upload(nomFichier, fichier, {
            contentType: fichier.type,
            upsert: false
        });

    if (error) {
        throw new Error("Erreur d'envoi : " + error.message);
    }

    // Récupérer son adresse publique
    const { data } = supabaseClient.storage
        .from("photos-recettes")
        .getPublicUrl(nomFichier);

    return data.publicUrl;
}
// ==========================================
// APERÇU DES PHOTOS
// ==========================================

const champFichierPhoto = document.getElementById("fichierPhoto");
const champUrlPhoto = document.getElementById("imageRecette");
const blocApercuPhoto = document.getElementById("apercuPhoto");
const imageApercu = document.getElementById("imageApercu");

let urlApercuTemporaire = null;

// Afficher une image dans le formulaire
function afficherApercuPhoto(url) {

    if (urlApercuTemporaire) {
        URL.revokeObjectURL(urlApercuTemporaire);
        urlApercuTemporaire = null;
    }

    if (!url) {
        imageApercu.removeAttribute("src");
        blocApercuPhoto.style.display = "none";
        return;
    }

    imageApercu.src = url;
    blocApercuPhoto.style.display = "block";
}

// Quand on sélectionne une photo sur l'ordinateur
champFichierPhoto.addEventListener("change", () => {

    const fichier = champFichierPhoto.files[0];

    if (!fichier) {
        afficherApercuPhoto(champUrlPhoto.value.trim());
        return;
    }

    const formatsAutorises = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!formatsAutorises.includes(fichier.type)) {
        alert("Format non autorisé. Utilise JPG, PNG ou WebP.");
        champFichierPhoto.value = "";
        afficherApercuPhoto(champUrlPhoto.value.trim());
        return;
    }

    if (fichier.size > 5 * 1024 * 1024) {
        alert("La photo ne doit pas dépasser 5 Mo.");
        champFichierPhoto.value = "";
        afficherApercuPhoto(champUrlPhoto.value.trim());
        return;
    }

    afficherApercuPhoto(URL.createObjectURL(fichier));
    urlApercuTemporaire = imageApercu.src;
});

// Quand on modifie l'adresse URL
champUrlPhoto.addEventListener("input", () => {

    if (!champFichierPhoto.files.length) {
        afficherApercuPhoto(champUrlPhoto.value.trim());
    }

});

// Si l'image ne peut pas être chargée
imageApercu.addEventListener("error", () => {
    blocApercuPhoto.style.display = "none";
});
// =====================================
// OUVRIR / FERMER LA GESTION DES PRIX
// =====================================

const boutonGererPrix = document.getElementById("gererPrix");
const formulairePrix = document.getElementById("formulairePrix");

if (boutonGererPrix && formulairePrix) {
    boutonGererPrix.addEventListener("click", () => {

        const estFerme = formulairePrix.style.display === "none";

        formulairePrix.style.display = estFerme ? "block" : "none";

        boutonGererPrix.textContent = estFerme
            ? "❌ Fermer la gestion des prix"
            : "💰 Gérer les prix";

    });
}
// =====================================
// ENREGISTRER LES PRIX DES INGRÉDIENTS
// =====================================

const prixForm = document.getElementById("prixForm");

if (prixForm) {
    prixForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const messagePrix = document.getElementById("messagePrix");
        const boutonEnregistrer = document.getElementById("enregistrerPrix");

        const ingredient = document
            .getElementById("nomIngredient")
            .value.trim().toLowerCase();

        const prix = Number(
            document.getElementById("prixIngredient").value
        );

        const unite = document.getElementById("uniteIngredient").value;

        const source = document
            .getElementById("sourceIngredient")
            .value.trim();

        if (!ingredient || !Number.isFinite(prix) || prix < 0) {
            messagePrix.textContent = "❌ Vérifie le nom et le prix.";
            return;
        }

        boutonEnregistrer.disabled = true;
        messagePrix.textContent = "⏳ Enregistrement en cours...";

        try {
            const { data: sessionData, error: sessionError } =
                await supabaseClient.auth.getUser();

            if (sessionError || !sessionData.user) {
                throw new Error("Tu dois être connecté.");
            }

            const { error } = await supabaseClient
                .from("prix_ingredients")
                .upsert(
                    {
                        ingredient: ingredient,
                        prix_unitaire: prix,
                        unite: unite,
                        source: source || "Prix renseigné manuellement",
                        date_actualisation: new Date().toISOString()
                    },
                    {
                        onConflict: "ingredient"
                    }
                );

            if (error) {
                throw error;
            }

            messagePrix.textContent =
                "✅ Prix enregistré avec succès !";

            prixForm.reset();

        } catch (erreur) {
            console.error("Erreur d'enregistrement du prix :", erreur);

            messagePrix.textContent =
                "❌ Erreur : " + erreur.message;

        } finally {
            boutonEnregistrer.disabled = false;
        }
    });
}