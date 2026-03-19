// Empêche l'ouverture d'une fenêtre console sur Windows en release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    phonemirror_lib::run()
}
