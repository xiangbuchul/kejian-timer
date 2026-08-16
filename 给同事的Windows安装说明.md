# 「刻间计时器」Windows 安装说明（可直接转发给同事）

这个文档分为两部分，请按同事角色转发：
- **第一部分【打包篇】**：发给一位懂技术的同事/Agent，由他在 Windows 电脑上把安装包打出来
- **第二部分【安装篇】**：把打好的安装包发给普通同事，他们按步骤安装即可

---

# 第一部分：打包篇（给技术人员）

## 一、拿到项目文件

从 Mac 同事那里拿到整个项目文件夹，或者从共享盘下载压缩包后解压。

解压后应该能看到类似这样的结构：

```text
work-timer-tauri/
├── src/                    ← 前端页面文件
├── src-tauri/              ← Rust 后端代码
├── GLOBAL_SHORTCUT_SETUP.md
├── WINDOWS_BUILD.md
└── 给同事的Windows安装说明.md   ← 本文件
```

## 二、在 Windows 电脑上安装环境（只需第一次）

按顺序安装下面 3 个东西，顺序不要错。

### 1. 安装 Rust

打开浏览器访问：

```text
https://www.rust-lang.org/tools/install
```

下载 `rustup-init.exe（64-bit）`，双击运行。出现黑框时按提示按回车，使用默认安装即可。

装完后，打开一个新的 **PowerShell** 窗口，输入：

```powershell
rustc --version
cargo --version
```

如果显示版本号（例如 `rustc 1.x.x`），说明安装成功。

### 2. 安装 WebView2 运行时（Win11 可跳过）

Windows 11 通常已经自带 WebView2，可以跳过这一步。

如果是 Windows 10，建议先安装：

```text
https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

下载 `Evergreen Standalone Installer` 并安装。装不装都不影响打包，只是确保最终用户电脑上能正常运行。

### 3. 安装 Visual Studio 2022 的 C++ 工具

这是 Tauri 编译必须用到的，不能跳过。

1. 下载 Visual Studio Community 2022：
   ```text
   https://visualstudio.microsoft.com/zh-hans/downloads/
   ```
2. 安装时勾选这个工作负载：
   **「使用 C++ 的桌面开发」**（Desktop development with C++）
3. 点击安装，等待完成（约 5-15GB，根据网络情况）

## 三、开始打包

1. 按键盘 `Win + R`，输入 `cmd`，回车，打开命令提示符（或 PowerShell）
2. 用 `cd` 命令进入项目文件夹。例如项目放在桌面：
   ```powershell
   cd C:\Users\你的用户名\Desktop\work-timer-tauri
   ```
3. 运行打包命令：
   ```powershell
   cargo tauri build
   ```
4. 第一次打包会比较慢（10-30 分钟），会下载一些依赖，请耐心等待。看到类似下面的输出就表示成功了：
   ```text
   Finished 2 bundles at:
   src-tauri\target\release\bundle\msi\刻间计时器_0.1.0_x64_en-US.msi
   src-tauri\target\release\bundle\nsis\刻间计时器_0.1.0_x64-setup.exe
   ```

## 四、把安装包交给普通同事

从上面两个路径里，复制出这两个文件：

- `刻间计时器_0.1.0_x64-setup.exe`  ← 推荐普通同事使用
- `刻间计时器_0.1.0_x64_en-US.msi`   ← 适合公司 IT 批量安装

把 `.exe` 发给普通同事即可。

---

# 第二部分：安装篇（给普通同事）

## 一、安装软件

1. 从技术人员那里拿到安装文件：
   ```text
   刻间计时器_0.1.0_x64-setup.exe
   ```
2. 双击运行。
3. 如果 Windows 弹出「Windows 已保护你的电脑」，点击「更多信息」→「仍要运行」。
4. 按安装向导提示，一路点击「下一步」完成安装。
5. 安装完成后，可以在开始菜单找到「刻间计时器」，点击打开。

## 二、第一次使用

1. 打开软件后，主窗口就是任务记录界面。
2. 点击右上角或相关按钮可以打开「悬浮窗计时器」。
3. 计时结束后，时间会自动填到当前任务的开始/结束时间里。
4. 数据会自动保存，不用担心关闭软件后丢失。
5. **全局快捷键**：安装后，按 `Win + Shift + T` 可以随时把主窗口唤起到最前。

## 三、常见问题

### Q1：双击没反应，或者提示缺少 WebView2？
请访问下面链接，下载并安装 WebView2：
```text
https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```
选择「Evergreen Standalone Installer」。

### Q2：安装时提示需要管理员权限？
这是正常的。如果公司电脑没有管理员权限，请联系 IT 帮忙安装，或使用 `.msi` 版通过企业软件分发工具安装。

### Q3：我的记录存在哪里？重装系统会丢吗？
数据保存在：
```text
C:\Users\你的用户名\AppData\Roaming\WorkTimer\data.json
```
重装系统前，把这个文件夹复制出来备份即可。

### Q4：全局快捷键是什么？
已内置 `Win + Shift + T`。如果不喜欢这个组合，需要技术人员修改 `src-tauri/src/lib.rs` 后重新打包。
