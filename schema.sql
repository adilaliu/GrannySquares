-- Granny Squares — Supabase schema (Auth + DB + RLS)
-- Paste into Supabase SQL editor. Idempotent-ish (drops only where safe).

-- Extensions ---------------------------------------------------------------
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- Helpers -----------------------------------------------------------------
create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select regexp_replace(lower(unaccent(coalesce(txt,''))), '[^a-z0-9]+', '-', 'g')
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles (User table linked to auth.users) ------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (length(handle) between 3 and 30),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Recipes -----------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,

  title text not null,
  slug text unique,
  description_md text,

  yield_text text,
  total_time_min int,
  active_time_min int,
  cuisine text,
  difficulty text check (difficulty in ('easy','medium','hard') or difficulty is null),

  diet_tags text[] default '{}', -- e.g. {'vegetarian','vegan','halal','kosher','gluten-free'}
  allergen_tags text[] default '{}', -- e.g. {'egg','dairy','peanut','tree-nut','soy','shellfish','gluten','sesame'}

  hero_image_url text,
  nutrition_json jsonb,
  public boolean not null default true,

  -- simple full-text
  tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description_md,'')), 'C')
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_created_at_idx on public.recipes (created_at desc);
create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_tsv_idx on public.recipes using gin (tsv);
create index if not exists recipes_diet_tags_idx on public.recipes using gin (diet_tags);

create trigger trg_recipes_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

create or replace function public.recipes_set_slug()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' or (new.title is distinct from old.title)) then
    new.slug := public.slugify(new.title);
    -- ensure uniqueness by appending short suffix if needed
    if new.slug is null or new.slug = '' then new.slug := substring(new.id::text,1,8); end if;
    if exists (select 1 from public.recipes r where r.slug = new.slug and r.id <> new.id) then
      new.slug := new.slug || '-' || substring(new.id::text,1,6);
    end if;
  end if;
  return new;
end $$;

create trigger trg_recipes_set_slug
before insert or update of title on public.recipes
for each row execute function public.recipes_set_slug();

alter table public.recipes enable row level security;

-- Ingredients -------------------------------------------------------------
create table if not exists public.ingredients (
  recipe_id uuid references public.recipes(id) on delete cascade,
  idx int not null,
  quantity numeric,
  unit text,
  item text not null,
  notes text,
  primary key (recipe_id, idx)
);

create index if not exists ingredients_recipe_idx on public.ingredients (recipe_id);
alter table public.ingredients enable row level security;

-- Steps -------------------------------------------------------------------
create table if not exists public.steps (
  recipe_id uuid references public.recipes(id) on delete cascade,
  idx int not null,
  instruction text not null,
  timer_seconds int,
  temperature_c int,
  tool text,
  tip text,
  image_url text,
  primary key (recipe_id, idx)
);

create index if not exists steps_recipe_idx on public.steps (recipe_id);
alter table public.steps enable row level security;

-- Substitutions -----------------------------------------------------------
create table if not exists public.substitutions (
  recipe_id uuid references public.recipes(id) on delete cascade,
  ingredient_idx int not null,
  suggestion text not null,
  primary key (recipe_id, ingredient_idx, suggestion)
);

alter table public.substitutions enable row level security;

-- Images ------------------------------------------------------------------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists images_recipe_idx on public.images (recipe_id);
alter table public.images enable row level security;

-- Comments ----------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  body_md text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_recipe_idx on public.comments (recipe_id);
create index if not exists comments_user_idx on public.comments (user_id);
alter table public.comments enable row level security;

-- Likes -------------------------------------------------------------------
create table if not exists public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists likes_recipe_idx on public.likes (recipe_id);
create index if not exists likes_user_idx on public.likes (user_id);
alter table public.likes enable row level security;

-- ========== RLS POLICIES (clean re-create) ==========

-- PROFILES
drop policy if exists profiles_read_public on public.profiles;
create policy profiles_read_public
  on public.profiles for select
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id);

-- RECIPES
drop policy if exists recipes_select_public_or_own on public.recipes;
create policy recipes_select_public_or_own
  on public.recipes for select
  using (public or auth.uid() = user_id);

drop policy if exists recipes_insert_auth on public.recipes;
create policy recipes_insert_auth
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists recipes_update_own on public.recipes;
create policy recipes_update_own
  on public.recipes for update
  using (auth.uid() = user_id);

drop policy if exists recipes_delete_own on public.recipes;
create policy recipes_delete_own
  on public.recipes for delete
  using (auth.uid() = user_id);

-- INGREDIENTS (inherit recipe ownership)
drop policy if exists ingredients_select_public_or_own on public.ingredients;
create policy ingredients_select_public_or_own
  on public.ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.public or r.user_id = auth.uid())
    )
  );

drop policy if exists ingredients_write_own on public.ingredients;
create policy ingredients_write_own
  on public.ingredients for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- STEPS
drop policy if exists steps_select_public_or_own on public.steps;
create policy steps_select_public_or_own
  on public.steps for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.public or r.user_id = auth.uid())
    )
  );

drop policy if exists steps_write_own on public.steps;
create policy steps_write_own
  on public.steps for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- SUBSTITUTIONS
drop policy if exists subs_select_public_or_own on public.substitutions;
create policy subs_select_public_or_own
  on public.substitutions for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.public or r.user_id = auth.uid())
    )
  );

drop policy if exists subs_write_own on public.substitutions;
create policy subs_write_own
  on public.substitutions for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- IMAGES
drop policy if exists images_select_public_or_own on public.images;
create policy images_select_public_or_own
  on public.images for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.public or r.user_id = auth.uid())
    )
  );

drop policy if exists images_write_own on public.images;
create policy images_write_own
  on public.images for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- COMMENTS
drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
  on public.comments for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.public or r.user_id = auth.uid())
    )
  );

drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth
  on public.comments for insert
  with check (auth.uid() is not null);

drop policy if exists comments_delete_own_or_recipe_owner on public.comments;
create policy comments_delete_own_or_recipe_owner
  on public.comments for delete
  using (
    auth.uid() = user_id or exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- LIKES
drop policy if exists likes_select_public on public.likes;
create policy likes_select_public
  on public.likes for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.public or r.user_id = auth.uid())
    )
  );

drop policy if exists likes_upsert_auth on public.likes;
create policy likes_upsert_auth
  on public.likes for insert
  with check (auth.uid() = user_id);

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own
  on public.likes for delete
  using (auth.uid() = user_id);

-- Enable RLS explicitly (safety)
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.steps enable row level security;
alter table public.substitutions enable row level security;
alter table public.images enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;

-- Add missing insert policy for profiles table
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
