import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardHeader, CardContent, Card } from '@/components/ui/card'
import { Checkbox, CheckedState } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useSafeStorage } from '@/lib/services/safeStorageService'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { CircleHelp, Settings, Info } from 'lucide-react'
import SafeStoragePopoverContent from '@/components/modals/safe-storage-popover-content'
import { Skeleton } from '@/components/ui/skeleton'
import { Model } from '@/lib/types'
import { models } from '@/lib/config'
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogDescription,
} from '@/components/ui/dialog'
import Combobox, { ComboboxItem } from '@/components/ui/combobox'
import { SessionMachineContext } from '@/contexts/session-machine-context'
import FolderPicker from '@/components/ui/folder-picker'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { getGitSettings } from '@/lib/app-settings'

type ExtendedComboboxItem = Model & ComboboxItem & { company: string }

const comboboxItems: ExtendedComboboxItem[] = models
    .filter(model => !model.comingSoon)
    .map(model => ({
        ...model,
        value: model.id,
        label: model.name,
        company: model.company,
    }))

const SettingsModal = ({ trigger }: { trigger: JSX.Element }) => {
    const [open, setOpen] = useState(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="w-[500px]">
                <VisuallyHidden.Root>
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <DialogDescription></DialogDescription>
                </VisuallyHidden.Root>
                <General setOpen={setOpen} />
            </DialogContent>
        </Dialog>
    )
}

