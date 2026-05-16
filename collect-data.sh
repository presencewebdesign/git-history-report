#!/usr/bin/env bash
# collect-data.sh
# Outputs git commit analysis as JSON for the web dashboard
#
# Usage: ./collect-data.sh <start-date> <end-date> <repo-path> [jira-key]
#
# Team members can be passed via the TEAM_CONFIG environment variable.
# Format: newline-separated "username:Git Author Pattern" entries.
# Example:  TEAM_CONFIG="alice:Alice Smith\|alice-gh
#            bob:Bob Jones"
# If TEAM_CONFIG is empty or unset, all authors are analysed.

START_DATE=$1
END_DATE=$2
REPO_PATH=$3
JIRA_KEY=${4:-}
JIRA_REGEX="a^"
[ -n "$JIRA_KEY" ] && JIRA_REGEX="${JIRA_KEY}-[0-9]+"

TEAM=()
if [ -n "$TEAM_CONFIG" ]; then
    while IFS= read -r line; do
        line="$(echo "$line" | xargs)"
        [ -n "$line" ] && TEAM+=("$line")
    done <<< "$TEAM_CONFIG"
fi

get_author_filter() { for entry in "${TEAM[@]}"; do [[ "${entry%%:*}" == "$1" ]] && echo "${entry#*:}" && return; done; }

AUTHOR_FILTER=""
USERNAMES=()
AUTHOR_NORMALISE_SED=""
TEAM_MODE="specific"

