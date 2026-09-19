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

## 已知历史坑

- `res/` 原本**完全没有** drawable/mipmap，Manifest 却引用了 `@mipmap/ic_launcher`，
  工程在补图标之前根本无法编译。已补 `ic_launcher_foreground.xml` 自适应图标。
