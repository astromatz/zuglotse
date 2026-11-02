import { Chess, type Square } from 'chess.js'

export interface OpeningData {
  id: string
  name: string
  eco: string
  moves: string
  plan: string
  tactics: string[]
  principleTip: string
  aliases?: string[]
}

export interface PrincipleEvaluation {
  status: 'good' | 'warning' | 'alert'
  title: string
  score: number // 0 bis 100
  badge: string // z. B. 'Vorbildlich ✅' | 'Ausbaufähig ⚠️' | 'Kritisch ❌'
  summary: string
  details: string[]
}

export interface OpeningPrinciplesReport {
  isOpeningPhase: boolean
  gamePhase: 'opening' | 'middleGame' | 'endgame'
  gamePhaseLabel: string
  overallScore: number // 0 bis 100
  lotseTip: string
  turn: 'w' | 'b'
  turnLabel: string
  center: PrincipleEvaluation
  development: PrincipleEvaluation
  kingSafety: PrincipleEvaluation
  harmony: PrincipleEvaluation
}

export interface OpeningAnalysisResult {
  opening: OpeningData | null
  whitePrinciples: OpeningPrinciplesReport
  blackPrinciples: OpeningPrinciplesReport
  activeReport: OpeningPrinciplesReport
}

// ---------------------------------------------------------------------------
// 1. Mini-Lexikon der wichtigsten Schacheröffnungen
// ---------------------------------------------------------------------------

