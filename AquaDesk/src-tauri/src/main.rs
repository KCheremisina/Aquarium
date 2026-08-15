#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

// Глобальная переменная для хранения текущего режима
static IS_WIDGET_MODE: AtomicBool = AtomicBool::new(false);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Регистрируем глобальную горячую клавишу F1
            app.global_shortcut().on_shortcut("F10", move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    // Переключаем состояние
                    let current = IS_WIDGET_MODE.load(Ordering::SeqCst);
                    let next_mode = !current;
                    IS_WIDGET_MODE.store(next_mode, Ordering::SeqCst);

                    // 1. Делаем окно прозрачным для курсора
                    let _ = window.set_ignore_cursor_events(next_mode);

                    // 2. Сообщаем фронтенду о смене режима
                    let _ = window.emit("widget-mode-changed", next_mode);
                }
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}