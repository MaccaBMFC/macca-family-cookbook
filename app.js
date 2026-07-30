
const recipes = [
  {
    "id": "beef-ragu",
    "title": "Slow Cooker Beef Ragu",
    "emoji": "🍝",
    "category": "Beef",
    "tags": [
      "Kid Approved",
      "Freezer Friendly",
      "Slow Cooker",
      "High Iron"
    ],
    "prep": "20 minutes",
    "cook": "8 hours",
    "serves": "6",
    "story": "A rich family favourite that is even better the next day and freezes beautifully.",
    "ingredients": [
      "1 kg chuck steak, cut into large pieces",
      "1 onion, finely chopped",
      "2 carrots, finely chopped",
      "3 garlic cloves, crushed",
      "2 tbsp tomato paste",
      "800 g crushed tomatoes",
      "1 cup beef stock",
      "1 tsp dried oregano",
      "Salt and pepper",
      "Pappardelle and parmesan, to serve"
    ],
    "method": [
      "Season the beef. Brown it in batches in a hot pan, then transfer it to the slow cooker.",
      "Cook the onion and carrot for 5 minutes. Add the garlic and tomato paste and cook for another minute.",
      "Add everything to the slow cooker. Cook on LOW for 8 hours or until the beef pulls apart easily.",
      "Shred the beef, stir it through the sauce, and serve with pasta and parmesan."
    ],
    "tips": [
      "Freeze in meal-sized portions.",
      "Add a splash of pasta water before serving if the sauce is very thick.",
      "Serve with homemade bread or garlic bread."
    ]
  },
  {
    "id": "french-toast",
    "title": "Homemade Bread French Toast",
    "emoji": "🍞",
    "category": "Breakfast",
    "tags": [
      "Kid Approved",
      "Under 30 Minutes"
    ],
    "prep": "5 minutes",
    "cook": "10 minutes",
    "serves": "4",
    "story": "A brilliant use for the soft homemade loaf, especially once it is a day old.",
    "ingredients": [
      "8 slices homemade bread",
      "3 eggs",
      "3/4 cup milk",
      "1 tsp vanilla",
      "1/2 tsp cinnamon",
      "Butter, for cooking",
      "Fruit, yoghurt or maple syrup, to serve"
    ],
    "method": [
      "Whisk the eggs, milk, vanilla and cinnamon in a shallow bowl.",
      "Dip each slice briefly on both sides. Do not leave very soft bread soaking.",
      "Cook in a buttered frying pan over medium heat for 2–3 minutes per side.",
      "Serve immediately with your preferred toppings."
    ],
    "tips": [
      "Lay very soft slices out for 20–30 minutes before dipping.",
      "Cut into fingers for younger kids."
    ]
  },
  {
    "id": "thai-snapper-noodles",
    "title": "Thai Snapper with Fresh Noodles",
    "emoji": "🐟",
    "category": "Seafood",
    "tags": [
      "Kid Approved",
      "Under 30 Minutes",
      "Healthy Choice"
    ],
    "prep": "10 minutes",
    "cook": "15 minutes",
    "serves": "4",
    "story": "A light, quick dinner that keeps the Thai flavours gentle enough for the kids.",
    "ingredients": [
      "4 king snapper fillets",
      "500 g fresh Thai-style noodles",
      "1 carrot, julienned",
      "1 capsicum, sliced",
      "2 tbsp soy sauce",
      "1 tbsp honey",
      "1 tsp sesame oil",
      "1 lime",
      "Neutral oil, for cooking"
    ],
    "method": [
      "Mix the soy sauce, honey, sesame oil and half the lime juice.",
      "Cook the vegetables in a hot wok for 3–4 minutes. Add the noodles and sauce and toss until hot.",
      "Pan-fry the snapper in a little oil until opaque and flaky.",
      "Serve the fish over the noodles with the remaining lime."
    ],
    "tips": [
      "Keep chilli on the table for adults rather than adding it to the whole dish.",
      "Do not overcook the snapper."
    ]
  }
];

const grid = document.getElementById('recipe-grid');
const search = document.getElementById('search');
const count = document.getElementById('count');
const dialog = document.getElementById('recipe-dialog');
const detail = document.getElementById('recipe-detail');
const closeDialog = document.getElementById('close-dialog');
let activeCategory = 'All';

function matchesRecipe(recipe, query) {
  const haystack = [
    recipe.title,
    recipe.category,
    recipe.story,
    ...recipe.tags,
    ...recipe.ingredients
  ].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function render() {
  const q = search.value.trim();
  const filtered = recipes.filter(recipe => {
    const categoryMatch =
      activeCategory === 'All' ||
      recipe.category === activeCategory ||
      (activeCategory === 'Slow Cooker' && recipe.tags.includes('Slow Cooker'));
    return categoryMatch && (!q || matchesRecipe(recipe, q));
  });

  count.textContent = `${filtered.length} recipe${filtered.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">No recipes found. Try another search.</div>';
    return;
  }

  grid.innerHTML = filtered.map(recipe => `
    <article class="card" tabindex="0" role="button" data-id="${recipe.id}">
      <div class="card-icon">${recipe.emoji}</div>
      <p class="eyebrow dark">${recipe.category}</p>
      <h3>${recipe.title}</h3>
      <p>${recipe.story}</p>
      <div class="meta">
        <span>⏱ ${recipe.prep} prep</span>
        <span>🍽 Serves ${recipe.serves}</span>
      </div>
      <div class="badges">
        ${recipe.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.card').forEach(card => {
    const open = () => openRecipe(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') open();
    });
  });
}

function openRecipe(id) {
  const r = recipes.find(recipe => recipe.id === id);
  detail.innerHTML = `
    <div class="card-icon">${r.emoji}</div>
    <p class="eyebrow dark">${r.category}</p>
    <h2>${r.title}</h2>
    <div class="badges">${r.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}</div>
    <p class="story">${r.story}</p>

    <div class="info-strip">
      <div class="info-box"><strong>Prep</strong>${r.prep}</div>
      <div class="info-box"><strong>Cook</strong>${r.cook}</div>
      <div class="info-box"><strong>Serves</strong>${r.serves}</div>
    </div>

    <section class="recipe-section">
      <h3>🛒 Ingredients</h3>
      <ul>${r.ingredients.map(item => `<li>${item}</li>`).join('')}</ul>
    </section>

    <section class="recipe-section">
      <h3>👨‍🍳 Method</h3>
      <ol>${r.method.map(step => `<li>${step}</li>`).join('')}</ol>
    </section>

    <section class="recipe-section tip-box">
      <h3>💡 Macca's Tips</h3>
      <ul>${r.tips.map(tip => `<li>${tip}</li>`).join('')}</ul>
    </section>
  `;
  dialog.showModal();
}

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    activeCategory = button.dataset.category;
    render();
  });
});

search.addEventListener('input', render);
closeDialog.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {
  if (e.target === dialog) dialog.close();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

render();