export const OPENINGS_DATABASE: OpeningData[] = [
  {
    id: 'ruy-lopez',
    name: 'Spanische Partie (Ruy Lopez)',
    eco: 'C60–C99',
    moves: '1. e4 e5 2. Sf3 Sc6 3. Lb5',
    plan: 'Weiß übt indirekten Druck auf das Zentrum aus: Der Läufer b5 fesselt oder bedroht den Springer c6, welcher den zentralen Bauern e5 verteidigt. Weiß plant, nach der Rochade mit c3 und d4 ein starkes Bauernzentrum aufzubauen.',
    tactics: [
      'Fesselung des Springers c6 gegen den schwarzen König',
      'Zentrumshebel mit c3 und d4 nach Absicherung der Rochade',
      'Läuferrückzug nach a4 und b3 bei schwarzem Befragen mit ...a6 und ...b5',
    ],
    principleTip: 'Lb5 greift nicht blind an, sondern untergräbt das Fundament des gegnerischen Zentrums.',
  },
  {
    id: 'italian-game',
    name: 'Italienische Partie (Giuoco Piano)',
    eco: 'C50–C54',
    moves: '1. e4 e5 2. Sf3 Sc6 3. Lc4',
    plan: 'Klassische Zentrums- und Figurenentwicklung: Weiß visiert mit Lc4 sofort das schwächste Feld f7 an, das vor der Rochade nur vom König gedeckt wird. Danach folgt entweder der scharfe Zentrumsstoß c3/d4 oder das harmonische Giuoco Pianissimo mit d3.',
    tactics: [
      'Angriff auf den schwachen Bauern f7',
      'Zentrumsvorstoß mit c3 gefolgt von d4',
      'Pin-Motive mit Lg5 gegen die schwarze Dame',
    ],
    principleTip: 'Lc4 zielt direkt auf f7. Achte darauf, f7 nicht unüberlegt zu schwächen.',
  },
  {
    id: 'fried-liver',
    name: 'Zweispringerspiel / Fried-Liver-Komplex',
    eco: 'C55–C59',
    moves: '1. e4 e5 2. Sf3 Sc6 3. Lc4 Sf6',
    plan: 'Schwarz kontert direkt gegen den Bauern e4. Weiß kann mit 4. Sg5 (Preußischer Angriff) voll auf f7 stürmen. Es entsteht ein hochgradig scharfer Taktik-Schlagabtausch, bei dem oft Figuren für Königsangriffe geopfert werden.',
    tactics: [
      'Weißer Doppelangriff mit Sg5 und Lc4 auf f7',
      'Schwarzer Zentrums-Konter mit 4...d5 5. exd5 Sa5',
      'Gefährliche Wanderung des schwarzen Königs ins offene Brett',
    ],
    principleTip: 'Gegen einen frühen f7-Sturm hilft nur aktiver Gegenangriff im Zentrum (4...d5!).',
  },
  {
    id: 'sicilian-defense',
    name: 'Sizilianische Verteidigung',
    eco: 'B20–B99',
    moves: '1. e4 c5',
    plan: 'Asymmetrischer Kampf um das Zentrum: Schwarz kämpft mit dem c-Bauern um d4 und tauscht im offenen Sizilianer einen Randbauern gegen den weißen Zentralbauern. Schwarz sichert sich die halboffene c-Linie und starkes Damenflügelspiel.',
    tactics: [
      'Druck auf der halboffenen c-Linie mit Turm und Dame',
      'Zentrums-Hebel ...d5 oder ...e5 zum richtigen Zeitpunkt',
      'Weißer Königsangriff mit Bauernsturm f4, g4 und Läufern auf c4/e3',
    ],
    principleTip: 'Schwarz verzichtet auf Symmetrie, um dynamisches Gegenspiel am Damenflügel zu erhalten.',
  },
  {
    id: 'sicilian-najdorf',
    name: 'Sizilianisch (Najdorf-Variante)',
    eco: 'B90–B99',
    moves: '1. e4 c5 2. Sf3 d6 3. d4 cxd4 4. Sxd4 Sf6 5. Sc3 a6',
    plan: 'Die Lieblingseröffnung von Kasparow und Fischer: 5...a6 nimmt Weiß alle Springer- und Läufersprünge nach b5 und bereitet ...b5 nebst flexibler Zentrumsgestaltung vor. Weiß wählt oft den scharfen Englischen Angriff mit f3, Le3, Dd2 und 0-0-0.',
    tactics: [
      'Vorstoß ...b5 mit Damenflügel-Initiative für Schwarz',
      'Englischer Königssturm von Weiß mit g4 und h4',
      'Qualitätsopfer auf c3 (...Txc3) zur Zerstörung der weißen Rochadestellung',
    ],
    principleTip: 'Der unscheinbare Zug 5...a6 sichert maximale Flexibilität und bremst weiße Figuren aus.',
  },
  {
    id: 'sicilian-dragon',
    name: 'Sizilianisch (Drachen-Variante)',
    eco: 'B70–B79',
    moves: '1. e4 c5 2. Sf3 d6 3. d4 cxd4 4. Sxd4 Sf6 5. Sc3 g6',
    plan: 'Schwarz baut mit 5...g6 und Lg7 den legendären „Drachenläufer“ auf, der die Diagonale h8-a1 beherrscht. Weiß antwortet meist mit dem Jugoslawischen Angriff (Le3, f3, Dd2, 0-0-0, h4-h5) – ein gnadenloser Wettlauf entgegengesetzter Angriffe.',
    tactics: [
      'Drachenläufer auf g7 attackiert das weiße Damenflügelzentrum',
      'Weißes h4-h5 zur Öffnung der h-Linie gegen den schwarzen König',
      'Qualitätsopfer auf c3 (...Txc3) als thematischer Konter',
    ],
    principleTip: 'Bei entgegengesetzten Rochaden zählt jede Sekunde: Wer zuerst matt setzt, gewinnt.',
  },
  {
    id: 'french-defense',
    name: 'Französische Verteidigung',
    eco: 'C00–C19',
    moves: '1. e4 e6 2. d4 d5',
    plan: 'Schwarz baut mit e6/d5 eine extrem solide Bauernkette auf und attackiert das weiße Zentrum. Die weiße Kette schließt sich oft mit e5; Schwarz attackiert die Basis d4 sofort mit ...c5 und ...Db6.',
    tactics: [
      'Problemkind: Der Damenläufer c8 ist hinter der Bauernkette e6/d7 eingesperrt',
      'Druck gegen das weiße Zentrumsfundament d4 mit ...c5, ...Sc6 und ...Db6',
      'Weißer Raumvorteil am Königsflügel mit Vorstoß e5 und Angriffschancen',
    ],
    principleTip: 'In geschlossenen Ketten greift man immer die Basis (d4) an, nicht die Spitze (e5).',
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann-Verteidigung',
    eco: 'B10–B19',
    moves: '1. e4 c6 2. d4 d5',
    plan: 'Eine der verlässlichsten Eröffnungen überhaupt: Schwarz bereitet d5 mit c6 vor. Entscheidender Vorteil gegenüber Französisch: Der Damenläufer kann vor dem Schließen der Kette mit ...e6 aktiv nach f5 oder g4 entwickelt werden.',
    tactics: [
      'Läuferentwicklung nach f5 vor dem Absichern mit ...e6',
      'Sehr gesunde, kompakte schwarze Bauernstruktur für das Endspiel',
      'Weißer Raumgewinn in der Vorstoßvariante mit 3. e5 Lf5 4. h4',
    ],
    principleTip: 'Erst den Läufer nach f5 ins Freie bringen, dann die Festung mit ...e6 dichtmachen.',
  },
  {
    id: 'queens-gambit',
    name: 'Damengambit (Abgelehnt / Angenommen)',
    eco: 'D06–D69',
    moves: '1. d4 d5 2. c4',
    plan: 'Weiß opfert scheinbar den Flügelbauern c4, um die schwarze Zentrumsstütze d5 wegzulocken und das volle Zentrum mit e4 zu besetzen. Schwarz kann annehmen (2...dxc4) oder ablehnen (2...e6 oder 2...c6).',
    tactics: [
      'Kein echtes Opfer: c4 kann fast immer mit Da4+ oder e3/Lxc4 zurückgeholt werden',
      'Minoritätsangriff am Damenflügel mit b4-b5 zur Schaffung von Schwächen',
      'Kampf um die Diagonale h2-b8 und das Zentrumsfeld e4',
    ],
    principleTip: 'Zentrum vor Material: Nimm das Gambit nur an, wenn du nicht versuchst, c4 krampfhaft festzuhalten.',
  },
  {
    id: 'slav-defense',
    name: 'Slawische Verteidigung',
    eco: 'D10–D19',
    moves: '1. d4 d5 2. c4 c6',
    plan: 'Schwarz stützt das Zentrum d5 stabil ab, sperrt aber im Gegensatz zum abgelehnten Damengambit (2...e6) seinen Läufer c8 nicht ein. Eine der beliebtesten Verteidigungen der Schach-Weltmeister.',
    tactics: [
      'Drohung von ...dxc4 nebst ...b5 zur Behauptung des Bauern',
      'Aktivierung des Läufers c8 nach f5',
      'Druck gegen den weißen Zentrumspunkt d4',
    ],
    principleTip: 'Kombiniert die Stabilität von 2...e6 mit der Beweglichkeit des Damenläufers.',
  },
  {
    id: 'kings-indian',
    name: 'Königsindische Verteidigung (KID)',
    eco: 'E60–E99',
    moves: '1. d4 Sf6 2. c4 g6 3. Sc3 Lg7 4. e4 d6',
    plan: 'Hypermoderne Kampfansage: Schwarz überlässt Weiß zunächst das breite Zentrum e4/d4, baut den mächtigen Läufer auf g7 auf und attackiert das Zentrum später mit ...e5. Im geschlossenen Zentrum stürmt Schwarz am Königsflügel mit f7-f5 los.',
    tactics: [
      'Mar-del-Plata-Angriff: f7-f5-f4 nebst g6-g5 für Mattangriff am Königsflügel',
      'Weißer Gegenstoß am Damenflügel mit c4-c5 und b4-b5',
      'Läufer g7 als Rückgrat der schwarzen Verteidigung und Diagonalkontrolle',
    ],
    principleTip: 'Raumnachteil ist kein Problem, wenn deine Figuren auf ein klares Hebel-Ziel ausgerichtet sind.',
  },
  {
    id: 'gruenfeld-defense',
    name: 'Grünfeld-Indische Verteidigung',
    eco: 'D80–D99',
    moves: '1. d4 Sf6 2. c4 g6 3. Sc3 d5',
    plan: 'Schwarz fordert Weiß direkt im 3. Zug heraus: Nach 4. cxd5 Sxd5 5. e4 hat Weiß ein riesiges Zentrum, doch Schwarz zerschlägt es systematisch mit ...c5, ...Lg7 und ...Sc6 von den Flügeln her.',
    tactics: [
      'Druck auf den isolierten oder vorgerückten Bauern d4',
      'Lange Diagonale h8-a1 für Läufer g7',
      'Entlastungstausch auf c3 zur Schwächung der weißen Struktur',
    ],
    principleTip: 'Ein großes Bauernzentrum ist nur stark, wenn es stabil gedeckt ist – sonst wird es zum Angriffsziel.',
  },
  {
    id: 'nimzo-indian',
    name: 'Nimzowitsch-Indische Verteidigung',
    eco: 'E20–E59',
    moves: '1. d4 Sf6 2. c4 e6 3. Sc3 Lb4',
    plan: 'Schwarz fesselt den Springer c3 und entreißt Weiß damit die Kontrolle über das wichtige Zentralfeld e4. Oft tauscht Schwarz Lxc3 und schlägt Weiß einen statischen Doppelbauern auf c3/c4 ins Lager.',
    tactics: [
      'Fesselung auf b4 kontrolliert indirekt das Zentrum e4',
      'Blockade und Belagerung des weißen Doppelbauern auf c4',
      'Hebel mit ...d5 oder ...c5 zur Zerstörung der weißen Koordination',
    ],
    principleTip: 'Fessle gegnerische Springer, um deren Einfluss auf das Zentrum auszuschalten.',
  },
  {
    id: 'london-system',
    name: 'Londoner System',
    eco: 'D02',
    moves: '1. d4 d5 2. Lf4 (oder 2. Sf3 & 3. Lf4)',
    plan: 'Extrem populäres, universelles System: Weiß entwickelt den Damenläufer aktiv nach f4, bevor mit e3 und c3 eine uneinnehmbare Granit-Pyramide gebaut wird. Weiß besetzt später oft den Vorposten e5 mit einem Springer.',
    tactics: [
      'Stützpunkt e5 für den weißen Springer',
      'Königsangriff mit Ld3, Se5, Df3 oder Vorstößen auf der h-Linie',
      'Läuferrückzug nach g3 bei Befragung durch ...Sh5',
    ],
    principleTip: 'Bringe den Damenläufer immer VOR dem Bauernzug e3 heraus, damit er nicht eingesperrt wird.',
  },
  {
    id: 'scandinavian-defense',
    name: 'Skandinavische Verteidigung',
    eco: 'B01',
    moves: '1. e4 d5',
    plan: 'Der direkteste Gegenstoß: Greift sofort im 1. Zug e4 an. Nach 2. exd5 Dxd5 kommt die Dame zwar früh ins Spiel, aber Schwarz erhält offene Linien und eine grundsolide Leichtfiguren-Aufstellung mit ...c6 und ...Lf5.',
    tactics: [
      'Weiß gewinnt mit 3. Sc3 ein Entwicklungstempo gegen die Dame',
      'Damenrückzug nach a5 oder d6 mit guter Übersicht',
      'Solides Zentrum nach ...c6 mit Läuferentwicklung nach f5/g4',
    ],
    principleTip: 'Achte nach 2...Dxd5 darauf, die Dame nicht zur leichten Zielscheibe für gegnerische Springer zu machen.',
  },
  {
    id: 'scotch-game',
    name: 'Schottische Partie',
    eco: 'C45',
    moves: '1. e4 e5 2. Sf3 Sc6 3. d4',
    plan: 'Weiß öffnet ohne Umschweife im 3. Zug das Zentrum. Nach 3...exd4 4. Sxd4 entsteht sofort dynamisches, offenes Figurenspiel mit vielen Tausch- und Angriffsmöglichkeiten.',
    tactics: [
      'Schnelle Öffnung der Diagonalen für beide Läufer',
      'Frühzeitiger Damentausch oder Druck gegen c6',
      'Schottisches Gambit mit 4. Lc4 für Entwicklungsvorsprung',
    ],
    principleTip: 'Im offenen Spiel gewinnt die Seite, die ihre Leichtfiguren schneller aktiviert.',
  },
  {
    id: 'english-opening',
    name: 'Englische Eröffnung',
    eco: 'A10–A39',
    moves: '1. c4',
    plan: 'Flankenangriff auf das Zentrum: Der c-Bauer kontrolliert von Beginn an das Feld d5. Weiß kombiniert dies meist mit Sf3, g3 und Lg2 (Fianchetto) für langfristigen positionellen Druck.',
    tactics: [
      'Kontrolle der Diagonale h1-a8 mit dem Läufer g2',
      'Vorstoß b4 am Damenflügel mit Raumgewinn',
      'Oft Übergang in königsindische oder sizilianische Strukturen',
    ],
    principleTip: 'Kontrolliere die Mitte mit Flügelbauern, um die eigenen Zentralbauern flexibel zu halten.',
  },
  {
    id: 'kings-gambit',
    name: 'Königsgambit',
    eco: 'C30–C39',
    moves: '1. e4 e5 2. f4',
    plan: 'Das romantische Schachopfer: Weiß opfert im 2. Zug den f-Bauern, um den schwarzen Zentrumsbauern wegzulenken, d4 zu spielen und die halboffene f-Linie für den Turm zu nutzen.',
    tactics: [
      'Direkter Angriff auf den Punkt f7 über die f-Linie',
      'Gefahr: Schwächung der Diagonale e1-h4 (Schachgebot ...Dh4+!)',
      'Schnelle Rochade und Zentrumsdominanz für Weiß',
    ],
    principleTip: 'Der Zug f4 eröffnet Angriffschancen, schwächt aber immer die Diagonale zum eigenen König.',
  },
  {
    id: 'four-knights',
    name: 'Vier-Springer-Spiel',
    eco: 'C47–C49',
    moves: '1. e4 e5 2. Sf3 Sc6 3. Sc3 Sf6',
    plan: 'Das Paradebeispiel harmonischer Schachentwicklung: Alle vier Springer besetzen im 2. und 3. Zug die natürlichen Entwicklungsfelder. Beide Seiten streben nach solider Zentrumsbeherrschung.',
    tactics: [
      'Fesselung mit Lb5 oder Lb4',
      'Zentrumsvorstoß d4 von Weiß oder ...d5 von Schwarz',
      'Spanische Vierspringer-Strukturen',
    ],
    principleTip: 'Erst die Springer, dann die Läufer – klassisches Prinzipien-Schach par excellence.',
  },
  {
    id: 'petrov-defense',
    name: 'Russische Verteidigung (Petrow)',
    eco: 'C42–C43',
    moves: '1. e4 e5 2. Sf3 Sf6',
    plan: 'Gegenangriff statt Verteidigung: Schwarz deckt e5 nicht ab, sondern attackiert sofort den weißen Bauern e4. Eine der stabilsten und remisbreitesten Verteidigungen auf Meisterebene.',
    tactics: [
      'Symmetrischer Tausch auf e5 und e4',
      'Fesselung auf der e-Linie bei unvorsichtigem 3...Sxe4 4.De2',
      'Kompakte Bauernstrukturen im Mittelspiel',
    ],
    principleTip: 'Spiele nach 3. Sxe5 nicht sofort 3...Sxe4?, sondern vertreibe erst den Springer mit 3...d6!',
  },
  {
    id: 'pirc-modern',
    name: 'Pirc-Ufimzew- / Moderne Verteidigung',
    eco: 'B06–B09',
    moves: '1. e4 d6 2. d4 Sf6 3. Sc3 g6',
    plan: 'Schwarz lässt Weiß freie Hand im Zentrum und verschanzt sich mit Läufer g7 und d6. Das weiße Zentrum wird erst im späteren Verlauf mit ...e5 oder ...c5 attackiert.',
    tactics: [
      'Österreichischer Angriff von Weiß mit f4, Ld3 und e5',
      'Flanken-Gegenstöße von Schwarz am Damenflügel mit ...c6 und ...b5',
      'Wachsamkeit gegen weiße Mattangriffe auf der h-Linie',
    ],
    principleTip: 'Wer Raum abgibt, muss wachsam verteidigen und präzise Gegenhebel setzen.',
  },
  {
    id: 'alehkine-defense',
    name: 'Aljechin-Verteidigung',
    eco: 'B02–B05',
    moves: '1. e4 Sf6',
    plan: 'Provoziert die weißen Zentrumsbauern: Weiß stürmt mit 2. e5 Sd5 3. d4 vor. Schwarz spekuliert darauf, dass die weißen Bauern überdehnt werden und später leichte Angriffsziele bilden.',
    tactics: [
      'Springerwanderung Sd5 nach b6',
      'Untergrabung des Zentrums mit ...d6 und ...c5',
      'Vierbauernangriff von Weiß mit e5, d4, c4, f4',
    ],
    principleTip: 'Lass den Gegner vorrücken, aber schneide ihm rechtzeitig die Rückendeckung ab.',
  },
  {
    id: 'catalan-opening',
    name: 'Katalanische Eröffnung',
    eco: 'E00–E09',
    moves: '1. d4 Sf6 2. c4 e6 3. g3 d5 4. Lg2',
    plan: 'Verbindet das Damengambit mit dem Druck des Fianchetto-Läufers g2. Der Läufer g2 fegt über die lange Diagonale und strahlt enormen Druck auf den schwarzen Damenflügel aus.',
    tactics: [
      'Druck gegen b7 und die Diagonale h1-a8',
      'Opfer des Bauern c4 für überlegene Aktivität',
      'Zentraler Hebel e4 nach guter Vorbereitung',
    ],
    principleTip: 'Ein Läufer auf der langen Diagonale kontrolliert das Brett wie ein Scharfschütze.',
  },
  {
    id: 'benoni-defense',
    name: 'Benoni-Verteidigung',
    eco: 'A56–A79',
    moves: '1. d4 Sf6 2. c4 c5 3. d5 e6 4. Sc3 exd5 5. cxd5 d6',
    plan: 'Asymmetrischer Kampf: Weiß erhält ein starkes Zentrum mit d5, Schwarz eine Damenflügel-Bauernmehrheit (a/b) und den aktiven Drachenläufer auf g7. Dynamik pur.',
    tactics: [
      'Damenflügel-Vorstoß ...b5 mit Turm-Unterstützung auf b8',
      'Weißer Zentrumsvorstoß e4-e5',
      'Stützpunkt e5 für den schwarzen Springer',
    ],
    principleTip: 'Spiele dort, wo deine Bauernmehrheit liegt: Schwarz am Damenflügel, Weiß im Zentrum.',
  },
  {
    id: 'dutch-defense',
    name: 'Holländische Verteidigung',
    eco: 'A80–A99',
    moves: '1. d4 f5',
    plan: 'Schwarz kämpft mit dem f-Bauern asymmetrisch um e4 und leitet oft einen direkten Angriff auf den weißen König ein. Die Kehrseite: Die Diagonale e8-h5 zum eigenen König wird gelockert.',
    tactics: [
      'Stonewall-System mit Bauern auf c6, d5, e6, f5 und Springer auf e4',
      'Leningrader System mit g6 und Lg7',
      'Vorsicht vor weißem Damenschach auf h5!',
    ],
    principleTip: 'Der Zug 1...f5 signalisiert Angriffslust, verlangt aber hohe Wachsamkeit um den eigenen König.',
  },
  {
    id: 'vienna-game',
    name: 'Wiener Partie',
    eco: 'C25–C29',
    moves: '1. e4 e5 2. Sc3',
    plan: 'Weiß entwickelt zuerst den Damenspringer, um d5 zu kontrollieren und sich den f4-Vorstoß (Wiener Gambit) offenzuhalten. Solide und trickreich.',
    tactics: [
      'Wiener Gambit: 2...Sf6 3. f4 d5',
      'Frankenstein-Dracula-Variante mit extrem wilden Verwicklungen',
      'Ruhige Entwicklung mit Lc4 und d3',
    ],
    principleTip: '2. Sc3 hält alle Optionen offen – von ruhigem Positionsspiel bis zum scharfen Königsangriff.',
  },
  {
    id: 'trompowsky-attack',
    name: 'Trompowsky-Angriff',
    eco: 'A45',
    moves: '1. d4 Sf6 2. Lg5',
    plan: 'Weiß stört sofort die schwarze Entwicklung und droht Lxf6, was die schwarze Königsflügelstruktur mit einem Doppelbauern ruinieren würde. Umgeht die meiste indische Schachtheorie.',
    tactics: [
      'Lxf6 zerstört die Bauernstruktur vor dem schwarzen König',
      'Schwarz reagiert oft mit 2...Se4 (Gegenangriff) oder 2...e6',
      'Zentrumskontrolle nach Tausch auf f6',
    ],
    principleTip: '2. Lg5 zwingt Schwarz sofort zu einer Richtungsentscheidung abseits gewohnter Pfade.',
  },
  {
    id: 'evans-gambit',
    name: 'Evans-Gambit',
    eco: 'C51–C52',
    moves: '1. e4 e5 2. Sf3 Sc6 3. Lc4 Lc5 4. b4',
    plan: 'Eines der berühmtesten Romantik-Gambits: Weiß opfert den b-Bauern, um mit c3 ein Tempo gegen den Läufer zu gewinnen und das Zentrum mit d4 im Sturm zu nehmen.',
    tactics: [
      'Tempo-Gewinn mit c3 gegen den Läufer c5/b4',
      'Schneller Zentrumssturm mit d4 und Db3 gegen f7',
      'Enormer Entwicklungsvorsprung bei offener Stellung',
    ],
    principleTip: 'Ein Flügelbauern-Opfer für schnelles Zentrums- und Angriffstempo ist oft goldrichtig.',
  },
  {
    id: 'smith-morra-gambit',
    name: 'Smith-Morra-Gambit',
    eco: 'B21',
    moves: '1. e4 c5 2. d4 cxd4 3. c3',
    plan: 'Waffe gegen Sizilianisch: Weiß opfert einen Bauern für freie Linien (c und d) und blitzschnelle Leichtfigurenentwicklung. Schwarz muss sich präzise verteidigen.',
    tactics: [
      'Offene c- und d-Linien für die weißen Schwerfiguren',
      'Druck gegen d6 und f7 mit Lc4 und Sbd2-c4/b3',
      'Taktische Springeropfer auf d5 oder b5',
    ],
    principleTip: 'Gib dem Sizilianer keine Zeit zur Organisation – offene Linien wiegen einen Bauern auf.',
  },
  {
    id: 'reti-opening',
    name: 'Réti-Eröffnung',
    eco: 'A04–A09',
    moves: '1. Sf3 d5 2. c4',
    plan: 'Hypermoderne Eröffnung par excellence: Weiß verzichtet auf einen frühen d4-Vorstoß und greift das schwarze Zentrum mit c4, Sf3 und Fianchetto-Läufern von den Flanken an.',
    tactics: [
      'Doppelfianchetto mit Lg2 und b3/Lb2',
      'Untergrabung des Zentrums d5',
      'Sehr flexible Übergänge in fast alle d4- und Flankeneröffnungen',
    ],
    principleTip: 'Greife das Zentrum mit Figuren an, statt es frühzeitig mit Bauern zu blockieren.',
  },
  {
    id: 'queens-indian',
    name: 'Damenindische Verteidigung',
    eco: 'E12–E19',
    moves: '1. d4 Sf6 2. c4 e6 3. Sf3 b6',
    plan: 'Solidere Schwester von Nimzo-Indisch: Wenn Weiß mit 3. Sf3 das 3...Lb4 verhindert, entwickelt Schwarz den Läufer nach b7, um das wichtige Zentralfeld e4 aus der Ferne zu kontrollieren.',
    tactics: [
      'Kontrolle des Zentralfeldes e4 mit Lb7 und Sf6',
      'Hebel ...c5 zur Belebung des Damenflügels',
      'Sehr solide, positionell ausgereifte Bauernstruktur',
    ],
    principleTip: 'Der Läufer b7 schielt quer über das Brett direkt auf das Herzstück des Zentrums (e4).',
  },
  {
    id: 'colle-system',
    name: 'Colle-System / Damenbauernspiel',
    eco: 'D05',
    moves: '1. d4 d5 2. Sf3 Sf6 3. e3 e6 4. Ld3 c5 5. c3',
    plan: 'Grundsolider weißer Aufbau: Das Zentrum wird mit d4/e3/c3 betonhart verriegelt. Weiß bereitet geduldig den befreienden Zentralvorstoß e3-e4 vor, der die weiße Stellung schlagartig explodieren lässt.',
    tactics: [
      'Zentraler Ausbruch mit e3-e4',
      'Königsangriff mit Lxh7+ (klassisches Läuferopfer auf h7)',
      'Sicherer, fehlerverzeihender Eröffnungsaufbau',
    ],
    principleTip: 'Geduld zahlt sich aus: Verriegele das Zentrum und brich im richtigen Moment mit e4 durch.',
  },
]

