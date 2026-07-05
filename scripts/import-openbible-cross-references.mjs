import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const defaultDownloadUrl = 'https://a.openbible.info/data/cross-references.zip';
const defaultOutputPath = path.join(projectRoot, 'sources/study/imported/openbible-cross-references.json');
const defaultTopTargetCount = 6;

const bookNamesByOsis = {
    Gen: 'Genesis',
    Exod: 'Exodus',
    Lev: 'Leviticus',
    Num: 'Numbers',
    Deut: 'Deuteronomy',
    Josh: 'Joshua',
    Judg: 'Judges',
    Ruth: 'Ruth',
    '1Sam': '1 Samuel',
    '2Sam': '2 Samuel',
    '1Kgs': '1 Kings',
    '2Kgs': '2 Kings',
    '1Chr': '1 Chronicles',
    '2Chr': '2 Chronicles',
    Ezra: 'Ezra',
    Neh: 'Nehemiah',
    Esth: 'Esther',
    Job: 'Job',
    Ps: 'Psalm',
    Prov: 'Proverbs',
    Eccl: 'Ecclesiastes',
    Song: 'Song of Solomon',
    Isa: 'Isaiah',
    Jer: 'Jeremiah',
    Lam: 'Lamentations',
    Ezek: 'Ezekiel',
    Dan: 'Daniel',
    Hos: 'Hosea',
    Joel: 'Joel',
    Amos: 'Amos',
    Obad: 'Obadiah',
    Jonah: 'Jonah',
    Mic: 'Micah',
    Nah: 'Nahum',
    Hab: 'Habakkuk',
    Zeph: 'Zephaniah',
    Hag: 'Haggai',
    Zech: 'Zechariah',
    Mal: 'Malachi',
    Matt: 'Matthew',
    Mark: 'Mark',
    Luke: 'Luke',
    John: 'John',
    Acts: 'Acts',
    Rom: 'Romans',
    '1Cor': '1 Corinthians',
    '2Cor': '2 Corinthians',
    Gal: 'Galatians',
    Eph: 'Ephesians',
    Phil: 'Philippians',
    Col: 'Colossians',
    '1Thess': '1 Thessalonians',
    '2Thess': '2 Thessalonians',
    '1Tim': '1 Timothy',
    '2Tim': '2 Timothy',
    Titus: 'Titus',
    Phlm: 'Philemon',
    Heb: 'Hebrews',
    Jas: 'James',
    '1Pet': '1 Peter',
    '2Pet': '2 Peter',
    '1John': '1 John',
    '2John': '2 John',
    '3John': '3 John',
    Jude: 'Jude',
    Rev: 'Revelation',
};

