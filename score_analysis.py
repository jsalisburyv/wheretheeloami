import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import os


# Choose which Elo variant to use: "standard", "mov"

# --- Load CSV ---
def load_data(filepath):
    df = pd.read_csv(filepath, na_values=['X'])
    # Each row is a day, columns are player names
    df.index = range(1, len(df) + 1)  # Day numbers start at 1
    df.index.name = 'Day'
    return df

# --- ELO Calculation ---
def compute_elo(scores, method, k=32, starting_elo=1500, mov_scaling=4000):
    players = scores.columns.tolist()
    elo = {player: starting_elo for player in players}
    history = []

    for day, row in scores.iterrows():
        # Only consider players who played (not NaN)
        played = [p for p in players if not pd.isna(row[p])]
        day_elo = elo.copy()
        # OvO Elo updates for all pairs who played
        for i in range(len(played)):
            for j in range(i+1, len(played)):
                p1, p2 = played[i], played[j]
                s1, s2 = row[p1], row[p2]
                r1, r2 = 10 ** (elo[p1] / 400), 10 ** (elo[p2] / 400)
                e1, e2 = r1 / (r1 + r2), r2 / (r1 + r2)
                # Actual result
                if s1 > s2:
                    a1, a2 = 1, 0
                elif s2 > s1:
                    a1, a2 = 0, 1
                else:
                    a1 = a2 = 0.5
                margin = abs(s1 - s2)
                if method == "standard":
                    delta1 = k * (a1 - e1)
                    delta2 = k * (a2 - e2)
                elif method == "mov":
                    mov_multiplier = np.log(1 + margin / mov_scaling)
                    delta1 = k * mov_multiplier * (a1 - e1)
                    delta2 = k * mov_multiplier * (a2 - e2)
                elo[p1] += delta1
                elo[p2] += delta2
        # Record Elo for all players
        history.append({**{p: elo[p] for p in players}, 'Day': day})
    return pd.DataFrame(history).set_index('Day')

# --- Streak Tracker ---
def compute_streaks(scores):
    streaks = {player: 0 for player in scores.columns}
    best_streaks = {player: 0 for player in scores.columns}

    for _, row in scores.iterrows():
        # Find winners for this day (highest score among those who played)
        valid_scores = {p: row[p] for p in scores.columns if not pd.isna(row[p])}
        if not valid_scores:
            continue
        max_score = max(valid_scores.values())
        winners = [p for p, s in valid_scores.items() if s == max_score]
        for p in scores.columns:
            if p in winners:
                streaks[p] += 1
                best_streaks[p] = max(best_streaks[p], streaks[p])
            elif not pd.isna(row[p]):
                streaks[p] = 0
        # If player did not play, streak is unchanged
    return best_streaks