const General = ({ setOpen }: { setOpen: (val: boolean) => void }) => {
    const { toast } = useToast()
    const [selectedModel, setSelectedModel] = useState(comboboxItems[0])
    // Checking model
    const {
        checkHasEncryptedData,
        getUseModelName,
        deleteData,
        setUseModelName,
        getApiKey,
    } = useSafeStorage()
    const sessionActorref = SessionMachineContext.useActorRef()
    let state = SessionMachineContext.useSelector(state => state)

    const [originalModelName, setOriginalModelName] = useState(
        comboboxItems[0].id
    )
    const [modelHasSavedApiKey, setModelHasSavedApiKey] = useState(false)
    const [folderPath, setFolderPath] = useState('')
    const [initialFolderPath, setInitialFolderPath] = useState<{
        loading: boolean
        value: string | null
    }>({
        loading: true,
        value: null,
    })
    const [hasClickedQuestion, setHasClickedQuestion] = useState(false)

    const clearStorageAndResetSession = () => {
        deleteData()
        toast({ title: 'Storage cleared!' })
        sessionActorref.send({ type: 'session.delete' })
    }

    useEffect(() => {
        if (!state?.context?.sessionState?.path) {
            return
        }
        setFolderPath(state.context.sessionState.path)
        if (!initialFolderPath.value) {
            setInitialFolderPath({
                loading: false,
                value: state.context.sessionState.path,
            })
        }
    }, [state?.context?.sessionState?.path])

    useEffect(() => {
        const check = async () => {
            const hasEncryptedData = await checkHasEncryptedData()
            if (hasEncryptedData) {
                const modelName: string = await getUseModelName()
                if (modelName) {
                    const foundModel = models.find(
                        model => model.id === modelName
                    )
                    if (foundModel) {
                        const extendedComboboxModel = {
                            ...foundModel,
                            value: foundModel.id,
                            label: foundModel.name,
                            company: foundModel.company,
                        }
                        setSelectedModel(extendedComboboxModel)
                        setOriginalModelName(modelName)
                    }
                }
            }
        }
        check()
    }, [])

    const fetchApiKey = useCallback(async () => {
        const res = await getApiKey(selectedModel.id)
        return res
    }, [selectedModel.id])

    function handleUseNewModel() {
        async function updateMachine() {
            const { versioning_type } = await getGitSettings()
            sessionActorref.send({
                type: 'session.create',
                payload: {
                    path: folderPath,
                    agentConfig: {
                        model: selectedModel.id,
                        api_key: _key,
                        versioning_type,
                    },
                },
            })
            sessionActorref.on('session.creationComplete', () => {
                sessionActorref.send({
                    type: 'session.init',
                    payload: {
                        // path: folderPath,
                        agentConfig: {
                            model: selectedModel.id,
                            api_key: _key,
                            versioning_type,
                        },
                    },
                })
            })
        }
        sessionActorref.send({ type: 'session.delete' })
        setUseModelName(selectedModel.id)
        const _key = fetchApiKey()
        updateMachine()
        setOpen(false)
    }

    function handleChangePath() {
        sessionActorref.send({ type: 'session.delete' })
        setOpen(false)
    }

    // use this when we implement the change directory button
    function handleNewChat() {
        async function updateMachine() {
            const { versioning_type } = await getGitSettings()
            sessionActorref.send({
                type: 'session.create',
                payload: {
                    path: folderPath,
                    agentConfig: {
                        model: selectedModel.id,
                        api_key: _key,
                        versioning_type,
                    },
                },
            })
            sessionActorref.on('session.creationComplete', () => {
                sessionActorref.send({
                    type: 'session.init',
                    payload: {
                        // path: folderPath,
                        agentConfig: {
                            model: selectedModel.id,
                            api_key: _key,
                            versioning_type,
                        },
                    },
                })
            })
        }
        sessionActorref.send({ type: 'session.delete' })
        setUseModelName(selectedModel.id)
        const _key = fetchApiKey()
        setOpen(false)
    }

    return (
        <div className="pt-4 pb-2 px-2 flex flex-col gap-5">
            <GeneralSettingsCard
                folderPath={folderPath}
                setFolderPath={setFolderPath}
                handleChangePath={handleChangePath}
            />
            <Card className="bg-midnight">
                <CardContent>
                    <div className="flex flex-col mt-5 w-full mb-4">
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold">
                                {selectedModel.id !== originalModelName
                                    ? `Set new model: `
                                    : `Current model:`}
                            </p>
                            <div className="flex flex-col">
                                <Combobox
                                    items={comboboxItems}
                                    itemType="model"
                                    selectedItem={selectedModel}
                                    setSelectedItem={setSelectedModel}
                                />
                            </div>
                        </div>
                        {selectedModel.value !== 'claude-3-5-sonnet' && (
                            <span className="text-sm text-green-500 mt-2 flex gap-1 items-center">
                                <Info className="w-4 h-4" />
                                Note: For best results use Claude 3.5 Sonnet
                                (it's better at coding!)
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between w-full">
                        <div className="flex gap-1 items-center mb-4 w-full">
                            <p className="text-xl font-bold">
                                {`${selectedModel.company} API Key`}
                            </p>
                            <Popover>
                                <PopoverTrigger
                                    className="ml-[2px]"
                                    onClick={() => setHasClickedQuestion(true)}
                                >
                                    <CircleHelp size={14} />
                                </PopoverTrigger>
                                <SafeStoragePopoverContent />
                            </Popover>
                            {hasClickedQuestion && (
                                <a
                                    className="text-primary hover:underline self-end ml-auto cursor-pointer"
                                    href={selectedModel?.apiKeyUrl}
                                    target="_blank"
                                >
                                    Looking for an API key?
                                </a>
                            )}
                        </div>
                        {selectedModel.id !== originalModelName &&
                            modelHasSavedApiKey && (
                                <Button onClick={handleUseNewModel}>
                                    {'Use this model'}
                                </Button>
                            )}
                    </div>
                    <APIKeyComponent
                        key={selectedModel.id}
                        model={selectedModel}
                        sessionActorref={sessionActorref}
                        setModelHasSavedApiKey={setModelHasSavedApiKey}
                    />
                    {/* <Input
                        className="w-full"
                        type="password"
                        value={123}
                        // onChange={handleApiKeyInputChange}
                        // disabled={!isChecked || isKeySaved}
                    /> */}
                </CardContent>
            </Card>
            {/* <Card className="bg-midnight">
                <CardHeader>
                    <div className="flex items-center -mb-2">
                        <CardTitle>API Keys</CardTitle>
                        <Popover>
                            <PopoverTrigger className="ml-2 mb-2">
                                <CircleHelp size={20} />
                            </PopoverTrigger>
                            <SafeStoragePopoverContent />
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        {models.map((model: Model) => (
                            <APIKeyComponent key={model.id} model={model} />
                        ))}
                    </div>
                </CardContent>
            </Card> */}
            <VersionControlSettingsCard />
            <MiscellaneousCard
                clearStorageAndResetSession={clearStorageAndResetSession}
            />
        </div>
    )
}

const APIKeyComponent = ({
    model,
    sessionActorref,
    setModelHasSavedApiKey,
}: {
    model: Model
    sessionActorref: any
    setModelHasSavedApiKey: (value: boolean) => void
}) => {
    const { addApiKey, getApiKey, removeApiKey, setUseModelName } =
        useSafeStorage()
    const [key, setKey] = useState('')
    const [isKeyStored, setIsKeyStored] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const fetchApiKey = useCallback(async () => {
        if (model.comingSoon) {
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        const res = await getApiKey(model.id)
        if (res) {
            setKey(res)
            setIsKeyStored(true)
            setModelHasSavedApiKey(true)
        } else {
            setIsKeyStored(false)
            setModelHasSavedApiKey(false)
        }
        setIsLoading(false)
    }, [model.id])

    useEffect(() => {
        fetchApiKey()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        await addApiKey(model.id, key)
        // Update the model as well
        await setUseModelName(model.id)
        setIsKeyStored(true)
        setIsSaving(false)
        // Right now even if the current session isn't using the model, it will still reset the session once key deleted
        sessionActorref.send({ type: 'session.delete' })
    }

    const handleDelete = async () => {
        setIsSaving(true)
        await removeApiKey(model.id)
        setIsKeyStored(false)
        setKey('')
        setIsSaving(false)
        // Right now even if the current session isn't using the model, it will still reset the session once key deleted
        sessionActorref.send({ type: 'session.delete' })
    }

    return (
        <div>
            <div className="flex items-center mb-2">
                <p className="text-lg">{model.name}</p>
                {model.comingSoon && (
                    <p className="text-md px-2 text-neutral-500">
                        (Coming soon!)
                    </p>
                )}
            </div>
            {isLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : isKeyStored ? (
                <div className="flex gap-4">
                    <Input
                        type="password"
                        value="**********************"
                        disabled
                    />
                    <Button
                        disabled={model.comingSoon || isSaving}
                        onClick={handleDelete}
                        variant="outline-thin"
                    >
                        {isSaving ? 'Deleting...' : 'Delete API Key'}
                    </Button>
                </div>
            ) : (
                <div className="flex gap-4">
                    <Input
                        id={model.id}
                        disabled={model.comingSoon || isSaving}
                        placeholder={`${model.company} API Key`}
                        type="password"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                    />
                    {key.length > 0 && (
                        <Button
                            disabled={model.comingSoon || isSaving}
                            onClick={handleSave}
                        >
                            {/* {isSaving ? 'Saving...' : 'Save'} */}
                            {isSaving ? 'Saving...' : 'Save and use'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

export default SettingsModal

const GeneralSettingsCard = ({
    folderPath,
    setFolderPath,
    handleChangePath,
}: {
    folderPath: string
    setFolderPath: (path: string) => void
    handleChangePath: () => void
}) => {
    return (
        <Card className="bg-midnight">
            <CardContent className="mt-5 w-full">
                <p className="text-lg font-semibold mb-4">
                    {`Project directory:`}
                </p>
                <FolderPicker
                    folderPath={folderPath}
                    setFolderPath={setFolderPath}
                    showTitle={false}
                    customButton={
                        <Button onClick={handleChangePath}>Change</Button>
                    }
                />
                {/* Commenting out for now, just does a refresh instead rn */}
                {/* {!initialFolderPath.loading && initialFolderPath.value !== folderPath && <Button className="mt-5 w-full" onClick={handleNewChat}>Start new chat</Button>} */}
            </CardContent>
        </Card>
    )
}

const VersionControlSettingsCard = () => {
    const [useGit, setUseGit] = useState<CheckedState>(true)
    const [createNewBranch, setCreateNewBranch] = useState<CheckedState>(true)
    const [showChangesApplyInfoText, setShowChangesApplyInfoText] =
        useState(false)
    const { toast } = useToast()

    useEffect(() => {
        const loadUserSettings = async () => {
            const res = await window.api.invoke(
                'get-user-setting',
                'git.enabled'
            )
            if (res.success) {
                setUseGit(res.data)
            }
            const res2 = await window.api.invoke(
                'get-user-setting',
                'git.create-new-branch'
            )
            if (res2.success) {
                setCreateNewBranch(res2.data)
            }
        }
        loadUserSettings()
    }, [])

    const handleMerge = () => {
        // TODO: Implement merge logic
        console.log('Attempting to merge...')
        // If merge fails, show an error message
        toast({
            title: 'Merge failed',
            description:
                'There are merge conflicts. Please resolve them in your editor and try again.',
            variant: 'destructive',
        })
    }

    async function handleUseGitChange(checked: boolean) {
        setShowChangesApplyInfoText(true)
        setUseGit(checked)
        const data = {
            setting: 'git',
            key: 'enabled',
            value: Boolean(checked),
        }
        const response = await window.api.invoke('set-user-setting', data)
    }

    async function handleCreateNewBranch(checked: boolean) {
        setShowChangesApplyInfoText(true)
        setCreateNewBranch(checked)
        const data = {
            setting: 'git',
            key: 'create-new-branch',
            value: Boolean(checked),
        }
        const response = await window.api.invoke('set-user-setting', data)
    }

    return (
        <Card className="bg-midnight">
            <CardContent className="mt-5 w-full">
                <div className="flex gap-1 items-center mb-4 w-full">
                    <h3 className="text-lg font-semibold">Version control</h3>
                    <Popover>
                        <PopoverTrigger className="ml-[2px]">
                            <CircleHelp size={14} />
                        </PopoverTrigger>
                        <PopoverContent
                            side="top"
                            className="bg-night w-fit p-2 px-3"
                        >
                            Enabling this means you can revert and step back to
                            previous versions
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="use-git"
                            checked={useGit}
                            onCheckedChange={handleUseGitChange}
                        />
                        <label
                            htmlFor="use-git"
                            className="hover:cursor-pointer"
                        >
                            Use git as version control system
                        </label>
                    </div>
                    <div
                        className={`flex flex-col gap-4 ${
                            !useGit ? 'opacity-50 hover:cursor-not-allowed' : ''
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="create-branch"
                                checked={createNewBranch}
                                onCheckedChange={handleCreateNewBranch}
                                disabled={!useGit}
                            />
                            <label
                                htmlFor="create-branch"
                                className={
                                    !useGit
                                        ? 'pointer-events-none'
                                        : 'hover:cursor-pointer'
                                }
                            >
                                Create a new branch when starting a new session
                            </label>
                        </div>
                    </div>
                    {showChangesApplyInfoText && (
                        <span className="text-sm text-green-500 mt-2 flex gap-1 items-center">
                            <Info className="w-4 h-4" />
                            Note: Changes will apply once a new session is
                            created
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

const MiscellaneousCard = ({
    clearStorageAndResetSession,
}: {
    clearStorageAndResetSession: () => void
}) => {
    return (
        <Card className="bg-midnight">
            <CardHeader>
                <div className="flex gap-1 items-center">
                    <h2 className="text-lg font-semibold">Miscellaneous</h2>
                    <Popover>
                        <PopoverTrigger className="ml-[2px]">
                            <CircleHelp size={14} />
                        </PopoverTrigger>
                        <PopoverContent
                            side="top"
                            className="bg-night w-fit p-2 px-3"
                        >
                            Clears your keys from Electron Safe Storage and
                            clears the session
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent>
                <Button className="w-fit" onClick={clearStorageAndResetSession}>
                    Clear Storage
                </Button>
            </CardContent>
        </Card>
    )
}
