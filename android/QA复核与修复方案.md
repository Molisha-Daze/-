# 静态 QA 报告复核与修复方案

> 复核对象：外部 GPT 对 `android/`（习惯打卡 App）的静态分析报告，共 6 条
> 复核方式：逐条回到源码定位行号验证，不采信结论本身
> 代码基准：`minSdk 29 / compileSdk 35 / Room 2.6.1 / Compose BOM 2024.11.00 / Kotlin 2.0.21`

---

## 一、复核结论总表

| # | 报告结论 | 复核判定 | 定级 | 一句话说明 |
|---|---|---|---|---|
| 1 | 工程无法编译 | ✅ **完全属实** | **P0 阻断** | `HistoryScreen` 引用了 ViewModel 里不存在的三个成员 |
| 2 | 未来日期可标记完成 | ✅ **属实**，且报告漏报一处 | **P1** | 无月份上限 + 无日期校验 + 无数据层守卫，三道门全开 |
| 3 | 重复计划/计数器未落地 | ✅ **属实** | **P1（休眠炸弹）** | 字段在、判定逻辑在、入口不在，靠默认值侥幸对齐 |
| 4 | 提醒已完成后仍弹 + 无效习惯写库 | ⚠️ **结论对，机理描述不准** | **P1** | 代码其实查了 habit，但只取字段不判空；真正的崩点是外键 |
| 5 | 数据库升级会清库 | ✅ **完全属实** | **P0 数据安全** | `fallbackToDestructiveMigration()` + `exportSchema=false` 双重裸奔 |
| 6 | 权限失败无反馈 | ✅ **属实**，精确定时部分需修正 | **P2** | 通知权限属实；精确定时因 `USE_EXACT_ALARM` 存在，实际影响面比报告说的小 |

**总评**：这份报告质量意外地高——6 条里 5 条结论站得住，且都给出了准确的符号名和调用关系，不是那种扫一眼就编的类型。扣分点是两条：#4 的机理写岔了，#6 把两个不同的精确定时权限混为一谈。另外漏了 3 个我认为更值得修的隐患，见第三节。

---

## 二、逐条复核与修复方案

### 问题 1 — 编译阻断（P0）

**证据**
- `HistoryScreen.kt:57-58` 读取 `viewModel.allHabits` / `viewModel.allCheckIns`
- `HistoryScreen.kt:82` 调用 `viewModel.toggleCheckIn(habitId, date)`（两参数）
- `HabitViewModel.kt:20-47` 实际只有 `habitsWithStats` / `heatMapProgress` / `historyRecords`，`toggleCheckIn(habitId: Long)` 只有一个参数

Repository 里其实**已经有** `allHabits`（`HabitRepository.kt:23`）和 `checkInDao.getAllCheckIns()`（`CheckInDao.kt:51`），只是没往 ViewModel 暴露。所以这不是设计缺失，是漏转发。

**修复**

`HabitRepository.kt` 增补：

```kotlin
val allCheckIns: Flow<List<CheckIn>> = checkInDao.getAllCheckIns()
```

`HabitViewModel.kt` 增补：

```kotlin
val allHabits: StateFlow<List<Habit>> = repository.allHabits
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

val allCheckIns: StateFlow<List<CheckIn>> = repository.allCheckIns
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
```

`HabitViewModel.kt` 改签名：

```kotlin
fun toggleCheckIn(habitId: Long, date: String = DateUtils.today()) {
    viewModelScope.launch { repository.toggleCheckIn(habitId, date) }
}
```

注意 `HistoryScreen.kt:58` 用的是 `collectAsState(initial = emptyList())`，而 `allCheckIns` 是 `StateFlow`——`StateFlow` 有初值，那行可以直接写成 `collectAsState()`，顺手改掉。

**⚠️ 关键**：`date` 参数一旦放开，就等于把问题 2 的口子开到了数据层。**必须同时落地问题 2 的守卫**（见下），否则修完编译只是换了个地方产生脏数据。

**验收**：`./gradlew :app:assembleDebug` 通过。

---

### 问题 2 — 未来日期可打卡（P1）

**证据**
- `CalendarMonthView.kt:104` `currentMonth.plusMonths(1)` 无上限，可一路翻到 2099 年
- `CalendarMonthView.kt:259` 行的 `clickable` 与 `:265` 的 `onCheckedChange` 都没有 `date > today` 判断
- `HabitRepository.toggleCheckIn():122` 对 `date` 参数无任何校验，原样写入

