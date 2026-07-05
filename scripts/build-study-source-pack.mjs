import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const primaryInputPath = path.join(projectRoot, 'sources/study/curated-records.json');
const importedInputDir = path.join(projectRoot, 'sources/study/imported');
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
const allowedDeliveryModes = new Set(['bundle', 'static']);

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

function isRecordObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function materializeRecord(record, defaults = {}) {
    return {
        ...defaults,
        ...record,
        routeIds: record.routeIds ?? defaults.routeIds ?? [],
        terms: record.terms ?? defaults.terms ?? [],
        references: record.references ?? defaults.references ?? [],
        anchorReferences: record.anchorReferences ?? defaults.anchorReferences,
        crossReferences: record.crossReferences ?? defaults.crossReferences,
        sourceUrl: record.sourceUrl ?? defaults.sourceUrl,
        delivery: record.delivery ?? defaults.delivery ?? 'bundle',
    };
}

function assertRecord(record, sourceLabel) {
    for (const key of ['id', 'sourceId', 'title', 'text']) {
        if (typeof record[key] !== 'string' || !record[key].trim()) {
            throw new Error(`${sourceLabel}: record is missing required string field: ${key}`);
        }
    }

    if (!allowedSourceIds.has(record.sourceId)) {
        throw new Error(`${sourceLabel}: unsupported sourceId "${record.sourceId}" in ${record.id}.`);
    }

    for (const key of ['license', 'attribution', 'allowedUse', 'confidence', 'reviewStatus']) {
        if (typeof record[key] !== 'string' || !record[key].trim()) {
            throw new Error(`${sourceLabel}: ${record.id}.${key} is required for SourcePack v2.`);
        }
    }

    if (record.sourceUrl !== undefined && typeof record.sourceUrl !== 'string') {
        throw new Error(`${sourceLabel}: ${record.id}.sourceUrl must be a string when provided.`);
    }

    if (!allowedConfidenceValues.has(record.confidence)) {
        throw new Error(`${sourceLabel}: ${record.id}.confidence must be one of: ${[...allowedConfidenceValues].join(', ')}.`);
    }

    if (!allowedReviewStatuses.has(record.reviewStatus)) {
        throw new Error(`${sourceLabel}: ${record.id}.reviewStatus must be one of: ${[...allowedReviewStatuses].join(', ')}.`);
    }

    if (!allowedDeliveryModes.has(record.delivery)) {
        throw new Error(`${sourceLabel}: ${record.id}.delivery must be one of: ${[...allowedDeliveryModes].join(', ')}.`);
    }

    assertArray(record.routeIds, `${record.id}.routeIds`);
    assertArray(record.terms, `${record.id}.terms`);
    assertArray(record.references, `${record.id}.references`);

    if (record.anchorReferences !== undefined) {
        assertArray(record.anchorReferences, `${record.id}.anchorReferences`);
    }

    for (const routeId of record.routeIds) {
        if (!allowedRouteIds.has(routeId)) {
            throw new Error(`${sourceLabel}: unsupported routeId "${routeId}" in ${record.id}.`);
        }
    }

    if (record.text.length > 420) {
        throw new Error(`${sourceLabel}: ${record.id}.text is too long for a source chunk. Keep records concise.`);
    }

    if (record.references.length > 0 && getReferenceAnchors(record.references).length === 0) {
        throw new Error(`${sourceLabel}: ${record.id}.references did not include a parseable Bible reference.`);
    }

    if (record.anchorReferences?.length > 0 && getReferenceAnchors(record.anchorReferences).length === 0) {
        throw new Error(`${sourceLabel}: ${record.id}.anchorReferences did not include a parseable Bible reference.`);
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
        delivery: record.delivery,
        ...(record.anchorReferences?.length ? { anchorReferences: [...new Set(record.anchorReferences)] } : {}),
        ...(Array.isArray(record.crossReferences) ? { crossReferences: record.crossReferences } : {}),
        generated: true,
    };
}

