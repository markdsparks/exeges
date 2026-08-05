import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TRANSLATION_ID, getTranslationById } from '../lib/translations';
import { createLocalChapter, loadTranslationChapter } from '../lib/chapterTranslation';

const STORAGE_KEY = 'exeges-translation';

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

        loadTranslationChapter({ translation: selectedTranslation, book, chapterNum, signal: controller.signal })
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
    }, [book, chapterNum, selectedTranslation]);

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
