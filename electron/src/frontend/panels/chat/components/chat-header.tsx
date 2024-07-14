import { SessionMachineContext } from '@/contexts/session-machine-context'
import {
    CircleArrowDown,
    Power,
    Rewind,
    History,
    Settings,
    TextQuote,
} from 'lucide-react'
import SettingsModal from '@/components/modals/settings-modal'
import IndexesModal from '@/components/modals/indexes-modal'

export default function ChatHeader({
    sessionId,
    headerIcon,
}: {
    sessionId?: string | null
    headerIcon?: JSX.Element
}) {
    const sessionActorRef = SessionMachineContext.useActorRef()

    async function handleReset() {
        sessionActorRef.send({ type: 'session.reset' })
    }

    async function handleStop() {
        sessionActorRef.send({ type: 'session.pause' })
    }

    async function handleIndexes() {
        // sessionActorRef.send({ type: 'session.indexes' })
    }

    return (
        <div className="relative pt-[2px] pb-2 border-outline-night shrink-0 items-left flex flex-row justify-between border-b mx-5">
            <p className="text-lg font-semibold self-end">Chat</p>
            <div className="flex gap-3 mb-[2px]">
                <IndexesButton indexesHandler={handleIndexes} />
                <RestartButton resetHandler={handleReset} />
                {/* <StopButton stopHandler={handleStop} /> */}
                <ConfigureButton />
            </div>
            {headerIcon}
        </div>
    )
}

const IndexesButton = ({ indexesHandler }: { indexesHandler: () => void }) => {
    return (
        <IndexesModal
            trigger={
                <button
                    onClick={indexesHandler}
                    className="group flex items-center gap-2 px-3 py-1 rounded-md mb-[-4px] -mr-2 smooth-hover min-w-0"
                >
                    <TextQuote
                        size={14}
                        className="group-hover:transition text-gray-400 duration-300 mb-[1px] group-hover:text-white flex-shrink-0"
                    />
                    <p className="group-hover:transition duration-300 text-gray-400 group-hover:text-white truncate">
                        Indexes
                    </p>
                </button>
            }
        />
    )
}

const RestartButton = ({ resetHandler }: { resetHandler: () => void }) => {
    return (
        <button
            onClick={resetHandler}
            className="group flex items-center gap-2 px-3 py-1 rounded-md mb-[-4px] -mr-2 smooth-hover min-w-0"
        >
            <History
                size={14}
                className="group-hover:transition text-gray-400 duration-300 mb-[1px] group-hover:text-white flex-shrink-0"
            />
            <p className="group-hover:transition duration-300 text-gray-400 group-hover:text-white truncate">
                Reset session
            </p>
        </button>
    )
}

const ConfigureButton = () => {
    return (
        <SettingsModal
            trigger={
                <button className="group flex items-center gap-2 px-3 py-1 rounded-md mb-[-4px] -mr-2 smooth-hover min-w-0">
                    <Settings
                        size={14}
                        className="group-hover:transition text-gray-400 duration-300 mb-[1px] group-hover:text-white flex-shrink-0"
                    />
                    <p className="group-hover:transition duration-300 text-gray-400 group-hover:text-white truncate">
                        Configure session
                    </p>
                </button>
            }
        />
    )
}

const StopButton = ({ stopHandler }: { stopHandler: () => void }) => {
    return (
        <button
            onClick={stopHandler}
            className="group flex items-center gap-2 px-3 py-1 rounded-md mb-[-4px] smooth-hover"
        >
            <Power
                size={14}
                className="group-hover:transition text-gray-400 group-hover:text-white duration-300 mb-[1px]"
            />
            <p className="group-hover:transition duration-300 text-gray-400 group-hover:text-white">
                Stop session
            </p>
        </button>
    )
}
