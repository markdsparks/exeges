import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GENERATED_STUDY_SOURCE_CHUNKS,
    GENERATED_STUDY_SOURCE_VERSION,
} from '../src/data/generatedStudySourceChunks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const importedSourceDir = path.join(projectRoot, 'sources/study/imported');

function readJson(relativePath) {
    return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

function readSourcePackEntries() {
    const entries = [
        {
            relativePath: 'sources/study/curated-records.json',
            pack: readJson('sources/study/curated-records.json'),
        },
    ];

    if (existsSync(importedSourceDir)) {
        const importedFiles = readdirSync(importedSourceDir)
            .filter(fileName => fileName.endsWith('.json'))
            .sort((a, b) => a.localeCompare(b));

        for (const fileName of importedFiles) {
            const relativePath = path.join('sources/study/imported', fileName);
            entries.push({
                relativePath,
                pack: readJson(relativePath),
            });
        }
    }

    return entries;
}

function materializeRecord(record, defaults = {}) {
    return {
        ...defaults,
        ...record,
        routeIds: record.routeIds ?? defaults.routeIds ?? [],
        terms: record.terms ?? defaults.terms ?? [],
        references: record.references ?? defaults.references ?? [],
        delivery: record.delivery ?? defaults.delivery ?? 'bundle',
    };
}

function materializeSourceRecords(sourcePackEntries) {
    return sourcePackEntries.flatMap(({ pack }) => (
        pack.records.map(record => materializeRecord(record, pack.recordDefaults ?? {}))
    ));
}

function assertRecordMetadata(record) {
    for (const key of ['license', 'attribution', 'confidence', 'reviewStatus', 'allowedUse']) {
        assert.equal(
            typeof record[key],
            'string',
            `${record.id}.${key} should be present in SourcePack v2 records`,
        );
        assert.ok(record[key].trim(), `${record.id}.${key} should not be blank`);
    }

    assert.ok(
        ['low', 'medium', 'high'].includes(record.confidence),
        `${record.id}.confidence should use the allowed values`,
    );
    assert.ok(
        ['draft', 'reviewed', 'needs-review'].includes(record.reviewStatus),
        `${record.id}.reviewStatus should use the allowed values`,
    );
}

function assertShardIncludes(shard, recordId) {
    assert.ok(
        shard.records.some(record => record.id === recordId),
        `${shard.book} ${shard.chapter} shard should include ${recordId}`,
    );
}

const sourcePackEntries = readSourcePackEntries();
const sourcePackVersions = Object.fromEntries(
    sourcePackEntries.map(({ relativePath, pack }) => [relativePath, pack.version]),
);
const combinedSourceVersion = Object.values(sourcePackVersions).join('+');
const allSourceRecords = materializeSourceRecords(sourcePackEntries);
const bundledSourceRecords = allSourceRecords.filter(record => record.delivery !== 'static');
const manifest = readJson('public/study-packs/v1/manifest.json');
const globalPack = readJson('public/study-packs/v1/global.json');
const genesisOne = readJson('public/study-packs/v1/genesis/1.json');
const joshuaTen = readJson('public/study-packs/v1/joshua/10.json');

for (const { relativePath, pack } of sourcePackEntries) {
    assert.equal(pack.schemaVersion, 2, `${relativePath} should use SourcePack v2`);
    assert.equal(typeof pack.version, 'string', `${relativePath} should have a version string`);
    assert.ok(pack.version.trim(), `${relativePath} version should not be blank`);
    assert.ok(Array.isArray(pack.records), `${relativePath} should have records`);
}

assert.equal(
    GENERATED_STUDY_SOURCE_VERSION,
    combinedSourceVersion,
    'generated JS version should match the combined source pack version',
);
assert.equal(
    GENERATED_STUDY_SOURCE_CHUNKS.length,
    bundledSourceRecords.length,
    'generated JS should include only bundled source records',
);
assert.equal(manifest.schemaVersion, 2, 'manifest should use SourcePack v2');
assert.equal(manifest.packVersion, combinedSourceVersion, 'manifest version should match combined source pack');
assert.equal(manifest.recordCount, allSourceRecords.length, 'manifest should count every source record');
assert.equal(manifest.bundledRecordCount, bundledSourceRecords.length, 'manifest should count bundled records');
assert.equal(
    manifest.staticOnlyRecordCount,
    allSourceRecords.length - bundledSourceRecords.length,
    'manifest should count static-only records',
);
assert.deepEqual(manifest.sourcePackVersions, sourcePackVersions, 'manifest should list source pack versions');

for (const record of allSourceRecords) {
    assertRecordMetadata(record);
}

for (const record of GENERATED_STUDY_SOURCE_CHUNKS) {
    assertRecordMetadata(record);
}

const packedRecordIds = new Set(globalPack.records.map(record => record.id));

for (const shardEntry of manifest.shards) {
    const shardPath = path.join('public/study-packs/v1', shardEntry.path);
    assert.ok(existsSync(path.join(projectRoot, shardPath)), `${shardEntry.path} should exist`);

    const shard = readJson(shardPath);
    const shardRecordIds = new Set(shard.records.map(record => record.id));
    assert.equal(shardRecordIds.size, shard.records.length, `${shardEntry.path} should not duplicate records`);
    assert.equal(shard.records.length, shardEntry.recordCount, `${shardEntry.path} should match manifest count`);

    for (const record of shard.records) {
        assertRecordMetadata(record);
        packedRecordIds.add(record.id);
    }
}

for (const record of allSourceRecords) {
    assert.ok(packedRecordIds.has(record.id), `${record.id} should appear in a static pack`);
}

assert.ok(
    !GENERATED_STUDY_SOURCE_CHUNKS.some(record => record.id === 'openbible-cross-genesis-1-3'),
    'imported OpenBible records should stay out of the generated JS bundle',
);

assertShardIncludes(genesisOne, 'passage-genesis-1-3-divine-speech');
assertShardIncludes(genesisOne, 'openbible-cross-genesis-1-3-light-word');
assertShardIncludes(genesisOne, 'openbible-cross-genesis-1-3');
assertShardIncludes(joshuaTen, 'easton-adoni-zedek-king');
assertShardIncludes(joshuaTen, 'passage-joshua-10-coalition');
assertShardIncludes(globalPack, 'method-cross-reference-guardrail');

console.log('study source pack benchmark passed');
