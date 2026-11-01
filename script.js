const recipes=[
{title:"Bœuf bourguignon traditionnel",category:"Plats",time:"2 h 30",image:"images/boeuf.jpg"},
{title:"Tarte au citron meringuée",category:"Desserts",time:"1 h 15",image:"images/tarte.jpg"},
{title:"Ratatouille provençale",category:"Plats",time:"1 h 10",image:"images/ratatouille.jpg"},
{title:"Crème brûlée à la vanille",category:"Desserts",time:"45 min",image:"images/creme.jpg"}
];
const grid=document.querySelector("#recipeGrid");
function showRecipes(query=""){const items=recipes.filter(r=>(r.title+" "+r.category).toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));grid.innerHTML="";for(const r of items){const card=document.createElement("article");card.className="card";const img=document.createElement("img");img.src=r.image;img.alt=r.title;img.loading="lazy";const body=document.createElement("div");body.className="cardBody";const badge=document.createElement("span");badge.className="badge";badge.textContent=r.category+" · "+r.time;const title=document.createElement("h3");title.textContent=r.title;const note=document.createElement("p");note.textContent="Exemple de présentation — recette à venir";body.append(badge,title,note);card.append(img,body);grid.append(card)}document.querySelector("#resultInfo").textContent=items.length?`${items.length} fiche(s) de démonstration — recettes complètes à venir.`:"Aucune recette trouvée."}
document.querySelector("#searchForm").addEventListener("submit",e=>{e.preventDefault();showRecipes(document.querySelector("#search").value.trim());document.querySelector("#recettes").scrollIntoView({behavior:"smooth"})});
function calculate(){const q=Number(document.querySelector("#quantity").value),a=Number(document.querySelector("#fromPortions").value),b=Number(document.querySelector("#toPortions").value);document.querySelector("#portionResult").textContent=q>=0&&a>0&&b>0?`Quantité adaptée : ${new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(q*b/a)} g`:"Entre des valeurs valides."}
for(const el of document.querySelectorAll(".tools input"))el.addEventListener("input",calculate);
document.querySelector("#year").textContent=new Date().getFullYear();showRecipes();calculate();
