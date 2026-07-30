-- THE MACCA FAMILY COOKBOOK — SUPABASE SETUP
-- Run this entire script in Supabase Dashboard → SQL Editor → New query.

create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text default '🍽️',
  category text not null,
  prep text,
  cook text,
  serves text,
  story text,
  tags jsonb not null default '[]'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  method jsonb not null default '[]'::jsonb,
  tips jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

drop policy if exists "Public can read recipes" on public.recipes;
create policy "Public can read recipes"
on public.recipes for select
to anon, authenticated
using (true);

drop policy if exists "Signed in users can add recipes" on public.recipes;
create policy "Signed in users can add recipes"
on public.recipes for insert
to authenticated
with check (true);

drop policy if exists "Signed in users can update recipes" on public.recipes;
create policy "Signed in users can update recipes"
on public.recipes for update
to authenticated
using (true)
with check (true);

drop policy if exists "Signed in users can delete recipes" on public.recipes;
create policy "Signed in users can delete recipes"
on public.recipes for delete
to authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.recipes to anon, authenticated;
grant insert, update, delete on public.recipes to authenticated;

-- Starter recipes. Safe to run once.
insert into public.recipes
(title, emoji, category, prep, cook, serves, story, tags, ingredients, method, tips)
select * from (values
(
  'Slow Cooker Beef Ragu','🍝','Beef','20 minutes','8 hours','6',
  'A rich family favourite that is even better the next day and freezes beautifully.',
  '["Kid Approved","Freezer Friendly","Slow Cooker","High Iron"]'::jsonb,
  '["1 kg chuck steak, cut into large pieces","1 onion, finely chopped","2 carrots, finely chopped","3 garlic cloves, crushed","2 tbsp tomato paste","800 g crushed tomatoes","1 cup beef stock","1 tsp dried oregano","Salt and pepper","Pappardelle and parmesan, to serve"]'::jsonb,
  '["Season the beef. Brown it in batches in a hot pan, then transfer it to the slow cooker.","Cook the onion and carrot for 5 minutes. Add the garlic and tomato paste and cook for another minute.","Add everything to the slow cooker. Cook on LOW for 8 hours or until the beef pulls apart easily.","Shred the beef, stir it through the sauce, and serve with pasta and parmesan."]'::jsonb,
  '["Freeze in meal-sized portions.","Add a splash of pasta water before serving if the sauce is very thick.","Serve with homemade bread or garlic bread."]'::jsonb
),
(
  'Homemade Bread French Toast','🍞','Breakfast','5 minutes','10 minutes','4',
  'A brilliant use for the soft homemade loaf, especially once it is a day old.',
  '["Kid Approved","Under 30 Minutes"]'::jsonb,
  '["8 slices homemade bread","3 eggs","3/4 cup milk","1 tsp vanilla","1/2 tsp cinnamon","Butter, for cooking","Fruit, yoghurt or maple syrup, to serve"]'::jsonb,
  '["Whisk the eggs, milk, vanilla and cinnamon in a shallow bowl.","Dip each slice briefly on both sides. Do not leave very soft bread soaking.","Cook in a buttered frying pan over medium heat for 2–3 minutes per side.","Serve immediately with your preferred toppings."]'::jsonb,
  '["Lay very soft slices out for 20–30 minutes before dipping.","Cut into fingers for younger kids."]'::jsonb
),
(
  'Thai Snapper with Fresh Noodles','🐟','Seafood','10 minutes','15 minutes','4',
  'A light, quick dinner that keeps the Thai flavours gentle enough for the kids.',
  '["Kid Approved","Under 30 Minutes","Healthy Choice"]'::jsonb,
  '["4 king snapper fillets","500 g fresh Thai-style noodles","1 carrot, julienned","1 capsicum, sliced","2 tbsp soy sauce","1 tbsp honey","1 tsp sesame oil","1 lime","Neutral oil, for cooking"]'::jsonb,
  '["Mix the soy sauce, honey, sesame oil and half the lime juice.","Cook the vegetables in a hot wok for 3–4 minutes. Add the noodles and sauce and toss until hot.","Pan-fry the snapper in a little oil until opaque and flaky.","Serve the fish over the noodles with the remaining lime."]'::jsonb,
  '["Keep chilli on the table for adults rather than adding it to the whole dish.","Do not overcook the snapper."]'::jsonb
)) as starter(title,emoji,category,prep,cook,serves,story,tags,ingredients,method,tips)
where not exists (select 1 from public.recipes);
