import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GENERATED_STUDY_SOURCE_CHUNKS,
    GENERATED_STUDY_SOURCE_VERSION,
} from '../src/data/generatedStudySourceChunks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
    return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'));
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

const sourcePack = readJson('sources/study/curated-records.json');
const manifest = readJson('public/study-packs/v1/manifest.json');
const globalPack = readJson('public/study-packs/v1/global.json');
const genesisOne = readJson('public/study-packs/v1/genesis/1.json');
const joshuaTen = readJson('public/study-packs/v1/joshua/10.json');

assert.equal(sourcePack.schemaVersion, 2, 'raw source pack should use SourcePack v2');
assert.equal(
    GENERATED_STUDY_SOURCE_VERSION,
    sourcePack.version,
    'generated JS version should match raw source pack version',
);
assert.equal(
    GENERATED_STUDY_SOURCE_CHUNKS.length,
    sourcePack.records.length,
    'generated JS should include every raw curated record',
);
assert.equal(manifest.schemaVersion, 2, 'manifest should use SourcePack v2');
assert.equal(manifest.packVersion, sourcePack.version, 'manifest version should match source pack');
assert.equal(manifest.recordCount, sourcePack.records.length, 'manifest should count raw records');

for (const record of sourcePack.records) {
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

for (const record of GENERATED_STUDY_SOURCE_CHUNKS) {
    assert.ok(packedRecordIds.has(record.id), `${record.id} should appear in a static pack`);
}

assertShardIncludes(genesisOne, 'passage-genesis-1-3-divine-speech');
assertShardIncludes(genesisOne, 'openbible-cross-genesis-1-3-light-word');
assertShardIncludes(joshuaTen, 'easton-adoni-zedek-king');
assertShardIncludes(joshuaTen, 'passage-joshua-10-coalition');
assertShardIncludes(globalPack, 'method-cross-reference-guardrail');

console.log('study source pack benchmark passed');
