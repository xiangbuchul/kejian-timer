# Windows 安装包构建指南

项目已经配置好同时输出 macOS（`.app`/`.dmg`）和 Windows（`.msi`/`.exe`）安装包。
当前环境是 macOS，所以只能生成 macOS 的 `.app`；Windows 安装包需要在 Windows 电脑或 Windows CI 上构建。

## 功能兼容性说明

Windows 同事拿到的功能和 macOS 版本基本一致：

- 主窗口记录任务、查看周报、管理任务类型
- 悬浮窗计时、拖拽、缩放、透明度调节
- 贴边隐藏 / 边缘唤出
- 数据自动保存到 `C:\Users\<用户名>\AppData\Roaming\WorkTimer`
- 全局快捷键（已内置：`Win + Shift + T`）

## Windows 环境准备

1. 安装 Rust：https://www.rust-lang.org/tools/install
2. 安装 Microsoft Edge WebView2（Win11 通常已自带，Win10 部分版本需要手动安装）
3. 安装 Visual Studio 2022 的「使用 C++ 的桌面开发」工作负载（Tauri 需要 MSVC 工具链）

## 构建步骤

把项目文件夹复制到 Windows 电脑，在项目根目录执行：

```powershell
cargo tauri build
```

构建完成后，安装包会出现在：

```text
src-tauri/target/release/bundle/msi/刻间计时器_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/刻间计时器_0.1.0_x64-setup.exe
```

把 `.msi` 或 `.exe` 发给同事即可。NSIS 安装包（`.exe`）通常更适合普通用户，不需要管理员权限；MSI 更适合企业批量部署。

## 全局快捷键在 Windows 上的说明

当前已内置 `Win + Shift + T`。如果同事更习惯 `Ctrl + Shift + T`，修改 `src-tauri/src/lib.rs` 中的快捷键注册代码：

```rust
let shortcut = Shortcut::new(
    Some(tauri_plugin_global_shortcut::Modifiers::CONTROL | tauri_plugin_global_shortcut::Modifiers::SHIFT),
    tauri_plugin_global_shortcut::Code::KeyT,
);
```

然后重新执行 `cargo tauri build`。

## 已知注意事项

- 第一次安装时会自动检测并下载 WebView2 运行时（通过 `embedBootstrapper` 模式）
- 悬浮窗的透明效果需要 Windows 10 版本 1809 或更高
- 数据文件按 Windows 标准存到 Roaming 目录，重装系统前可手动备份该文件夹
