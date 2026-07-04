import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.join(projectRoot, 'sources/study/curated-records.json');
const jsOutputPath = path.join(projectRoot, 'src/data/generatedStudySourceChunks.js');
const staticPackRoot = path.join(projectRoot, 'public/study-packs/v1');
const staticPackBasePath = 'study-packs/v1';

const sourceRegistry = {
    exegesMethod: {
        id: 'exeges-method',
        label: 'Exeges method notes',
        license: 'App-authored',
        href: '',
    },
    passageContext: {
        id: 'passage-context',
        label: 'Passage context',
        license: 'Derived from the visible Bible passage',
        href: '',
    },
    eastonDictionary: {
        id: 'easton-dictionary',
        label: "Easton's Bible Dictionary",
        license: 'Public domain',
        href: 'https://en.wikipedia.org/wiki/Easton%27s_Bible_Dictionary',
    },
    smithDictionary: {
        id: 'smith-dictionary',
        label: "Smith's Bible Dictionary",
        license: 'Public domain',
        href: 'https://en.wikipedia.org/wiki/Smith%27s_Bible_Dictionary',
    },
    openBibleCrossReferences: {
        id: 'openbible-cross-references',
        label: 'OpenBible.info Cross References',
        license: 'CC BY',
        href: 'https://www.openbible.info/labs/cross-references/',
    },
    openBibleGeocoding: {
        id: 'openbible-geocoding',
        label: 'OpenBible.info Bible Geocoding Data',
        license: 'CC BY 4.0',
        href: 'https://github.com/openbibleinfo/Bible-Geocoding-Data',
    },
};

const allowedSourceIds = new Set([
    'exegesMethod',
    'passageContext',
    'eastonDictionary',
    'smithDictionary',
    'openBibleCrossReferences',
    'openBibleGeocoding',
]);

const allowedRouteIds = new Set([
    'word-name',
    'person',
    'place',
    'historical-cultural',
    'canonical',
    'theological',
    'general',
]);

const allowedConfidenceValues = new Set(['low', 'medium', 'high']);
const allowedReviewStatuses = new Set(['draft', 'reviewed', 'needs-review']);

const bibleBookAliases = new Map([
    ['Genesis', 'Genesis'],
    ['Exodus', 'Exodus'],
    ['Leviticus', 'Leviticus'],
    ['Numbers', 'Numbers'],
    ['Deuteronomy', 'Deuteronomy'],
    ['Joshua', 'Joshua'],
    ['Judges', 'Judges'],
    ['Ruth', 'Ruth'],
    ['1 Samuel', '1 Samuel'],
    ['2 Samuel', '2 Samuel'],
    ['1 Kings', '1 Kings'],
    ['2 Kings', '2 Kings'],
    ['1 Chronicles', '1 Chronicles'],
    ['2 Chronicles', '2 Chronicles'],
    ['Ezra', 'Ezra'],
    ['Nehemiah', 'Nehemiah'],
    ['Esther', 'Esther'],
    ['Job', 'Job'],
    ['Psalm', 'Psalm'],
    ['Psalms', 'Psalm'],
    ['Proverbs', 'Proverbs'],
    ['Ecclesiastes', 'Ecclesiastes'],
    ['Song of Solomon', 'Song of Solomon'],
    ['Song', 'Song of Solomon'],
    ['Isaiah', 'Isaiah'],
    ['Jeremiah', 'Jeremiah'],
    ['Lamentations', 'Lamentations'],
    ['Ezekiel', 'Ezekiel'],
    ['Daniel', 'Daniel'],
    ['Hosea', 'Hosea'],
    ['Joel', 'Joel'],
    ['Amos', 'Amos'],
    ['Obadiah', 'Obadiah'],
    ['Jonah', 'Jonah'],
    ['Micah', 'Micah'],
    ['Nahum', 'Nahum'],
    ['Habakkuk', 'Habakkuk'],
    ['Zephaniah', 'Zephaniah'],
    ['Haggai', 'Haggai'],
    ['Zechariah', 'Zechariah'],
    ['Malachi', 'Malachi'],
    ['Matthew', 'Matthew'],
    ['Mark', 'Mark'],
    ['Luke', 'Luke'],
    ['John', 'John'],
    ['Acts', 'Acts'],
    ['Romans', 'Romans'],
    ['1 Corinthians', '1 Corinthians'],
    ['2 Corinthians', '2 Corinthians'],
    ['Galatians', 'Galatians'],
    ['Ephesians', 'Ephesians'],
    ['Philippians', 'Philippians'],
    ['Colossians', 'Colossians'],
    ['1 Thessalonians', '1 Thessalonians'],
    ['2 Thessalonians', '2 Thessalonians'],
    ['1 Timothy', '1 Timothy'],
    ['2 Timothy', '2 Timothy'],
    ['Titus', 'Titus'],
    ['Philemon', 'Philemon'],
    ['Hebrews', 'Hebrews'],
    ['James', 'James'],
    ['1 Peter', '1 Peter'],
    ['2 Peter', '2 Peter'],
    ['1 John', '1 John'],
    ['2 John', '2 John'],
    ['3 John', '3 John'],
    ['Jude', 'Jude'],
    ['Revelation', 'Revelation'],
]);