**报告漏报的一处**：`CalendarMonthView.kt:68-69` 的 `currentMonth` 和 `selectedDate` 是两个独立 state。翻到下一个月后 `selectedDate` 仍停在上个月的某一天，下方"计划清单"标题（`:229`）渲染的是旧月份日期，而网格高亮的是新月份——**月历和清单显示的不是同一天**。这是纯 UI 逻辑错误，不是数据问题，但用户第一眼就会觉得"这 App 算错了"。

**修复（三道防线，缺一不可）**

1. **UI 层** `CalendarMonthView.kt`：
   - 「下一月」按钮 `enabled = currentMonth < YearMonth.now()`
   - 日期格 `dateObj > today` 时去掉 `clickable`，文字改 `onSurfaceVariant.copy(alpha = 0.38f)` 置灰
   - 切月时把 `selectedDate` 夹回当前月（`coerceIn(firstDay, lastDay)`），或切月即重置为该月 1 号

2. **交互层** `CalendarMonthView.kt:254-260`：`selectedDate > today` 时整行不可点（现在只禁了 Checkbox，行本身还能点，属于漏网）

3. **数据层**（真正的兜底）`HabitRepository.toggleCheckIn()`：
   ```kotlin
   if (date > DateUtils.today()) return false   // 不抛异常，通知路径也在调这个
   ```
   用 `return false` 而非 `require()`，避免 `CheckInActionReceiver` 这类后台路径被异常打断。

**顺带修**：`StreakCalculator.kt:26-35` 加一道 `filter { it <= referenceToday }`。否则一旦写进未来日期，`longestStreak`（`:93` 的 `maxOf(maxStreak, currentStreak)`）会把未来段也算进去，产出"连续打卡 47 天"这种鬼数据。

---

### 问题 3 — 重复计划与计数器未落地（P1，休眠炸弹）

**证据**
- `Habit.kt:19-29` 定义了 `recurrenceType` / `startDate` / `endDate` / `weeklyDays` / `monthlyDays` / `intervalDays` / `isCounter` / `targetCount` / `unit`
- `CalendarMonthView.kt:301-329` 的 `isHabitScheduled()` 完整实现了五种重复类型的判定
- 但 `AddEditHabitDialog.kt:83` 的 `onSave` 只回传 4 个字段，`HabitViewModel.addHabit():73-91` 也只接收 4 个
- `HabitRepository.habitsWithStats():41-56` 直接把 `getAllActiveHabits()` 全量列出，完全不判排期
- `HabitRepository.toggleCheckIn():130-136` 写入的 `CheckIn` 用默认 `count = 1`，不看 `targetCount`

**为什么现在没爆**：新建习惯时 `recurrenceType` 默认 `"daily"`、`startDate` 默认 `""`，而 `isHabitScheduled` 对 `"daily"` 恒返回 `true`（`:310`）。所以今日页和月历**碰巧**算出一样的结果。但只要数据库里出现任意一行 `recurrenceType="weekly"`（将来补了 UI、手动改库、或导入数据），今日页、统计、月历三方立刻给出互相矛盾的答案。

**具体矛盾**：计数器习惯（如"喝水 3 杯"）在今日页点一下就标记完成（`count=1` 但 `isCompleted=true`），而月历按 `count >= targetCount` 判定（`:159`）——**今日页说完成了，月历说没完成**。反过来，通知里的"一键完成"会直接把 `count` 灌成 `targetCount`（`CheckInActionReceiver.kt:40`）。同一个习惯三条路径三种语义。

**根因**：`isHabitScheduled()` 是 `CalendarMonthView.kt` 里的 **private 函数**，今日页和统计压根调用不到，只能各写各的。

**修复（需要拍板，两个方案）**

**方案 A — 完整实现（推荐，工作量中等）**
1. 把 `isHabitScheduled()` 从 `CalendarMonthView.kt` 提取到 `util/HabitSchedule.kt` 并改为 public，今日页 / 月历 / 统计 / 通知**共用同一份判定**——这是根治口径不一致的关键一步
2. `AddEditHabitDialog` 增加：重复方式分段控件（每天 / 每周 / 每月 / 每 N 天 / 单次）、起止日期、计数器开关（目标次数 + 单位）；`onSave` 改为回传完整 `Habit` 对象
3. `HabitRepository.habitsWithStats()` 用 `isHabitScheduled(habit, todayDate)` 过滤"今天该做的"，进度分母改为**当天有排期的习惯数**，而非全部活跃习惯数
4. `HabitCard` 对 `isCounter` 显示 `+1 / -1` 与 `n / target`，`toggleCheckIn` 改为按 `count` 递增，达到 `targetCount` 才置 `isCompleted`
5. `AlarmReceiver` / `CheckInActionReceiver` 的完成判定统一走 `HabitSchedule.isCompleted(habit, checkIn)`

