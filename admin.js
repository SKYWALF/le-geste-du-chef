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

temps_repos: document.getElementById("reposRecette").value.trim() === ""
    ? null
    : Number(document.getElementById("reposRecette").value),

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

// ==========================================
// ENREGISTREMENT TERMINÉ
// RECHERCHE AUTOMATIQUE DES PRIX
// ==========================================

// Afficher le message de confirmation
messageRecette.textContent = modification
    ? "✅ Recette modifiée avec succès !"
    : "✅ Recette ajoutée avec succès !";

// Quitter le mode modification
recetteEnModification = null;

// Vider le formulaire
document.getElementById("recetteForm").reset();

// Actualiser la liste des recettes
await afficherRecettes();

// ==========================================
// RECHERCHER LES PRIX AUTOMATIQUEMENT
// ==========================================

// Uniquement pour les recettes publiées
if (recette.publie) {

    messageRecette.textContent +=
        "\n🔎 Recherche automatique des prix en cours...";

    try {

        // Récupérer la session administrateur
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !sessionData.session) {
            throw new Error("Session administrateur introuvable.");
        }

        // Appeler la fonction Supabase
const { data, error } =
    await supabaseClient.functions.invoke(
        "actualiser-prix",
        {
            body: {},
            headers: {
                Authorization:
                    "Bearer " + sessionData.session.access_token
            }
        }
    );

        if (error) {
            throw error;
        }

        if (!data?.succes) {
            throw new Error(
                data?.erreur || "La recherche des prix a échoué."
            );
        }

        const prixAjoutes = Number(data.prix_ajoutes || 0);

        // Afficher le résultat
        if (prixAjoutes > 0) {

            messageRecette.textContent +=
                "\n✅ " + prixAjoutes +
                " nouveau(x) prix récupéré(s) automatiquement !";

        } else {

            messageRecette.textContent +=
                "\nℹ️ Aucun nouveau prix disponible pour le moment.";

        }

        // Actualiser les prix affichés
        if (typeof afficherListePrix === "function") {
            await afficherListePrix();
        }

        // Actualiser les ingrédients sans prix
        if (typeof detecterPrixManquants === "function") {
            await detecterPrixManquants();
        }

        console.log(
            "Résultat de la recherche automatique :",
            data
        );

    } catch (erreur) {

        console.error(
            "Erreur de recherche automatique des prix :",
            erreur
        );

        messageRecette.textContent +=
            "\n⚠️ Recette enregistrée, mais recherche des prix indisponible.";

    }
}

});

// Afficher les recettes enregistrées dans Supabase
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

const categoriesRecettes = {};

["Entrée", "Plat", "Dessert"].forEach(nom => {
    const details = document.createElement("details");
    details.style.marginBottom = "12px";

    const summary = document.createElement("summary");
    summary.style.cssText = `
        cursor: pointer;
        padding: 14px;
        background: #b59458;
        color: white;
        border-radius: 8px;
        font-weight: bold;
    `;

    const nombre = recettes.filter(r => r.categorie === nom).length;

    const emoji = {
        "Entrée": "🥗",
        "Plat": "🍲",
        "Dessert": "🍰"
    }[nom];

    summary.textContent = `${emoji} ${nom}s (${nombre})`;

    const contenu = document.createElement("div");
    contenu.style.marginTop = "12px";

    details.append(summary, contenu);
    liste.appendChild(details);

    categoriesRecettes[nom] = contenu;
});

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
  
const destination = categoriesRecettes[recette.categorie];

if (destination) {
    destination.appendChild(carte);
} else {
    liste.appendChild(carte);
}

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

// Récupérer le temps de repos enregistré
document.getElementById("reposRecette").value =
    recette.temps_repos ?? "";

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

// Actualiser automatiquement la liste des prix
await afficherListePrix();
// Actualiser automatiquement les prix manquants
const zonePrixManquants = document.getElementById("prixManquants");

if (
    zonePrixManquants &&
    zonePrixManquants.textContent.trim() !== ""
) {
    await detecterPrixManquants();
}

// Actualiser le coût de la recette après l'enregistrement d'un prix
const boutonVerification = document.getElementById("verifierPrixRecette");

