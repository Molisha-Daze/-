import { Habit, CheckIn, StandaloneCounter } from '../types';
import { getLocalDateString } from '../utils/streak';

const DB_NAME = 'HabitTrackerDB';
const DB_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('habits')) {
        const habitStore = db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
        habitStore.createIndex('sortOrder', 'sortOrder', { unique: false });
      }
      if (!db.objectStoreNames.contains('check_ins')) {
        const checkInStore = db.createObjectStore('check_ins', { keyPath: 'id', autoIncrement: true });
        checkInStore.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
        checkInStore.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('standalone_counters')) {
        const counterStore = db.createObjectStore('standalone_counters', { keyPath: 'id', autoIncrement: true });
        counterStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllHabits(): Promise<Habit[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    const request = store.getAll();

    request.onsuccess = () => {
      const habits: Habit[] = request.result || [];
      habits.sort((a, b) => a.sortOrder - b.sortOrder);
      resolve(habits);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveHabit(habit: Omit<Habit, 'id'> & { id?: number }): Promise<Habit> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    const request = habit.id ? store.put(habit) : store.add(habit);

    request.onsuccess = () => {
      const id = habit.id || (request.result as number);
      resolve({ ...(habit as Habit), id });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteHabit(habitId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'check_ins'], 'readwrite');
    const habitStore = tx.objectStore('habits');
    const checkInStore = tx.objectStore('check_ins');

    habitStore.delete(habitId);

    // Also remove associated check-ins
    const index = checkInStore.index('habitId_date');
    const range = IDBKeyRange.bound([habitId, ''], [habitId, '\uffff']);
    const cursorReq = index.openCursor(range);
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateHabitsOrder(habits: Habit[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('habits', 'readwrite');
  const store = tx.objectStore('habits');

  habits.forEach((habit, index) => {
    habit.sortOrder = index;
    store.put(habit);
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllCheckIns(): Promise<CheckIn[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('check_ins', 'readonly');
    const store = tx.objectStore('check_ins');
    const request = store.getAll();

    request.onsuccess = () => {
      const list: CheckIn[] = request.result || [];
      list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function toggleCheckIn(
  habitId: number,
  date: string,
  targetCount: number = 1,
  allSubTaskIds?: string[]
): Promise<{ completed: boolean; checkIn?: CheckIn }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('check_ins', 'readwrite');
    const store = tx.objectStore('check_ins');
    const index = store.index('habitId_date');
    const req = index.get([habitId, date]);

    req.onsuccess = () => {
      const existing = req.result as CheckIn | undefined;
      const isAlreadyCompleted = existing && (existing.isCompleted || (existing.count !== undefined && existing.count >= targetCount));

      if (isAlreadyCompleted) {
        // Toggle off: reset completedSubTaskIds and delete or mark not completed
        if (existing?.photoUrl) {
          existing.isCompleted = false;
          existing.count = 0;
          existing.completedSubTaskIds = [];
          store.put(existing);
          resolve({ completed: false, checkIn: existing });
        } else {
          store.delete(existing!.id);
          resolve({ completed: false });
        }
      } else {
        // Toggle on: mark isCompleted = true, and fill allSubTaskIds if it is a parent plan
        const fullSubTaskIds = allSubTaskIds && allSubTaskIds.length > 0 ? [...allSubTaskIds] : (existing?.completedSubTaskIds || []);
        if (existing) {
          existing.isCompleted = true;
          existing.count = Math.max(targetCount, existing.count || 0);
          if (allSubTaskIds && allSubTaskIds.length > 0) {
            existing.completedSubTaskIds = fullSubTaskIds;
          }
          store.put(existing);
          resolve({ completed: true, checkIn: existing });
        } else {
          const newCheckIn: Omit<CheckIn, 'id'> = {
            habitId,
            date,
            isCompleted: true,
            count: targetCount,
            completedSubTaskIds: fullSubTaskIds,
            createdAt: Date.now()
          };
          const addReq = store.add(newCheckIn);
          addReq.onsuccess = () => {
            resolve({ completed: true, checkIn: { ...newCheckIn, id: addReq.result as number } });
          };
        }
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Increment or decrement counter for a habit on a given date.
 * E.g. Click +1 for "drink water" (target 3 glasses).
 */
export async function stepHabitCount(
  habitId: number,
  date: string,
  targetCount: number,
  delta: number
): Promise<{ count: number; completed: boolean; checkIn?: CheckIn }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('check_ins', 'readwrite');
    const store = tx.objectStore('check_ins');
    const index = store.index('habitId_date');
    const req = index.get([habitId, date]);

    req.onsuccess = () => {
      const existing = req.result as CheckIn | undefined;
      let newCount = (existing?.count !== undefined ? existing.count : 0) + delta;
      if (newCount < 0) newCount = 0;
      const isCompleted = newCount >= targetCount && targetCount > 0;

      if (existing) {
        if (newCount === 0 && !existing.photoUrl) {
          // If count reset to 0 and no photo, delete record
          store.delete(existing.id);
          resolve({ count: 0, completed: false });
          return;
        }
        existing.count = newCount;
        existing.isCompleted = isCompleted;
        store.put(existing);
        resolve({ count: newCount, completed: isCompleted, checkIn: existing });
      } else {
        if (newCount === 0) {
          resolve({ count: 0, completed: false });
          return;
        }
        const newCheckIn: Omit<CheckIn, 'id'> = {
          habitId,
          date,
          count: newCount,
          isCompleted,
          createdAt: Date.now()
        };
        const addReq = store.add(newCheckIn);
        addReq.onsuccess = () => {
          resolve({
            count: newCount,
            completed: isCompleted,
            checkIn: { ...newCheckIn, id: addReq.result as number }
          });
        };
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function attachPhotoToCheckIn(habitId: number, date: string, photoDataUrl: string): Promise<CheckIn> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('check_ins', 'readwrite');
    const store = tx.objectStore('check_ins');
    const index = store.index('habitId_date');
    const req = index.get([habitId, date]);

    req.onsuccess = () => {
      const existing = req.result as CheckIn | undefined;
      if (existing) {
        existing.photoUrl = photoDataUrl;
        store.put(existing);
        resolve(existing);
      } else {
        const newCheckIn: Omit<CheckIn, 'id'> = {
          habitId,
          date,
          photoUrl: photoDataUrl,
          isCompleted: true,
          count: 1,
          createdAt: Date.now()
        };
        const addReq = store.add(newCheckIn);
        addReq.onsuccess = () => {
          resolve({ ...newCheckIn, id: addReq.result as number });
        };
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removePhotoFromCheckIn(habitId: number, date: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('check_ins', 'readwrite');
    const store = tx.objectStore('check_ins');
    const index = store.index('habitId_date');
    const req = index.get([habitId, date]);

    req.onsuccess = () => {
      const existing = req.result as CheckIn | undefined;
      if (existing) {
        delete existing.photoUrl;
        store.put(existing);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Toggle completion of an individual sub-task within a parent plan (大计划).
 * E.g. Click to mark "深蹲 4 组 x 10 次" as completed.
 */
export async function toggleSubTask(
  habitId: number,
  date: string,
  subTaskId: string,
  totalSubTasks: number
): Promise<{ completed: boolean; completedSubTaskIds: string[]; checkIn?: CheckIn }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('check_ins', 'readwrite');
    const store = tx.objectStore('check_ins');
    const index = store.index('habitId_date');
    const req = index.get([habitId, date]);

    req.onsuccess = () => {
      const existing = req.result as CheckIn | undefined;
      let completedIds: string[] = existing?.completedSubTaskIds ? [...existing.completedSubTaskIds] : [];

      if (completedIds.includes(subTaskId)) {
        completedIds = completedIds.filter((id) => id !== subTaskId);
      } else {
        completedIds.push(subTaskId);
      }

      const allCompleted = totalSubTasks > 0 && completedIds.length >= totalSubTasks;

      if (existing) {
        existing.completedSubTaskIds = completedIds;
        existing.isCompleted = allCompleted;
        store.put(existing);
        resolve({ completed: allCompleted, completedSubTaskIds: completedIds, checkIn: existing });
      } else {
        const newCheckIn: Omit<CheckIn, 'id'> = {
          habitId,
          date,
          isCompleted: allCompleted,
          completedSubTaskIds: completedIds,
          createdAt: Date.now()
        };
        const addReq = store.add(newCheckIn);
        addReq.onsuccess = () => {
          resolve({
            completed: allCompleted,
            completedSubTaskIds: completedIds,
            checkIn: { ...newCheckIn, id: addReq.result as number }
          });
        };
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------
// 独立计数器数据存储与操作 (无需设定计划，自由加减)
// ----------------------------------------------------

export async function loadAllCounters(): Promise<StandaloneCounter[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('standalone_counters', 'readonly');
    const store = tx.objectStore('standalone_counters');
    const req = store.getAll();

    req.onsuccess = () => {
      const list: StandaloneCounter[] = req.result || [];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveCounter(
  counter: Omit<StandaloneCounter, 'id'> & { id?: number }
): Promise<StandaloneCounter> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('standalone_counters', 'readwrite');
    const store = tx.objectStore('standalone_counters');
    const now = Date.now();
    const dataToSave = {
      ...counter,
      updatedAt: now,
      createdAt: counter.createdAt || now
    };
    const req = counter.id ? store.put(dataToSave) : store.add(dataToSave);

    req.onsuccess = () => {
      const id = counter.id || (req.result as number);
      resolve({ ...(dataToSave as StandaloneCounter), id });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCounter(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('standalone_counters', 'readwrite');
    const store = tx.objectStore('standalone_counters');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function stepCounter(id: number, delta: number): Promise<StandaloneCounter> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('standalone_counters', 'readwrite');
    const store = tx.objectStore('standalone_counters');
    const req = store.get(id);

    req.onsuccess = () => {
      const existing = req.result as StandaloneCounter | undefined;
      if (!existing) {
        reject(new Error('Counter not found'));
        return;
      }

      let next = existing.currentCount + delta;
      if (next < 0) next = 0;
      if (existing.hasLimit && existing.limitCount != null && next > existing.limitCount) {
        next = existing.limitCount;
      }

      existing.currentCount = next;
      existing.updatedAt = Date.now();
      store.put(existing);
      resolve(existing);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function resetCounter(id: number, targetValue: number = 0): Promise<StandaloneCounter> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('standalone_counters', 'readwrite');
    const store = tx.objectStore('standalone_counters');
    const req = store.get(id);

    req.onsuccess = () => {
      const existing = req.result as StandaloneCounter | undefined;
      if (!existing) {
        reject(new Error('Counter not found'));
        return;
      }

      existing.currentCount = targetValue;
      existing.updatedAt = Date.now();
      store.put(existing);
      resolve(existing);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function initSampleCountersIfEmpty(): Promise<StandaloneCounter[]> {
  const counters = await loadAllCounters();
  if (counters.length === 0) {
    const sampleCounters: Omit<StandaloneCounter, 'id'>[] = [
      {
        name: '冰箱里的可乐',
        currentCount: 6,
        hasLimit: true,
        limitCount: 12,
        unit: '罐',
        step: 1,
        colorHex: '#EF4444',
        note: '喝一次点一下，随时掌握库存量，少于 3 罐及时补货',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        name: '今日咖啡记录',
        currentCount: 2,
        hasLimit: false,
        unit: '杯',
        step: 1,
        colorHex: '#F59E0B',
        note: '喝一杯点一次，无上限自由记录每日咖啡因摄入',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    const created: StandaloneCounter[] = [];
    for (const c of sampleCounters) {
      const saved = await saveCounter(c);
      created.push(saved);
    }
    return created;
  }
  return counters;
}

export async function initSampleDataIfEmpty(): Promise<void> {
  const habits = await loadAllHabits();
  if (habits.length === 0) {
    const today = getLocalDateString();
    const sampleHabits: Omit<Habit, 'id'>[] = [
      {
        name: '今日喝水打卡',
        description: '保持身体水分充盈，每天定时补充健康饮用水',
        iconName: 'Water',
        colorHex: '#14B8A6',
        reminderTime: '10:00',
        sortOrder: 0,
        archived: false,
        createdAt: Date.now(),
        recurrenceType: 'daily',
        startDate: today,
        isCounter: true,
        targetCount: 3,
        unit: '杯'
      },
      {
        name: '力量与体能训练',
        description: '深蹲 4 组 x 10 次\n卧推 4 组 x 10 次\n引体向上 3 组 x 8 次\n赛后肌肉静态拉伸 10 分钟',
        iconName: 'Fitness',
        colorHex: '#8B5CF6',
        reminderTime: '18:30',
        sortOrder: 1,
        archived: false,
        createdAt: Date.now(),
        recurrenceType: 'daily',
        startDate: today,
        isParentPlan: true,
        subTasks: [
          { id: 'sub-squat', title: '深蹲 4 组 x 10 次' },
          { id: 'sub-bench', title: '卧推 4 组 x 10 次' },
          { id: 'sub-pullup', title: '引体向上 3 组 x 8 次' },
          { id: 'sub-stretch', title: '肌肉静态拉伸 10 分钟' }
        ]
      },
      {
        name: '晨跑打卡 3 公里',
        description: '清晨有氧慢跑，配速保持在 6 分钟/公里，唤醒整天元气',
        iconName: 'Run',
        colorHex: '#10B981',
        reminderTime: '07:30',
        sortOrder: 2,
        archived: false,
        createdAt: Date.now(),
        recurrenceType: 'daily',
        startDate: today
      },
      {
        name: '深度阅读 30 分钟',
        description: '专注沉浸式读书，记录精彩文段与思考笔记',
        iconName: 'Book',
        colorHex: '#3B82F6',
        reminderTime: '21:00',
        sortOrder: 3,
        archived: false,
        createdAt: Date.now(),
        recurrenceType: 'daily',
        startDate: today
      }
    ];

    for (const h of sampleHabits) {
      await saveHabit(h);
    }
  } else {
    // Check if "力量与体能训练" needs subTasks populated for existing storage
    const fitness = habits.find((h) => h.name.includes('力量与体能训练') || h.name.includes('力量'));
    if (fitness && (!fitness.subTasks || fitness.subTasks.length === 0)) {
      fitness.isParentPlan = true;
      fitness.subTasks = [
        { id: 'sub-squat', title: '深蹲 4 组 x 10 次' },
        { id: 'sub-bench', title: '卧推 4 组 x 10 次' },
        { id: 'sub-pullup', title: '引体向上 3 组 x 8 次' },
        { id: 'sub-stretch', title: '肌肉静态拉伸 10 分钟' }
      ];
      await saveHabit(fitness);
    }
  }

  // Also initialize sample counters if empty
  await initSampleCountersIfEmpty();
}

export async function clearAllAndResetDefaults(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'checkins', 'standalone_counters'], 'readwrite');
    tx.objectStore('habits').clear();
    tx.objectStore('checkins').clear();
    tx.objectStore('standalone_counters').clear();
    tx.oncomplete = async () => {
      await initSampleDataIfEmpty();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

