export const LOCAL_STUDY_SLM_MODELS = [
    {
        id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        label: 'Qwen2.5 0.5B',
        profile: 'qwen2',
        description: 'Experimental',
    },
    {
        id: 'Qwen3-0.6B-q4f16_1-MLC',
        label: 'Qwen3 0.6B',
        profile: 'qwen3',
        description: 'Reasoning test',
    },
    {
        id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
        label: 'SmolLM2 360M',
        profile: 'smollm',
        description: 'Legacy',
    },
];

export const LOCAL_STUDY_SLM_MODEL_ID = LOCAL_STUDY_SLM_MODELS[0].id;

export function getLocalStudyModelOption(modelId = LOCAL_STUDY_SLM_MODEL_ID) {
    return LOCAL_STUDY_SLM_MODELS.find(model => model.id === modelId) ?? LOCAL_STUDY_SLM_MODELS[0];
}