**方案 B — 砍字段保简洁（最小改动）**
把 `Habit` 收敛成纯"每日习惯"，删掉 `recurrenceType` / `weeklyDays` / `monthlyDays` / `intervalDays` / `isCounter` / `targetCount` / `unit`，同时简化 `isHabitScheduled`。代价是放弃"每周三次"这类能力，但代码债务归零，且**不需要写数据库迁移**（因为 `version=1` 还没发布，见问题 5）。

> 我的意见：如果这个 App 是你自己长期用的，选 A——"每周一三五健身"这种需求迟早会来，现在字段和判定逻辑已经写好了，补 UI 比将来从零加便宜得多。但如果只是想尽快跑起来用，B 更省事。**这是唯一需要你拍板的一条，其余 5 条照做即可。**

---

### 问题 4 — 提醒链路（P1）

**证据与修正**

报告说"通知操作接收器没有确认习惯仍存在且未归档"——**措辞不准**。

`CheckInActionReceiver.kt:30` 确实调用了 `getHabitById(habitId)`，但注意 `:31-32`：

```kotlin
val targetCount = habit?.targetCount ?: 1
val isCounter = habit?.isCounter ?: false
```

**只取字段，没判空**。`habit` 为 `null`（习惯已删除）时流程继续往下走，`:36` 照样 `insert`。而 `CheckIn.kt:10-17` 声明了 `ForeignKey(onDelete = CASCADE)`——插入一个 `habitId` 已不存在的 `CheckIn` 会直接抛 `FOREIGN KEY constraint failed`。所以**结论对，崩点机理要写准**。另外 `archived` 确实全程没校验（`HabitDao.kt:14` 的查询都带 `WHERE archived = 0`，但通知路径用的是 `getHabitById`，不带这个条件）。

其余两条属实：
- `AlarmReceiver.kt:18` 拿到广播直接 `showReminderNotification`，没有任何"今天是否已打卡"查询
- `HabitRepository.toggleCheckIn()` 完成后没有任何 `NotificationManager.cancel()`

**修复**

`AlarmReceiver.kt` — 先查再弹，且 `goAsync()` 要在所有 return 前 `finish()`：

```kotlin
val pendingResult = goAsync()
CoroutineScope(Dispatchers.IO).launch {
    try {
        val db = HabitDatabase.getInstance(context)
        val habit = db.habitDao().getHabitById(habitId) ?: return@launch
        if (habit.archived || habit.reminderTime == null) return@launch

        // 已完成则不再打扰
        val existing = db.checkInDao().getCheckIn(habitId, DateUtils.today())
        val done = if (habit.isCounter) (existing?.count ?: 0) >= habit.targetCount
                   else existing != null
        if (!done) NotificationHelper.showReminderNotification(context, habitId, habit.name)

        NotificationHelper.scheduleDailyReminder(context, habit)  // 顺带用查到的 habit，别用 intent 里的旧名字
    } finally {
        pendingResult.finish()
    }
}
```

> 顺带修一个报告没提的：`AlarmReceiver` 用的是 intent 里带的 `habitName`（`:14`），习惯改名后通知还会显示旧名字。改成从 DB 取。

`CheckInActionReceiver.kt` — 补判空 + 归档校验：

```kotlin
val habit = db.habitDao().getHabitById(habitId) ?: return@launch
if (habit.archived) return@launch
```

`HabitRepository.toggleCheckIn()` — 完成后消通知（repository 已持有 `context`）：

```kotlin
// 标记为完成后
(context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
    .cancel(habitId.toInt())
```

---

### 问题 5 — 破坏性迁移清库（P0）

**证据**
- `HabitDatabase.kt:31` `.fallbackToDestructiveMigration()`
- `HabitDatabase.kt:15` `exportSchema = false`

报告说得对，但只说了一半。`exportSchema = false` 意味着 Room 不落 schema JSON，将来既**无法用 AutoMigration**，也**没有历史 schema 可供比对**，手写迁移时全靠人肉回忆改了什么——这比 `fallbackToDestructiveMigration` 本身更麻烦。

好消息：`backup_rules.xml` 已经 `<include domain="database" path="." />` 和 `domain="file"`（打卡照片），Android 的云端备份覆盖了数据库和私有文件目录。这是条兜底，但**依赖 Google 备份可用性，且 `data_extraction_rules.xml` 需要确认**——自用工具不该把数据命运交给它。