const bibleBookAliasByLowercase = new Map(
    [...bibleBookAliases.entries()].map(([alias, canonical]) => [alias.toLowerCase(), canonical]),
);

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const bookPattern = [...bibleBookAliases.keys()]
    .sort((a, b) => b.length - a.length)
    .map(book => escapeRegExp(book).replace(/\s+/g, '\\s+'))
    .join('|');

const referencePattern = new RegExp(`\\b(${bookPattern})\\s+(\\d{1,3})(?::\\d{1,3}(?:-\\d{1,3})?)?`, 'gi');

function assertArray(value, label) {
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
        throw new Error(`${label} must be an array of strings.`);
    }
}

function assertRecord(record) {
    for (const key of ['id', 'sourceId', 'title', 'text']) {
        if (typeof record[key] !== 'string' || !record[key].trim()) {
            throw new Error(`Record is missing required string field: ${key}`);
        }
    }

    if (!allowedSourceIds.has(record.sourceId)) {
        throw new Error(`Unsupported sourceId "${record.sourceId}" in ${record.id}.`);
    }

    for (const key of ['license', 'attribution', 'allowedUse', 'confidence', 'reviewStatus']) {
        if (typeof record[key] !== 'string' || !record[key].trim()) {
            throw new Error(`${record.id}.${key} is required for SourcePack v2.`);
        }
    }

    if (record.sourceUrl !== undefined && typeof record.sourceUrl !== 'string') {
        throw new Error(`${record.id}.sourceUrl must be a string when provided.`);
    }

    if (!allowedConfidenceValues.has(record.confidence)) {
        throw new Error(`${record.id}.confidence must be one of: ${[...allowedConfidenceValues].join(', ')}.`);
    }

    if (!allowedReviewStatuses.has(record.reviewStatus)) {
        throw new Error(`${record.id}.reviewStatus must be one of: ${[...allowedReviewStatuses].join(', ')}.`);
    }

    assertArray(record.routeIds, `${record.id}.routeIds`);
    assertArray(record.terms, `${record.id}.terms`);
    assertArray(record.references, `${record.id}.references`);

    for (const routeId of record.routeIds) {
        if (!allowedRouteIds.has(routeId)) {
            throw new Error(`Unsupported routeId "${routeId}" in ${record.id}.`);
        }
    }

    if (record.text.length > 420) {
        throw new Error(`${record.id}.text is too long for a source chunk. Keep records concise.`);
    }

    if (record.references.length > 0 && getReferenceAnchors(record.references).length === 0) {
        throw new Error(`${record.id}.references did not include a parseable Bible reference.`);
    }
}

function normalizeRecord(record) {
    const source = sourceRegistry[record.sourceId];

    return {
        id: record.id,
        sourceId: record.sourceId,
        title: record.title,
        routeIds: [...new Set(record.routeIds)],
        terms: [...new Set(record.terms.map(term => term.toLowerCase()))],
        references: [...new Set(record.references)],
        text: record.text,
        license: record.license || source.license,
        attribution: record.attribution || source.label,
        sourceUrl: record.sourceUrl ?? source.href,
        confidence: record.confidence,
        reviewStatus: record.reviewStatus,
        allowedUse: record.allowedUse,
        generated: true,
    };
}

function makeOutput({ version, records }) {
    const chunks = records.map(normalizeRecord).sort((a, b) => a.id.localeCompare(b.id));

    return `// Generated by scripts/build-study-source-pack.mjs. Do not edit by hand.
export const GENERATED_STUDY_SOURCE_VERSION = ${JSON.stringify(version)};

export const GENERATED_STUDY_SOURCE_CHUNKS = ${JSON.stringify(chunks, null, 4)};
`;
}

