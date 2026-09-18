# 每日习惯打卡 Android App (Kotlin + Jetpack Compose)

基于 **Kotlin + Jetpack Compose + Material 3** 构建的原生 Android 习惯打卡与拍照留证工具。

## 核心功能与技术规范

- **目标平台**: Android 10 (API 29) 至 Android 15 (API 35)。
- **界面层**: 100% Jetpack Compose + Material 3，适配系统深色/浅色模式，全中文界面，字号严格保证不小于 12sp。
- **本地存储**: Room 数据库（`Habit` 习惯表、`CheckIn` 打卡表），`HabitStats` 采用动态查询实时算，零冗余字段。
- **连续天数算法**: 本地时区自然日（00:00 为界），计算当前连续打卡天数与历史最长纪录，断卡后当前连续天数正确归零。
- **拍照与相册凭证**: 采用 Android 官方最新标准 `ActivityResultContracts.PickVisualMedia`（Photo Picker），向下兼容至 Android 10，无需申请危险的 `READ_EXTERNAL_STORAGE` 权限。
- **照片持久化保护**: 从 Photo Picker 获取的临时 Uri 流式复制存储至 App 私有存储目录（`getExternalFilesDir` / `filesDir`），保证手机重启与沙盒生命周期内文件永久有效。
- **本地定时提醒**: 使用 `AlarmManager.setExactAndAllowWhileIdle` 精确定时；注册 `BOOT_COMPLETED` 广播接收器在开机后自动重新排期所有提醒；通知渠道配置完整，Android 13+ 运行时动态请求 `POST_NOTIFICATIONS` 权限，通知附带一键打卡 Action。
- **历史热力图与流**: 35 天日历热力图（依每日完成度比例呈现深浅梯度）+ 倒序打卡流水列表，支持点击缩略图全屏查看大图凭证。

## 在 Android Studio 中运行

1. 打开 Android Studio (推荐 Hedgehog / Iguana / Ladybug 或更高版本)。
2. 选择 **File -> Open...**，定位到本工程的 `android` 目录。
3. 等待 Gradle 同步依赖完成（使用 Gradle 8.7+ 和 JDK 17）。
4. 连接 Android 10 ~ 15 设备或模拟器，点击 **Run 'app'** 即可直接编译运行。
