# frozen_string_literal: true

module DarkMode
  DEFAULTS = {
    'enabled' => '1'
  }.freeze

  # Kľúč v `UserPreference#others`. MUSÍ to byť SYMBOL a MUSÍ byť na module, nie
  # v `class << self` — inak je to konštanta singleton triedy a `DarkMode::PREF_KEY`
  # padne na NameError. Presne to sa raz stalo v `redmine_ai_assistant` 0.7.0.
  # Jadro má v `others` samé symboly, takže string by sa choval ako iný kľúč.
  PREF_KEY = :dark_mode

  class << self
    def settings
      stored = Setting.plugin_redmine_dark_mode || {}
      DEFAULTS.merge(stored.to_h.reject { |_k, v| v.nil? || v.to_s.empty? })
    rescue StandardError
      DEFAULTS.dup
    end

    def enabled?
      settings['enabled'].to_s == '1'
    end

    # Zapnuté pre konkrétneho človeka? Číta sa z jeho nastavení účtu, takže tmavý režim
    # ho nasleduje na akýkoľvek počítač, nielen do jedného prehliadača.
    def on_for?(user)
      return false unless user.respond_to?(:logged?) && user.logged?

      user.pref[PREF_KEY].to_s == '1'
    rescue StandardError
      false
    end

    def set_for(user, on)
      return false unless user.respond_to?(:logged?) && user.logged?

      pref = user.pref
      # Zapisuje sa cez jadrové `pref[key] =`, nie ručným merge do `others` — jadro si
      # tam drží vlastnú serializáciu a ručný zápis ju vie potichu rozbiť.
      pref[PREF_KEY] = on ? '1' : '0'
      pref.save
      on
    end
  end
end
