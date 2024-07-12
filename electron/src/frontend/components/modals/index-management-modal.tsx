import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
} from '@/components/ui/dialog'
import FolderPicker from '@/components/ui/folder-picker'
import axios from 'axios'
import { SessionMachineContext } from '@/contexts/session-machine-context'
import { Check, X } from 'lucide-react'
import CircleSpinner from '@/components/ui/circle-spinner/circle-spinner'
import { useSafeStorage } from '@/lib/services/safeStorageService'
import { useToast } from '@/components/ui/use-toast'

const API_KEYS = {
    ANTHROPIC: 'claude-3-5-sonnet',
    OPENAI: 'gpt4-o',
}

const IndexManagementModal = ({ isOpen, setOpen }) => (
    <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="w-[500px]">
            <DialogHeader className="mx-auto">
                <DialogTitle>
                    <h1 className="text-2xl font-bold">Project Indexes</h1>
                </DialogTitle>
            </DialogHeader>
            <IndexManagement setOpen={setOpen} />
        </DialogContent>
    </Dialog>
)

const IndexManagement = ({ setOpen }) => {
    const { toast } = useToast()
    const host = SessionMachineContext.useSelector(state => state.context.host)
    const { getApiKey, setApiKey } = useSafeStorage()
    const [indexes, setIndexes] = useState([])
    const [newIndexPath, setNewIndexPath] = useState('')
    const [error, setError] = useState(null)
    const [apiKeys, setApiKeys] = useState({
        [API_KEYS.ANTHROPIC]: '',
        [API_KEYS.OPENAI]: '',
    })

    const fetchIndexes = useCallback(async () => {
        try {
            const response = await axios.get(`${host}/indexes`)
            setIndexes(response.data)
        } catch (error) {
            console.error('Failed to fetch indexes:', error)
            setError('Failed to fetch indexes. Please try again.')
        }
    }, [host])

    const fetchApiKeys = useCallback(async () => {
        const anthropic = await getApiKey(API_KEYS.ANTHROPIC)
        const openai = await getApiKey(API_KEYS.OPENAI)
        setApiKeys({
            [API_KEYS.ANTHROPIC]: anthropic || '',
            [API_KEYS.OPENAI]: openai || '',
        })
    }, [getApiKey])

    useEffect(() => {
        fetchIndexes()
        fetchApiKeys()
    }, [fetchIndexes, fetchApiKeys])

    const handleRemoveIndex = async path => {
        try {
            const encodedPath = encodeURIComponent(path.replace(/\//g, '%2F'))
            await axios.delete(`${host}/indexes/${encodedPath}`)
            setIndexes(indexes.filter(index => index.path !== path))
            toast({ title: 'Index removed successfully' })
        } catch (error) {
            console.error('Failed to remove index:', error)
            setError('Failed to remove index. Please try again.')
        }
    }

    const handleAddIndex = async () => {
        if (newIndexPath) {
            try {
                setError(null)
                const encodedPath = encodeURIComponent(
                    newIndexPath.replace(/\//g, '%2F')
                )
                await axios.delete(`${host}/indexes/${encodedPath}`)
                await axios.post(`${host}/indexes/${encodedPath}`)
                setIndexes([
                    ...indexes,
                    { path: newIndexPath, status: 'running' },
                ])
                setNewIndexPath('')
                toast({ title: 'Index added successfully' })
            } catch (error) {
                console.error('Failed to add index:', error)
                setError('Failed to add index. Please try again.')
            }
        }
    }

    const handleApiKeyChange = async (key, value) => {
        setApiKeys(prev => ({ ...prev, [key]: value }))
        await setApiKey(key, value)
        toast({
            title: `${
                key === API_KEYS.ANTHROPIC ? 'Anthropic' : 'OpenAI'
            } API key updated`,
        })
    }

    const renderApiKeyInput = (keyName, displayName) => (
        <div className="mb-4">
            <p className="text-xl font-bold mb-2">{displayName}</p>
            {apiKeys[keyName] ? (
                <div className="flex items-center gap-2">
                    <Check className="text-green-500" />
                    <span>API Key set</span>
                    <Button
                        onClick={() => handleApiKeyChange(keyName, '')}
                        size="sm"
                        variant="outline"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Input
                        type="password"
                        value={apiKeys[keyName]}
                        onChange={e =>
                            handleApiKeyChange(keyName, e.target.value)
                        }
                        placeholder={`Enter ${displayName}`}
                    />
                    <Button
                        onClick={() =>
                            handleApiKeyChange(keyName, apiKeys[keyName])
                        }
                        size="sm"
                    >
                        Save
                    </Button>
                </div>
            )}
        </div>
    )

    return (
        <div className="pb-2 flex flex-col gap-5">
            <Card className="bg-midnight">
                <CardContent className="mt-5 w-full">
                    <h2 className="text-lg font-semibold mb-4">
                        Required API Keys
                    </h2>
                    {renderApiKeyInput(API_KEYS.ANTHROPIC, 'Anthropic API Key')}
                    {renderApiKeyInput(API_KEYS.OPENAI, 'OpenAI API Key')}
                </CardContent>
            </Card>
            <Card className="bg-midnight">
                <CardContent className="mt-5 w-full">
                    <h2 className="text-lg font-semibold mb-4">
                        Directory indexes
                    </h2>
                    <div className="flex items-center mb-2 gap-4">
                        <FolderPicker
                            folderPath={newIndexPath}
                            setFolderPath={setNewIndexPath}
                            showTitle={false}
                            buttonClassName="px-5"
                        />
                        {newIndexPath && (
                            <Button onClick={handleAddIndex}>
                                Create an Index
                            </Button>
                        )}
                    </div>
                    {error && (
                        <div className="text-red-500 mb-2 mt-6">{error}</div>
                    )}
                    {indexes.length > 0 && (
                        <div className="mt-6">
                            {indexes.map(index => (
                                <div
                                    key={index.path}
                                    className="flex items-center justify-between mb-2"
                                >
                                    <span>{index.path}</span>
                                    {index.status === 'running' && (
                                        <CircleSpinner />
                                    )}
                                    {index.status === 'done' && (
                                        <Check className="text-green-500" />
                                    )}
                                    {index.status === 'error' && (
                                        <span className="text-red-500">
                                            Error
                                        </span>
                                    )}
                                    <Button
                                        onClick={() =>
                                            handleRemoveIndex(index.path)
                                        }
                                        variant="destructive"
                                        size="sm"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default IndexManagementModal
