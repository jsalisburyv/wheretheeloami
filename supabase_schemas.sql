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

create table public.elos (
  user_id uuid not null,
  basic_elo integer null default 1000,
  margin_elo integer null default 1000,
  updated_at timestamp without time zone null default now(),
  constraint elos_pkey primary key (user_id),
  constraint elos_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.feature_flags (
  name text not null,
  enabled boolean null default true,
  constraint feature_flags_pkey primary key (name)
) TABLESPACE pg_default;

create table public.games (
  id uuid not null default gen_random_uuid (),
  game_date date not null,
  user_id uuid null,
  round1_score integer null,
  round2_score integer null,
  round3_score integer null,
  total_score integer GENERATED ALWAYS as (((round1_score + round2_score) + round3_score)) STORED null,
  submitted_at timestamp without time zone null default now(),
  constraint games_pkey primary key (id),
  constraint games_game_date_user_id_key unique (game_date, user_id),
  constraint games_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint games_round1_score_check check (
    (
      (round1_score >= 0)
      and (round1_score <= 5000)
    )
  ),
  constraint games_round2_score_check check (
    (
      (round2_score >= 0)
      and (round2_score <= 5000)
    )
  ),
  constraint games_round3_score_check check (
    (
      (round3_score >= 0)
      and (round3_score <= 5000)
    )
  )
) TABLESPACE pg_default;

create table public.player_stats (
  user_id uuid not null,
  current_win_streak integer null default 0,
  last_win_date date null,
  last_played_date date null,
  total_wins integer null default 0,
  total_games integer null default 0,
  constraint player_stats_pkey primary key (user_id),
  constraint player_stats_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;