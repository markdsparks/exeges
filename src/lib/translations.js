export const DEFAULT_TRANSLATION_ID = 'kjv';

export const TRANSLATIONS = [
    {
        id: 'kjv',
        name: 'KJV',
        label: 'King James Version',
        source: 'local',
        searchLabel: 'KJV text stored on this device',
    },
    {
        id: 'esv',
        name: 'ESV',
        label: 'English Standard Version',
        source: 'remote',
        searchLabel: 'ESV text from the configured proxy',
    },
];

export function getTranslationById(id) {
    return TRANSLATIONS.find(translation => translation.id === id) ?? TRANSLATIONS[0];
}

export function getEsvProxyUrl() {
    return import.meta.env.VITE_ESV_PROXY_URL?.trim() ?? '';
}
