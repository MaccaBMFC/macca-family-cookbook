
const cfg = window.MACCA_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("PASTE_")
  && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_");

const db = configured
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY)
  : null;

let recipes = [];
let activeCategory = "All";
let currentUser = null;

const $ = id => document.getElementById(id);
const grid = $("recipe-grid");
const search = $("search");
const count = $("count");
const statusBox = $("status");
const recipeDialog = $("recipe-dialog");
const authDialog = $("auth-dialog");
const managerDialog = $("manager-dialog");

function lines(value) {
  return value.split("\n").map(x => x.trim()).filter(Boolean);
}
function tags(value) {
  return value.split(",").map(x => x.trim()).filter(Boolean);
}
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
function showStatus(message) {
  statusBox.textContent = message;
  statusBox.hidden = !message;
}
function matchesRecipe(recipe, query) {
  const haystack = [
    recipe.title, recipe.category, recipe.story,
    ...safeArray(recipe.tags), ...safeArray(recipe.ingredients)
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

async function loadRecipes() {
  if (!db) {
    showStatus("Supabase is not connected yet. Add your project URL and publishable key to config.js.");
    grid.innerHTML = '<div class="empty">Complete the Supabase setup to load recipes.</div>';
    return;
  }
  showStatus("Loading recipes…");
  const { data, error } = await db.from("recipes").select("*").order("title");
  if (error) {
    showStatus(`Could not load recipes: ${error.message}`);
    return;
  }
  recipes = data || [];
  showStatus("");
  render();
  renderManagerList();
}

function render() {
  const q = search.value.trim();
  const filtered = recipes.filter(recipe => {
    const categoryMatch = activeCategory === "All"
      || recipe.category === activeCategory
      || (activeCategory === "Slow Cooker" && safeArray(recipe.tags).includes("Slow Cooker"));
    return categoryMatch && (!q || matchesRecipe(recipe, q));
  });

  count.textContent = `${filtered.length} recipe${filtered.length === 1 ? "" : "s"}`;
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">No recipes found.</div>';
    return;
  }

  grid.innerHTML = filtered.map(recipe => `
    <article class="card" tabindex="0" role="button" data-id="${recipe.id}">
      <div class="card-icon">${recipe.emoji || "🍽️"}</div>
      <p class="eyebrow dark">${recipe.category}</p>
      <h3>${recipe.title}</h3>
      <p>${recipe.story || ""}</p>
      <div class="meta"><span>⏱ ${recipe.prep || "—"} prep</span><span>🍽 Serves ${recipe.serves || "—"}</span></div>
      <div class="badges">${safeArray(recipe.tags).map(tag => `<span class="badge">${tag}</span>`).join("")}</div>
    </article>`).join("");

  document.querySelectorAll(".card").forEach(card => {
    const open = () => openRecipe(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") open();
    });
  });
}

