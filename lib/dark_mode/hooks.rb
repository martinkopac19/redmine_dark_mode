# frozen_string_literal: true

module DarkMode
  class Hooks < Redmine::Hook::ViewListener
    # CSS + príznak do hlavičky, JS na koniec stránky — rovnaký dvojhook vzor, aký
    # používa `redmine_command_palette`, `redmine_ai_assistant` aj `redmine_inapp_notifications`.
    def view_layouts_base_html_head(context = {})
      return '' unless DarkMode.enabled?
      return '' unless User.current.logged?

      tags = stylesheet_link_tag('dark_mode', :plugin => 'redmine_dark_mode')
      tags + javascript_tag(<<~JS)
        window.RDM_CONFIG=#{config_json.to_json.html_safe};
        #{early_switch}
      JS
    end

    def view_layouts_base_body_bottom(context = {})
      return '' unless DarkMode.enabled?
      return '' unless User.current.logged?

      javascript_include_tag('dark_mode', :plugin => 'redmine_dark_mode')
    end

    private

    def config_json
      {
        :base => Redmine::Utils.relative_url_root.to_s,
        :on   => DarkMode.on_for?(User.current),
        :i18n => {
          :toggle => l(:'dark_mode.toggle_label'),
          :toDark => l(:'dark_mode.switch_to_dark'),
          :toLight => l(:'dark_mode.switch_to_light')
        }
      }
    end

    # Príznak sa nasadzuje TU, v hlavičke, nie až v JS na konci stránky.
    #
    # Keby sa čakalo na koniec, prehliadač by stihol vykresliť svetlú stránku a až potom
    # ju prefarbiť — pri každom prekliku by to bliklo do biela. Preto sa `data-dark`
    # nastaví skôr, než sa vôbec začne kresliť telo stránky.
    #
    # Zdrojom pravdy je nastavenie účtu (`RDM_CONFIG.on`), localStorage je len poistka
    # pre stránky zo cache prehliadača, kde by sa serverová hodnota nemusela obnoviť.
    def early_switch
      <<~JS
        (function(){
          var on = window.RDM_CONFIG.on;
          try { localStorage.setItem('rdm-dark', on ? '1' : '0'); } catch (e) {}
          document.documentElement.setAttribute('data-dark', on ? '1' : '0');
        })();
      JS
    end
  end
end
