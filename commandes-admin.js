
const zoneCommandes = document.getElementById("listeCommandes");

async function afficherCommandes() {
    if (!zoneCommandes) return;

    zoneCommandes.textContent = "Chargement des commandes...";

    const { data, error } = await supabaseClient
        .from("commandes_menus")
        .select("*")
        .order("date_creation", { ascending: false });

    if (error) {
        zoneCommandes.textContent = "Erreur : " + error.message;
        return;
    }

    zoneCommandes.replaceChildren();

    if (!data.length) {
        zoneCommandes.textContent = "Aucune commande reçue.";
        return;
    }

    for (const commande of data) {
        const carte = document.createElement("div");
        carte.style.cssText =
            "padding:20px;margin:15px 0;background:#f7f5f0;border-radius:10px;";

        const ajouter = (titre, valeur) => {
            const p = document.createElement("p");
            p.textContent = titre + " : " + (valeur ?? "Non renseigné");
            carte.appendChild(p);
        };

        ajouter("Date", new Date(commande.date_creation).toLocaleString("fr-FR"));
        ajouter("Email", commande.email);
        ajouter("Personnes", commande.convives);
        ajouter("Budget courses", commande.budget + " €");
        ajouter("Occasion", commande.occasion);
        ajouter("Préférences", commande.preferences);
        ajouter("Ingrédients à éviter", commande.ingredients_eviter);
        ajouter("Allergies", commande.allergies);

        const statut = document.createElement("select");

        const statuts = [
            "demande",
            "en_attente_paiement",
            "payee",
            "en_preparation",
            "terminee",
            "annulee"
        ];

        for (const valeur of statuts) {
            const option = document.createElement("option");
            option.value = valeur;
            option.textContent = valeur.replaceAll("_", " ");
            statut.appendChild(option);
        }

        statut.value = commande.statut;

        statut.addEventListener("change", async () => {
            const ancienStatut = commande.statut;
            statut.disabled = true;

            const { error } = await supabaseClient
                .from("commandes_menus")
                .update({ statut: statut.value })
                .eq("id", commande.id);

            if (error) {
                alert("Erreur : " + error.message);
                statut.value = ancienStatut;
            } else {
                commande.statut = statut.value;
            }

            statut.disabled = false;
        });

        carte.appendChild(statut);
        zoneCommandes.appendChild(carte);
    }
}

document.getElementById("voirCommandes")
    ?.addEventListener("click", afficherCommandes);