# --- Plotting ---
def generate_plots(scores, elo_histories):
    elo_history_mov, elo_history_std = elo_histories

    os.makedirs("plots", exist_ok=True)
    from matplotlib.gridspec import GridSpec
    plt.close('all')
    fig = plt.figure(figsize=(28, 15))
    gs = GridSpec(3, 3, width_ratios=[1,1,0.8])
    axes = [fig.add_subplot(gs[0,2]), fig.add_subplot(gs[1,2])]
    
    ax_scores = fig.add_subplot(gs[:2, 1])  # New axes for scores
    # Daily Scores + Rolling Averages (merged)
    colors = sns.color_palette(n_colors=len(scores.columns))
    for idx, player in enumerate(scores.columns):
        # Plot daily scores
        scores[player].plot(
            ax=ax_scores, linestyle='-', label=f"{player} Score", color=colors[idx]
        )
        # # Plot rolling averages
        # scores[player].rolling(window=3).mean().plot(
        #     ax=ax_scores, linestyle='--', label=f"{player} 3-Day Avg", color=colors[idx], alpha=0.7
        # )
        scores[player].rolling(window=5).mean().plot(
            ax=ax_scores, linestyle=':', label=f"{player} 5-Day Avg", color=colors[idx], alpha=0.7
        )
    ax_scores.set_title("Daily Scores & 5 Day Rolling Average")
    ax_scores.set_ylabel("")
    ax_scores.set_xlabel("")
    ax_scores.set_xticks([])
    ax_scores.yaxis.grid(True, which='major', linestyle='-', linewidth=0.7, alpha=0.7)
    ax_scores.minorticks_on()

    # Cumulative
    scores.cumsum().plot(ax=axes[0], title="Cumulative Scores", legend=False)
    axes[0].set_ylabel("")
    axes[0].set_xlabel("")
    axes[0].set_xticks([])
    axes[0].yaxis.grid(True, which='major', linestyle='-', linewidth=0.7, alpha=0.7)


    # Heatmap with winner border
    ax_hm = sns.heatmap(scores.T, fmt=".0f", cmap="coolwarm", cbar=True, ax=axes[1])
    axes[1].set_title("Heatmap of Scores")
    axes[1].set_xlabel("")
    axes[1].set_xticks([])
    # Add border to winner's cell for each day
    for day_idx, (_, row) in enumerate(scores.iterrows()):
        valid_scores = {p: row[p] for p in scores.columns if not pd.isna(row[p])}
        if not valid_scores:
            continue
        max_score = max(valid_scores.values())
        winners = [p for p, s in valid_scores.items() if s == max_score]
        for winner in winners:
            y = list(scores.columns).index(winner)
            x = day_idx
            rect = plt.Rectangle((x, y), 1, 1, fill=False, edgecolor='black', linewidth=2)
            axes[1].add_patch(rect)

   

    # ELO (overlapped) - new axes on left
    ax_elo = fig.add_subplot(gs[:, 0])
    for player in scores.columns:
        color = sns.color_palette()[list(scores.columns).index(player) % len(sns.color_palette())]
        ax_elo.plot(elo_history_mov.index, elo_history_mov[player], label=f"{player} (MOV)", linestyle='-', color=color)
        ax_elo.plot(elo_history_std.index, elo_history_std[player], label=f"{player} (Standard)", linestyle='--', color=color)
    ax_elo.set_title("ELO Rating Over Time (MOV vs Standard)")
    ax_elo.set_ylabel("")
    ax_elo.set_xlabel("")
    ax_elo.set_xticks([])
    ax_elo.yaxis.grid(True, which='major', linestyle='-', linewidth=0.7, alpha=0.7)
    ax_elo.legend()

    # --- Summary Section ---
    avg = scores.mean().to_dict()
    std = scores.std().to_dict()
    cum = scores.sum().to_dict()
    lowest = scores.min().to_dict()
    highest = scores.max().to_dict()
    # Win %: for each player, count days they had highest score among those who played
    win_counts = {p: 0 for p in scores.columns}
    total_played = {p: 0 for p in scores.columns}
    for _, row in scores.iterrows():
        valid_scores = {p: row[p] for p in scores.columns if not pd.isna(row[p])}
        if not valid_scores:
            continue
        max_score = max(valid_scores.values())
        winners = [p for p, s in valid_scores.items() if s == max_score]
        for p in valid_scores:
            total_played[p] += 1
        for w in winners:
            win_counts[w] += 1
    win_pct_dict = {p: round(win_counts[p]/total_played[p], 3) if total_played[p] > 0 else 0 for p in scores.columns}
    # Best streaks
    streaks = compute_streaks(scores)
    # Current streaks
    current_streaks = {p: 0 for p in scores.columns}
    for _, row in scores.iterrows():
        valid_scores = {p: row[p] for p in scores.columns if not pd.isna(row[p])}
        if not valid_scores:
            continue
        max_score = max(valid_scores.values())
        winners = [p for p, s in valid_scores.items() if s == max_score]
        for p in scores.columns:
            if p in winners:
                current_streaks[p] += 1
            elif not pd.isna(row[p]):
                current_streaks[p] = 0
    # Current ELO (using MOV variant)
    current_elo = elo_history_mov.iloc[-1].to_dict()

    max_elo = {p: elo_history_mov[p].max() for p in scores.columns}
    stat_names = [
        "Average",
        "Std Dev",
        "Lowest",
        "Highest",
        "Win %",
        "Best Streak",
        "Current Streak",
        "Cumulative",
        "Current ELO",
        "Max ELO"
    ]
    stat_dicts = [
        avg,
        std,
        lowest,
        highest,
        {p: win_pct_dict[p]*100 for p in scores.columns},
        streaks,
        current_streaks,
        cum,
        current_elo,
        max_elo
    ]
    summary_lines = []
    header = f"{'Stat':<16}  " + "  ".join([f"{p:<12}" for p in scores.columns])
    summary_lines.append(header)
    summary_lines.append("-" * (18 + 14*len(scores.columns)))
    for stat, stat_dict in zip(stat_names, stat_dicts):
        if stat in ["Lowest", "Highest", "Cumulative"]:
            line = f"{stat:<16}  " + "  ".join([f"{int(stat_dict[p]):<12}" if not pd.isna(stat_dict[p]) else f"{stat_dict[p]:<12}" for p in scores.columns])
        else:
            line = f"{stat:<16}  " + "  ".join([f"{stat_dict[p]:<12.2f}" if isinstance(stat_dict[p], float) else f"{stat_dict[p]:<12}" for p in scores.columns])
        summary_lines.append(line)
    summary_text = "\n".join(summary_lines)

    # Summary text below all charts
    fig.text(0.5, 0.02, summary_text, ha='left', va='bottom', fontsize=14, family='monospace', linespacing=1.5, wrap=True, bbox=dict(facecolor='white', alpha=0.9, boxstyle='round,pad=0.7'))

    import datetime
    today_str = datetime.datetime.now().strftime("%Y_%m_%d")
    plt.tight_layout()
    plt.savefig(f"plots/{today_str}.png")
    plt.clf()

