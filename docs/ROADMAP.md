# Roadmap


## Kurzfristig (nächste Iteration)

**Steuerrechner pro Eigentümer**
Vollständige KeSt-Berechnung mit Kirchensteuer, Güterstand-Effekte auf Zugewinnausgleich, separate Steuerveranlagung pro Person. Sparer-Pauschbetrag und Vorabpauschale sind bereits implementiert; die Differenzierung nach Eigentümer-Grenzsteuersatz fehlt noch.

**Rollierender Nettowert-Chart im Dashboard**
Snapshots als Zeitreihe mit Linienchart (Recharts) statt nur tabellarischer Ansicht. Zeigt historische Entwicklung gegen Projektionspfad.

**Check-in Auswertung**
Monatliche Check-ins werden heute gespeichert, aber kaum ausgewertet. Sparquoten-Verlauf, Abweichung vom Plan, Trend-Visualisierung.

**Asset-Import aus CSV/PDF**
Depotauszüge von Banken (comdirect, ING, DKB) direkt als CSV importieren, Positionen matchen und Werte aktualisieren.

## Mittelfristig

**Nachlassplanung / Erbschaftsteuer**
Freibeträge (400k Ehegatte, 400k Kind je Elternteil, 10-Jahres-Schenkungsregel), geschätzter Erbschaftsteuerbetrag auf Portfolioebene, Schenkungsplanung über Zeit.

**GmbH / Holding-Ebene**
Separate Buchhaltungsebene für operative GmbH vs. Holding vs. Privatvermögen. Steuereffekte bei Gewinnausschüttung (KESt auf Dividenden aus der GmbH) vs. Thesaurierung.

**Renten- und Versorgungsrechnung**
Integration von gesetzlicher Rente (Auskunft manuell eingeben), Beamtenversorgung, betriebliche Altersvorsorge als zeitgesteuerte Einkommensströme mit Lebenserwartungsszenarien.

**Monte-Carlo-Simulation**
Statt fixer Rendite-Offsets: stochastische Simulation mit Normalverteilung um die erwartete Rendite (σ basierend auf historischer Volatilität je Klasse). Zeigt Konfidenzintervalle statt drei Linien.

**Währungsrisiko**
Assets in Fremdwährung (USD, CHF) mit Wechselkurs-Eingabe und optionaler Hedging-Simulation.

## Langfristig

**Cloud-Sync (optional)**
Ende-zu-Ende-verschlüsselte Synchronisation über einen selbst gehosteten Backend (z.B. Supabase) — nur auf expliziten Wunsch, kein Zwang.

**Berater-Modus**
Separate Ansicht für Mandanten ohne Bearbeitungsrechte, PDF-Report-Export (Zusammenfassung Vermögen + Projektion + Haushalt auf 2 Seiten).

**Immobilien-DCF**
Vollständige Discounted-Cashflow-Bewertung einer Immobilie: Bruttomietmultiplikator, Leerstandsrisiko, Instandhaltungsrücklage, Steuer auf Mieteinnahmen (§ 21 EStG).

**KI-gestützte Szenarienanalyse**
Natürlichsprachliche Eingabe ("Was passiert wenn ich mit 55 aufhöre zu arbeiten?") die automatisch Streams, Buckets und Horizont anpasst und eine Vergleichsansicht zeigt.
