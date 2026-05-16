#!/usr/bin/env bash
# show-commits.sh
# Analyze Git commits between specific dates
#
# Usage: ./show-commits.sh <start-date> <end-date> <repo-path>
#
# The TEAM array can be configured in two ways:
# 1. Specific team members: Define username:pattern pairs to filter commits
# 2. All authors: Leave TEAM=() empty to analyze all authors in the repository

START_DATE=$1
END_DATE=$2
REPO_PATH=$3

# JIRA / ticket prefix used to extract ticket references from commit messages
# e.g. "PROJ-", "JIRA-"
TICKET_PREFIX=""
TICKET_REGEX="a^"
[ -n "$TICKET_PREFIX" ] && TICKET_REGEX="${TICKET_PREFIX}[0-9]+"

# Team members — format: "username:git author pattern"
# Use \| in the pattern to merge multiple git identities for one person
# Leave TEAM=() empty to analyze ALL authors in the repository
TEAM=()

get_author_filter() { for entry in "${TEAM[@]}"; do [[ "${entry%%:*}" == "$1" ]] && echo "${entry#*:}" && return; done; }

# Derive AUTHOR_FILTER, USERNAMES, and author name normalisation from TEAM
AUTHOR_FILTER=""
USERNAMES=()
AUTHOR_NORMALISE_SED=""
AUTHOR_FLAG=""