# --- Summary Stats ---
def summarize(scores, elo_history_mov):
    # Win %: for each player, count days they had highest score among those who played
    win_counts = {p: 0 for p in scores.columns}
    total_played = {p: 0 for p in scores.columns}
    for _, row in scores.iterrows():
        valid_scores = {p: row[p] for p in scores.columns if not pd.isna(row[p])}
        if not valid_scores:
            continue
        max_score = max(valid_scores.values())
        winners = [p for p, s in valid_scores.items() if s == max_score]
        for p in valid_scores:
            total_played[p] += 1
        for w in winners:
            win_counts[w] += 1
    win_pct_dict = {p: round(win_counts[p]/total_played[p], 3) if total_played[p] > 0 else 0 for p in scores.columns}
    max_elo = {p: elo_history_mov[p].max() for p in scores.columns}
    summary = {
        "standard_deviation": scores.std().to_dict(),
        "win_percentage": win_pct_dict,
        "max_elo": max_elo
    }
    return summary

# --- Main Function ---
def analyze_scores(csv_path):
    scores = load_data(csv_path)
    print(scores)
    elo_history_mov = compute_elo(scores, method="mov")
    elo_history_std = compute_elo(scores, method="standard")
    streaks = compute_streaks(scores)
    summary = summarize(scores, elo_history_mov)

    generate_plots(scores, (elo_history_mov, elo_history_std))

    return {
        "final_elo": elo_history_mov.iloc[-1].to_dict(),
        "best_win_streaks": streaks,
        **summary
    }

# --- Run Example ---
if __name__ == "__main__":
    result = analyze_scores("scores.csv")
    for key, value in result.items():
        print(f"{key}:")
        if isinstance(value, dict):
            for k, v in value.items():
                if isinstance(v, float):
                    print(f"  {k}: {v:.2f}")
                else:
                    print(f"  {k}: {v}")
            print()
        else:
            print(f"{value}\n")
