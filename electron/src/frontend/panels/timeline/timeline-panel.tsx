import { useEffect, useState } from 'react'
import { GitBranch } from 'lucide-react'
import { useAtom } from 'jotai'
import { SessionMachineContext } from '@/contexts/session-machine-context'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Checkpoint, CheckpointTracker } from '@/lib/types'
import { exampleSteps, StepType, checkpointTrackerAtom } from './lib'
import Step from './components/step'

const ANIMATE_DEMO = false

const TimelinePanel = ({
    expanded,
    setExpanded,
    setShowMinimizedTimeline,
}: {
    expanded: boolean
    setExpanded: (value: boolean) => void
    setShowMinimizedTimeline: (value: boolean) => void
}) => {
    const [activeStep, setActiveStep] = useState(0)
    const [subStepFinished, setSubStepFinished] = useState(false)
    const [selectedRevertStep, setSelectedRevertStep] = useState<number | null>(
        null
    )
    const [animationKey, setAnimationKey] = useState(0)
    const sessionActorRef = SessionMachineContext.useActorRef()
    const checkpoints: Checkpoint[] = SessionMachineContext.useSelector(
        state => state.context.sessionConfig?.checkpoints,
        (a, b) =>
            a?.length === b?.length &&
            a?.every(
                (checkpoint: { checkpoint_id: any }, index: string | number) =>
                    checkpoint?.checkpoint_id === b[index]?.checkpoint_id
            )
    )

    const commits: Checkpoint[] =
        checkpoints?.filter(
            checkpoint => checkpoint.commit_hash !== 'no_commit'
        ) ?? []

    const versioning_type = SessionMachineContext.useSelector(
        state => state.context.sessionConfig?.versioning_type
    )
    const hasCommits =
        versioning_type === 'git' && commits && commits.length > 0

    const old_branch = SessionMachineContext.useSelector(
        state => state.context.sessionConfig?.versioning_metadata?.old_branch
    )

    const steps: StepType[] = hasCommits
        ? commits.map((commit, index) => ({
              ...commit,
              subSteps: [],
          }))
        : exampleSteps

    const [checkpointTracker, setCheckpointTracker] =
        useAtom<CheckpointTracker | null>(checkpointTrackerAtom)

    useEffect(() => {
        if (commits.length > 0) {
            const selected = checkpointTracker?.selected ?? null
            setCheckpointTracker({
                initial: commits[0],
                current: commits[commits.length - 1],
                selected,
            })
        }
    }, [commits])

    useEffect(() => {
        setShowMinimizedTimeline(hasCommits)
    }, [hasCommits])

    useEffect(() => {
        if (ANIMATE_DEMO) {
            if (activeStep < steps.length - 1) {
                const timer = setTimeout(() => {
                    if (
                        subStepFinished ||
                        steps[activeStep].subSteps.length === 0
                    ) {
                        setActiveStep(activeStep + 1)
                        setSubStepFinished(false)
                    }
                }, 2000)
                return () => clearTimeout(timer)
            }
        } else {
            // If not animating, set activeStep to the last step immediately
            setActiveStep(steps.length - 1)
        }
    }, [activeStep, subStepFinished, steps.length])

    function handleGitMerge() {
        sessionActorRef.send({
            type: 'session.sendEvent',
            params: {
                serverEventType: 'GitMerge',
                content: {
                    commit_message: 'Merge branch',
                },
            },
        })
    }

    return (
        <div className="flex flex-col justify-between h-full">
            <div className="relative">
                <div
                    className={`flex justify-between ${
                        expanded || !hasCommits
                            ? 'h-6 mb-5 gap-1'
                            : 'h-0 mb-0 overflow-hidden'
                    } transition-all duration-300 ease-in-out`}
                >
                    <h2 className={`text-lg font-semibold overflow-hidden`}>
                        Devon's Timeline
                    </h2>
                    {versioning_type === 'git' && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="flex items-center">
                                        <code className="flex gap-2 bg-black px-[6px] py-[1px] rounded-md text-primary text-opacity-100 text-[0.9rem]">
                                            <GitBranch
                                                size={16}
                                                className="text-primary"
                                            />
                                            {isString(old_branch)
                                                ? old_branch
                                                : '(name not found)'}
                                        </code>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" align="end">
                                    <p>Source branch</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                {hasCommits ? (
                    steps.map((step, index) => (
                        <Step
                            key={step.checkpoint_id}
                            step={step}
                            index={index}
                            activeStep={activeStep}
                            setSubStepFinished={setSubStepFinished}
                            stepsLength={steps.length}
                            animateDemo={ANIMATE_DEMO}
                            hasCommits={hasCommits}
                            expanded={expanded}
                            setExpanded={setExpanded}
                            selectedRevertStep={selectedRevertStep}
                            setSelectedRevertStep={setSelectedRevertStep}
                            sessionActorRef={sessionActorRef}
                            animationKey={animationKey}
                            setAnimationKey={setAnimationKey}
                        />
                    ))
                ) : (
                    <div className="flex">
                        <p className="whitespace-nowrap text-center text-md text-gray-400">
                            {versioning_type === 'git'
                                ? `Devon hasn't made any commits yet`
                                : 'Git is disabled for this project'}
                        </p>
                    </div>
                )}
            </div>
            {expanded && hasCommits && (
                <div className="flex flex-col gap-4 items-center pb-2 border-t border-outlinecolor">
                    <p className="mt-4 flex whitespace-nowrap">
                        Sync changes with{' '}
                        <code className="bg-black px-[6px] py-[1px] rounded-md text-primary text-opacity-100 text-[0.9rem] mx-[4px]">
                            {isString(old_branch)
                                ? old_branch
                                : '(name not found)'}
                        </code>{' '}
                        branch?
                    </p>
                    <Button className="w-fit" onClick={handleGitMerge}>
                        Merge branch
                    </Button>
                </div>
            )}
        </div>
    )
}

function isString(value: unknown) {
    return typeof value === 'string' || value instanceof String
}

export default TimelinePanel
