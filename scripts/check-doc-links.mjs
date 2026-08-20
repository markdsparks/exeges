import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectoryNames = new Set([
    '.git',
    'build',
    'dist',
    'node_modules',
    'public',
]);

async function findMarkdownFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;

        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findMarkdownFiles(entryPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(entryPath);
        }
    }

    return files;
}

function getLocalLinkTargets(markdown) {
    const withoutCodeFences = markdown.replace(/```[\s\S]*?```/g, '');
    const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
    const targets = [];

    for (const match of withoutCodeFences.matchAll(linkPattern)) {
        let target = match[1].trim();
        if (target.startsWith('<') && target.endsWith('>')) {
            target = target.slice(1, -1);
        }

        if (!target || target.startsWith('#')) continue;
        if (/^(?:https?:|mailto:|app:|data:)/i.test(target)) continue;

        const pathOnly = target.split('#', 1)[0].split('?', 1)[0];
        if (pathOnly) targets.push(decodeURIComponent(pathOnly));
    }

    return targets;
}

const markdownFiles = (await findMarkdownFiles(projectRoot)).sort();
const failures = [];
let localLinkCount = 0;

for (const markdownFile of markdownFiles) {
    const markdown = await readFile(markdownFile, 'utf8');
    for (const target of getLocalLinkTargets(markdown)) {
        localLinkCount += 1;
        const resolved = target.startsWith('/')
            ? path.join(projectRoot, target.slice(1))
            : path.resolve(path.dirname(markdownFile), target);

        if (!resolved.startsWith(`${projectRoot}${path.sep}`) && resolved !== projectRoot) {
            failures.push(`${path.relative(projectRoot, markdownFile)} -> ${target} (outside repository)`);
            continue;
        }

        try {
            await access(resolved);
        } catch {
            failures.push(`${path.relative(projectRoot, markdownFile)} -> ${target}`);
        }
    }
}

if (failures.length) {
    console.error('Broken local Markdown links:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Documentation links passed (${markdownFiles.length} files, ${localLinkCount} local links).`);
}