// ---------------------------------------------------------------------------
// 2. Eröffnungs-Erkennung (Pattern- & FEN-Matcher)
// ---------------------------------------------------------------------------

type PieceCode = 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK' | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK'

function getPieceMap(chess: Chess): Record<string, PieceCode | null> {
  const map: Record<string, PieceCode | null> = {}
  for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      const sq = `${file}${rank}` as Square
      const p = chess.get(sq)
      map[sq] = p ? (`${p.color}${p.type.toUpperCase()}` as PieceCode) : null
    }
  }
  return map
}

export function detectOpening(fen: string): OpeningData | null {
  try {
    const chess = new Chess(fen)
    const m = getPieceMap(chess)
    const moveNumber = chess.moveNumber()

    // Wenn zu weit fortgeschritten (> 18 Züge), Eröffnungserkennung zurückstellen
    if (moveNumber > 18) return null

    // 1. Spezifische Linien zuerst prüfen:
    // Evans-Gambit
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.c6 === 'bN' && m.c4 === 'wB' && m.b4 === 'wP') {
      return OPENINGS_DATABASE.find(o => o.id === 'evans-gambit') ?? null
    }

    // Smith-Morra-Gambit
    if (m.e4 === 'wP' && m.c5 === 'bP' && m.d4 === 'wP' && m.c3 === 'wP') {
      return OPENINGS_DATABASE.find(o => o.id === 'smith-morra-gambit') ?? null
    }

    // Sizilianisch: Najdorf
    if (m.e4 === 'wP' && m.c5 === 'bP' && m.a6 === 'bP' && (m.d6 === 'bP' || m.d5 === 'bP') && m.f6 === 'bN') {
      return OPENINGS_DATABASE.find(o => o.id === 'sicilian-najdorf') ?? null
    }

    // Sizilianisch: Drachen
    if (m.e4 === 'wP' && m.c5 === 'bP' && m.g6 === 'bP' && (m.g7 === 'bB' || m.f8 === 'bB')) {
      return OPENINGS_DATABASE.find(o => o.id === 'sicilian-dragon') ?? null
    }

    // Fried Liver / Zweispringerspiel
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.c6 === 'bN' && m.c4 === 'wB' && m.f6 === 'bN') {
      return OPENINGS_DATABASE.find(o => o.id === 'fried-liver') ?? null
    }

    // Spanische Partie (Ruy Lopez)
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.c6 === 'bN' && (m.b5 === 'wB' || m.a4 === 'wB')) {
      return OPENINGS_DATABASE.find(o => o.id === 'ruy-lopez') ?? null
    }

    // Italienische Partie
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.c6 === 'bN' && m.c4 === 'wB') {
      return OPENINGS_DATABASE.find(o => o.id === 'italian-game') ?? null
    }

    // Schottische Partie
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.c6 === 'bN' && (m.d4 === 'wP' || m.d4 === 'wN')) {
      return OPENINGS_DATABASE.find(o => o.id === 'scotch-game') ?? null
    }

    // Vier-Springer-Spiel
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.c6 === 'bN' && m.c3 === 'wN' && m.f6 === 'bN') {
      return OPENINGS_DATABASE.find(o => o.id === 'four-knights') ?? null
    }

    // Russische Verteidigung (Petrow)
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f3 === 'wN' && m.f6 === 'bN' && m.c6 !== 'bN') {
      return OPENINGS_DATABASE.find(o => o.id === 'petrov-defense') ?? null
    }

    // Wiener Partie
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.c3 === 'wN' && m.f3 !== 'wN') {
      return OPENINGS_DATABASE.find(o => o.id === 'vienna-game') ?? null
    }

    // Königsgambit
    if (m.e4 === 'wP' && m.e5 === 'bP' && m.f4 === 'wP') {
      return OPENINGS_DATABASE.find(o => o.id === 'kings-gambit') ?? null
    }

    // Französische Verteidigung
    if (m.e4 === 'wP' && m.e6 === 'bP' && (m.d5 === 'bP' || m.d7 === 'bP')) {
      return OPENINGS_DATABASE.find(o => o.id === 'french-defense') ?? null
    }

    // Caro-Kann
    if (m.e4 === 'wP' && m.c6 === 'bP' && (m.d5 === 'bP' || m.d7 === 'bP')) {
      return OPENINGS_DATABASE.find(o => o.id === 'caro-kann') ?? null
    }

    // Sizilianische Verteidigung (allgemein)
    if (m.e4 === 'wP' && m.c5 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'sicilian-defense') ?? null
    }

    // Skandinavische Verteidigung
    if (m.e4 === 'wP' && m.d5 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'scandinavian-defense') ?? null
    }

    // Aljechin-Verteidigung
    if (m.e4 === 'wP' && (m.f6 === 'bN' || m.d5 === 'bN') && m.e5 !== 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'alehkine-defense') ?? null
    }

    // Pirc / Modern
    if (m.e4 === 'wP' && m.d6 === 'bP' && m.g6 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'pirc-modern') ?? null
    }

    // Grünfeld-Indisch
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.f6 === 'bN' && m.g6 === 'bP' && m.d5 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'gruenfeld-defense') ?? null
    }

    // Königsindische Verteidigung
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.f6 === 'bN' && m.g6 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'kings-indian') ?? null
    }

    // Nimzowitsch-Indisch
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.f6 === 'bN' && m.e6 === 'bP' && (m.b4 === 'bB' || m.c3 === 'bB')) {
      return OPENINGS_DATABASE.find(o => o.id === 'nimzo-indian') ?? null
    }

    // Damenindisch
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.f6 === 'bN' && m.e6 === 'bP' && (m.b6 === 'bP' || m.b7 === 'bB')) {
      return OPENINGS_DATABASE.find(o => o.id === 'queens-indian') ?? null
    }

    // Katalanisch
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.g3 === 'wP' && (m.g2 === 'wB' || m.f1 === 'wB')) {
      return OPENINGS_DATABASE.find(o => o.id === 'catalan-opening') ?? null
    }

    // Benoni-Verteidigung
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.c5 === 'bP' && (m.d5 === 'wP' || m.e6 === 'bP')) {
      return OPENINGS_DATABASE.find(o => o.id === 'benoni-defense') ?? null
    }

    // Slawische Verteidigung
    if (m.d4 === 'wP' && m.c4 === 'wP' && m.d5 === 'bP' && m.c6 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'slav-defense') ?? null
    }

    // Damengambit (allgemein)
    if (m.d4 === 'wP' && ((m.c4 === 'wP' && m.d5 === 'bP') || m.c4 === 'bP')) {
      return OPENINGS_DATABASE.find(o => o.id === 'queens-gambit') ?? null
    }

    // Londoner System
    if (m.d4 === 'wP' && (m.f4 === 'wB' || (m.f3 === 'wN' && (m.d5 === 'bP' || m.f6 === 'bN') && m.c4 !== 'wP'))) {
      return OPENINGS_DATABASE.find(o => o.id === 'london-system') ?? null
    }

    // Colle-System
    if (m.d4 === 'wP' && m.e3 === 'wP' && m.c3 === 'wP' && (m.d3 === 'wB' || m.f1 === 'wB')) {
      return OPENINGS_DATABASE.find(o => o.id === 'colle-system') ?? null
    }

    // Trompowsky-Angriff
    if (m.d4 === 'wP' && m.g5 === 'wB' && (m.f6 === 'bN' || m.e7 === 'bP')) {
      return OPENINGS_DATABASE.find(o => o.id === 'trompowsky-attack') ?? null
    }

    // Holländische Verteidigung
    if (m.d4 === 'wP' && m.f5 === 'bP') {
      return OPENINGS_DATABASE.find(o => o.id === 'dutch-defense') ?? null
    }

    // Englische Eröffnung
    if (m.c4 === 'wP' && m.d4 !== 'wP' && m.e4 !== 'wP') {
      return OPENINGS_DATABASE.find(o => o.id === 'english-opening') ?? null
    }

    // Réti-Eröffnung
    if (m.f3 === 'wN' && m.c4 === 'wP' && m.d4 !== 'wP') {
      return OPENINGS_DATABASE.find(o => o.id === 'reti-opening') ?? null
    }

    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 3. Stimmigkeits-Prüfung der Eröffnungsprinzipien
