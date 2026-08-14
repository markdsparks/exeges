import { useEffect, useMemo, useRef, useState } from 'react';
import {
    createUserBackup,
    getUserBackupCounts,
    MAX_USER_BACKUP_BYTES,
    mergeUserBackup,
    parseUserBackup,
} from '../../lib/userBackup';
import '../../styles/backup.css';

function formatBackupDate(value) {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch {
        return 'an unknown date';
    }
}

function plural(count, word) {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function getMergeLines(summary) {
    const lines = [];

    if (summary.bookmarksAdded) lines.push(`Add ${plural(summary.bookmarksAdded, 'bookmark')}`);
    if (summary.notesAdded) lines.push(`Add ${plural(summary.notesAdded, 'note')}`);
    if (summary.studiesAdded) lines.push(`Add ${plural(summary.studiesAdded, 'study thread')}`);
    if (summary.studiesMerged) lines.push(`Combine ${plural(summary.studiesMerged, 'study thread')}`);
    if (summary.observationsAdded) lines.push(`Add ${plural(summary.observationsAdded, 'observation')}`);
    if (summary.observationsMerged) lines.push(`Combine ${plural(summary.observationsMerged, 'observation')}`);
    if (summary.studyTextMerged) lines.push('Combine saved study writing');
    if (summary.notesKept) lines.push(`Keep ${plural(summary.notesKept, 'local note')}`);
    if (summary.restoresPosition) lines.push('Restore your reading place');
    if (summary.restoresPreferences) lines.push('Restore saved preferences');

    return lines.length ? lines : ['Nothing new to add from this backup'];
}

function downloadBackup(fileName, serialized) {
    const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function BackupPanel({ open, data, onRestore, onClose }) {
    const fileInputRef = useRef(null);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const counts = useMemo(() => getUserBackupCounts(data), [data]);
    const merge = useMemo(
        () => selectedBackup ? mergeUserBackup(data, selectedBackup) : null,
        [data, selectedBackup],
    );

    useEffect(() => {
        if (!open) return;
        setSelectedBackup(null);
        setError('');
        setStatus('');
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    const handleExport = async () => {
        const backup = createUserBackup(data);
        const serialized = `${JSON.stringify(backup, null, 2)}\n`;
        const fileName = `exeges-backup-${backup.createdAt.slice(0, 10)}.json`;
        const file = new File([serialized], fileName, { type: 'application/json' });

        setError('');
        setStatus('');

        try {
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Exeges backup',
                });
                setStatus('Backup ready to save or share.');
                return;
            }
        } catch (shareError) {
            if (shareError?.name === 'AbortError') return;
        }

        downloadBackup(fileName, serialized);
        setStatus('Backup downloaded.');
    };

    const handleChooseFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setSelectedBackup(null);
        setStatus('');

        if (!file) return;
        if (file.size > MAX_USER_BACKUP_BYTES) {
            setError('That backup is too large to restore here.');
            return;
        }

        try {
            const result = parseUserBackup(await file.text());
            if (!result.backup) {
                setError(result.error);
                return;
            }

            setError('');
            setSelectedBackup(result.backup);
        } catch {
            setError('Exeges could not read that backup file.');
        }
    };

    const handleRestore = () => {
        if (!merge) return;

        setError('');
        const result = onRestore?.(merge.data);
        if (!result?.ok) {
            setError(result?.message || 'Exeges could not save this restored data on this device.');
            return;
        }

        setStatus('Backup restored. Your existing notes were kept in place.');
        setSelectedBackup(null);
    };

    return (
        <div className="backup-overlay" onClick={onClose}>
            <section
                className="backup-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="backup-panel-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="backup-header">
                    <div>
                        <p className="backup-kicker">Your data</p>
                        <h2 id="backup-panel-title">Backup &amp; restore</h2>
                    </div>
                    <button className="backup-close" onClick={onClose} aria-label="Close backup and restore">
                        &times;
                    </button>
                </header>

                <div className="backup-content">
                    <p className="backup-counts">
                        {plural(counts.notes, 'note')} · {plural(counts.bookmarks, 'bookmark')} · {plural(counts.studies, 'study thread')}
                    </p>

                    <section className="backup-action-section" aria-labelledby="backup-export-title">
                        <div>
                            <h3 id="backup-export-title">Keep a copy</h3>
                            <p>A private file with your writing, bookmarks, study threads, reading place, and preferences. ESV wording is never included.</p>
                        </div>
                        <button className="backup-primary-action" onClick={handleExport}>Export backup</button>
                    </section>

                    <section className="backup-action-section" aria-labelledby="backup-restore-title">
                        <div>
                            <h3 id="backup-restore-title">Bring back a copy</h3>
                            <p>Existing notes stay in place. New material is added carefully.</p>
                        </div>
                        <button className="backup-secondary-action" onClick={() => fileInputRef.current?.click()}>
                            Choose backup
                        </button>
                        <input
                            ref={fileInputRef}
                            className="backup-file-input"
                            type="file"
                            accept="application/json,.json"
                            onChange={handleChooseFile}
                        />
                    </section>

                    {selectedBackup && merge && (
                        <section className="backup-restore-preview" aria-live="polite">
                            <p className="backup-preview-kicker">Ready to restore</p>
                            <p className="backup-preview-date">Saved {formatBackupDate(selectedBackup.createdAt)}</p>
                            <ul>
                                {getMergeLines(merge.summary).map(line => <li key={line}>{line}</li>)}
                            </ul>
                            <button className="backup-primary-action" onClick={handleRestore}>Restore safely</button>
                        </section>
                    )}

                    {(error || status) && (
                        <p className={`backup-message ${error ? 'is-error' : 'is-success'}`} role="status">
                            {error || status}
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
