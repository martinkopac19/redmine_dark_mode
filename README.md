# Redmine Dark mode (Previo)

Ikona mesiaca v hlavičke prepne Redmine do tmavého režimu. Voľba patrí **účtu**, nie
prehliadaču — kto si ju zapne, má ju aj na inom počítači.

## Prečo plugin a nie ďalšia téma

Redmine prepína tému **centrálne pre celú inštanciu** (*Administration → Settings →
Display*), nie pre jednotlivých ľudí. Tmavý režim, ktorý si zapína každý sám za seba,
sa preto ako téma spraviť nedá; musí to byť CSS vrstva pridaná podľa nastavenia
prihláseného človeka.

## Čo bolo treba prekryť

Jadro Redmine 6.1 farby v premenných **nemá**: v 85 kB jeho CSS je **440 natvrdo
zapísaných farieb** a nikde ani `prefers-color-scheme`. Tmavý režim sa teda nedá zapnúť
prehodením pár tokenov.

Najväčšiu časť práce spraví prehodenie **sivej škály našich tém**
(`--previo-grey50..600`, v `previo-grey` navyše `--p3-*`). Tie premenné téma zaviedla
práve na to, aby sa farba dala meniť na jednom mieste — robíme presne to, len opačným
smerom. Zvyšok sú cielené prekrytia jadra a našich pluginov.

Pozor na váhu selektorov: téma kreslí polia, selecty a záložky cez `#content …`, čo je
selektor s id. `html[data-dark="1"] input` naň nestačí — preto sú tie pravidlá písané
s rovnakým `#content`, nie s `!important`.

## Ako to funguje

- Príznak `data-dark` na `<html>` sa nasadzuje **v hlavičke stránky**. Keby sa čakalo na
  JS na konci, pri každom prekliku by stránka bliklo do biela.
- Klik prepne stránku okamžite a request na server ide až potom; keď zlyhá, prepnutie sa
  vráti späť.
- Ikona sa kreslí **maskou plnenou `currentColor`**, takže si farbu berie z hlavičky
  a plugin nezávisí od toho, akú tému má inštancia zapnutú.

## Nastavenia

*Administration → Plugins → Dark mode*: kill-switch. Vypnutím zmizne prepínač z hlavičky,
uložené voľby ľudí zostanú.

## Testy

```sh
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless=new --disable-gpu --remote-debugging-port=9393 \
        --user-data-dir="$(cygpath -w /tmp)/cdpDM" about:blank &
node extra/ui_cdp_test.mjs http://localhost:3080 <login> <heslo> <issueId> 9393 <adresarNaSnimky>
```

**Rozmer okna si test vynucuje cez CDP** (`Emulation.setDeviceMetricsOverride`), nie
prepínačom `--window-size` — ten headless Edge ticho ignoruje a v okne širokom 500 px
prepne Redmine na mobilné rozloženie, kde je účtové menu úplne inde.
