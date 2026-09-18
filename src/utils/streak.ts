export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Use noon to avoid DST edge cases
}

export function calculateStreaks(checkInDates: string[], referenceDate: Date = new Date()): { currentStreak: number; longestStreak: number } {
  if (!checkInDates || checkInDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dateSet = new Set(checkInDates);
  const sortedDates = Array.from(dateSet).sort();

  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate Longest Streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseLocalDate(sortedDates[i - 1]);
    const curr = parseLocalDate(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else if (diffDays > 1) {
      tempStreak = 1;
    }
  }

  // Calculate Current Streak
  const todayStr = getLocalDateString(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const isTodayChecked = dateSet.has(todayStr);
  const isYesterdayChecked = dateSet.has(yesterdayStr);

  let currentStreak = 0;

  if (isTodayChecked) {
    let checkDate = new Date(referenceDate);
    while (dateSet.has(getLocalDateString(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else if (isYesterdayChecked) {
    // Today hasn't been checked in yet, but yesterday was -> streak is preserved pending today
    let checkDate = new Date(yesterday);
    while (dateSet.has(getLocalDateString(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Neither today nor yesterday was checked in -> streak broken, resets to 0
    currentStreak = 0;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak)
  };
}

export function getRecentDays(daysCount: number = 35, referenceDate: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateString(d));
  }
  return dates;
}
