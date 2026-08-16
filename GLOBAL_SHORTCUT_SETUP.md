# 「刻间计时器」全局快捷键说明

**当前版本已内置全局快捷键**，默认：

- **macOS**：`Cmd + Shift + T`
- **Windows**：`Win + Shift + T`（因为代码里用的是 `SUPER` 键）

按下后会把「刻间计时器」主窗口唤起到最前，无论你当前正在用哪个软件。

## 当前实现代码（已内置）

相关代码已经在 `src-tauri/src/lib.rs` 的 `run()` 函数中：

```rust
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|_app| {
            let shortcut = Shortcut::new(
                Some(tauri_plugin_global_shortcut::Modifiers::SUPER | tauri_plugin_global_shortcut::Modifiers::SHIFT),
                tauri_plugin_global_shortcut::Code::KeyT,
            );
            _app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            })?;
            let dir = data_dir();
            fs::create_dir_all(&dir)?;
            Ok(())
        })
```

## 如何修改快捷键

改 `Code::KeyT` 和 `Modifiers` 即可。例如把 Windows 上改成 `Ctrl + Shift + T`：

```rust
let shortcut = Shortcut::new(
    Some(tauri_plugin_global_shortcut::Modifiers::CONTROL | tauri_plugin_global_shortcut::Modifiers::SHIFT),
    tauri_plugin_global_shortcut::Code::KeyT,
);
```

修改后重新执行 `cargo tauri build` 即可生效。

## 权限说明

`src-tauri/capabilities/default.json` 中已经添加了：

```json
"global-shortcut:allow-register",
"global-shortcut:allow-unregister"
```

这样插件才有权限注册和注销全局快捷键。