function openRecipe(id) {
  const r = recipes.find(recipe => recipe.id === id);
  if (!r) return;
  $("recipe-detail").innerHTML = `
    <div class="card-icon">${r.emoji || "🍽️"}</div>
    <p class="eyebrow dark">${r.category}</p>
    <h2>${r.title}</h2>
    <div class="badges">${safeArray(r.tags).map(tag => `<span class="badge">${tag}</span>`).join("")}</div>
    ${r.story ? `<p class="story">${r.story}</p>` : ""}
    <div class="info-strip">
      <div class="info-box"><strong>Prep</strong>${r.prep || "—"}</div>
      <div class="info-box"><strong>Cook</strong>${r.cook || "—"}</div>
      <div class="info-box"><strong>Serves</strong>${r.serves || "—"}</div>
    </div>
    <section class="recipe-section"><h3>🛒 Ingredients</h3><ul>${safeArray(r.ingredients).map(x => `<li>${x}</li>`).join("")}</ul></section>
    <section class="recipe-section"><h3>👨‍🍳 Method</h3><ol>${safeArray(r.method).map(x => `<li>${x}</li>`).join("")}</ol></section>
    ${safeArray(r.tips).length ? `<section class="recipe-section tip-box"><h3>💡 Macca's Tips</h3><ul>${r.tips.map(x => `<li>${x}</li>`).join("")}</ul></section>` : ""}
  `;
  recipeDialog.showModal();
}

async function openManager() {
  if (!db) {
    alert("Connect Supabase in config.js first.");
    return;
  }
  const { data: { session } } = await db.auth.getSession();
  currentUser = session?.user || null;
  if (!currentUser) {
    authDialog.showModal();
    return;
  }
  $("signed-in-as").textContent = `Signed in as ${currentUser.email}`;
  renderManagerList();
  managerDialog.showModal();
}

$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  $("login-message").textContent = "Signing in…";
  const { data, error } = await db.auth.signInWithPassword({
    email: $("login-email").value.trim(),
    password: $("login-password").value
  });
  if (error) {
    $("login-message").textContent = error.message;
    return;
  }
  currentUser = data.user;
  $("login-message").textContent = "";
  authDialog.close();
  $("signed-in-as").textContent = `Signed in as ${currentUser.email}`;
  managerDialog.showModal();
});

$("sign-out-button").addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  managerDialog.close();
});

$("recipe-form").addEventListener("submit", async event => {
  event.preventDefault();
  const id = $("recipe-id").value;
  const payload = {
    title: $("title").value.trim(),
    emoji: $("emoji").value.trim() || "🍽️",
    category: $("category").value,
    prep: $("prep").value.trim(),
    cook: $("cook").value.trim(),
    serves: $("serves").value.trim(),
    story: $("story").value.trim(),
    tags: tags($("tags").value),
    ingredients: lines($("ingredients").value),
    method: lines($("method").value),
    tips: lines($("tips").value),
    updated_at: new Date().toISOString()
  };

  $("save-message").textContent = "Saving…";
  let result;
  if (id) {
    result = await db.from("recipes").update(payload).eq("id", id);
  } else {
    result = await db.from("recipes").insert(payload);
  }
  if (result.error) {
    $("save-message").textContent = result.error.message;
    return;
  }
  $("save-message").textContent = "Recipe saved.";
  $("save-message").classList.add("success");
  clearForm();
  await loadRecipes();
});

function clearForm() {
  $("recipe-form").reset();
  $("recipe-id").value = "";
  $("cancel-edit-button").hidden = true;
  $("save-message").textContent = "";
  $("save-message").classList.remove("success");
}

function editRecipe(id) {
  const r = recipes.find(x => x.id === id);
  if (!r) return;
  $("recipe-id").value = r.id;
  $("title").value = r.title || "";
  $("emoji").value = r.emoji || "";
  $("category").value = r.category || "";
  $("prep").value = r.prep || "";
  $("cook").value = r.cook || "";
  $("serves").value = r.serves || "";
  $("story").value = r.story || "";
  $("tags").value = safeArray(r.tags).join(", ");
  $("ingredients").value = safeArray(r.ingredients).join("\n");
  $("method").value = safeArray(r.method).join("\n");
  $("tips").value = safeArray(r.tips).join("\n");
  $("cancel-edit-button").hidden = false;
  $("recipe-form").scrollIntoView({ behavior: "smooth" });
}

async function deleteRecipe(id) {
  const r = recipes.find(x => x.id === id);
  if (!r || !confirm(`Delete "${r.title}"?`)) return;
  const { error } = await db.from("recipes").delete().eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadRecipes();
}

function renderManagerList() {
  const list = $("manager-list");
  if (!list) return;
  if (!recipes.length) {
    list.innerHTML = '<p class="muted">No recipes yet.</p>';
    return;
  }
  list.innerHTML = recipes.map(r => `
    <div class="manager-row">
      <div><strong>${r.emoji || "🍽️"} ${r.title}</strong><div class="muted">${r.category}</div></div>
      <div class="manager-row-actions">
        <button class="secondary-button" data-edit="${r.id}">Edit</button>
        <button class="danger-button" data-delete="${r.id}">Delete</button>
      </div>
    </div>`).join("");
  list.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editRecipe(b.dataset.edit));
  list.querySelectorAll("[data-delete]").forEach(b => b.onclick = () => deleteRecipe(b.dataset.delete));
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.dataset.category;
    render();
  });
});
document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => $(button.dataset.close).close());
});
search.addEventListener("input", render);
$("manager-button").addEventListener("click", openManager);
$("cancel-edit-button").addEventListener("click", clearForm);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}
loadRecipes();
