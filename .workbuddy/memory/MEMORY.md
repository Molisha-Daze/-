# 项目长期约定 — dailywork（习惯打卡 App）

## Android 离线构建工具链（重要，可直接复用）

工具链在 **E:\anzhuo\toolchain**（非默认位置，系统没有 ANDROID_HOME、也没有 gradlew）：

- JDK：`E:\anzhuo\toolchain\jdk-17.0.20.1+1`
- Gradle：`E:\anzhuo\toolchain\gradle-8.9\bin\gradle`（8.9，与 AGP 8.7.3 匹配）
- Android SDK：`E:\anzhuo\toolchain\android-sdk`（platform-35、build-tools 35.0.0 已装）
- Gradle 缓存：`E:\anzhuo\toolchain\.gradle-home`

**构建命令**（注意 PATH 必须补 PortableGit 的 usr/bin，否则 ls/dirname/cat/tail 全找不到）：

```bash
export PATH="/c/Users/admin/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:/c/Users/admin/.workbuddy/binaries/PortableGit/versions/1.2.0/bin:$PATH"
export JAVA_HOME="E:\\anzhuo\\toolchain\\jdk-17.0.20.1+1"
export ANDROID_HOME="E:\\anzhuo\\toolchain\\android-sdk"
export ANDROID_SDK_ROOT="E:\\anzhuo\\toolchain\\android-sdk"
export GRADLE_USER_HOME="E:\\anzhuo\\toolchain\\.gradle-home"
"/e/anzhuo/toolchain/gradle-8.9/bin/gradle" \
  -p "C:/Users/admin/Documents/trae_projects/lunwen/dailywork/android" \
  :app:assembleDebug :app:testDebugUnitTest --console=plain --no-daemon
```

- 从 Bash 调用 `cmd` 会被安全策略拦截（"Invoking cmd.exe from Bash bypasses all command validation"），别走这条路。
- 输出重定向到文件再读，别用管道（管道命令可能缺失）。
- 全量构建约 1.5 分钟，增量 25 秒左右。

## 工程约定

- Room：`exportSchema=true` + `ksp { arg("room.schemaLocation", "$projectDir/schemas") }`。
  schema JSON 在 `android/app/schemas/`，**必须纳入版本管理**，供写 Migration 时比对。
- 单元测试：`testImplementation(libs.junit)`（4.13.2），纯 JVM 逻辑（如 StreakCalculator）可直接测，
  不需要 Robolectric。
- minSdk 29，java.time 原生可用，不需要 desugaring；因此启动图标只需 `mipmap-anydpi-v26`
  自适应图标变体，不必提供各密度 PNG。

## ⚠️ 项目结构：两份共存的实现（2026-09-19 整理）

本仓库不是「一个 App」，而是两份独立的 App 实现。动任何一个之前先确认改的是哪一份：

| # | 位置 | 技术栈 | 存储 | 说明 |
|---|---|---|---|---|
| 1 | `src/` | React 19 + TS + Tailwind 4 + Vite | IndexedDB `HabitTrackerDB` v3 | 网页版，真正能在浏览器跑起来的那个 |
| 2 | `android/` | Kotlin + Compose + Room | Room SQLite **version=2** | 原生版，能真的编译出 APK |

两者**零代码共用，数据完全不互通**。~~第 3 份 `src/services/androidSources.ts`~~
已于 2026-09-19 **删除**（见下）。

- 「独立计数器」：两边现在都有了。**它是脱离习惯的独立实体**（如"冰箱里的可乐"）；
  `Habit.isCounter` 是另一个概念（习惯内的计数目标，如"喝水3杯"），**同名不同义**，别搞混。
- 「管理中心」：2026-09-19 21:10 **两边已合并为同一结构**，现在是真正的 1:1 对应：
  上半屏是四个功能金刚区（设置字号 / 关于 / 数据备份 / 提醒设置），
  下半屏是计划清单（习惯的增删改与排序）。安卓侧实现为
  `SettingsScreen` + 嵌入的 `HabitManageSection`。
- **导航结构两边已完全一致，均为 4 个 tab**：
  今日打卡 / 日历与回顾(安卓叫历史回顾) / 独立计数器(安卓叫计数器) / 管理中心。
  ⚠️ 不要再单独加「习惯管理」tab —— 它已被并入管理中心，重复拖动出来会让两边再次错位。
- **给外部 GPT / AI 派活时必须指定改哪一份**，否则它改了 `src/`，用户在 APK 里看不到任何变化
  （2026-09-19 codex 分支就是这么踩的）。

### HabitManageSection 刻意不用 LazyColumn
它会被放进 `SettingsScreen` 的 LazyColumn 里。嵌套 LazyColumn 必须给内层固定高度，
滚动会很怪；习惯数量通常只有几十个，改为 Column 全量渲染（网页版也是全量 map，行为对齐）。
将来若习惯数量真涨到几百，再考虑用 `LazyListScope` 扩展函数重写。

### ⚠️ Room 已升到 version=2，改实体必须同时做两件事

独立计数器（`standalone_counters` 表，实体 `StandaloneCounter`）随 `MIGRATION_1_2` 引入。
`HabitDatabase` 里 `version` 已由 1 改为 2。今后改实体必须同时做两件事：

1. 写显式 `Migration(old, new)` 并在 `addMigrations(...)` 注册
2. 把新导出的 `app/schemas/.../N.json` 纳入版本管理

**绝不可用 `fallbackToDestructiveMigration()`**——那会静默删库，丢掉全部习惯、打卡历史和照片关联。
手改 Migration SQL 后，务必把自己写的建表语句与导出 JSON 的 `fields`
逐字段比对（列名 / affinity / notNull 三者都要一致）。

## 已知历史坑

- `res/` 原本**完全没有** drawable/mipmap，Manifest 却引用了 `@mipmap/ic_launcher`，
  工程在补图标之前根本无法编译。已补 `ic_launcher_foreground.xml` 自适应图标。