function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getReferenceAnchors(references) {
    const anchors = [];

    for (const reference of references) {
        referencePattern.lastIndex = 0;

        let match = referencePattern.exec(reference);
        while (match) {
            const rawBook = match[1].replace(/\s+/g, ' ').toLowerCase();
            const book = bibleBookAliasByLowercase.get(rawBook);
            const chapter = Number.parseInt(match[2], 10);

            if (book && Number.isFinite(chapter)) {
                anchors.push({
                    book,
                    chapter,
                    key: `${slugify(book)}-${chapter}`,
                    path: `${slugify(book)}/${chapter}.json`,
                });
            }

            match = referencePattern.exec(reference);
        }
    }

    return anchors.filter((anchor, index, list) => (
        list.findIndex(item => item.key === anchor.key) === index
    ));
}

function addRecordToShard(shards, anchor, record) {
    const existing = shards.get(anchor.key) ?? {
        book: anchor.book,
        chapter: anchor.chapter,
        path: anchor.path,
        records: [],
    };

    if (!existing.records.some(item => item.id === record.id)) {
        existing.records.push(record);
    }

    shards.set(anchor.key, existing);
}

function makeShard({ version, book, chapter, records }) {
    return {
        schemaVersion: 2,
        packVersion: version,
        book,
        chapter,
        records: records.sort((a, b) => a.id.localeCompare(b.id)),
    };
}

function makeGlobalPack({ version, records }) {
    return {
        schemaVersion: 2,
        packVersion: version,
        scope: 'global',
        records: records.sort((a, b) => a.id.localeCompare(b.id)),
    };
}

function makeManifest({ version, records, globalRecords, shards }) {
    const sortedShards = [...shards.values()].sort((a, b) => (
        a.book.localeCompare(b.book) || a.chapter - b.chapter
    ));

    return {
        schemaVersion: 2,
        packVersion: version,
        basePath: staticPackBasePath,
        recordCount: records.length,
        globalPath: globalRecords.length ? 'global.json' : '',
        globalRecordCount: globalRecords.length,
        shardCount: sortedShards.length,
        sources: sourceRegistry,
        shards: sortedShards.map(shard => ({
            id: `${slugify(shard.book)}-${shard.chapter}`,
            book: shard.book,
            chapter: shard.chapter,
            path: shard.path,
            recordCount: shard.records.length,
        })),
    };
}

async function writeStaticPacks({ version, records }) {
    const normalizedRecords = records.map(normalizeRecord).sort((a, b) => a.id.localeCompare(b.id));
    const globalRecords = [];
    const shards = new Map();

    for (const record of normalizedRecords) {
        const anchors = getReferenceAnchors(record.references);

        if (anchors.length === 0) {
            globalRecords.push(record);
            continue;
        }

        for (const anchor of anchors) {
            addRecordToShard(shards, anchor, record);
        }
    }

    await rm(staticPackRoot, { recursive: true, force: true });
    await mkdir(staticPackRoot, { recursive: true });

    if (globalRecords.length > 0) {
        await writeFile(
            path.join(staticPackRoot, 'global.json'),
            `${JSON.stringify(makeGlobalPack({ version, records: globalRecords }), null, 4)}\n`,
            'utf8',
        );
    }

    for (const shard of shards.values()) {
        const shardPath = path.join(staticPackRoot, shard.path);
        await mkdir(path.dirname(shardPath), { recursive: true });
        await writeFile(
            shardPath,
            `${JSON.stringify(makeShard({ version, ...shard }), null, 4)}\n`,
            'utf8',
        );
    }

    await writeFile(
        path.join(staticPackRoot, 'manifest.json'),
        `${JSON.stringify(makeManifest({ version, records: normalizedRecords, globalRecords, shards }), null, 4)}\n`,
        'utf8',
    );
}

async function main() {
    const raw = await readFile(inputPath, 'utf8');
    const sourcePack = JSON.parse(raw);

    if (sourcePack.schemaVersion !== 2) {
        throw new Error('Source pack needs schemaVersion: 2.');
    }

    if (typeof sourcePack.version !== 'string' || !sourcePack.version.trim()) {
        throw new Error('Source pack needs a version string.');
    }

    if (!Array.isArray(sourcePack.records)) {
        throw new Error('Source pack needs a records array.');
    }

    const seenIds = new Set();
    for (const record of sourcePack.records) {
        assertRecord(record);

        if (seenIds.has(record.id)) {
            throw new Error(`Duplicate source record id: ${record.id}`);
        }

        seenIds.add(record.id);
    }

    await writeFile(jsOutputPath, makeOutput(sourcePack), 'utf8');
    await writeStaticPacks(sourcePack);
    console.log(`Generated ${sourcePack.records.length} study source chunks and static source packs.`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
