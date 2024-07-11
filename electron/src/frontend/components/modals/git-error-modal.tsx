import { SessionMachineContext } from '@/contexts/session-machine-context'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

const GitErrorModal = () => {
    const unresolvedGitErrors = SessionMachineContext.useSelector(
        state =>
            state.context.serverEventContext.gitError?.filter(
                e => e.resolved === false
            ) ?? []
    )

    if (unresolvedGitErrors.length === 0) {
        return null
    }

    const currentError = unresolvedGitErrors[0]

    return (
        <Dialog open={false}>
            <DialogContent hideclose={true.toString()} className="sm:max-w-[425px] pb-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle size={20} className="mb-[2px]"/>
                        <h2 className="text-xl font-semibold">Git error</h2>
                    </div>
                    <p className="text-sm text-gray-400">
                        {currentError.message}
                    </p>
                    <p className="text-sm">
                        There was a problem with git. How would you like to
                        proceed?
                    </p>
                    <div className="flex flex-col gap-3 mt-2">
                        <Button
                            className="w-full py-2 rounded transition-colors"
                            onClick={() => {
                                // TODO: Implement resolve action
                                console.log('Resolved')
                            }}
                        >
                            I've resolved this issue
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full py-2 rounded transition-colors text-gray-500 hover:text-white hover:bg-red-600"
                            onClick={() => {
                                // TODO: Implement continue without Git action
                                console.log('Continue without Git')
                            }}
                        >
                            Continue without git
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default GitErrorModal
