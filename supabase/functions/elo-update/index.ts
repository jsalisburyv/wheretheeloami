// Supabase Edge Function: elo-update.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const GameUpdateSchema = z.object({
  game_date: z.string().date(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { game_date } = GameUpdateSchema.parse(await req.json());
    console.log(`📅 Processing ELO for ${game_date}`);
    const [{ data: scores }, { data: flags }, { data: currentElos }] =
      await Promise.all([
        supabase.from('games').select('*').eq('game_date', game_date),
        supabase.from('feature_flags').select('name, enabled'),
        supabase.from('current_elos').select('*'),
      ]);
    // For now, let's allow any request with a valid Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Missing Authorization header',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (!scores || scores.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No scores found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const isEnabled = (flag) =>
      flags?.find((f) => f.name === flag)?.enabled ?? false;
    const K = 32;
    const updatedElos: Array<{
      user_id: string;
      basic_elo: number;
      margin_elo: number;
      updated_at: string;
    }> = [];
    const playerStats: Array<{
      user_id: string;
      last_played_date: string;
      last_win_date: string | null;
      current_win_streak: number;
    }> = [];
    const players = scores.map((s) => ({
      user_id: s.user_id,
      total: s.total_score,
    }));

    // One-vs-One Elo updates for all pairs who played
    const eloChanges = new Map();
    players.forEach((p) => eloChanges.set(p.user_id, { basic: 0, margin: 0 }));

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];

        // Get current Elo ratings
        const current1 =
          currentElos?.find((e) => e.user_id === p1.user_id) || null;
        const current2 =
          currentElos?.find((e) => e.user_id === p2.user_id) || null;
        const baseElo1 = current1?.basic_elo ?? 1500;
        const baseElo2 = current2?.basic_elo ?? 1500;

        // Calculate expected scores using standard Elo formula
        const r1 = Math.pow(10, baseElo1 / 400);
        const r2 = Math.pow(10, baseElo2 / 400);
        const e1 = r1 / (r1 + r2);
        const e2 = r2 / (r1 + r2);

        // Determine actual results
        let a1, a2;
        if (p1.total > p2.total) {
          a1 = 1;
          a2 = 0;
        } else if (p2.total > p1.total) {
          a1 = 0;
          a2 = 1;
        } else {
          a1 = 0.5;
          a2 = 0.5; // Tie
        }

        // Calculate margin of victory
        const margin = Math.abs(p1.total - p2.total);

        // Standard Elo changes
        const delta1_standard = K * (a1 - e1);
        const delta2_standard = K * (a2 - e2);

        // Margin of Victory (MOV) Elo changes
        const movScaling = 4000;
        const movMultiplier = Math.log(1 + margin / movScaling);
        const delta1_mov = K * movMultiplier * (a1 - e1);
        const delta2_mov = K * movMultiplier * (a2 - e2);

        // Accumulate changes
        const changes1 = eloChanges.get(p1.user_id);
        const changes2 = eloChanges.get(p2.user_id);
        changes1.basic += delta1_standard;
        changes1.margin += delta1_mov;
        changes2.basic += delta2_standard;
        changes2.margin += delta2_mov;
      }
    }

    // Apply accumulated changes and handle bonuses/penalties
    for (const p1 of players) {
      const current =
        currentElos?.find((e) => e.user_id === p1.user_id) || null;
      const baseElo = current?.basic_elo ?? 1500;
      const marginElo = current?.margin_elo ?? 1500;

      const changes = eloChanges.get(p1.user_id);
      let basicNew = Math.round(baseElo + changes.basic);
      let marginNew = Math.round(marginElo + changes.margin);

      // Determine if this player won (for streak tracking)
      const maxScore = Math.max(...players.map((p) => p.total));
      const isWinner = p1.total === maxScore;

      // Win streak bonuses
      let winStreak = 0;
      if (isEnabled('streak_bonus') && isWinner) {
        const { data: stats } = await supabase
          .from('player_stats')
          .select('current_win_streak')
          .eq('user_id', p1.user_id)
          .single();
        winStreak = stats?.current_win_streak ?? 0;
        if (winStreak >= 3) {
          basicNew += 5;
          marginNew += 5;
        }
      }

      // Elo decay for inactivity
      if (isEnabled('elo_decay')) {
        const { data: stats } = await supabase
          .from('player_stats')
          .select('last_played_date')
          .eq('user_id', p1.user_id)
          .single();
        if (stats?.last_played_date) {
          const daysInactive = Math.floor(
            (new Date(game_date).getTime() -
              new Date(stats.last_played_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysInactive >= 5) {
            basicNew -= 10;
            marginNew -= 10;
          }
        }
      }

      updatedElos.push({
        user_id: p1.user_id,
        basic_elo: basicNew,
        margin_elo: marginNew,
        updated_at: new Date().toISOString(),
      });

      playerStats.push({
        user_id: p1.user_id,
        last_played_date: game_date,
        last_win_date: isWinner ? game_date : null,
        current_win_streak: isWinner ? winStreak + 1 : 0,
      });
    }
    await Promise.all([
      supabase.from('current_elos').upsert(updatedElos),
      supabase.from('elo_history').insert(
        updatedElos.map((e) => ({
          user_id: e.user_id,
          game_date,
          basic_elo: e.basic_elo,
          margin_elo: e.margin_elo,
        }))
      ),
      supabase.from('player_stats').upsert(playerStats, {
        onConflict: 'user_id',
      }),
    ]);
    return new Response(
      JSON.stringify({
        success: true,
        updated: Object.fromEntries(
          updatedElos.map((e) => [
            e.user_id,
            {
              basic: e.basic_elo,
              margin: e.margin_elo,
            },
          ])
        ),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('❌ Error in ELO Update:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
