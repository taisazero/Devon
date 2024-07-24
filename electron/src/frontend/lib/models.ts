import { useState, useEffect } from 'react'
import { ComboboxItem } from '@/components/ui/combobox'
import { Model } from './types'

const defaultModels: Model[] = [
    {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        company: 'Anthropic',
        apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
        id: 'gpt4-o',
        name: 'GPT-4o',
        company: 'OpenAI',
        apiKeyUrl: 'https://platform.openai.com/api-keys',
    },
    // {
    //     id: 'llama-3-70b',
    //     name: 'Groq Llama 3 70B',
    //     company: 'Groq',
    // },
    // {
    //     id: 'ollama/deepseek-coder:6.7b',
    //     name: 'Ollama Deepseek 6.7b',
    //     company: 'Ollama',
    // },
]

const customOption = {
    id: 'custom',
    name: 'Custom (LiteLLM)',
    company: 'LiteLLM',
}

async function getSavedModels(): Promise<Model[]> {
    const res = await window.api.invoke('get-user-setting', 'models')
    if (res.success) {
        return res.data.map((model: string) => JSON.parse(model))
    }
    return []
}

export async function addModel(model: Model): Promise<void> {
    const data = {
        setting: 'models',
        value: JSON.stringify({
            ...model,
            isCustom: true,
        }),
    }
    await window.api.invoke('set-user-setting', data)
}

export async function getAllModels(): Promise<Model[]> {
    const savedModels = await getSavedModels()

    // Combine default models with saved models, giving priority to saved models
    const allModels = [...defaultModels]

    savedModels.forEach(savedModel => {
        const index = allModels.findIndex(model => model.id === savedModel.id)
        if (index !== -1) {
            // Replace the default model with the saved one
            allModels[index] = savedModel
        } else {
            // Add the new saved model
            allModels.push(savedModel)
        }
    })

    return allModels
}

type ExtendedComboboxItem = ComboboxItem & Model

export const useModels = () => {
    const [comboboxItems, setComboboxItems] = useState<ExtendedComboboxItem[]>(
        []
    )
    const [selectedModel, setSelectedModel] =
        useState<ExtendedComboboxItem | null>(null)
    const [models, setModels] = useState<Model[]>([])

    useEffect(() => {
        const fetchModels = async () => {
            const allModels = await getAllModels()
            setModels(allModels)
            allModels.push(customOption)
            const items: ExtendedComboboxItem[] = allModels
                .filter(model => !model.comingSoon)
                .map(model => ({
                    ...model,
                    value: model.id,
                    label: model.name,
                }))

            setComboboxItems(items)
            setSelectedModel(items[0]) // Set the first item as default
        }
        fetchModels()
    }, [])

    return {
        models,
        comboboxItems,
        selectedModel,
        setSelectedModel,
    }
}
