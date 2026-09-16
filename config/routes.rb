# frozen_string_literal: true

RedmineApp::Application.routes.draw do
  # Bez prípony `.json` — tá prepne Redmine do API vetvy autentizácie, ktorá ignoruje
  # session cookie a prihlásený človek dostane 403. Rovnakú pascu už raz riešili
  # `redmine_rich_editor` u `/uploads.json` aj `redmine_inapp_notifications`.
  post 'dark_mode/toggle', :to => 'dark_mode#toggle', :as => 'dark_mode_toggle'
end
