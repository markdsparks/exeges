import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TRANSLATION_ID, getEsvProxyUrl, getTranslationById } from '../lib/translations';

const STORAGE_KEY = 'exeges-translation';

function normalizeProxyUrl(url) {
    return url.replace(/\/$/, '');
}

function createLocalChapter(book, chapterNum) {
    const chapter = book?.chapters?.find(c => c.chapter === chapterNum);
    if (!book || !chapter) return null;

    return {
        ...book,
        chapters: [chapter],
        translationId: 'kjv',
        translationName: 'KJV',
        source: 'local',
    };
}

async function fetchEsvChapter({ book, chapterNum, signal }) {
    const proxyUrl = getEsvProxyUrl();
    if (!proxyUrl) {
        return {
            status: 'setup-needed',
            chapter: null,
            message: 'ESV needs a private proxy before it can load in this public app.',
        };
    }

    const reference = `${book.name} ${chapterNum}`;
    const response = await fetch(
        `${normalizeProxyUrl(proxyUrl)}?reference=${encodeURIComponent(reference)}`,
        { signal }
    );

    if (!response.ok) {
        throw new Error(`ESV request failed with ${response.status}`);
    }

    const payload = await response.json();
    const verses = Array.isArray(payload.verses) ? payload.verses : [];

    if (!verses.length) {
        throw new Error('ESV response did not include verses.');
    }

    return {
        status: 'ready',
        chapter: {
            ...book,
            chapters: [{
                chapter: chapterNum,
                verses: verses.map(verse => ({
                    verse: verse.verse,
                    text: verse.text,
                })),
            }],
            translationId: 'esv',
            translationName: 'ESV',
            copyright: payload.copyright ?? '',
            source: 'remote',
        },
        message: '',
    };
}

export function useTranslation(book, chapterNum) {
    const [selectedTranslationId, setSelectedTranslationId] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || DEFAULT_TRANSLATION_ID;
        } catch {
            return DEFAULT_TRANSLATION_ID;
        }
    });
    const [remoteChapter, setRemoteChapter] = useState(null);
    const [remoteState, setRemoteState] = useState({ status: 'idle', message: '' });

    const selectedTranslation = getTranslationById(selectedTranslationId);
    const localChapter = useMemo(() => createLocalChapter(book, chapterNum), [book, chapterNum]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, selectedTranslation.id);
        } catch {}
    }, [selectedTranslation.id]);

    useEffect(() => {
        if (!book || selectedTranslation.source !== 'remote') {
            setRemoteChapter(null);
            setRemoteState({ status: 'idle', message: '' });
            return undefined;
        }

        const controller = new AbortController();
        setRemoteChapter(null);
        setRemoteState({ status: 'loading', message: '' });

        fetchEsvChapter({ book, chapterNum, signal: controller.signal })
            .then(result => {
                if (controller.signal.aborted) return;
                setRemoteChapter(result.chapter);
                setRemoteState({ status: result.status, message: result.message });
            })
            .catch(error => {
                if (controller.signal.aborted) return;
                setRemoteChapter(null);
                setRemoteState({
                    status: 'error',
                    message: error.message || 'ESV could not be loaded right now.',
                });
            });

        return () => controller.abort();
    }, [book, chapterNum, selectedTranslation.source]);

    const selectTranslation = useCallback((translationId) => {
        setSelectedTranslationId(getTranslationById(translationId).id);
    }, []);

    const displayBook = selectedTranslation.source === 'remote'
        ? remoteChapter
        : localChapter;

    return {
        selectedTranslation,
        selectedTranslationId: selectedTranslation.id,
        selectTranslation,
        displayBook,
        localBook: localChapter,
        translationState: selectedTranslation.source === 'remote'
            ? remoteState
            : { status: 'ready', message: '' },
    };
}
