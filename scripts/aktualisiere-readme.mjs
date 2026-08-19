// Erzeugt die generierten Abschnitte des README aus https://timrutte.de/profil.json.
//
// Warum: das Profil trug monatelang eine Selbstbezeichnung, die es auf der
// Website längst nicht mehr gab, und listete sieben von neun Artikeln. Was an
// zwei Stellen von Hand gepflegt wird, läuft auseinander. Die Website ist die
// Quelle, dieses README zieht nach.
//
// Von Hand gepflegt bleibt alles außerhalb der Marker: Begrüßung, Zertifikate,
// Kontakt. Innerhalb der Marker wird überschrieben.
//
// Aufruf: node scripts/aktualisiere-readme.mjs
import { readFile, writeFile } from 'node:fs/promises';

const QUELLE = process.env.PROFIL_JSON ?? 'https://timrutte.de/profil.json';
const DATEI = 'README.md';

const antwort = await fetch(QUELLE, { headers: { 'User-Agent': 'timrutte-profil-sync' } });
if (!antwort.ok) throw new Error(`${QUELLE} antwortete mit ${antwort.status}`);
const daten = await antwort.json();
if (daten.version !== 1) {
  throw new Error(
    `profil.json meldet Version ${daten.version}, dieses Skript kennt 1. ` +
      `Struktur geändert, Skript anpassen statt raten.`
  );
}

const abschnitte = {
  // Der Rahmen steht hier, die Aussage kommt von der Website. "for
  // business-critical AWS systems" steckt schon im Satz, deshalb hier nicht.
  positionierung:
    `**${daten.positionierung.rolle}** – based in Germany, remote since 2003. ` +
    `More than 20 years in software development. ${daten.positionierung.satz}`,

  problemwelten: daten.problemwelten
    .map(pw =>
      [
        `### ${pw.anlass.replace(/\.$/, '')}`,
        '',
        pw.text,
        '',
        '→ ' + pw.leistungen.map(l => `[${l.name}](${l.url})`).join(' · '),
      ].join('\n')
    )
    .join('\n\n'),

  caseStudies: daten.caseStudies
    .map(c => `* [${c.name}](${c.url}) – ${c.kennzahlen.join(', ')}`)
    .join('\n'),

  artikel:
    daten.artikel.map(a => `* [${a.titel}](${a.url}) – ${kurz(a.beschreibung)}`).join('\n') +
    `\n\nMore on [timrutte.de/en/blog](https://timrutte.de/en/blog/)` +
    ` · also in German on [timrutte.de/blog](https://timrutte.de/blog/)` +
    ` · [RSS](${daten.feeds.en})`,
};

/**
 * Erster Satz der Beschreibung, klein geschrieben, ohne Punkt, bei sehr langen
 * Sätzen an der Wortgrenze gekürzt. Die Liste soll überflogen werden können.
 */
function kurz(text, max = 110) {
  let satz = text.split(/(?<=\.)\s/)[0].replace(/\.$/, '');
  if (satz.length > max) satz = satz.slice(0, satz.lastIndexOf(' ', max)) + ' …';
  return satz.charAt(0).toLowerCase() + satz.slice(1);
}

let readme = await readFile(DATEI, 'utf8');
let ersetzt = 0;

for (const [name, inhalt] of Object.entries(abschnitte)) {
  const muster = new RegExp(
    `(<!-- auto:${name} -->\\n)[\\s\\S]*?(\\n<!-- /auto:${name} -->)`,
    'm'
  );
  if (!muster.test(readme)) throw new Error(`Marker auto:${name} fehlt im README`);
  readme = readme.replace(muster, `$1${inhalt}$2`);
  ersetzt++;
}

await writeFile(DATEI, readme);
console.log(`${ersetzt} Abschnitte aus ${QUELLE} erneuert`);
