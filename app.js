const cfg = window.MACCA_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("PASTE_") && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_");
const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;

const STANDARD_BADGES = ["Family Favourite","Kid Approved","Freezer Friendly","Slow Cooker","BBQ","Bread Maker","Caravan Friendly","Budget Friendly","High Iron","Healthy Choice","Under 30 Minutes","Meal Prep"];
let recipes = [];
let categories = [];
let activeCategory = "All";
let currentUser = null;
const $ = id => document.getElementById(id);
const grid = $("recipe-grid");
const search = $("search");
const count = $("count");
const statusBox = $("status");

function safeArray(value){return Array.isArray(value)?value:[]}
function lines(value){return value.split("\n").map(x=>x.trim()).filter(Boolean)}
function customTags(value){return value.split(",").map(x=>x.trim()).filter(Boolean)}
function showStatus(message){statusBox.textContent=message;statusBox.hidden=!message}
function escapeHtml(value=""){return value.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function truncate(value="",n=110){return value.length>n?value.slice(0,n).trim()+"…":value}
function recipeSearchText(r){return [r.title,r.category,r.story,...safeArray(r.tags),...safeArray(r.ingredients)].join(" ").toLowerCase()}
function isFavourite(r){return safeArray(r.tags).includes("Family Favourite")}

async function loadRecipes(){
  if(!db){showStatus("Supabase is not connected. Keep your working config.js file.");grid.innerHTML='<div class="empty">Connect Supabase to load recipes.</div>';return}
  showStatus("Loading the family cookbook…");
  const [recipeResult, categoryResult] = await Promise.all([
    db.from("recipes").select("*").order("title"),
    db.from("categories").select("*").order("sort_order").order("name")
  ]);
  if(recipeResult.error){showStatus(`Could not load recipes: ${recipeResult.error.message}`);return}
  if(categoryResult.error){showStatus(`Could not load categories: ${categoryResult.error.message}`);return}
  recipes=recipeResult.data||[];
  categories=categoryResult.data||[];
  showStatus("");
  renderEverything();
}

function renderEverything(){renderCategoryControls();renderStats();renderFeatured();renderRecipes();renderManagerList();renderCategoryList()}

function renderCategoryControls(){
  const filterBar=$("filter-bar");
  const current=activeCategory;
  filterBar.innerHTML=[
    `<button class="filter ${current==="All"?"active":""}" data-category="All">All recipes</button>`,
    ...categories.map(c=>`<button class="filter ${current===c.name?"active":""}" data-category="${escapeHtml(c.name)}">${escapeHtml(c.icon||"🍽️")} ${escapeHtml(c.name)}</button>`)
  ].join("");
  filterBar.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{
    activeCategory=b.dataset.category;
    renderCategoryControls();
    renderRecipes();
  });

  const select=$("category");
  const selected=select.value;
  select.innerHTML='<option value="">Select…</option>'+categories.map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.icon||"🍽️")} ${escapeHtml(c.name)}</option>`).join("");
  if(categories.some(c=>c.name===selected))select.value=selected;
}
function categoryIcon(name){
  return categories.find(c=>c.name===name)?.icon||"🍽️";
}

function renderStats(){
  $("stat-recipes").textContent=recipes.length;
  $("stat-categories").textContent=categories.length;
  $("stat-favourites").textContent=recipes.filter(isFavourite).length;
}
function renderFeatured(){
  const section=$("featured-section");
  if(!recipes.length){section.hidden=true;return}
  const favourites=recipes.filter(isFavourite);
  const r=(favourites.length?favourites:recipes)[new Date().getDate()%(favourites.length||recipes.length)];
  section.hidden=false;
  $("featured-card").innerHTML=`<div><p class="kicker dark">${escapeHtml(r.category||"Recipe")}</p><h2>${escapeHtml(r.title)}</h2><p>${escapeHtml(r.story||"A family recipe ready for the table.")}</p><div class="meta"><span>⏱ ${escapeHtml(r.prep||"—")} prep</span><span>🔥 ${escapeHtml(r.cook||"—")} cook</span><span>🍽 Serves ${escapeHtml(r.serves||"—")}</span></div><div class="badges">${safeArray(r.tags).slice(0,4).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("")}</div></div><div class="feature-emoji">${escapeHtml(r.emoji||"🍽️")}</div>`;
  $("featured-card").onclick=()=>openRecipe(r.id);
}
function renderRecipes(){
  const q=search.value.trim().toLowerCase();
  const filtered=recipes.filter(r=>{const categoryMatch=activeCategory==="All"||r.category===activeCategory||(activeCategory==="Slow Cooker"&&safeArray(r.tags).includes("Slow Cooker"));return categoryMatch&&(!q||recipeSearchText(r).includes(q))});
  count.textContent=`${filtered.length} recipe${filtered.length===1?"":"s"}`;
  if(!filtered.length){grid.innerHTML='<div class="empty">No recipes found. Try another search or category.</div>';return}
  grid.innerHTML=filtered.map(r=>`<article class="recipe-card" tabindex="0" role="button" data-id="${r.id}"><div class="card-visual"><span class="category-pill">${escapeHtml(r.category)}</span>${isFavourite(r)?'<span class="favourite-ribbon">❤️ Favourite</span>':''}<span>${escapeHtml(r.emoji||"🍽️")}</span></div><div class="card-body"><h3>${escapeHtml(r.title)}</h3><p class="card-story">${escapeHtml(truncate(r.story||"A family recipe ready to cook."))}</p><div class="meta"><span>⏱ ${escapeHtml(r.prep||"—")}</span><span>🍽 ${escapeHtml(r.serves||"—")}</span></div><div class="badges">${safeArray(r.tags).filter(t=>t!=="Family Favourite").slice(0,3).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("")}</div></div></article>`).join("");
  grid.querySelectorAll(".recipe-card").forEach(card=>{const open=()=>openRecipe(card.dataset.id);card.onclick=open;card.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")open()}})
}
function openRecipe(id){
  const r=recipes.find(x=>x.id===id);if(!r)return;
  $("recipe-detail").innerHTML=`<section class="recipe-hero"><div class="detail-emoji">${escapeHtml(r.emoji||"🍽️")}</div><p class="kicker dark">${escapeHtml(r.category)}</p><h2>${escapeHtml(r.title)}</h2><div class="badges" style="justify-content:center">${safeArray(r.tags).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("")}</div></section><section class="recipe-body">${r.story?`<p class="detail-story">${escapeHtml(r.story)}</p>`:""}<div class="info-strip"><div class="info-box"><strong>Prep</strong>${escapeHtml(r.prep||"—")}</div><div class="info-box"><strong>Cook</strong>${escapeHtml(r.cook||"—")}</div><div class="info-box"><strong>Serves</strong>${escapeHtml(r.serves||"—")}</div></div><section class="recipe-section"><h3>🛒 Ingredients</h3><ul>${safeArray(r.ingredients).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></section><section class="recipe-section"><h3>👨‍🍳 Method</h3><ol>${safeArray(r.method).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ol></section>${safeArray(r.tips).length?`<section class="recipe-section tip-box"><h3>💡 Macca's Tips</h3><ul>${r.tips.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></section>`:""}<div class="detail-actions"><button class="primary-button" id="cook-mode-button">👨‍🍳 Start Cook Mode</button></div></section>`;
  $("recipe-dialog").showModal();
  $("cook-mode-button").onclick=()=>openCookMode(r);
}
function openCookMode(r){
  $("recipe-dialog").close();$("cook-title").textContent=r.title;
  $("cook-content").innerHTML=`<div class="info-strip"><div class="info-box"><strong>Prep</strong>${escapeHtml(r.prep||"—")}</div><div class="info-box"><strong>Cook</strong>${escapeHtml(r.cook||"—")}</div><div class="info-box"><strong>Serves</strong>${escapeHtml(r.serves||"—")}</div></div>${safeArray(r.method).map((step,i)=>`<article class="cook-step"><span>${i+1}</span><div>${escapeHtml(step)}</div></article>`).join("")}`;
  $("cook-dialog").showModal();
}

function renderBadgeOptions(){
  $("badge-options").innerHTML=STANDARD_BADGES.map((b,i)=>`<label class="badge-check"><input type="checkbox" value="${escapeHtml(b)}" id="badge-${i}"><span>${escapeHtml(b)}</span></label>`).join("");
}
function selectedTags(){
  const checked=[...document.querySelectorAll("#badge-options input:checked")].map(x=>x.value);
  return [...new Set([...checked,...customTags($("tags").value)])];
}
async function openManager(){
  if(!db){alert("Keep your existing configured config.js file when uploading Version 1.2.");return}
  const {data:{session}}=await db.auth.getSession();currentUser=session?.user||null;
  if(!currentUser){$("auth-dialog").showModal();return}
  $("signed-in-as").textContent=`Signed in as ${currentUser.email}`;renderManagerList();$("manager-dialog").showModal();
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();$("login-message").textContent="Signing in…";const {data,error}=await db.auth.signInWithPassword({email:$("login-email").value.trim(),password:$("login-password").value});if(error){$("login-message").textContent=error.message;return}currentUser=data.user;$("login-message").textContent="";$("auth-dialog").close();$("signed-in-as").textContent=`Signed in as ${currentUser.email}`;$("manager-dialog").showModal()});
$("sign-out-button").onclick=async()=>{await db.auth.signOut();currentUser=null;$("manager-dialog").close()};
$("recipe-form").addEventListener("submit",async e=>{e.preventDefault();const id=$("recipe-id").value;const payload={title:$("title").value.trim(),emoji:$("emoji").value.trim()||"🍽️",category:$("category").value,prep:$("prep").value.trim(),cook:$("cook").value.trim(),serves:$("serves").value.trim(),story:$("story").value.trim(),tags:selectedTags(),ingredients:lines($("ingredients").value),method:lines($("method").value),tips:lines($("tips").value),updated_at:new Date().toISOString()};$("save-message").textContent="Saving…";const result=id?await db.from("recipes").update(payload).eq("id",id):await db.from("recipes").insert(payload);if(result.error){$("save-message").textContent=result.error.message;return}$("save-message").textContent="Recipe saved beautifully.";$("save-message").classList.add("success");clearForm();await loadRecipes();switchManagerTab("library")});
function clearForm(){$("recipe-form").reset();$("recipe-id").value="";$("cancel-edit-button").hidden=true;$("save-message").textContent="";$("save-message").classList.remove("success")}
function editRecipe(id){const r=recipes.find(x=>x.id===id);if(!r)return;switchManagerTab("form");$("recipe-id").value=r.id;$("title").value=r.title||"";$("emoji").value=r.emoji||"";renderCategoryControls();$("category").value=r.category||"";$("prep").value=r.prep||"";$("cook").value=r.cook||"";$("serves").value=r.serves||"";$("story").value=r.story||"";$("ingredients").value=safeArray(r.ingredients).join("\n");$("method").value=safeArray(r.method).join("\n");$("tips").value=safeArray(r.tips).join("\n");document.querySelectorAll("#badge-options input").forEach(x=>x.checked=safeArray(r.tags).includes(x.value));$("tags").value=safeArray(r.tags).filter(t=>!STANDARD_BADGES.includes(t)).join(", ");$("cancel-edit-button").hidden=false;$("recipe-form").scrollIntoView({behavior:"smooth"})}
async function deleteRecipe(id){const r=recipes.find(x=>x.id===id);if(!r||!confirm(`Delete "${r.title}"?`))return;const {error}=await db.from("recipes").delete().eq("id",id);if(error){alert(error.message);return}await loadRecipes()}
function renderManagerList(){const list=$("manager-list");if(!list)return;$("manager-count").textContent=`${recipes.length} total`;if(!recipes.length){list.innerHTML='<p class="muted">No recipes yet.</p>';return}list.innerHTML=recipes.map(r=>`<div class="manager-row"><div><strong>${escapeHtml(r.emoji||"🍽️")} ${escapeHtml(r.title)}</strong><div class="muted">${escapeHtml(r.category)} · ${safeArray(r.tags).length} badge${safeArray(r.tags).length===1?"":"s"}</div></div><div class="manager-row-actions"><button class="secondary-button" data-edit="${r.id}">Edit</button><button class="danger-button" data-delete="${r.id}">Delete</button></div></div>`).join("");list.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editRecipe(b.dataset.edit));list.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteRecipe(b.dataset.delete))}

$("category-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=$("category-name").value.trim();
  const icon=$("category-icon").value.trim()||"🍽️";
  $("category-message").textContent="Adding category…";
  const {error}=await db.from("categories").insert({name,icon,sort_order:categories.length+1});
  if(error){
    $("category-message").textContent=error.code==="23505"?"That category already exists.":error.message;
    return;
  }
  $("category-form").reset();
  $("category-message").textContent="Category added.";
  $("category-message").classList.add("success");
  await loadRecipes();
});
async function deleteCategory(id){
  const c=categories.find(x=>x.id===id);
  if(!c)return;
  const inUse=recipes.some(r=>r.category===c.name);
  if(inUse){
    alert(`"${c.name}" is currently used by one or more recipes. Move those recipes to another category before deleting it.`);
    return;
  }
  if(!confirm(`Delete the "${c.name}" category?`))return;
  const {error}=await db.from("categories").delete().eq("id",id);
  if(error){alert(error.message);return}
  if(activeCategory===c.name)activeCategory="All";
  await loadRecipes();
}
function renderCategoryList(){
  const list=$("category-list");
  if(!list)return;
  if(!categories.length){list.innerHTML='<p class="muted">No categories yet.</p>';return}
  list.innerHTML=categories.map(c=>{
    const used=recipes.filter(r=>r.category===c.name).length;
    return `<div class="category-row"><div><span class="category-row-icon">${escapeHtml(c.icon||"🍽️")}</span><strong>${escapeHtml(c.name)}</strong><small>${used} recipe${used===1?"":"s"}</small></div><button class="danger-button" data-delete-category="${c.id}" ${used?"disabled title='Move recipes first'":""}>Delete</button></div>`;
  }).join("");
  list.querySelectorAll("[data-delete-category]").forEach(b=>b.onclick=()=>deleteCategory(b.dataset.deleteCategory));
}

function switchManagerTab(tab){document.querySelectorAll(".manager-tab").forEach(b=>b.classList.toggle("active",b.dataset.managerTab===tab));$("manager-form-panel").hidden=tab!=="form";$("manager-library-panel").hidden=tab!=="library";$("manager-categories-panel").hidden=tab!=="categories"}
document.querySelectorAll(".manager-tab").forEach(b=>b.onclick=()=>switchManagerTab(b.dataset.managerTab));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
search.addEventListener("input",renderRecipes);$("manager-button").onclick=openManager;$("cancel-edit-button").onclick=clearForm;
renderBadgeOptions();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"))}
loadRecipes();
