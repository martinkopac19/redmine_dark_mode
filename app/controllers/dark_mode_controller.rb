# frozen_string_literal: true

class DarkModeController < ApplicationController
  before_action :require_login

  # Prepnutie tmavého režimu. Odpoveď je zámerne minimálna — stránku prefarbí JS sám,
  # request slúži len na to, aby si voľbu zapamätal účet, nie prehliadač.
  def toggle
    on = DarkMode.on_for?(User.current)
    DarkMode.set_for(User.current, !on)

    if request.xhr? || request.format.json?
      render :json => { :on => !on }
    else
      # Bez JS (alebo keď niekto odkaz otvorí priamo) sa vrátime tam, odkiaľ prišiel.
      redirect_back(:fallback_location => home_path)
    end
  end
end