**修复**

1. 删掉 `.fallbackToDestructiveMigration()`
2. `exportSchema = true`，生成的 `app/schemas/` 目录纳入版本管理
3. `version = 1` 当前无需迁移对象；今后每次改实体：编译拿 `schemas/N.json` → 手写 `Migration(N-1, N)` → 用 `MigrationTestHelper` 或手动开旧库验证
4. **额外建议**：加一条手动导出通道（把 `habit_tracker.db` + 照片目录打包到用户可访问的 Download 目录）。对"自用长期记录工具"这个定位来说，这是唯一真正让人安心的兜底

> 现在动手代价最低：`version=1` 还没发布过，随便改实体都不需要写迁移。等用上几个月再想起来改，就得老老实实写 `Migration` 了。

---

### 问题 6 — 权限失败无反馈（P2）

**证据与修正**

通知权限部分**完全属实**：
- `MainScreen.kt:38-40` 回调是 `{ _ -> }`——结果直接丢进垃圾桶
- `MainScreen.kt:42-52` 的 `LaunchedEffect(Unit)` 只在首次进入请求一次，用户拒绝后 App 再也不提，也没有 `shouldShowRequestPermissionRationale` 解释

精确定时部分**需要修正报告**。`AndroidManifest.xml:7-8` 同时声明了：