function makeOutput({ version, records }) {
    const chunks = records
        .filter(record => record.delivery !== 'static')
        .map(normalizeRecord)
        .sort((a, b) => a.id.localeCompare(b.id));

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

function getShardAnchors(record) {
    const shardReferences = record.anchorReferences?.length
        ? record.anchorReferences
        : record.references;

    return getReferenceAnchors(shardReferences);
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

function makeManifest({ version, records, globalRecords, shards, sourcePackVersions }) {
    const sortedShards = [...shards.values()].sort((a, b) => (
        a.book.localeCompare(b.book) || a.chapter - b.chapter
    ));
    const bundledRecordCount = records.filter(record => record.delivery !== 'static').length;

    return {
        schemaVersion: 2,
        packVersion: version,
        basePath: staticPackBasePath,
        recordCount: records.length,
        bundledRecordCount,
        staticOnlyRecordCount: records.length - bundledRecordCount,
        sourcePackVersions,
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

async function writeStaticPacks({ version, records, sourcePackVersions = {} }) {
    const normalizedRecords = records.map(normalizeRecord).sort((a, b) => a.id.localeCompare(b.id));
    const globalRecords = [];
    const shards = new Map();

    for (const record of normalizedRecords) {
        const anchors = getShardAnchors(record);

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
        `${JSON.stringify(makeManifest({
            version,
            records: normalizedRecords,
            globalRecords,
            shards,
            sourcePackVersions,
        }), null, 4)}\n`,
        'utf8',
    );
}

async function readJsonFile(filePath) {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
}

async function readImportedSourcePacks() {
    try {
        const entries = await readdir(importedInputDir, { withFileTypes: true });
        const jsonFiles = entries
            .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
            .map(entry => path.join(importedInputDir, entry.name))
            .sort((a, b) => a.localeCompare(b));

        return Promise.all(jsonFiles.map(async filePath => ({
            filePath,
            pack: await readJsonFile(filePath),
        })));
    } catch (error) {
        if (error?.code === 'ENOENT') return [];
        throw error;
    }
}

function validateSourcePack(sourcePack, sourceLabel) {
    if (sourcePack.schemaVersion !== 2) {
        throw new Error(`${sourceLabel}: source pack needs schemaVersion: 2.`);
    }

    if (typeof sourcePack.version !== 'string' || !sourcePack.version.trim()) {
        throw new Error(`${sourceLabel}: source pack needs a version string.`);
    }

    if (!Array.isArray(sourcePack.records)) {
        throw new Error(`${sourceLabel}: source pack needs a records array.`);
    }

    if (sourcePack.recordDefaults !== undefined && !isRecordObject(sourcePack.recordDefaults)) {
        throw new Error(`${sourceLabel}: recordDefaults must be an object when provided.`);
    }
}

async function readSourcePacks() {
    const primaryPack = await readJsonFile(primaryInputPath);
    const importedPacks = await readImportedSourcePacks();

    return [
        {
            filePath: primaryInputPath,
            pack: primaryPack,
        },
        ...importedPacks,
    ];
}

function combineSourcePacks(sourcePacks) {
    const records = [];
    const seenIds = new Set();
    const sourcePackVersions = {};

    for (const { filePath, pack } of sourcePacks) {
        const sourceLabel = path.relative(projectRoot, filePath);
        validateSourcePack(pack, sourceLabel);
        sourcePackVersions[sourceLabel] = pack.version;
        const defaults = pack.recordDefaults ?? {};

        for (const rawRecord of pack.records) {
            const record = materializeRecord(rawRecord, defaults);
            assertRecord(record, sourceLabel);

            if (seenIds.has(record.id)) {
                throw new Error(`Duplicate source record id: ${record.id}`);
            }

            seenIds.add(record.id);
            records.push(record);
        }
    }

    return {
        version: Object.values(sourcePackVersions).join('+'),
        records,
        sourcePackVersions,
    };
}

async function main() {
    const sourcePacks = await readSourcePacks();
    const combinedSourcePack = combineSourcePacks(sourcePacks);
    const bundledRecordCount = combinedSourcePack.records.filter(record => record.delivery !== 'static').length;

    await writeFile(jsOutputPath, makeOutput(combinedSourcePack), 'utf8');
    await writeStaticPacks(combinedSourcePack);
    console.log(
        `Generated ${combinedSourcePack.records.length} study source chunks `
        + `(${bundledRecordCount} bundled, ${combinedSourcePack.records.length - bundledRecordCount} static-only).`,
    );
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