// ---------------------------------------------------------------------------

const CENTER_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5']

export function evaluatePrinciplesForSide(fen: string, side: 'w' | 'b'): OpeningPrinciplesReport {
  const chess = new Chess(fen)
  const isWhite = side === 'w'
  const turnLabel = isWhite ? 'Weiß' : 'Schwarz'
  const moveNumber = chess.moveNumber()

  // Spielphase bestimmen
  let totalPieces = 0
  let queensRemaining = 0
  for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      const p = chess.get(`${file}${rank}` as Square)
      if (p) {
        totalPieces++
        if (p.type === 'q') queensRemaining++
      }
    }
  }

  let gamePhase: 'opening' | 'middleGame' | 'endgame' = 'opening'
  let gamePhaseLabel = 'Eröffnung'
  if (totalPieces <= 14 || queensRemaining === 0) {
    gamePhase = 'endgame'
    gamePhaseLabel = 'Endspiel'
  } else if (moveNumber > 16 || totalPieces <= 22) {
    gamePhase = 'middleGame'
    gamePhaseLabel = 'Mittelspiel'
  }

  const isOpeningPhase = gamePhase === 'opening'

  // -------------------------------------------------------------------------
  // A. ZENTRUMSKONTROLLE
  // -------------------------------------------------------------------------
  const friendlyPawnsInCenter: Square[] = []
  const enemyPawnsInCenter: Square[] = []
  let centerAttacksFriendly = 0
  let centerAttacksEnemy = 0

  for (const sq of CENTER_SQUARES) {
    const piece = chess.get(sq)
    if (piece?.type === 'p') {
      if (piece.color === side) friendlyPawnsInCenter.push(sq)
      else enemyPawnsInCenter.push(sq)
    }
    centerAttacksFriendly += chess.attackers(sq, side).length
    centerAttacksEnemy += chess.attackers(sq, isWhite ? 'b' : 'w').length
  }

  // Erweiterter Zentrumseinfluss (c4/f4 für Weiß, c5/f5 für Schwarz)
  const flankCenterPawn = isWhite
    ? (chess.get('c4')?.type === 'p' && chess.get('c4')?.color === 'w') ||
      (chess.get('f4')?.type === 'p' && chess.get('f4')?.color === 'w')
    : (chess.get('c5')?.type === 'p' && chess.get('c5')?.color === 'b') ||
      (chess.get('f5')?.type === 'p' && chess.get('f5')?.color === 'b')

  let centerScore = friendlyPawnsInCenter.length * 30 + (flankCenterPawn ? 15 : 0) + Math.min(40, centerAttacksFriendly * 8)
  centerScore = Math.min(100, Math.max(10, centerScore))

  let centerStatus: 'good' | 'warning' | 'alert' = 'good'
  let centerBadge = 'Stark ✅'
  let centerSummary = ''
  const centerDetails: string[] = []

  if (friendlyPawnsInCenter.length >= 2) {
    centerStatus = 'good'
    centerBadge = 'Hervorragend ✅'
    centerSummary = 'Mächtiges klassisches Bauernzentrum etabliert.'
    centerDetails.push(`Zentralbauern auf ${friendlyPawnsInCenter.join(' und ')} beherrschen den Raum.`)
  } else if (friendlyPawnsInCenter.length === 1) {
    centerStatus = 'good'
    centerBadge = 'Solide ✅'
    centerSummary = 'Solide Zentrumspräsenz mit 1 Zentralbauern.'
    centerDetails.push(`Zentralbauer auf ${friendlyPawnsInCenter[0]} sichert wichtigen Raum.`)
  } else if (flankCenterPawn || centerAttacksFriendly >= 3) {
    centerStatus = 'warning'
    centerBadge = 'Umkämpft ⚠️'
    centerSummary = 'Zentrum wird von den Flanken aus mit Figuren attackiert.'
    centerDetails.push('Kein eigener Bauer direkt im Zentrum, aber spürbare Figurenkraft auf den Zentralfeldern.')
  } else {
    centerStatus = 'alert'
    centerBadge = 'Schwach ❌'
    centerSummary = 'Kein Einfluss im Zentrum – der Gegner hat zu viel Freiraum.'
    centerDetails.push('Dringend einen Hebel wie e4/d4 (Weiß) bzw. e5/d5/c5 (Schwarz) anstreben.')
  }

  if (enemyPawnsInCenter.length > 0) {
    centerDetails.push(`Gegner hat Zentrumsbesetzung auf ${enemyPawnsInCenter.join(', ')}.`)
  }

  // -------------------------------------------------------------------------
  // B. FIGURENENTWICKLUNG
  // -------------------------------------------------------------------------
  const homeSquaresKnights: Square[] = isWhite ? ['b1', 'g1'] : ['b8', 'g8']
  const homeSquaresBishops: Square[] = isWhite ? ['c1', 'f1'] : ['c8', 'f8']

  let developedMinors = 0
  const undeveloppedPieces: string[] = []

  for (const sq of homeSquaresKnights) {
    const p = chess.get(sq)
    if (p && p.type === 'n' && p.color === side) {
      undeveloppedPieces.push(`Springer ${sq}`)
    } else {
      developedMinors++
    }
  }

  for (const sq of homeSquaresBishops) {
    const p = chess.get(sq)
    if (p && p.type === 'b' && p.color === side) {
      undeveloppedPieces.push(`Läufer ${sq}`)
    } else {
      developedMinors++
    }
  }

  // Früher Damenausflug prüfen
  const homeQueenSquare: Square = isWhite ? 'd1' : 'd8'
  const queenMoved = !chess.get(homeQueenSquare) || chess.get(homeQueenSquare)?.type !== 'q'
  const earlyQueenRisk = queenMoved && developedMinors < 2 && moveNumber <= 7

  // Blockierte Läufer prüfen
  const blockedPieces: string[] = []
  if (isWhite) {
    const c1Bishop = chess.get('c1')
    if (c1Bishop?.type === 'b' && c1Bishop.color === 'w') {
      const d2 = chess.get('d2')
      if (d2?.type === 'p' && d2.color === 'w') {
        const d3 = chess.get('d3')
        if (d3) blockedPieces.push('Damenläufer c1 durch Bauer d2 blockiert')
      }
    }
  } else {
    const c8Bishop = chess.get('c8')
    if (c8Bishop?.type === 'b' && c8Bishop.color === 'b') {
      const d7 = chess.get('d7')
      const e6 = chess.get('e6')
      if (d7?.type === 'p' && e6?.type === 'p') {
        blockedPieces.push('Läufer c8 ist hinter der Bauernkette e6/d7 eingesperrt')
      }
    }
  }

  let devScore = Math.round((developedMinors / 4) * 85)
  if (earlyQueenRisk) devScore = Math.max(15, devScore - 25)
  if (blockedPieces.length > 0) devScore = Math.max(20, devScore - 10)
  devScore = Math.min(100, devScore)

  let devStatus: 'good' | 'warning' | 'alert' = 'good'
  let devBadge = 'Aktiv ✅'
  let devSummary = ''
  const devDetails: string[] = []

  if (developedMinors >= 3 && !earlyQueenRisk) {
    devStatus = 'good'
    devBadge = 'Sehr gut ✅'
    devSummary = `${developedMinors} von 4 Leichtfiguren aktiv entwickelt.`
    devDetails.push('Vorbildliche Entwicklung – Figuren sind bereit für gemeinsame Pläne.')
  } else if (developedMinors === 2) {
    devStatus = 'warning'
    devBadge = 'Im Gange ⚠️'
    devSummary = `2 von 4 Leichtfiguren entwickelt.`
    devDetails.push(`Noch auf der Grundreihe: ${undeveloppedPieces.join(', ')}.`)
  } else {
    devStatus = moveNumber <= 3 ? 'warning' : 'alert'
    devBadge = moveNumber <= 3 ? 'Startphase ⚠️' : 'Rückständig ❌'
    devSummary = `${developedMinors} von 4 Leichtfiguren entwickelt.`
    devDetails.push(`Figurenentwicklung beschleunigen: ${undeveloppedPieces.join(', ')} noch unberührt.`)
  }

  if (earlyQueenRisk) {
    devDetails.push('Warnung: Die Dame wurde zu früh herausgezogen – Gefahr von gegnerischem Tempogewinn.')
  }
  for (const b of blockedPieces) {
    devDetails.push(b)
  }

  // -------------------------------------------------------------------------
  // C. KÖNIGSSICHERHEIT & ROCHADE
  // -------------------------------------------------------------------------
  const fenParts = fen.split(/\s+/)
  const castlingRights = fenParts[2] ?? '-'
  const hasKingsideRights = isWhite ? castlingRights.includes('K') : castlingRights.includes('k')
  const hasQueensideRights = isWhite ? castlingRights.includes('Q') : castlingRights.includes('q')
  const kingSquare = isWhite ? 'e1' : 'e8'

  // Wurde rochiert?
  const isCastledKingside = isWhite
    ? chess.get('g1')?.type === 'k' && chess.get('g1')?.color === 'w'
    : chess.get('g8')?.type === 'k' && chess.get('g8')?.color === 'b'
  const isCastledQueenside = isWhite
    ? (chess.get('c1')?.type === 'k' || chess.get('b1')?.type === 'k') && (chess.get('c1')?.color === 'w' || chess.get('b1')?.color === 'w')
    : (chess.get('c8')?.type === 'k' || chess.get('b8')?.type === 'k') && (chess.get('c8')?.color === 'b' || chess.get('b8')?.color === 'b')
  const isCastled = isCastledKingside || isCastledQueenside

  // Offene e-Linie prüfen
  let eFileHasPawns = false
  for (let r = 1; r <= 8; r++) {
    if (chess.get(`e${r}` as Square)?.type === 'p') {
      eFileHasPawns = true
      break
    }
  }

  let kingScore = 70
  let kingStatus: 'good' | 'warning' | 'alert' = 'warning'
  let kingBadge = 'Im Zentrum ⚠️'
  let kingSummary = ''
  const kingDetails: string[] = []

  if (isCastled) {
    kingScore = 100
    kingStatus = 'good'
    kingBadge = 'Gesichert ✅'
    kingSummary = `König steht sicher durch ${isCastledKingside ? 'kurze' : 'lange'} Rochade.`
    kingDetails.push('König ist aus der gefährlichen Brettmitte evakuiert und die Türme sind verbunden.')
  } else {
    const kingPiece = chess.get(kingSquare)
    const kingStillOnHome = kingPiece?.type === 'k' && kingPiece.color === side

    if (!kingStillOnHome) {
      // König hat gezogen ohne zu rochieren
      kingScore = 20
      kingStatus = 'alert'
      kingBadge = 'Kritisch ❌'
      kingSummary = 'König hat gezogen – Rochaderecht endgültig verloren!'
      kingDetails.push('Der unrochiert im Feld stehende König ist hochgradig anfällig für taktische Angriffe.')
    } else if (!hasKingsideRights && !hasQueensideRights) {
      kingScore = 25
      kingStatus = 'alert'
      kingBadge = 'Rochade verloren ❌'
      kingSummary = 'Rochaderechte verloren – König sitzt im Zentrum fest.'
      kingDetails.push('König durch Figuren absichern und Zentrumsöffnung vermeiden.')
    } else if (!eFileHasPawns) {
      kingScore = 30
      kingStatus = 'alert'
      kingBadge = 'Gefährdet ❌'
      kingSummary = 'Kritisch: Unrochierter König auf offener Zentrumslinie!'
      kingDetails.push('Die e-Linie ist geöffnet. Ohne sofortige Rochade drohen vernichtende Schachs.')
    } else {
      // Rochade noch möglich
      const f1Empty = !chess.get(isWhite ? 'f1' : 'f8')
      const g1Empty = !chess.get(isWhite ? 'g1' : 'g8')
      const canCastleNext = hasKingsideRights && f1Empty && g1Empty

      if (canCastleNext) {
        kingScore = 75
        kingStatus = 'warning'
        kingBadge = 'Vorbereitet ⚠️'
        kingSummary = 'Rochade ist vorbereitet und griffbereit.'
        kingDetails.push('Der Weg für die kurze Rochade ist frei – möglichst zeitnah ausführen.')
      } else {
        kingScore = 55
        kingStatus = 'warning'
        kingBadge = 'Ausstehend ⚠️'
        kingSummary = 'König noch in der Mitte, Rochade noch nicht vorbereitet.'
        kingDetails.push('Leichtfiguren am Königsflügel herausziehen, um den König abzusichern.')
      }
    }
  }

  // -------------------------------------------------------------------------
  // D. FIGURENHARMONIE & RANDFIGUREN
  // -------------------------------------------------------------------------
  const edgeKnights: Square[] = []
  const rimSquaresWhite: Square[] = ['a3', 'h3', 'a4', 'h4']
  const rimSquaresBlack: Square[] = ['a6', 'h6', 'a5', 'h5']
  const rimSquaresToCheck = isWhite ? rimSquaresWhite : rimSquaresBlack

  for (const sq of rimSquaresToCheck) {
    const p = chess.get(sq)
    if (p?.type === 'n' && p.color === side) edgeKnights.push(sq)
  }

  let harmonyScore = 90
  let harmonyStatus: 'good' | 'warning' | 'alert' = 'good'
  let harmonyBadge = 'Harmonisch ✅'
  let harmonySummary = 'Figuren unterstützen sich und streben ins Zentrum.'
  const harmonyDetails: string[] = []

  if (edgeKnights.length > 0) {
    harmonyScore = Math.max(30, 90 - edgeKnights.length * 30)
    harmonyStatus = 'warning'
    harmonyBadge = 'Randfiguren ⚠️'
    harmonySummary = `Springer auf ${edgeKnights.join(', ')} steht am Brettrand.`
    harmonyDetails.push('Schachweisheit: „Ein Springer am Rand bringt Kummer und Schand.“')
    harmonyDetails.push('Am Rand kontrolliert ein Springer nur 4 statt bis zu 8 Felder – zügig zentralisieren.')
  } else {
    harmonyDetails.push('Keine deplatzierten Randspringer – Figuren stehen kompakt.')
  }

  // Gesamtnote berechnen
  const overallScore = Math.round(
    centerScore * 0.3 + devScore * 0.3 + kingScore * 0.3 + harmonyScore * 0.1
  )

  // Prägnanter Lotsen-Tipp
  let lotseTip = 'Solide Eröffnungsbeherrschung. Plane den Übergang ins Mittelspiel mit konkreten Hebeln.'
  if (kingStatus === 'alert') {
    lotseTip = 'Oberste Priorität: Bring deinen König durch eine Rochade oder Flucht aus der Mitte in Sicherheit!'
  } else if (earlyQueenRisk) {
    lotseTip = 'Zieh nicht mehrfach mit der Dame in der Eröffnung – bring erst alle Springer und Läufer heraus.'
  } else if (edgeKnights.length > 0) {
    lotseTip = 'Zentralisiere den Springer vom Brettrand zur Spielfeldmitte, um seinen Einfluss zu verdoppeln.'
  } else if (devStatus === 'alert') {
    lotseTip = 'Aktiviere zuerst deine Leichtfiguren (Springer & Läufer), bevor du einen verfrühten Angriff wagst.'
  } else if (centerStatus === 'alert') {
    lotseTip = 'Kämpfe mit einem Gegenstoß im Zentrum um Raum, um dich nicht einengen zu lassen.'
  } else if (kingStatus === 'warning' && developedMinors >= 2) {
    lotseTip = 'Der ideale Moment für die Rochade: Sichere jetzt den König ab, um die Türme zu verbinden.'
  }

  return {
    isOpeningPhase,
    gamePhase,
    gamePhaseLabel,
    overallScore,
    lotseTip,
    turn: side,
    turnLabel,
    center: {
      status: centerStatus,
      title: 'Zentrumskontrolle',
      score: centerScore,
      badge: centerBadge,
      summary: centerSummary,
      details: centerDetails,
    },
    development: {
      status: devStatus,
      title: 'Figurenentwicklung',
      score: devScore,
      badge: devBadge,
      summary: devSummary,
      details: devDetails,
    },
    kingSafety: {
      status: kingStatus,
      title: 'Königssicherheit & Rochade',
      score: kingScore,
      badge: kingBadge,
      summary: kingSummary,
      details: kingDetails,
    },
    harmony: {
      status: harmonyStatus,
      title: 'Figurenharmonie',
      score: harmonyScore,
      badge: harmonyBadge,
      summary: harmonySummary,
      details: harmonyDetails,
    },
  }
}

export function analyzeOpeningPrinciples(fen: string): OpeningAnalysisResult {
  const opening = detectOpening(fen)
  const chess = new Chess(fen)
  const activeSide = chess.turn()

  const whitePrinciples = evaluatePrinciplesForSide(fen, 'w')
  const blackPrinciples = evaluatePrinciplesForSide(fen, 'b')

  return {
    opening,
    whitePrinciples,
    blackPrinciples,
    activeReport: activeSide === 'w' ? whitePrinciples : blackPrinciples,
  }
}