function getArg(name) {
    const prefix = `--${name}=`;
    const match = process.argv.slice(2).find(arg => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : '';
}

function hasFlag(name) {
    return process.argv.slice(2).includes(`--${name}`);
}

function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseOsisPoint(value) {
    const [bookId, chapter, verse] = value.split('.');
    const book = bookNamesByOsis[bookId];

    if (!book || !chapter || !verse) {
        throw new Error(`Unsupported OpenBible reference: ${value}`);
    }

    return {
        book,
        chapter: Number.parseInt(chapter, 10),
        verse: Number.parseInt(verse, 10),
    };
}

function formatOsisReference(value) {
    const [startRaw, endRaw] = value.split('-');
    const start = parseOsisPoint(startRaw);

    if (!endRaw) return `${start.book} ${start.chapter}:${start.verse}`;

    const end = parseOsisPoint(endRaw);

    if (start.book === end.book && start.chapter === end.chapter) {
        return `${start.book} ${start.chapter}:${start.verse}-${end.verse}`;
    }

    if (start.book === end.book) {
        return `${start.book} ${start.chapter}:${start.verse}-${end.chapter}:${end.verse}`;
    }

    return `${start.book} ${start.chapter}:${start.verse}-${end.book} ${end.chapter}:${end.verse}`;
}

function getBookTerm(reference) {
    const [bookName] = reference.match(/^(?:\d\s)?[A-Za-z]+(?:\s(?:of\s)?[A-Za-z]+)*/u) ?? [];
    return bookName ? bookName.toLowerCase() : '';
}

function makeRecordText(fromReference, topReferences) {
    const base = `OpenBible cross-reference data links ${fromReference} with `;
    const suffix = ` Use these as canonical leads after interpreting ${fromReference} locally.`;
    const references = [...topReferences];

    while (references.length > 1) {
        const text = `${base}${references.join(', ')}.${suffix}`;
        if (text.length <= 420) return text;
        references.pop();
    }

    return `${base}${references.join(', ')}.${suffix}`;
}

function parseCrossReferenceRows(text) {
    const [header, ...lines] = text.trim().split(/\r?\n/);
    const headerParts = header.split('\t');
    const dateMatch = header.match(/CC-BY\s+(\d{4}-\d{2}-\d{2})/u);

    if (headerParts[0] !== 'From Verse' || headerParts[1] !== 'To Verse') {
        throw new Error('OpenBible cross-reference file did not have the expected header.');
    }

    const grouped = new Map();
    let edgeCount = 0;

    for (const line of lines) {
        if (!line.trim()) continue;

        const [fromOsis, toOsis, votesRaw] = line.split('\t');
        const votes = Number.parseInt(votesRaw, 10);

        if (!fromOsis || !toOsis || !Number.isFinite(votes)) {
            throw new Error(`Invalid OpenBible cross-reference row: ${line}`);
        }

        const existing = grouped.get(fromOsis) ?? [];
        existing.push({
            osis: toOsis,
            reference: formatOsisReference(toOsis),
            votes,
        });
        grouped.set(fromOsis, existing);
        edgeCount += 1;
    }

    return {
        sourceDate: dateMatch?.[1] ?? '',
        edgeCount,
        grouped,
    };
}

function makeRecord(fromOsis, targets, topTargetCount) {
    const fromReference = formatOsisReference(fromOsis);
    const topTargets = targets
        .sort((a, b) => b.votes - a.votes || a.reference.localeCompare(b.reference))
        .slice(0, topTargetCount)
        .map(target => ({
            reference: target.reference,
            votes: target.votes,
        }));
    const topReferences = topTargets.map(target => target.reference);
    const targetBookTerms = topReferences.map(getBookTerm).filter(Boolean);

    return {
        id: `openbible-cross-${slugify(fromReference)}`,
        title: `Cross-reference leads from ${fromReference}`,
        terms: [
            'cross reference',
            'canonical',
            'scripture',
            'theme',
            'parallel',
            getBookTerm(fromReference),
            ...targetBookTerms,
        ].filter((term, index, terms) => term && terms.indexOf(term) === index),
        references: [fromReference, ...topReferences],
        anchorReferences: [fromReference],
        crossReferences: topTargets,
        text: makeRecordText(fromReference, topReferences),
    };
}

async function downloadZip(downloadUrl) {
    const response = await fetch(downloadUrl);

    if (!response.ok) {
        throw new Error(`Failed to download ${downloadUrl}: ${response.status} ${response.statusText}`);
    }

    const zipPath = path.join(tmpdir(), 'openbible-cross-references.zip');
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(zipPath, buffer);
    return zipPath;
}

async function readCrossReferenceText(zipPath) {
    const { stdout } = await execFileAsync('unzip', ['-p', zipPath, 'cross_references.txt'], {
        maxBuffer: 20 * 1024 * 1024,
    });

    return stdout;
}

function makeSourcePack({ records, edgeCount, sourceDate, topTargetCount, downloadUrl }) {
    return {
        schemaVersion: 2,
        version: `openbible-cross-references-${sourceDate || 'unknown'}`,
        source: {
            id: 'openBibleCrossReferences',
            label: 'OpenBible.info Cross References',
            downloadUrl,
            sourceDate,
            edgeCount,
            importedRecordCount: records.length,
            topTargetCount,
        },
        recordDefaults: {
            sourceId: 'openBibleCrossReferences',
            routeIds: ['canonical'],
            license: 'CC BY',
            attribution: 'OpenBible.info Cross References',
            sourceUrl: 'https://www.openbible.info/labs/cross-references/',
            confidence: 'medium',
            reviewStatus: 'needs-review',
            allowedUse: 'Use as cross-reference leads after local passage meaning is clear; do not treat links as proof of an interpretation.',
            delivery: 'static',
        },
        records,
    };
}

async function main() {
    const inputPath = getArg('input');
    const outputPath = getArg('output') || defaultOutputPath;
    const topTargetCount = Number.parseInt(getArg('top') || String(defaultTopTargetCount), 10);
    const downloadUrl = getArg('url') || defaultDownloadUrl;

    if (!Number.isInteger(topTargetCount) || topTargetCount < 1 || topTargetCount > 12) {
        throw new Error('--top must be an integer from 1 to 12.');
    }

    const zipPath = inputPath || await downloadZip(downloadUrl);
    const text = await readCrossReferenceText(zipPath);
    const { sourceDate, edgeCount, grouped } = parseCrossReferenceRows(text);
    const records = [...grouped.entries()]
        .map(([fromOsis, targets]) => makeRecord(fromOsis, targets, topTargetCount))
        .sort((a, b) => a.id.localeCompare(b.id));

    const sourcePack = makeSourcePack({
        records,
        edgeCount,
        sourceDate,
        topTargetCount,
        downloadUrl,
    });

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(sourcePack)}\n`, 'utf8');

    if (!hasFlag('quiet')) {
        console.log(
            `Imported ${records.length} OpenBible cross-reference cards `
            + `from ${edgeCount} edges into ${path.relative(projectRoot, outputPath)}.`,
        );
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
