import React, { useState, useEffect } from 'react'
import { SessionMachineContext } from '@/contexts/session-machine-context'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'


const GitInitModal = () => {
    const [isOpen, setIsOpen] = useState(false)
    const gitInitMsg = SessionMachineContext.useSelector(
        state => state.context.serverEventContext.gitInit
    )
    const sessionActorRef = SessionMachineContext.useActorRef()

    useEffect(() => {
        if (gitInitMsg) {
            setIsOpen(true)
        }
    }, [gitInitMsg])

    const handleInitRepo = () => {
        sessionActorRef.send({
            type: 'session.sendEvent',
            params: {
                serverEventType: 'GitResolve',
                content: { action: 'git' },
            },
        })
        setIsOpen(false)
    }

    const handleContinueWithoutGit = () => {
        sessionActorRef.send({
            type: 'session.sendEvent',
            params: {
                serverEventType: 'GitResolve',
                content: { action: 'nogit' },
            },
        })
        setIsOpen(false)
    }

    if (!gitInitMsg) {
        return null
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                hideclose={true.toString()}
                className="sm:max-w-[425px] pb-4"
            >
                <DialogHeader>
                    <DialogTitle>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <Icon
                                icon="vscode-icons:file-type-git"
                                className="h-[24px] w-[24px]"
                            />
                            <h2 className="text-xl font-semibold">
                                Initialize git repository?
                            </h2>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-1">
                    <p className="text-sm">{gitInitMsg}</p>
                    <div className="flex flex-col gap-3 mt-2">
                        <Button
                            className="w-full py-2 rounded transition-colors"
                            onClick={handleInitRepo}
                        >
                            Initialize git repository
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full rounded transition-colors text-gray-500 hover:text-red-500 hover:border-2 hover:bg-transparent hover:border-red-500"
                            onClick={handleContinueWithoutGit}
                        >
                            Continue without git
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default GitInitModal
