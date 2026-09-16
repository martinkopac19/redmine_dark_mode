# Changelog

## 0.1.0 - 2026-09-16

Prvá verzia — prepínač tmavého režimu v hlavičke.

- Ikona mesiaca sedí **medzi lievikom (filter mailov) a odhlásením**. Poradie určuje
  plugin sám pre všetky tri položky naraz, lebo poradie v DOM je iné než to, čo má
  človek vidieť, a téma si ho prehadzuje cez flex `order`.
- Ikona sa kreslí **maskou plnenou `currentColor`**, nie obrázkom s natvrdo zapísanou
  farbou. Každá naša téma má hlavičku inak — `previo-grey` svetlú so sivými ikonami,
  ostatné tmavú s bielymi — a takto vyzerá prepínač správne v každej z nich bez toho,
  aby od niektorej závisel.
- Voľba sa ukladá **k účtu** (`UserPreference`), nie do prehliadača, takže človeka
  nasleduje na ktorýkoľvek počítač. localStorage je len poistka proti bliknutiu.
- Príznak `data-dark` sa nasadzuje **v hlavičke stránky**, nie až v JS na jej konci —
  inak by pri každom prekliku bliklo do biela.

Tmavá šablóna má vyše 500 riadkov a nedalo sa to spraviť menej: jadro Redmine 6.1 nemá
farby v premenných (85 kB CSS, **440 natvrdo zapísaných farieb**, nikde
`prefers-color-scheme`). Najúčinnejšia časť je preto prehodenie sivej škály, na ktorej
stoja naše témy (`--previo-grey50..600`, `--p3-*`) — tým stmavne naraz to, čo by sa inak
prekrývalo po jednom pravidle.

Tmavý je aj **popis úlohy a komentáre**, vrátane plochy rich editora, jeho vyskakovacej
lišty, palety pod `/` a okna na vkladanie odkazu — každý plugin si nesie vlastné biele
pozadie, takže bez toho vyzeral detail úlohy ako panda. To isté platí pre panel
notifikácií, command palette, okná AI asistenta, emoji picker a prilepený pruh s názvom
úlohy pri rolovaní.

Prezreté a doladené obrazovky: **detail úlohy, zoznam úloh, zoznam projektov, Prehľad
projektu, Aktivita, Moja stránka, Môj účet a stránka používateľa.** Najviac práce dali tri
miesta, ktoré si téma alebo jadro kreslia natvrdo bielou: boxy (`#content .box` — bez toho
zostali „Členovia" v prehľade a všetky sekcie Môjho účtu biele), dátumové hlavičky
v Aktivite a riadky tabuliek, ktoré **nemajú triedy `odd`/`even`** (napríklad „Projekty"
na stránke používateľa).

Samostatnú zmienku si zaslúži **hlavička komentára** (`h4.journal-header`): jadro jej dáva
svetlé pozadie a sivý text, takže nad každým komentárom zostal biely pruh s nečitateľným
menom a dátumom — hoci text komentára pod ním tmavý bol.

Testy: 10 kontrol v prehliadači (poradie ikony sa meria **súradnicami**, nie poradím
v DOM; jasnosť pozadia musí klesnúť pod 60 z 255).