if [ ${#TEAM[@]} -eq 0 ]; then
    # TEAM is empty - we'll query all authors dynamically after cd to repo
    TEAM_MODE="all"
else
    # TEAM has members - build filter as before
    TEAM_MODE="specific"
    for entry in "${TEAM[@]}"; do
        username="${entry%%:*}"
        pattern="${entry#*:}"
        USERNAMES+=("$username")
        [[ -z "$AUTHOR_FILTER" ]] && AUTHOR_FILTER="$pattern" || AUTHOR_FILTER="$AUTHOR_FILTER\|$pattern"
        # Split pattern on \| to find aliases, build sed substitutions using | as delimiter
        IFS='|' read -ra aliases <<< "${pattern//\\|/|}"
        for alias in "${aliases[@]}"; do
            [[ "$alias" != "$username" ]] && AUTHOR_NORMALISE_SED+="s|${alias}|${username}|;"
        done
    done
    AUTHOR_FLAG="--author=\"$AUTHOR_FILTER\""
fi

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [ -z "$START_DATE" ] || [ -z "$END_DATE" ] || [ -z "$REPO_PATH" ]; then
    echo -e "${RED}Usage: $0 <start-date> <end-date> <repo-path>${NC}"
    echo -e "${YELLOW}Example: $0 '2024-01-01' '2024-12-31' /path/to/repo${NC}"
    echo -e "${YELLOW}Example: $0 '30 days ago' 'now' /path/to/repo${NC}"
    exit 1
fi

cd "$REPO_PATH" || { echo -e "${RED}Error: could not cd to repo path: $REPO_PATH${NC}"; exit 1; }

# If TEAM is empty, extract all unique authors from the repo in the date range
if [ "$TEAM_MODE" = "all" ]; then
    echo -e "${YELLOW}TEAM array is empty - analyzing ALL authors in the repository${NC}\n"
    
    # Get all unique authors (name <email>) from the date range
    all_authors=()
    while IFS= read -r author_line; do
        all_authors+=("$author_line")
    done < <(git log --since="$START_DATE" --until="$END_DATE" --pretty=format:"%an|%ae" | sort -u)
    
    # Build USERNAMES array from actual commit authors
    # Format: "Name (email)" for display
    for author_line in "${all_authors[@]}"; do
        IFS='|' read -r name email <<< "$author_line"
        if [ -n "$name" ]; then
            # Use name as the username for display, store email info too
            USERNAMES+=("$name ($email)")
        fi
    done
    
    # For "all" mode, get_author_filter needs to return the full "name|email" pattern
    get_author_filter() {
        local search="$1"
        for author_line in "${all_authors[@]}"; do
            IFS='|' read -r name email <<< "$author_line"
            local display="$name ($email)"
            [[ "$display" == "$search" ]] && echo "$name" && return
        done
    }
fi

# Helper function to run git log with conditional author filter
git_log_filtered() {
    if [ -n "$AUTHOR_FILTER" ]; then
        git log --since="$START_DATE" --until="$END_DATE" --author="$AUTHOR_FILTER" "$@"
    else
        git log --since="$START_DATE" --until="$END_DATE" "$@"
    fi
}

# Helper function to run git log for a specific author filter
git_log_for_author() {
    local author_filter="$1"
    shift
    git log --since="$START_DATE" --until="$END_DATE" --author="$author_filter" "$@"
}

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📊 Git Commit Analysis: ${YELLOW}$START_DATE${NC} ${CYAN}to${NC} ${YELLOW}$END_DATE${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}\n"

# Check if there are any commits in the date range
COMMIT_COUNT=$(git_log_filtered --oneline | wc -l | tr -d ' ')

if [ "$COMMIT_COUNT" -eq 0 ]; then
    echo -e "${RED}No commits found between $START_DATE and $END_DATE${NC}"
    exit 0
fi

# Total commits
echo -e "${GREEN}📈 Total Commits:${NC} ${YELLOW}$COMMIT_COUNT${NC}\n"

# Commits by author (bar chart)
echo -e "${GREEN}👥 Commits by Author:${NC}"
BAR_MAX=40
author_data=$(git_log_filtered --pretty=format:"%an" | sed "${AUTHOR_NORMALISE_SED:-}" | sort | uniq -c | sort -rn)
top_count=$(echo "$author_data" | head -1 | awk '{print $1}')
echo -e "  ${CYAN}$(printf '%-20s' '─────────────────────')────────────────────────────────────────────────${NC}"
row=0
echo "$author_data" | while read count author; do
    bar_len=$(( count * BAR_MAX / top_count ))
    bar=$(printf '█%.0s' $(seq 1 $bar_len))
    if (( row % 2 == 0 )); then
        name_color=$BLUE; bar_color=$GREEN
    else
        name_color=$MAGENTA; bar_color=$CYAN
    fi
    echo -e "  ${name_color}$(printf '%-20s' "$author")${NC} ${YELLOW}$(printf '%3d' $count)${NC} ${bar_color}$bar${NC}"
    echo -e "  ${CYAN}$(printf '%-20s' '─────────────────────')────────────────────────────────────────────────${NC}"
    row=$(( row + 1 ))
done
echo ""

# Commits by date (activity graph)
echo -e "${GREEN}📅 Commit Activity:${NC}"
date_data=$(git_log_filtered --pretty=format:"%ad" --date=short | sort | uniq -c | sort -k2)
top_day=$(echo "$date_data" | awk '{print $1}' | sort -rn | head -1)
echo "$date_data" | while read count date; do
    bar_len=$(( count * 20 / top_day ))
    [[ $bar_len -lt 1 ]] && bar_len=1
    bar=$(printf '▪%.0s' $(seq 1 $bar_len))
    echo -e "  ${BLUE}$date${NC} ${CYAN}$bar${NC} ${YELLOW}$count${NC}"
done
echo ""

# Files changed statistics
echo -e "${GREEN}📁 File Change Statistics:${NC}"
FILES_CHANGED=$(git_log_filtered --name-only --pretty=format: | sort | uniq | grep -v '^$' | wc -l | tr -d ' ')
echo -e "  Total files changed: ${YELLOW}$FILES_CHANGED${NC}"

# Most changed files (bar chart)
echo -e "\n${GREEN}🔥 Top 10 Most Changed Files:${NC}"
file_data=$(git_log_filtered --name-only --pretty=format: | grep -v '^$' | sort | uniq -c | sort -rn | head -10)
top_file=$(echo "$file_data" | head -1 | awk '{print $1}')
SEP="  ${CYAN}─────────────────────────────────────────────────────────────────────────${NC}"
echo -e "$SEP"
row=0
echo "$file_data" | while read count file; do
    bar_len=$(( count * 30 / top_file ))
    [[ $bar_len -lt 1 ]] && bar_len=1
    bar=$(printf '█%.0s' $(seq 1 $bar_len))
    if (( row % 2 == 0 )); then bar_color=$MAGENTA; else bar_color=$CYAN; fi
    echo -e "  ${YELLOW}$(printf '%3d' $count)${NC} ${bar_color}$bar${NC} $file"
    echo -e "$SEP"
    row=$(( row + 1 ))
done
echo ""

# Lines changed
echo -e "${GREEN}📊 Lines Changed:${NC}"
STATS=$(git_log_filtered --shortstat | grep -E "fil(e|es) changed" | awk '{files+=$1; inserted+=$4; deleted+=$6} END {print files, inserted, deleted}')
read files inserted deleted <<< "$STATS"
NET_LINES=$((${inserted:-0} - ${deleted:-0}))
echo -e "  Files: ${YELLOW}${files:-0}${NC} | Insertions: ${GREEN}+${inserted:-0}${NC} | Deletions: ${RED}-${deleted:-0}${NC} | Net: ${MAGENTA}${NET_LINES}${NC}\n"

# Lines of code by file type
echo -e "${GREEN}💻 Lines of Code by File Type:${NC}"
echo -e "${CYAN}  (Sorted by total changes, showing insertions and deletions)${NC}\n"

# Get all changed files and calculate stats per extension
file_type_data=$(git_log_filtered --numstat --pretty=format:"" | \
awk '
NF==3 {
    file = $3
    # Extract extension after last dot
    n = split(file, parts, ".")
    if (n > 1 && index(parts[n], "/") == 0) {
        ext = parts[n]
    } else {
        ext = "no-extension"
    }
    insertions[ext] += $1
    deletions[ext] += $2
}
END {
    for (ext in insertions) {
        ins = insertions[ext]
        del = deletions[ext]
        total = ins + del
        net = ins - del
        print total "|" ext "|" ins "|" del "|" net
    }
}' | sort -t'|' -k1 -rn | head -15)

# Get max value for unified bar scaling
max_value=$(echo "$file_type_data" | awk -F'|' '{if ($3 > max) max = $3; if ($4 > max) max = $4} END {print max}')

# Print simple table header
printf "  ${CYAN}%-16s %-12s %-12s %-12s${NC}\n" "File Type" "Insertions" "Deletions" "Net Change"
printf "  ${CYAN}%-16s %-12s %-12s %-12s${NC}\n" "────────────────" "────────────" "────────────" "────────────"

# Print table rows with bars
echo "$file_type_data" | while IFS='|' read total ext ins del net; do
    # Calculate bar lengths on same scale (max 25 characters)
    ins_bar_len=$(( max_value > 0 ? ins * 25 / max_value : 0 ))
    del_bar_len=$(( max_value > 0 ? del * 25 / max_value : 0 ))
    [[ $ins_bar_len -lt 1 && $ins -gt 0 ]] && ins_bar_len=1
    [[ $del_bar_len -lt 1 && $del -gt 0 ]] && del_bar_len=1
    
    ins_bar=$(printf '█%.0s' $(seq 1 $ins_bar_len 2>/dev/null))
    del_bar=$(printf '█%.0s' $(seq 1 $del_bar_len 2>/dev/null))
    
    # Net color
    if [ "$net" -ge 0 ]; then
        net_color=$GREEN
        net_sign="+"
    else
        net_color=$RED
        net_sign=""
    fi
    
    # Print extension and numbers
    printf "  ${YELLOW}%-16s${NC} ${GREEN}+%-11s${NC} ${RED}-%-11s${NC} ${net_color}%-12s${NC}\n" \
        ".$ext" "$ins" "$del" "${net_sign}${net}"
    
    # Print bars below
    printf "  %-16s ${GREEN}%-25s${NC} ${RED}%-25s${NC}\n" "" "$ins_bar" "$del_bar"
    echo ""
done

echo ""

# Most Recent File Changes
echo -e "${GREEN}🕒 Most Recent File Changes (Last 15):${NC}"
echo -e "${CYAN}  Shows the most recently modified files in chronological order${NC}\n"

# Get recent file changes
prev_date=""
git_log_filtered --name-only --pretty=format:"%h|%ad|%s" --date=short | \
awk -F'|' '
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
    # Print date header when date changes
    if [ "$date" != "$prev_date" ]; then
        [ -n "$prev_date" ] && echo ""
        echo -e "  ${CYAN}📅 $date${NC}"
        prev_date="$date"
    fi
    
    # Shorten long file paths for display
    display_file="$filename"
    if [ ${#filename} -gt 60 ]; then
        display_file="...${filename: -57}"
    fi
    
    # Extract JIRA ticket if present
    jira=$(echo "$subject" | grep -oE "$TICKET_REGEX" | head -1)
    
    # Print file and commit info
    echo -e "    ${MAGENTA}${display_file}${NC}"
    if [ -n "$jira" ]; then
        echo -e "    ${YELLOW}${hash}${NC} │ ${GREEN}${jira}${NC} │ $(echo "$subject" | cut -c1-40)..."
    else
        echo -e "    ${YELLOW}${hash}${NC} │ $(echo "$subject" | cut -c1-50)..."
    fi
done
echo ""

# Productivity Patterns
# Only show if we have authors to analyze
if [ ${#USERNAMES[@]} -gt 0 ]; then
    echo -e "${GREEN}⚡ Productivity Patterns:${NC}\n"
fi

# Function to calculate commit streak for an author
calculate_commit_streak() {
    local author_name="$1"
    local author_filter=$(get_author_filter "$author_name")
    
    # Get unique commit dates sorted
    local dates=$(git_log_for_author "$author_filter" --pretty=format:"%ad" --date=short | sort -u)
    
    if [ -z "$dates" ]; then
        echo "0"
        return
    fi
    
    local max_streak=0
    local current_streak=1
    local prev_date=""
    
    while IFS= read -r date; do
        if [ -n "$prev_date" ]; then
            # Calculate days between dates (macOS compatible)
            local prev_epoch=$(date -j -f "%Y-%m-%d" "$prev_date" "+%s" 2>/dev/null || date -d "$prev_date" "+%s" 2>/dev/null)
            local curr_epoch=$(date -j -f "%Y-%m-%d" "$date" "+%s" 2>/dev/null || date -d "$date" "+%s" 2>/dev/null)
            local days_diff=$(( (curr_epoch - prev_epoch) / 86400 ))
            
            if [ "$days_diff" -eq 1 ]; then
                current_streak=$((current_streak + 1))
                if [ "$current_streak" -gt "$max_streak" ]; then
                    max_streak=$current_streak
                fi
            else
                current_streak=1
            fi
        fi
        prev_date="$date"
    done <<< "$dates"
    
    # Handle case where entire period is one streak
    if [ "$current_streak" -gt "$max_streak" ]; then
        max_streak=$current_streak
    fi
    
    echo "$max_streak"
}

# Function to get first and last commit times
get_commit_time_boundaries() {
    local author_name="$1"
    local author_filter=$(get_author_filter "$author_name")
    
    # Get commit times (hour only)
    local times=$(git_log_for_author "$author_filter" --pretty=format:"%ad" --date=format:"%H" | sort -n)
    
    if [ -z "$times" ]; then
        echo "N/A|N/A"
        return
    fi
    
    local first_hour=$(echo "$times" | head -1)
    local last_hour=$(echo "$times" | tail -1)
    
    echo "$first_hour|$last_hour"
}

# Function to calculate average time between commits
calculate_avg_time_between_commits() {
    local author_name="$1"
    local author_filter=$(get_author_filter "$author_name")
    
    local commit_count=$(git_log_for_author "$author_filter" --oneline | wc -l | tr -d ' ')
    
    if [ "$commit_count" -le 1 ]; then
        echo "N/A"
        return
    fi
    
    # Get first and last commit timestamps
    local first_commit=$(git_log_for_author "$author_filter" --pretty=format:"%at" --reverse | head -1)
    local last_commit=$(git_log_for_author "$author_filter" --pretty=format:"%at" | head -1)
    
    if [ -z "$first_commit" ] || [ -z "$last_commit" ]; then
        echo "N/A"
        return
    fi
    
    local time_span=$((last_commit - first_commit))
    local avg_seconds=$((time_span / (commit_count - 1)))
    
    # Convert to human readable format
    if [ "$avg_seconds" -lt 3600 ]; then
        local minutes=$((avg_seconds / 60))
        echo "${minutes}m"
    elif [ "$avg_seconds" -lt 86400 ]; then
        local hours=$((avg_seconds / 3600))
        echo "${hours}h"
    else
        local days=$((avg_seconds / 86400))
        echo "${days}d"
    fi
}

# Display productivity patterns for each developer
if [ ${#USERNAMES[@]} -gt 0 ]; then
    for author in "${USERNAMES[@]}"; do
        author_filter=$(get_author_filter "$author")
        total=$(git_log_for_author "$author_filter" --oneline | wc -l | tr -d ' ')
        
        if [ "$total" -gt 0 ]; then
            streak=$(calculate_commit_streak "$author")
            time_bounds=$(get_commit_time_boundaries "$author")
            IFS='|' read -r first_hour last_hour <<< "$time_bounds"
            avg_time=$(calculate_avg_time_between_commits "$author")
            
            echo -e "  ${CYAN}───────────────────────────────────────────────────────${NC}"
            echo -e "  ${BLUE}$(printf '%-30s' "$author")${NC}"
            echo -e "    🔥 Longest streak: ${YELLOW}${streak}${NC} consecutive days"
            echo -e "    ⏰ Working hours: ${YELLOW}${first_hour}:00${NC} to ${YELLOW}${last_hour}:00${NC}"
            echo -e "    📊 Avg time between commits: ${YELLOW}${avg_time}${NC}"
        fi
    done
    echo -e "  ${CYAN}───────────────────────────────────────────────────────${NC}"
    echo ""
fi

# Developer Summary
# Only show if we have authors to analyze
if [ ${#USERNAMES[@]} -gt 0 ]; then
    echo -e "${GREEN}📊 Developer Summary:${NC}"
    echo -e "${CYAN}  Sorted by ticket count. Bar shows commits-per-ticket (longer = more commits per ticket).${NC}\n"
fi

# Function to count commits and tickets per author
count_developer_stats() {
    local author_name="$1"
    local author_filter=$(get_author_filter "$author_name")

    local total=$(git_log_for_author "$author_filter" --oneline | wc -l | tr -d ' ')
    local unique_tickets=$(git_log_for_author "$author_filter" --pretty=format:"%s" | \
        grep -oE "$TICKET_REGEX" | sort | uniq | wc -l | tr -d ' ')

    if [ "$total" -gt 0 ]; then
        # Commits per ticket ratio bar (max bar = 5 commits/ticket)
        local ratio_x10=0
        local commits_per_ticket=$total
        if [ "$unique_tickets" -gt 0 ]; then
            ratio_x10=$(( total * 10 / unique_tickets ))
            commits_per_ticket=$(( total / unique_tickets ))
        fi
        local bar_len=$(( ratio_x10 > 50 ? 20 : ratio_x10 * 20 / 50 ))
        [[ $bar_len -lt 1 ]] && bar_len=1
        local bar=$(printf '█%.0s' $(seq 1 $bar_len))
        echo -e "  ${CYAN}───────────────────────────────────────────────────────${NC}"
        echo -e "  ${BLUE}$(printf '%-20s' "$author_name")${NC}  🎫 ${YELLOW}$unique_tickets${NC} tickets  📦 ${YELLOW}$total${NC} commits  (~${YELLOW}$commits_per_ticket${NC} commits/ticket)"
        echo -e "  Commits/ticket ${GREEN}$bar${NC}"
    fi
}

# Get developers sorted by unique JIRA ticket count
get_sorted_devs() {
    local temp_file=$(mktemp)
    
    for author in "${USERNAMES[@]}"; do
        local author_filter=$(get_author_filter "$author")
        local ticket_count=$(git_log_for_author "$author_filter" --pretty=format:"%s" | \
            grep -oE "$TICKET_REGEX" | sort | uniq | wc -l | tr -d ' ')
        echo "$ticket_count|$author" >> "$temp_file"
    done
    
    # Sort by ticket count (descending) and return just the names
    sort -t'|' -k1 -rn "$temp_file" | cut -d'|' -f2
    rm -f "$temp_file"
}

# Get sorted developer list
if [ ${#USERNAMES[@]} -gt 0 ]; then
    SORTED_DEVS=$(get_sorted_devs)

    # Check each developer in sorted order
    while IFS= read -r dev; do
        count_developer_stats "$dev"
    done <<< "$SORTED_DEVS"
    echo ""
fi

# JIRA Ticket Detailed Breakdown
# Only show if we have authors to analyze
if [ ${#USERNAMES[@]} -gt 0 ]; then
    echo -e "${GREEN}🔍 JIRA Ticket Detailed Breakdown:${NC}"
    echo -e "${CYAN}(Shows specific tickets and how many commits per ticket)${NC}\n"
fi

# Function to show JIRA ticket details per author
count_tickets_by_author() {
    local author_name="$1"
    local author_filter=$(get_author_filter "$author_name")
    
    # Get all unique JIRA tickets for this author
    local tickets=$(git_log_for_author "$author_filter" --pretty=format:"%s" | \
        grep -oE "$TICKET_REGEX" | sort | uniq)
    
    local ticket_count=$(echo "$tickets" | grep -c "$TICKET_REGEX" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$ticket_count" -gt 0 ]; then
        echo -e "  ${BLUE}$author_name${NC} (${YELLOW}$ticket_count${NC} tickets):"
        
        # Show breakdown of commits per ticket
        while IFS= read -r ticket; do
            if [ -n "$ticket" ]; then
                local commit_count=$(git_log_for_author "$author_filter" --pretty=format:"%s" | grep -c "$ticket")
                echo -e "    ${MAGENTA}$ticket${NC} - ${YELLOW}$commit_count${NC} commit$([ $commit_count -gt 1 ] && echo 's' || echo '')"
            fi
        done <<< "$tickets"
        echo ""
    fi
}

# Check each developer in sorted order
if [ ${#USERNAMES[@]} -gt 0 ]; then
    while IFS= read -r dev; do
        count_tickets_by_author "$dev"
    done <<< "$SORTED_DEVS"
    echo ""
fi

# Detailed commit list
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📝 Detailed Commit List:${NC}"
echo -e "${CYAN}  (Organized chronologically, most recent first)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}\n"

# Get commits in reverse chronological order and group by date
prev_date=""
git_log_filtered --pretty=format:"%ad|%an|%h|%s" --date=short | \
sed "${AUTHOR_NORMALISE_SED:-}" | \
sort -t'|' -k1,1r | \
while IFS='|' read -r date author hash subject; do
    # Print date header when date changes
    if [ "$date" != "$prev_date" ]; then
        [ -n "$prev_date" ] && echo ""
        
        # Get day of week
        day_of_week=$(date -j -f "%Y-%m-%d" "$date" "+%A" 2>/dev/null || date -d "$date" "+%A" 2>/dev/null)
        
        echo -e "  ${CYAN}📅 $date ($day_of_week)${NC}"
        echo -e "  ${CYAN}─────────────────────────────────────────────────────${NC}"
        prev_date="$date"
    fi
    
    # Extract JIRA ticket if present
    jira=$(echo "$subject" | grep -oE "$TICKET_REGEX" | head -1)
    
    # Print commit info
    if [ -n "$jira" ]; then
        echo -e "    ${YELLOW}${hash}${NC} | ${BLUE}${author}${NC} | ${MAGENTA}${jira}${NC}"
    else
        echo -e "    ${YELLOW}${hash}${NC} | ${BLUE}${author}${NC}"
    fi
    echo -e "    └─ ${subject}"
done

echo -e "\n${CYAN}═══════════════════════════════════════════════════════${NC}"