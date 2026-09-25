# frozen_string_literal: true

# Redmine Dark mode (Previo) — prepínač tmavého režimu v hlavičke.
#
# PREČO TO JE PLUGIN A NIE TÉMA: Redmine prepína tému centrálne pre celú inštanciu
# (Administration → Settings → Display), nie pre jednotlivých ľudí. Tmavý režim, ktorý
# si zapína každý sám za seba, sa preto nedá spraviť ďalšou témou — musí to byť CSS
# vrstva, ktorá sa pridáva podľa nastavenia prihláseného človeka.
#
# `require_relative` je zámerne tu a nie v `to_prepare` — ten sa v production nespúšťa.
require_relative 'lib/dark_mode'
require_relative 'lib/dark_mode/hooks'

Redmine::Plugin.register :redmine_dark_mode do
  name 'Dark mode (Previo)'
  author 'Martin Kopáč'
  description 'A moon switch in the header that turns Redmine dark for the logged-in ' \
              'user. The choice is stored on the account, not in the browser.'
  version '0.1.4'
  url 'https://github.com/martinkopac19/redmine_dark_mode'
  requires_redmine version_or_higher: '6.0'

  settings :default => DarkMode::DEFAULTS,
           :partial => 'settings/dark_mode'

  # Ikona ide medzi filter notifikácií a odhlásenie — `:before => :logout` je jediná
  # pozícia, ktorá to drží bez ohľadu na poradie načítania pluginov (filter si pozíciu
  # neurčuje, takže sa naň odkazovať nedá).
  #
  # `url = '#'`, lebo položka prepína, nekliká sa na stránku; JS klik zruší. Ikonka
  # NEMÔŽE ísť do `caption` — jadro ju prepúšťa cez `h(caption)` (menu_manager.rb:188),
  # takže by sa vypísala ako text. Rieši to CSS `::before` s data-URI, presne ako
  # zvonček notifikácií a prútik AI asistenta. Triedu `.dark-mode` vyrobí jadro samo
  # z názvu položky (menu_manager.rb:459-460) — sem sa písať nesmie, bola by dvakrát.
  menu :account_menu, :dark_mode, '#',
       :caption => :'dark_mode.toggle_label',
       :before  => :logout,
       :html    => { 'data-rdm' => 'toggle' },
       :if      => proc { DarkMode.enabled? && User.current.logged? }
end
