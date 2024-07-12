import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, Card } from '@/components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import FolderPicker from '@/components/ui/folder-picker'
import axios from 'axios'
import { SessionMachineContext } from '@/contexts/session-machine-context'
import { Check, Info } from 'lucide-react'
import CircleSpinner from '@/components/ui/circle-spinner/circle-spinner'
import { useSafeStorage } from '@/lib/services/safeStorageService'
import { useToast } from '@/components/ui/use-toast'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

type IndexStatus = 'running' | 'done' | 'error'

interface IndexItem {
    path: string
    status: IndexStatus
}

const IndexManagementModal = ({ isOpen, setOpen }) => {
    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="w-[500px]">
                <VisuallyHidden.Root>
                    <DialogHeader>
                        <DialogTitle>Index Management</DialogTitle>
                    </DialogHeader>
                </VisuallyHidden.Root>
                <IndexManagement setOpen={setOpen} />
            </DialogContent>
        </Dialog>
    )
}

const IndexManagement = ({ setOpen }: { setOpen: (val: boolean) => void }) => {
    const { toast } = useToast()
    const host = SessionMachineContext.useSelector(state => state.context.host)
    const { getApiKey, setApiKey } = useSafeStorage()
    const [indexes, setIndexes] = useState<IndexItem[]>([])
    const [newIndexPath, setNewIndexPath] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [anthropicKey, setAnthropicKey] = useState('')
    const [openAIKey, setOpenAIKey] = useState('')

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
        const anthropic = await getApiKey('anthropic')
        const openai = await getApiKey('openai')
        setAnthropicKey(anthropic || '')
        setOpenAIKey(openai || '')
    }, [getApiKey])

    useEffect(() => {
        fetchIndexes()
        fetchApiKeys()
    }, [fetchIndexes, fetchApiKeys])

    const handleRemoveIndex = async (path: string) => {
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
                const encodedPath = encodeURIComponent(newIndexPath.replace(/\//g, '%2F'))
                await axios.delete(`${host}/indexes/${encodedPath}`)
                await axios.post(`${host}/indexes/${encodedPath}`)
                setIndexes([...indexes, { path: newIndexPath, status: 'running' }])
                setNewIndexPath('')
                toast({ title: 'Index added successfully' })
            } catch (error) {
                console.error('Failed to add index:', error)
                setError('Failed to add index. Please try again.')
            }
        }
    }

    const handleApiKeyChange = async (key: string, value: string) => {
        if (key === 'anthropic') {
            setAnthropicKey(value)
        } else {
            setOpenAIKey(value)
        }
        await setApiKey(key, value)
        toast({ title: `${key.charAt(0).toUpperCase() + key.slice(1)} API key updated` })
    }

    return (
        <div className="pt-4 pb-2 px-2 flex flex-col gap-5">
            <Card className="bg-midnight">
                <CardContent className="mt-5 w-full">
                    <h2 className="text-lg font-semibold mb-4">API Keys</h2>
                    <div className="flex items-center mb-2 gap-4">
                        <Input
                            type="password"
                            value={anthropicKey}
                            onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                            placeholder="Anthropic API Key"
                        />
                        {anthropicKey && <Check className="text-green-500" />}
                    </div>
                    <div className="flex items-center mb-2 gap-4">
                        <Input
                            type="password"
                            value={openAIKey}
                            onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                            placeholder="OpenAI API Key"
                        />
                        {openAIKey && <Check className="text-green-500" />}
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-midnight">
                <CardContent className="mt-5 w-full">
                    <h2 className="text-lg font-semibold mb-4">Directory indexes</h2>
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
                        <div className={'mt-6'}>
                            {indexes.map(index => (
                                <div key={index.path} className="flex items-center justify-between mb-2">
                                    <span>{index.path}</span>
                                    {index.status === 'running' && <CircleSpinner />}
                                    {index.status === 'done' && <Check className="text-green-500" />}
                                    {index.status === 'error' && <span className="text-red-500">Error</span>}
                                    <Button onClick={() => handleRemoveIndex(index.path)} variant="destructive" size="sm">
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