if (boutonVerification) {
    const ingredientsSaisis = document
        .getElementById("ingredientsRecette")
        ?.value.trim();

    if (ingredientsSaisis) {
        boutonVerification.click();
    }
}

        } catch (erreur) {
            console.error("Erreur d'enregistrement du prix :", erreur);

            messagePrix.textContent =
                "❌ Erreur : " + erreur.message;

        } finally {
            boutonEnregistrer.disabled = false;
        }
    });
}
// =====================================
// AFFICHER LES PRIX DES INGRÉDIENTS
// =====================================

async function afficherListePrix() {

    const liste = document.getElementById("listePrixIngredients");

    if (!liste) return;

    liste.textContent = "⏳ Chargement des prix...";

    const { data, error } = await supabaseClient
        .from("prix_ingredients")
        .select("ingredient, prix_unitaire, unite, source")
        .order("ingredient", { ascending: true });

    if (error) {
        liste.textContent = "❌ Erreur : " + error.message;
        return;
    }

    liste.innerHTML = "";

    if (!data || data.length === 0) {
        liste.textContent = "Aucun ingrédient enregistré.";
        return;
    }

    data.forEach((produit) => {

        const carte = document.createElement("div");

        carte.style.cssText = `
            padding: 15px;
            margin-bottom: 10px;
            background: white;
            border: 1px solid #e8e0d2;
            border-radius: 8px;
        `;

        const nom = document.createElement("strong");
        nom.textContent = produit.ingredient;

        const prix = document.createElement("p");

        const montant = Number(produit.prix_unitaire)
            .toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            });

        prix.textContent = `${montant} € / ${produit.unite}`;

        const source = document.createElement("small");
        source.textContent = produit.source || "Source non renseignée";

// Bouton pour modifier le prix
const boutonModifier = document.createElement("button");

boutonModifier.type = "button";
boutonModifier.textContent = "✏️ Modifier";

boutonModifier.style.cssText = `
    margin-top: 12px;
    padding: 10px;
    font-size: 14px;
`;

boutonModifier.addEventListener("click", () => {

    // Remplir le formulaire avec les informations existantes
    document.getElementById("nomIngredient").value =
        produit.ingredient;

    document.getElementById("prixIngredient").value =
        produit.prix_unitaire;

    document.getElementById("uniteIngredient").value =
        produit.unite;

    document.getElementById("sourceIngredient").value =
        produit.source || "";

    // Remonter jusqu'au formulaire
    document.getElementById("prixForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

});

// Afficher les informations et le bouton
carte.appendChild(nom);
carte.appendChild(prix);
carte.appendChild(source);
carte.appendChild(boutonModifier);
// Bouton Supprimer un ingrédient
const boutonSupprimerPrix = document.createElement("button");

boutonSupprimerPrix.type = "button";
boutonSupprimerPrix.textContent = "🗑️ Supprimer";

boutonSupprimerPrix.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    background: #c0392b;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
`;

boutonSupprimerPrix.addEventListener("click", async () => {

    const confirmation = confirm(
        `Voulez-vous supprimer "${produit.ingredient}" ?`
    );

    if (!confirmation) return;

    boutonSupprimerPrix.disabled = true;

    const { data, error } = await supabaseClient
        .from("prix_ingredients")
        .delete()
        .eq("ingredient", produit.ingredient)
        .select("ingredient");

    if (error || !data || data.length !== 1) {
        alert(
            "❌ Suppression impossible : " +
            (error?.message || "Vérifie les autorisations Supabase.")
        );
        boutonSupprimerPrix.disabled = false;
        return;
    }

    await afficherListePrix();
});

carte.appendChild(boutonSupprimerPrix);

liste.appendChild(carte);

    });
}

// Bouton pour actualiser la liste
const boutonActualiserPrix =
    document.getElementById("actualiserListePrix");

if (boutonActualiserPrix) {
    boutonActualiserPrix.addEventListener("click", afficherListePrix);
}

// Charger la liste à l'ouverture du formulaire
if (boutonGererPrix) {
    boutonGererPrix.addEventListener("click", () => {

        if (formulairePrix.style.display === "block") {
            afficherListePrix();
        }

    });
}
// =====================================
// VÉRIFIER LES PRIX D'UNE RECETTE
// =====================================

const boutonVerifierPrix = document.getElementById("verifierPrixRecette");
const resultatVerification = document.getElementById("resultatVerificationPrix");

if (boutonVerifierPrix && resultatVerification) {

    boutonVerifierPrix.addEventListener("click", async () => {

        const texte = document.getElementById("ingredientsRecette").value;

        const ingredients = texte
            .split("\n")
            .map(ligne => ligne.trim())
            .filter(ligne => ligne.length > 0);

        resultatVerification.style.display = "block";
        resultatVerification.textContent = "⏳ Vérification des prix...";

        if (ingredients.length === 0) {
            resultatVerification.textContent =
                "⚠️ Ajoute d'abord des ingrédients.";
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from("prix_ingredients")
                .select("ingredient, prix_unitaire, unite");

            if (error) throw error;

            let total = 0;
            let reconnus = 0;
            const lignes = [];
            const ingredientsManquants = [];

            ingredients.forEach(ingredient => {

                const cout = window.calculerPrixIngredient(
                    ingredient,
                    data || []
                );

                if (cout !== null && Number.isFinite(cout)) {
                    total += cout;
                    reconnus++;

                    lignes.push(
                        `✅ ${ingredient} : ${cout.toFixed(2)} €`
                    );
              } else {
    lignes.push(
        `⚠️ ${ingredient} : prix manquant ou ingrédient non reconnu`
    );

ingredientsManquants.push(ingredient);
    }
}); 

            const euros = montant => montant.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR"
            });

            resultatVerification.textContent =
                lignes.join("\n") +
                `\n\n💰 Coût connu : ${euros(total)}` +
                `\n📊 ${reconnus}/${ingredients.length} ingrédients calculés`;

            resultatVerification.style.whiteSpace = "pre-line";
            // Bouton pour accéder à la gestion des prix manquants
if (ingredientsManquants.length > 0) {
    const bouton = document.createElement("button");

    bouton.type = "button";
    bouton.textContent =
        `💰 Renseigner les prix manquants (${ingredientsManquants.length})`;

bouton.style.marginTop = "15px";

bouton.addEventListener("click", () => {

    const gestionPrix = document.getElementById("formulairePrix");

    if (gestionPrix) {

    // Récupérer le premier ingrédient sans prix
    const ingredient = ingredientsManquants[0];

    // Retirer la quantité et l'unité
    const nom = ingredient
        .replace(
            /^\d+(?:[.,]\d+)?\s*(?:kg|mg|g|ml|cl|l|pièces?|unités?|gousses?)\s+(?:de\s+|du\s+|d['’])?/i,
            ""
        )
        .replace(/^\d+(?:[.,]\d+)?\s+/, "")
        .trim();

    // Remplir automatiquement le formulaire
    const champNom = document.getElementById("nomIngredient");

    if (champNom) {
        champNom.value = nom;
    }

    // Afficher la gestion des prix
    gestionPrix.style.display = "block";

    gestionPrix.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}
    });

    resultatVerification.appendChild(bouton);
}
            // =====================================
// BOUTON POUR LES PRIX MANQUANTS
// =====================================



} catch (erreur) {
            console.error(erreur);

            resultatVerification.textContent =
                "❌ Erreur : " + erreur.message;
        }

    });
}
// ========================================
// DÉTECTEUR DE PRIX MANQUANTS
// ========================================

// ==========================================
// LE GESTE DU CHEF
// DÉTECTEUR AUTOMATIQUE DE PRIX MANQUANTS
// ==========================================

// ==========================================
// LE GESTE DU CHEF
// DÉTECTEUR INTELLIGENT DES PRIX MANQUANTS
// ==========================================

async function detecterPrixManquants() {

    const zone = document.getElementById("prixManquants");

    if (!zone) return;

    zone.textContent = "⏳ Analyse des recettes en cours...";

    try {

        // Récupérer toutes les données avec pagination
        async function recupererToutesLesLignes(table, colonnes) {

            const lignes = [];
            const taillePage = 1000;
            let debut = 0;

            while (true) {

                const { data, error } = await supabaseClient
                    .from(table)
                    .select(colonnes)
                    .range(debut, debut + taillePage - 1);

                if (error) throw error;

                lignes.push(...(data || []));

                if (!data || data.length < taillePage) break;

                debut += taillePage;
            }

            return lignes;
        }

        const recettes = await recupererToutesLesLignes(
            "recettes",
            "titre, ingredients"
        );

        const prix = await recupererToutesLesLignes(
            "prix_ingredients",
            "ingredient, prix_unitaire, unite, source"
        );

        if (typeof window.calculerPrixIngredient !== "function") {
            throw new Error(
                "Le fichier calcul-prix.js n'est pas chargé."
            );
        }

        // Normaliser les noms
        function normaliser(nom) {

            return String(nom || "")
                .toLowerCase()
                .replace(/œ/g, "oe")
                .replace(/æ/g, "ae")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[’']/g, "'")
                .replace(/\s+/g, " ")
                .trim();
        }

        // Extraire quantité, unité et nom
        function extraireIngredient(ingredient) {

            const texte = typeof ingredient === "string"
                ? ingredient.trim()
                : [
                    ingredient?.quantite,
                    ingredient?.unite,
                    ingredient?.nom
                ].filter(v => v != null).join(" ").trim();

            if (!texte) return null;

            // Ingrédients avec unité
            const resultat = normaliser(texte).match(
                /^(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l|pieces?|unites?|gousses?)\s+(?:de\s+|du\s+|d[' ])?(.+)$/i
            );

            if (resultat) {

                const unite = resultat[2].toLowerCase();
                const nom = resultat[3].trim();

                let unitePrix = "unité";

                if (["kg", "mg", "g"].includes(unite)) {
                    unitePrix = "kg";
                } else if (["ml", "cl", "l"].includes(unite)) {
                    unitePrix = "L";
                } else if (/gousses?/.test(unite)) {
                    unitePrix = "gousse";
                }

                return {
                    nom,
                    unitePrix,
                    texte
                };
            }

            // Exemple : 3 œufs, 2 oignons
            const sansUnite = normaliser(texte).match(
                /^(\d+(?:[.,]\d+)?)\s+(.+)$/
            );

            if (sansUnite) {

                return {
                    nom: sansUnite[2].trim(),
                    unitePrix: "unité",
                    texte,
                    formatSpecial: true
                };
            }

            return {
                nom: texte,
                unitePrix: "unité",
                texte,
                formatSpecial: true
            };
        }

        // Regrouper les ingrédients
        const ingredientsManquants = new Map();

        let nombreIngredients = 0;
        let lignesAProbleme = 0;

        for (const recette of recettes) {

            if (!Array.isArray(recette.ingredients)) continue;

            for (const ingredient of recette.ingredients) {

                nombreIngredients++;

                const cout = window.calculerPrixIngredient(
                    ingredient,
                    prix
                );

                if (cout !== null && Number.isFinite(cout)) {
                    continue;
                }

                lignesAProbleme++;

                const resultat = extraireIngredient(ingredient);

                if (!resultat) continue;

                // Regrouper les pluriels simples comme
                // oignons / oignon et oeufs / oeuf
                const cleNom = typeof simplifierNomPrix === "function"
                    ? simplifierNomPrix(resultat.nom)
                    : normaliser(resultat.nom);

                const cle = cleNom + "|" + resultat.unitePrix;

                if (!ingredientsManquants.has(cle)) {

                    ingredientsManquants.set(cle, {
                        nom: resultat.nom,
                        unite: resultat.unitePrix,
                        recettes: new Set(),
                        exemples: new Set(),
                        formatSpecial: resultat.formatSpecial || false
                    });
                }

                const element = ingredientsManquants.get(cle);

                element.recettes.add(
                    recette.titre || "Recette sans titre"
                );

                element.exemples.add(resultat.texte);

            }
        }

        zone.replaceChildren();

        // Titre
        const titre = document.createElement("h3");
        titre.textContent = "💰 Analyse des prix des ingrédients";
        zone.appendChild(titre);

        // Résumé
        const resume = document.createElement("p");

        resume.textContent =
            `${recettes.length} recettes analysées — ` +
            `${nombreIngredients} lignes d'ingrédients — ` +
            `${lignesAProbleme} lignes à vérifier — ` +
            `${ingredientsManquants.size} ingrédients regroupés.`;

        zone.appendChild(resume);

        const explication = document.createElement("p");

        explication.textContent =
            "Ces ingrédients nécessitent une vérification : " +
            "prix absent, unité incompatible ou format non reconnu.";

        zone.appendChild(explication);

        if (ingredientsManquants.size === 0) {

            const succes = document.createElement("p");

            succes.textContent =
                "✅ Tous les ingrédients ont un coût calculable !";

            zone.appendChild(succes);

            return;
        }

        // Trier par nom
        const elements = [...ingredientsManquants.values()]
            .sort((a, b) =>
                a.nom.localeCompare(b.nom, "fr")
            );

        // Afficher les ingrédients regroupés
        for (const element of elements) {

            const bloc = document.createElement("div");

            bloc.style.padding = "15px";
            bloc.style.marginBottom = "10px";
            bloc.style.border = "1px solid #ddd";
            bloc.style.borderRadius = "8px";

            // Nom
            const nom = document.createElement("h4");

            nom.textContent = "❌ " + element.nom;

            bloc.appendChild(nom);

            // Unité
            const unite = document.createElement("p");

            unite.textContent =
                "📏 Unité de prix proposée : " + element.unite;

            bloc.appendChild(unite);

            // Quantités rencontrées
            const exemples = document.createElement("p");

            exemples.textContent =
                "🥣 Exemples : " +
                [...element.exemples].slice(0, 5).join(", ");

            bloc.appendChild(exemples);

            // Recettes concernées
            const recettesConcernees = document.createElement("p");

            recettesConcernees.textContent =
                "📖 Recettes : " +
                [...element.recettes].join(", ");

            bloc.appendChild(recettesConcernees);

            // Avertissement si format spécial
            if (element.formatSpecial) {

                const avertissement = document.createElement("p");

                avertissement.textContent =
                    "⚠️ Format à vérifier : le calculateur " +
                    "ne reconnaît peut-être pas cette écriture.";

                bloc.appendChild(avertissement);
            }

            // Bouton
            const bouton = document.createElement("button");

            bouton.type = "button";
            bouton.textContent = "💰 Renseigner le prix";

            bouton.addEventListener("click", () => {

                const formulaire =
                    document.getElementById("prixForm");

                const champNom =
                    document.getElementById("nomIngredient");

                const champPrix =
                    document.getElementById("prixIngredient");

                const champUnite =
                    document.getElementById("uniteIngredient");

                if (
                    !formulaire ||
                    !champNom ||
                    !champPrix ||
                    !champUnite
                ) {
                    alert("Formulaire des prix introuvable.");
                    return;
                }

                // Préremplir le formulaire
                champNom.value = element.nom;

                champUnite.value = element.unite;

                // Ne jamais inventer un prix
                champPrix.value = "";

                // Faire défiler
                formulaire.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                champPrix.focus();

            });

            bloc.appendChild(bouton);

            zone.appendChild(bloc);
        }

    } catch (erreur) {

        console.error(
            "Erreur du détecteur de prix :",
            erreur
        );

        zone.textContent =
            "❌ Erreur : " + erreur.message;
    }
}

// ==========================================
// ACTIVER LE DÉTECTEUR DE PRIX MANQUANTS
// ==========================================

document
    .getElementById("analyserPrixManquants")
    ?.addEventListener("click", detecterPrixManquants);
    // ==========================================
// TEST DE LA FONCTION AUTOMATIQUE DES PRIX
// ==========================================

window.testerActualisationPrix = async function () {
    try {
        const { data, error } =
            await supabaseClient.functions.invoke("actualiser-prix", {
                body: {}
            });

        if (error) {
            console.error("Erreur de la fonction :", error);
            alert("Erreur lors du test. Consulte la console.");
            return;
        }

        console.log("Réponse de la fonction :", data);

        alert(data.message || data.erreur || "Test terminé");

    } catch (erreur) {
        console.error(erreur);
        alert("Erreur pendant le test.");
    }
};