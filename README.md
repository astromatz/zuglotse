# Zuglotse – Dein Schachkompass (Webapp)

**Zuglotse** ist eine moderne, mobile-first Webanwendung zur Analyse von Schachstellungen. Sie läuft **vollständig clientseitig im Browser** – ohne Server-Backend, ohne Datenbank und ohne Zwangsregistrierung.

* **Schach-Engine:** Lokales Stockfish via WebAssembly & Web Worker direkt im Browser.
* **Erklärungen:** Deterministische deutsche Stellungskommentare & Eröffnungsprinzipien.
* **Optionale KI:** Direkte Anbindung von Google Gemini oder OpenAI über den eigenen API-Schlüssel (Bring Your Own Key), der sicher im lokalen Browser-Speicher (`localStorage`) verbleibt.
* **Datenschutz:** Analysen, Verlauf (`chess_history`) und API-Schlüssel verlassen dein Gerät niemals zu einem Drittanbieter-Server (bei KI-Nutzung nur direkt an die gewählte Schnittstelle).

---

## 🚀 Hosting auf GitHub Pages

Die Webapp ist vollständig für das Hosting auf **GitHub Pages** vorbereitet. Du hast zwei einfache Möglichkeiten zur Veröffentlichung:

### Option 1: Automatische Bereitstellung via GitHub Actions (Empfohlen)

Mit dieser Methode baut GitHub deine Webapp bei jedem Commit/Push automatisch und passt den Pfad (`basePath`) automatisch an deinen Repository-Namen an.

1. **GitHub-Repository erstellen:**
   * Erstelle ein neues Repository auf GitHub (z. B. `zuglotse` oder `schach-lotse`).
2. **Dateien übertragen:**
   * Initialisiere diesen Ordner als Git-Repository und pushe ihn zu GitHub:
     ```bash
     git init
     git add .
     git commit -m "Initial commit Zuglotse Webapp"
     git branch -M main
     git remote add origin https://github.com/<DEIN-NUTZERNAME>/<DEIN-REPO>.git
     git push -u origin main
     ```
3. **GitHub Pages aktivieren:**
   * Gehe in deinem GitHub-Repository auf **Settings** -> **Pages**.
   * Wähle unter **Build and deployment > Source** den Eintrag **GitHub Actions** aus.
   * Der im Projekt enthaltene Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) startet automatisch.
4. **Fertig!**
   * Deine Webapp ist nach etwa 1–2 Minuten unter `https://<DEIN-NUTZERNAME>.github.io/<DEIN-REPO>/` erreichbar.

---

### Option 2: Sofortige Bereitstellung über den `docs/`-Ordner (Ohne GitHub Actions)

Im Unterordner `docs/` befindet sich bereits ein **fertig gebauter, sofort einsatzbereiter statischer Export** der Webapp (inklusive `.nojekyll`, Stockfish WebAssembly, Schriften und Styles).

1. Pushe das Repository zu GitHub (wie in Option 1).
2. Gehe in deinem GitHub-Repository auf **Settings** -> **Pages**.
3. Wähle unter **Build and deployment > Source**:
   * **Deploy from a branch**
   * Branch: `main` (oder `master`)
   * Ordner: **/docs**
4. Klicke auf **Save**. Die Webapp ist sofort live!

> **Tipp für Sub-Pfade bei Option 2:** Falls dein Repository unter `https://<nutzer>.github.io/<repo>/` liegt, wird Option 1 empfohlen, da GitHub Actions den Basis-Pfad automatisch zur Build-Zeit setzt. Bei einer eigenen Domain (z. B. `zuglotse.de`) funktioniert Option 2 direkt ohne Anpassungen.

---

## 🛠️ Lokale Entwicklung & Build

Möchtest du lokal Änderungen vornehmen oder testen:

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Lokalen Entwicklungsserver starten
npm run dev
# Browser öffnen unter: http://localhost:3000

# 3. Statischen Export für GitHub Pages / Webhosting erstellen
npm run build
# Der fertige statische Build liegt anschließend im Ordner /out
```

Alternativ kannst du den bereits gebauten `docs/`-Ordner direkt mit jedem statischen HTTP-Server testen:
```bash
npx serve docs
```

---

## 📁 Projektstruktur

```text
Webapp/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Automatischer GitHub-Pages-Deploy-Workflow
├── app/
│   ├── _components/          # Haupt-UI (Brett, Sheets, Steuerung, Dialoge)
│   ├── globals.css           # Tailwind-Farben, Tokens, Schriften
│   ├── layout.tsx            # HTML-Grundgerüst & Metadaten
│   ├── opengraph-image.tsx   # Statisches OpenGraph Social-Vorschaubild
│   └── page.tsx              # Startseite
├── components/               # UI-Komponenten (Radix, Lucide, Chess-Panels)
├── docs/                     # Fertig kompilierter statischer Build für GitHub Pages
├── hooks/                    # React Hooks (useStockfish, useHistory, etc.)
├── lib/                      # Schach-Logik, Stockfish-Worker, KI-Provider
├── public/
│   ├── .nojekyll             # Verhindert, dass GitHub Pages _next/-Ordner ignoriert
│   ├── favicon.svg           # Zuglotse-Kompass-Icon
│   ├── fonts/                # Eingebettete Schachsymbol-Schriftart
│   ├── stockfish-lite.js     # Web-Worker für Stockfish
│   └── stockfish-lite.wasm   # Kompiliertes WebAssembly-Modell
├── next.config.js            # Next.js Static-Export & BasePath-Konfiguration
├── package.json              # Abhängigkeiten & Scripts
├── tailwind.config.ts        # Designsystem & Farb-Tokens
└── README.md                 # Diese Dokumentation
```

---

## 🔒 Wichtige Besonderheiten für GitHub Pages

1. **`.nojekyll` Datei:**
   GitHub Pages führt standardmäßig die Jekyll-Engine aus. Da Next.js-Assets im Unterverzeichnis `_next/` liegen und Jekyll Ordner mit Unterstrich ignoriert, ist die Datei `.nojekyll` zwingend erforderlich und bereits in `public/` und `docs/` enthalten.
2. **WebAssembly & Web Worker:**
   Stockfish wird als Web Worker geladen. Die Pfadermittlung in `hooks/useStockfish.ts` ermittelt die URL dynamisch zur Laufzeit, sodass die Engine sowohl auf der Domain-Wurzel als auch in Unterverzeichnissen (`/<repo-name>/`) fehlerfrei geladen wird.
