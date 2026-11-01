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