```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

- `USE_EXACT_ALARM` 是 Android 13（API 33）引入的，**安装即授予、用户不可撤销**。只要声明了它，Android 13+ 上 `canScheduleExactAlarms()` 恒为 `true`，`NotificationHelper.kt:81-93` 的降级分支根本走不到
- 真正会降级到非精确的只有 **Android 12（API 31–32）**，且用户在系统设置里手动关掉了"闹钟和提醒"
- 两者并存是冗余。`USE_EXACT_ALARM` 在 Google Play 上架需要提交用途声明（自用无所谓，但没必要留）

所以报告把"通知权限被拒"和"精确定时被拒"并列，夸大了后者的影响面。

**修复**

1. `MainScreen.kt:40` 回调改为 `{ granted -> notificationGranted = granted }`；未授予时在页面顶部显示可点击提示条，跳 `Settings.ACTION_APP_NOTIFICATION_SETTINGS`
2. **改请求时机**：别在冷启动时就要权限（拒绝率最高）。改成用户点击"设置每日提醒时间"那一刻再请求——语义准确，说服力强得多
3. `NotificationHelper.scheduleDailyReminder()` 改为返回 `Boolean`（是否真的用上了精确闹钟），降级时让编辑页显示"已降级为不精确提醒（可能延迟数分钟）· 去设置开启"
4. `AndroidManifest.xml` 删掉 `USE_EXACT_ALARM`，保留 `SCHEDULE_EXACT_ALARM`

> 补充确认：`minSdk = 29`，`java.time.*` 原生可用，**不需要** coreLibraryDesugaring。这点没问题。

---

## 三、报告漏掉的三个隐患

### 隐患 A — `HabitDao.insert` 用了 `REPLACE`（高危）

`HabitDao.kt:23`：`@Insert(onConflict = OnConflictStrategy.REPLACE)`

SQLite 的 `REPLACE` 语义是**先删后插**。配合 `CheckIn.kt:11-17` 的 `ForeignKey(onDelete = CASCADE)`，一旦有人拿一个已存在的 `habit`（`id != 0`）走 `insert` 路径，会**连带删掉该习惯的全部打卡记录和照片关联**。

目前 `addHabit()` 只在新增时用（`Habit.kt` 的 `id` 默认 0），`updateHabit()` 走的是 `@Update`——所以暂时不触发。但这是一颗踩上去就炸的雷，且 Room 官方文档明确警告过这个组合。

**修复**：改成 `OnConflictStrategy.IGNORE`，或在 Dao 注释里写死"更新只允许走 `@Update`"。

### 隐患 B — 通知 ID 与 requestCode 靠魔法数字错开

`NotificationHelper.kt:74` 用 `habitId.toInt()` 做 PendingIntent requestCode，`:150` 用 `habitId.toInt() + 100000` 给打卡 Action 错开，`:170` 又用 `habitId.toInt()` 做通知 ID。三处裸 `toInt()` 散落在不同文件（`CheckInActionReceiver.kt:55` 也有一处），靠 `+100000` 这个偏移量保证不撞车——改一处忘一处就会静默串台。

**修复**：在 `NotificationHelper` 里集中生成：`reqCodeAlarm(id)` / `reqCodeAction(id)` / `notificationId(id)`，别在 Receiver 里自己算。

### 隐患 C — 计数器根本没有 +1 的入口

`HabitRepository.toggleCheckIn():122-139` 的语义是"有则删、无则插"，对计数器习惯意味着只能在 `0 ↔ 1` 之间横跳。而月历按 `count >= targetCount` 判定（`:159`）——**除了通知里的"一键完成"会直接灌满，用户在 App 内永远无法把一个"喝水 3 杯"的习惯标记为完成**。这是问题 3 最具体的一个症状，单列出来是因为它即使不采纳方案 A，也值得单独补一个 +1 按钮。

---

## 四、执行顺序

| 顺序 | 任务 | 理由 |
|---|---|---|
| 1 | 问题 1 恢复编译 | 不编译就什么都验不了 |
| 2 | 问题 5 迁移策略 | 现在改零成本，等数据攒起来就贵了 |
| 3 | 问题 2 未来日期（含三道防线） | 改动小、收益高，且是问题 1 的前置守卫 |
| 4 | 问题 4 提醒链路 | 独立模块，不影响其他 |
| 5 | 隐患 A（`REPLACE` → `IGNORE`） | 一行改动，拆掉一颗雷 |
| 6 | 问题 6 权限反馈 | 体验问题，可缓 |
| 7 | 问题 3 排期/计数器 | 最大块，**需先拍板 A / B** |

---

## 五、验收清单

- [ ] `./gradlew :app:assembleDebug` 通过
- [ ] 月历翻到当月后「下一月」按钮置灰，未来日期不可点
- [ ] 强行构造 `toggleCheckIn(habitId, "2099-01-01")` 不产生任何数据库写入
- [ ] 先在 App 内打卡，等到提醒时间，通知**不再出现**
- [ ] 删除某习惯后，若其通知仍挂在通知栏，点「一键完成」不崩溃
- [ ] 在 App 内打卡后，该习惯的已展示通知立即消失
- [ ] Android 13 上拒绝通知权限后，App 内出现"去设置开启"提示条
- [ ] Android 12 模拟器关闭"闹钟和提醒"后，编辑页显示降级提示
- [ ] 修改实体字段并 bump `version` 后，旧数据完整保留（迁移验证）
- [ ] 计数器习惯可在 App 内累加到 `targetCount` 并正确标记为完成

---

## 六、实施状态（2026-09-19）

问题 3 经确认走**方案 A（完整实现）**，六条结论 + 三个补充隐患已全部落地：

| 项 | 涉及文件 | 状态 |
|---|---|---|
| 编译阻断 | `HabitViewModel` / `HabitRepository` / `HistoryScreen` | ✅ |
| 数据库迁移策略 | `HabitDatabase`（删 `fallbackToDestructiveMigration`，`exportSchema=true`） | ✅ |
| 排期判定统一 | 新增 `util/HabitSchedule.kt`，月历/今日页/热力图/通知共用 | ✅ |
| 排期与计数器 UI | `AddEditHabitDialog`（`onSave` 改为回传完整 `Habit`） | ✅ |
| 今日页口径 | `habitsWithStats` 增 `scheduledToday`，新增 `todayHabits`；热力图分母改为当天有排期数 | ✅ |
| 计数器打卡 | 新增 `incrementCheckIn` / `decrementCheckIn`，`HabitCard` 与月历均提供 ± | ✅ |
| 未来日期防护 | 月历禁翻未来月 + 未来格只读 + 数据层 `isWritableDate` + `StreakCalculator` 过滤 | ✅ |
| 提醒链路 | `AlarmReceiver` 查完成/排期/用 DB 最新名；`CheckInActionReceiver` 判空+归档；完成后消通知 | ✅ |
| 权限反馈 | `MainScreen` 消费回调 + 去设置提示条；弹窗在设置提醒时再请求；精确定时降级明示 | ✅ |
| 隐患 A/B | `HabitDao.insert` 改 `IGNORE`；通知 ID/requestCode 集中到 `NotificationHelper` | ✅ |

**未验证项**：本机无 Android SDK 与 Gradle wrapper，未做编译验证。
首次构建需执行 `./gradlew :app:assembleDebug`（会生成 `app/schemas/1.json`，请纳入版本管理）。

**已规避的回归**：老数据 `startDate` 为空串表示「不限起始」，编辑弹窗不得擅自填成今天，
否则该习惯在开始日期之前的历史排期会全部消失——弹窗对空值显示「不限」并原样保留。
