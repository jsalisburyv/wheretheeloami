create table public.current_elos (
  user_id uuid not null,
  basic_elo integer null default 1000,
  margin_elo integer null default 1000,
  updated_at timestamp without time zone null default now(),
  constraint elos_pkey primary key (user_id),
  constraint elos_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.elo_history (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  game_date date not null,
  basic_elo integer null,
  margin_elo integer null,
  created_at timestamp without time zone null default now(),
  constraint elo_history_pkey primary key (id),
  constraint elo_history_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.feature_flags (
  name text not null,
  enabled boolean null default true,
  description text null,
  constraint feature_flags_pkey primary key (name)
) TABLESPACE pg_default;

create table public.feature_flags (
  name text not null,
  enabled boolean null default true,
  description text null,
  constraint feature_flags_pkey primary key (name)
) TABLESPACE pg_default;

create table public.player_stats (
  user_id uuid not null,
  current_win_streak integer null default 0,
  last_win_date date null,
  last_played_date date null,
  total_wins integer null default 0,
  total_games integer null default 0,
  max_win_streak integer null default 0,
  constraint player_stats_pkey primary key (user_id),
  constraint player_stats_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  display_name text null,
  email text null,
  avatar_url text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;