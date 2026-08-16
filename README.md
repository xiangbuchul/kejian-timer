# 刻间计时器

一个简洁的桌面工时记录工具，支持主窗口任务记录和悬浮窗计时。

## 功能

- 记录每日任务处理时间（任务类型、开始/结束时间、处理量级、常规/突发属性）
- 悬浮窗计时器：置顶、透明、可拖拽缩放、贴边隐藏
- 每周汇总统计
- 全局快捷键唤起（默认 `Cmd + Shift + T` / `Win + Shift + T`）
- 数据本地保存

## 下载安装

### macOS

下载 [`刻间计时器.app.zip`](./刻间计时器.app.zip)，解压后将 `刻间计时器.app` 拖到「应用程序」文件夹。

### Windows

本仓库使用 GitHub Actions 自动构建 Windows 安装包。

1. 点击本页面顶部的 **Actions** 标签
2. 选择 **Build Windows Installer**
3. 点击最新的成功运行记录
4. 在页面底部的 **Artifacts** 区域下载：
   - `kejian-timer-windows-setup`：`.exe` 安装包（推荐普通用户）
   - `kejian-timer-windows-msi`：`.msi` 安装包（适合企业批量部署）

> 如果 Actions 页面没有可下载的产物，请联系项目维护者手动触发一次构建。

## 手动构建

### Windows

确保已安装 Rust、WebView2 和 Visual Studio 2022 的「使用 C++ 的桌面开发」工作负载，然后在项目根目录执行：

```powershell
cargo tauri build
```

详见 [`WINDOWS_BUILD.md`](./WINDOWS_BUILD.md)。

### macOS

```bash
cargo tauri build --bundles app
```

## 快捷键

全局快捷键已默认启用，用于唤起主窗口：

- macOS：`Cmd + Shift + T`
- Windows：`Win + Shift + T`

如需修改，请参考 [`GLOBAL_SHORTCUT_SETUP.md`](./GLOBAL_SHORTCUT_SETUP.md)。

## 数据保存位置

- macOS：`~/Library/Application Support/WorkTimer/`
- Windows：`C:\Users\<用户名>\AppData\Roaming\WorkTimer\`

## 文档

- [`给同事的Windows安装说明.md`](./给同事的Windows安装说明.md)：可直接转发给同事的详细安装说明
- [`WINDOWS_BUILD.md`](./WINDOWS_BUILD.md)：Windows 打包指南
- [`GLOBAL_SHORTCUT_SETUP.md`](./GLOBAL_SHORTCUT_SETUP.md)：全局快捷键说明

## 网页版（推荐 Windows 同事使用）

如果你不想安装桌面客户端，可以直接使用网页版：

```text
https://xiangbuchul.github.io/kejian-timer/
```

网页版功能与桌面版基本一致：
- 任务记录、任务类型管理
- 每周汇总与周五周报
- 可拖拽的悬浮计时面板
- 数据保存在浏览器本地

**注意**：网页版不支持全局快捷键 `Cmd+Shift+T` / `Win+Shift+T`。

## 启用 GitHub Pages

1. 打开仓库 Settings → Pages
2. Source 选择 **Deploy from a branch**
3. Branch 选择 **gh-pages** / (root)
4. 或者使用 GitHub Actions 自动部署（已配置 `.github/workflows/pages.yml`）