if [ ${#TEAM[@]} -eq 0 ]; then
    TEAM_MODE="all"
else
    for entry in "${TEAM[@]}"; do
        username="${entry%%:*}"
        pattern="${entry#*:}"
        USERNAMES+=("$username")
        [[ -z "$AUTHOR_FILTER" ]] && AUTHOR_FILTER="$pattern" || AUTHOR_FILTER="$AUTHOR_FILTER\|$pattern"
        IFS='|' read -ra aliases <<< "${pattern//\\|/|}"
        for alias in "${aliases[@]}"; do
            [[ "$alias" != "$username" ]] && AUTHOR_NORMALISE_SED+="s|${alias}|${username}|;"
        done
    done
fi

if [ -z "$START_DATE" ] || [ -z "$END_DATE" ] || [ -z "$REPO_PATH" ]; then
    echo '{"error":"Usage: collect-data.sh <start-date> <end-date> <repo-path> [jira-key]"}' >&2
    exit 1
fi

cd "$REPO_PATH" || { echo '{"error":"Could not cd to repo path"}' >&2; exit 1; }

if [ "$TEAM_MODE" = "all" ]; then
    all_authors=()
    while IFS= read -r author_line; do
        all_authors+=("$author_line")
    done < <(git log --since="$START_DATE" --until="$END_DATE" --pretty=format:"%an|%ae" | sort -u)
    for author_line in "${all_authors[@]}"; do
        IFS='|' read -r name email <<< "$author_line"
        [ -n "$name" ] && USERNAMES+=("$name ($email)")
    done
    get_author_filter() {
        local search="$1"
        for author_line in "${all_authors[@]}"; do
            IFS='|' read -r name email <<< "$author_line"
            local display="$name ($email)"
            [[ "$display" == "$search" ]] && echo "$name" && return
        done
    }
fi

git_log_filtered() {
    if [ -n "$AUTHOR_FILTER" ]; then
        git log --since="$START_DATE" --until="$END_DATE" --author="$AUTHOR_FILTER" "$@"
    else
        git log --since="$START_DATE" --until="$END_DATE" "$@"
    fi
}

git_log_for_author() {
    local author_filter="$1"
    shift
    git log --since="$START_DATE" --until="$END_DATE" --author="$author_filter" "$@"
}

escape_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

# ---------- Collect Data ----------

COMMIT_COUNT=$(git_log_filtered --oneline | wc -l | tr -d ' ')

# Commits by author
commits_by_author_json="["
first=1
git_log_filtered --pretty=format:"%an" | sed "${AUTHOR_NORMALISE_SED:-}" | sort | uniq -c | sort -rn | while read count author; do
    [ $first -eq 1 ] && first=0 || printf ','
    printf '{"author":"%s","commits":%d}' "$(escape_json "$author")" "$count"
done > /tmp/cba_$$.json
commits_by_author_json="[$(cat /tmp/cba_$$.json)]"
rm -f /tmp/cba_$$.json

# Commit activity by date
commit_activity_json="["
git_log_filtered --pretty=format:"%ad" --date=short | sort | uniq -c | sort -k2 | while read count date; do
    printf '{"date":"%s","commits":%d},' "$date" "$count"
done | sed 's/,$//' > /tmp/ca_$$.json
commit_activity_json="[$(cat /tmp/ca_$$.json)]"
rm -f /tmp/ca_$$.json

# Files changed
FILES_CHANGED=$(git_log_filtered --name-only --pretty=format: | sort | uniq | grep -v '^$' | wc -l | tr -d ' ')

# Top 10 changed files
git_log_filtered --name-only --pretty=format: | grep -v '^$' | sort | uniq -c | sort -rn | head -10 | while read count file; do
    printf '{"file":"%s","changes":%d},' "$(escape_json "$file")" "$count"
done | sed 's/,$//' > /tmp/tcf_$$.json
top_changed_files_json="[$(cat /tmp/tcf_$$.json)]"
rm -f /tmp/tcf_$$.json

# Lines changed
STATS=$(git_log_filtered --shortstat | grep -E "fil(e|es) changed" | awk '{files+=$1; inserted+=$4; deleted+=$6} END {print files, inserted, deleted}')
read files inserted deleted <<< "$STATS"
files=${files:-0}; inserted=${inserted:-0}; deleted=${deleted:-0}
net=$((inserted - deleted))

# Lines by file type
git_log_filtered --numstat --pretty=format:"" | awk '
NF==3 && $1 != "-" {
    file = $3
    n = split(file, parts, ".")
    if (n > 1 && index(parts[n], "/") == 0) ext = parts[n]; else ext = "no-extension"
    insertions[ext] += $1
    deletions[ext] += $2
}
END {
    for (ext in insertions) {
        ins = insertions[ext]
        del = deletions[ext]
        total = ins + del
        net_val = ins - del
        print total "|" ext "|" ins "|" del "|" net_val
    }
}' | sort -t'|' -k1 -rn | head -15 | while IFS='|' read total ext ins del net_val; do
    printf '{"extension":".%s","insertions":%d,"deletions":%d,"net":%d},' "$ext" "$ins" "$del" "$net_val"
done | sed 's/,$//' > /tmp/lft_$$.json
lines_by_file_type_json="[$(cat /tmp/lft_$$.json)]"
rm -f /tmp/lft_$$.json

# Recent file changes
git_log_filtered --name-only --pretty=format:"%h|%ad|%s" --date=short | awk -F'|' '
    NF==3 {
        hash=$1; date=$2; subject=$3
        getline filename
        if (filename != "" && !(filename in seen)) {
            print date "|" hash "|" filename "|" subject
            seen[filename]=1
            count++
            if (count >= 15) exit
        }
    }
' | while IFS='|' read -r date hash filename subject; do
    jira=$(echo "$subject" | grep -oE "$JIRA_REGEX" | head -1)
    printf '{"date":"%s","hash":"%s","file":"%s","subject":"%s","jira":"%s"},' \
        "$date" "$hash" "$(escape_json "$filename")" "$(escape_json "$subject")" "$jira"
done | sed 's/,$//' > /tmp/rfc_$$.json
recent_changes_json="[$(cat /tmp/rfc_$$.json)]"
rm -f /tmp/rfc_$$.json

# Commits by day of week
git_log_filtered --pretty=format:"%ad" --date=format:"%A" | sort | uniq -c | sort -rn | while read count day; do
    printf '{"day":"%s","commits":%d},' "$day" "$count"
done | sed 's/,$//' > /tmp/cdow_$$.json
commits_by_day_json="[$(cat /tmp/cdow_$$.json)]"
rm -f /tmp/cdow_$$.json

# Commits by hour
git_log_filtered --pretty=format:"%ad" --date=format:"%H" | sort | uniq -c | sort -k2 | while read count hour; do
    printf '{"hour":%d,"commits":%d},' "$((10#$hour))" "$count"
done | sed 's/,$//' > /tmp/cbh_$$.json
commits_by_hour_json="[$(cat /tmp/cbh_$$.json)]"
rm -f /tmp/cbh_$$.json

# Productivity patterns
productivity_json="["
pp_first=1
if [ ${#USERNAMES[@]} -gt 0 ]; then
    for author in "${USERNAMES[@]}"; do
        author_filter=$(get_author_filter "$author")
        total=$(git_log_for_author "$author_filter" --oneline | wc -l | tr -d ' ')
        if [ "$total" -gt 0 ]; then
            # Streak
            max_streak=0; current_streak=1; prev_date=""
            while IFS= read -r d; do
                if [ -n "$prev_date" ]; then
                    prev_epoch=$(date -j -f "%Y-%m-%d" "$prev_date" "+%s" 2>/dev/null || date -d "$prev_date" "+%s" 2>/dev/null)
                    curr_epoch=$(date -j -f "%Y-%m-%d" "$d" "+%s" 2>/dev/null || date -d "$d" "+%s" 2>/dev/null)
                    days_diff=$(( (curr_epoch - prev_epoch) / 86400 ))
                    if [ "$days_diff" -eq 1 ]; then
                        current_streak=$((current_streak + 1))
                        [ "$current_streak" -gt "$max_streak" ] && max_streak=$current_streak
                    else
                        current_streak=1
                    fi
                fi
                prev_date="$d"
            done <<< "$(git_log_for_author "$author_filter" --pretty=format:"%ad" --date=short | sort -u)"
            [ "$current_streak" -gt "$max_streak" ] && max_streak=$current_streak

            # Working hours
            times=$(git_log_for_author "$author_filter" --pretty=format:"%ad" --date=format:"%H" | sort -n)
            first_hour=$(echo "$times" | head -1)
            last_hour=$(echo "$times" | tail -1)

            # Avg time between commits
            commit_count=$(git_log_for_author "$author_filter" --oneline | wc -l | tr -d ' ')
            avg_time_label="N/A"
            avg_minutes=0
            if [ "$commit_count" -gt 1 ]; then
                first_commit=$(git_log_for_author "$author_filter" --pretty=format:"%at" --reverse | head -1)
                last_commit=$(git_log_for_author "$author_filter" --pretty=format:"%at" | head -1)
                time_span=$((last_commit - first_commit))
                avg_seconds=$((time_span / (commit_count - 1)))
                avg_minutes=$((avg_seconds / 60))
                if [ "$avg_seconds" -lt 3600 ]; then
                    avg_time_label="${avg_minutes}m"
                elif [ "$avg_seconds" -lt 86400 ]; then
                    avg_time_label="$((avg_seconds / 3600))h"
                else
                    avg_time_label="$((avg_seconds / 86400))d"
                fi
            fi

            # JIRA tickets
            unique_tickets=$(git_log_for_author "$author_filter" --pretty=format:"%s" | grep -oE "$JIRA_REGEX" | sort | uniq | wc -l | tr -d ' ')
            commits_per_ticket=0
            [ "$unique_tickets" -gt 0 ] && commits_per_ticket=$((total / unique_tickets))

            # JIRA ticket breakdown
            jira_breakdown="["
            jb_first=1
            while IFS= read -r ticket; do
                if [ -n "$ticket" ]; then
                    tc=$(git_log_for_author "$author_filter" --pretty=format:"%s" | grep -c "$ticket")
                    [ $jb_first -eq 1 ] && jb_first=0 || jira_breakdown+=","
                    jira_breakdown+="{\"ticket\":\"$ticket\",\"commits\":$tc}"
                fi
            done <<< "$(git_log_for_author "$author_filter" --pretty=format:"%s" | grep -oE "$JIRA_REGEX" | sort | uniq)"
            jira_breakdown+="]"

            [ $pp_first -eq 1 ] && pp_first=0 || productivity_json+=","
            productivity_json+="{\"author\":\"$(escape_json "$author")\",\"commits\":$total,\"streak\":$max_streak,\"firstHour\":\"${first_hour:-N/A}\",\"lastHour\":\"${last_hour:-N/A}\",\"avgTimeBetweenCommits\":\"$avg_time_label\",\"avgMinutes\":$avg_minutes,\"tickets\":$unique_tickets,\"commitsPerTicket\":$commits_per_ticket,\"jiraBreakdown\":$jira_breakdown}"
        fi
    done
fi
productivity_json+="]"

# Detailed commits (grouped by date)
detailed_commits="["
dc_first=1
prev_date=""
current_date_commits=""
git_log_filtered --pretty=format:"%ad|%an|%h|%s" --date=short | sed "${AUTHOR_NORMALISE_SED:-}" | sort -t'|' -k1,1r | while IFS='|' read -r date author hash subject; do
    jira=$(echo "$subject" | grep -oE "$JIRA_REGEX" | head -1)
    day_of_week=$(date -j -f "%Y-%m-%d" "$date" "+%A" 2>/dev/null || date -d "$date" "+%A" 2>/dev/null)
    printf '%s|%s|%s|%s|%s|%s\n' "$date" "$day_of_week" "$author" "$hash" "$(escape_json "$subject")" "$jira"
done > /tmp/dc_$$.json

# Build grouped JSON from the flat list
prev_date=""
echo -n "[" > /tmp/dc_grouped_$$.json
dc_first=1
while IFS='|' read -r date dow author hash subject jira; do
    if [ "$date" != "$prev_date" ]; then
        if [ -n "$prev_date" ]; then
            echo -n "]}," >> /tmp/dc_grouped_$$.json
        fi
        echo -n "{\"date\":\"$date\",\"dayOfWeek\":\"$dow\",\"commits\":[" >> /tmp/dc_grouped_$$.json
        dc_commit_first=1
        prev_date="$date"
    fi
    [ $dc_commit_first -eq 1 ] && dc_commit_first=0 || echo -n "," >> /tmp/dc_grouped_$$.json
    echo -n "{\"hash\":\"$hash\",\"author\":\"$author\",\"subject\":\"$subject\",\"jira\":\"$jira\"}" >> /tmp/dc_grouped_$$.json
done < /tmp/dc_$$.json
[ -n "$prev_date" ] && echo -n "]}" >> /tmp/dc_grouped_$$.json
echo -n "]" >> /tmp/dc_grouped_$$.json
detailed_commits_json=$(cat /tmp/dc_grouped_$$.json)
rm -f /tmp/dc_$$.json /tmp/dc_grouped_$$.json

# Commit size distribution (by lines changed per commit)
git_log_filtered --shortstat --pretty=format:"COMMIT_SEP" | awk '
/COMMIT_SEP/ { next }
/fil(e|es) changed/ {
    total = 0
    for (i = 1; i <= NF; i++) {
        if ($(i+1) ~ /insertion/) total += $i
        if ($(i+1) ~ /deletion/) total += $i
    }
    if (total <= 10) small++
    else if (total <= 100) medium++
    else if (total <= 500) large++
    else xlarge++
}
END {
    printf "{\"small\":%d,\"medium\":%d,\"large\":%d,\"xlarge\":%d}", small+0, medium+0, large+0, xlarge+0
}' > /tmp/csd_$$.json
commit_size_json=$(cat /tmp/csd_$$.json)
rm -f /tmp/csd_$$.json

# Weekly commit velocity
git_log_filtered --pretty=format:"%ad" --date=format:"%G-W%V" | sort | uniq -c | sort -k2 | while read count week; do
    printf '{"week":"%s","commits":%d},' "$week" "$count"
done | sed 's/,$//' > /tmp/wv_$$.json
weekly_velocity_json="[$(cat /tmp/wv_$$.json)]"
rm -f /tmp/wv_$$.json

# Code ownership — top 15 files with author breakdown
git_log_filtered --name-only --pretty=format:"AUTHOR:%an" | sed "${AUTHOR_NORMALISE_SED:-}" | awk '
/^AUTHOR:/ { author = substr($0, 8); next }
/^$/ { next }
{
    file = $0
    key = file "|" author
    file_author[key]++
    file_total[file]++
}
END {
    PROCINFO["sorted_in"] = "@val_num_desc"
    n = 0
    for (f in file_total) {
        if (++n > 15) break
        printf "%s\t%d\t", f, file_total[f]
        first = 1
        for (k in file_author) {
            split(k, parts, "|")
            if (parts[1] == f) {
                if (!first) printf ","
                printf "%s:%d", parts[2], file_author[k]
                first = 0
            }
        }
        printf "\n"
    }
}' | sort -t$'\t' -k2 -rn | head -15 | while IFS=$'\t' read -r filepath total authors_raw; do
    author_arr="["
    af=1
    IFS=',' read -ra apairs <<< "$authors_raw"
    for ap in "${apairs[@]}"; do
        aname="${ap%:*}"
        acount="${ap##*:}"
        [ $af -eq 1 ] && af=0 || author_arr+=","
        author_arr+="{\"author\":\"$(escape_json "$aname")\",\"commits\":$acount}"
    done
    author_arr+="]"
    printf '{"file":"%s","totalCommits":%d,"authors":%s},' "$(escape_json "$filepath")" "$total" "$author_arr"
done | sed 's/,$//' > /tmp/co_$$.json
code_ownership_json="[$(cat /tmp/co_$$.json)]"
rm -f /tmp/co_$$.json

# Commit message stats
msg_stats=$(git_log_filtered --pretty=format:"%s" | awk -v jira_key="$JIRA_KEY" '
{
    total++
    len += length($0)
    if (jira_key != "" && $0 ~ jira_key "-[0-9]+") with_ticket++
    words += split($0, w, " ")
}
END {
    avg_len = (total > 0 ? int(len / total) : 0)
    avg_words = (total > 0 ? int(words / total) : 0)
    printf "{\"total\":%d,\"withTicketRef\":%d,\"avgLength\":%d,\"avgWords\":%d}", total, with_ticket+0, avg_len, avg_words
}')

# Lines changed per author
git_log_filtered --shortstat --pretty=format:"AUTHOR:%an" | sed "${AUTHOR_NORMALISE_SED:-}" | awk '
/^AUTHOR:/ { author = substr($0, 8); next }
/^$/ { next }
/fil(e|es) changed/ {
    ins = 0; del = 0
    for (i = 1; i <= NF; i++) {
        if ($(i+1) ~ /insertion/) ins = $i
        if ($(i+1) ~ /deletion/) del = $i
    }
    insertions[author] += ins
    deletions[author] += del
}
END {
    for (a in insertions) {
        printf "%s\t%d\t%d\n", a, insertions[a], deletions[a]
    }
}' | sort -t$'\t' -k2 -rn | while IFS=$'\t' read -r author ins del; do
    printf '{"author":"%s","insertions":%d,"deletions":%d},' "$(escape_json "$author")" "$ins" "$del"
done | sed 's/,$//' > /tmp/lca_$$.json
lines_by_author_json="[$(cat /tmp/lca_$$.json)]"
rm -f /tmp/lca_$$.json

# ---------- Output JSON ----------
cat <<ENDJSON
{
  "meta": {
    "startDate": "$START_DATE",
    "endDate": "$END_DATE",
    "repoPath": "$(escape_json "$REPO_PATH")",
    "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "jiraKey": "$JIRA_KEY"
  },
  "totalCommits": $COMMIT_COUNT,
  "commitsByAuthor": $commits_by_author_json,
  "commitActivity": $commit_activity_json,
  "fileStats": {
    "totalFilesChanged": $FILES_CHANGED,
    "topChangedFiles": $top_changed_files_json
  },
  "linesChanged": {
    "files": $files,
    "insertions": $inserted,
    "deletions": $deleted,
    "net": $net
  },
  "linesByFileType": $lines_by_file_type_json,
  "recentFileChanges": $recent_changes_json,
  "commitsByDayOfWeek": $commits_by_day_json,
  "commitsByHour": $commits_by_hour_json,
  "developers": $productivity_json,
  "detailedCommits": $detailed_commits_json,
  "commitSizeDistribution": $commit_size_json,
  "weeklyVelocity": $weekly_velocity_json,
  "codeOwnership": $code_ownership_json,
  "commitMessageStats": $msg_stats,
  "linesByAuthor": $lines_by_author_json
}
ENDJSON
