import { useEffect, useState, useRef, RefObject, MutableRefObject } from 'react'
import axios from 'axios'
import { SessionMachineContext } from '@/contexts/session-machine-context'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { History, Undo, Undo2, GitBranch } from 'lucide-react'
import { AgentConfig } from '@/lib/types'

type SubStepType = {
    hash: string
    label: string
    subtitle?: string
}

type StepType = {
    hash: string
    label: string
    subtitle?: string
    subSteps: SubStepType[]
    checkpoint_id: number
}

const ANIMATE_DEMO = false

const exampleSteps: StepType[] = [
    {
        hash: '1',
        label: 'Initialize the project',
        subtitle: 'Setting up the initial project structure',
        subSteps: [
            {
                hash: '1.1',
                label: 'Install dependencies',
                subtitle: 'Add necessary packages',
            },
            {
                hash: '1.2',
                label: 'Create project files',
                subtitle: 'Setup basic file structure',
            },
            {
                hash: '1.3',
                label: 'Initialize the project',
                subtitle: 'Setup the project configuration',
            },
        ],
        checkpoint_id: 1,
    },
    {
        hash: '2',
        label: 'Create the game loop',
        subtitle: 'Implement the main game loop',
        subSteps: [
            {
                hash: '2.1',
                label: 'Define game loop logic',
                subtitle: 'Setup the game loop function',
            },
        ],
        checkpoint_id: 2,
    },
    {
        hash: '3',
        label: 'Add snake logic',
        subtitle: 'Implement the snake movement and controls',
        subSteps: [],
        checkpoint_id: 3,
    },
    {
        hash: '4',
        label: 'Implement the game board',
        subtitle: 'Design and code the game board layout',
        subSteps: [],
        checkpoint_id: 4,
    },
    {
        hash: '5',
        label: 'Add collision detection',
        subtitle: 'Implement logic to detect collisions',
        subSteps: [],
        checkpoint_id: 5,
    },
    {
        hash: '6',
        label: 'Add food and scoring',
        subtitle: 'Add food items and scoring mechanism',
        subSteps: [],
        checkpoint_id: 6,
    },
    {
        hash: '7',
        label: 'Finalize the game',
        subtitle: 'Finish up and test the game',
        subSteps: [],
        checkpoint_id: 7,
    },
]

// const steps: StepType[] = exampleSteps

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
    const sessionActorRef = SessionMachineContext.useActorRef()
    // const commits = SessionMachineContext.useSelector(
    //     state => state.context.serverEventContext.gitData.commits
    // )
    const host = SessionMachineContext.useSelector(state => state.context.host)
    const name = SessionMachineContext.useSelector(state => state.context.name)
    const [config, setConfig] = useState<AgentConfig | null>(null)
    const getSessionConfig = async () => {
        try {
            const response = await axios.get(`${host}/sessions/${name}/config`)
            return response.data
        } catch (error) {
            console.error('Error fetching session config:', error)
            throw error
        }
    }

    const commits = config?.checkpoints.filter(checkpoint => checkpoint.commit_hash !== "no_commit").map(checkpoint => ({
            hash: checkpoint.commit_hash,
            message: checkpoint.commit_message,
            checkpoint_id: checkpoint.checkpoint_id,
        })) ?? []
    
    console.log('commits', commits)

    useEffect(() => {
        const interval = setInterval(() => {
            getSessionConfig().then(res => setConfig(res))
        }, 1000)
        // Clean up the interval when the component unmounts
        return () => clearInterval(interval)
    }, [expanded])

    // const hasCommits = true
    // const steps: StepType[] = exampleSteps

    const hasCommits =
        config?.versioning_type === 'git' && commits && commits.length > 0

    const steps: StepType[] = hasCommits
        ? commits.map((commit, index) => ({
              id: index,
              label: commit.message,
              hash: commit.hash,
              // subtitle: commit.author,
              subSteps: [],
              checkpoint_id: commit.checkpoint_id,
          }))
        : exampleSteps

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
                    {config?.versioning_type === 'git' && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="flex items-center">
                                        <code className="flex gap-2 bg-black px-[6px] py-[1px] rounded-md text-primary text-opacity-100 text-[0.9rem]">
                                            <GitBranch
                                                size={16}
                                                className="text-primary"
                                            />
                                            {isString(
                                                config?.versioning_metadata
                                                    ?.old_branch
                                            )
                                                ? config?.versioning_metadata
                                                      ?.old_branch
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
                            key={step.hash}
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
                        />
                    ))
                ) : (
                    <div className="flex">
                        <p className="whitespace-nowrap text-center text-md text-gray-400">
                            {config?.versioning_type === 'git'
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
                            {isString(config?.versioning_metadata?.old_branch)
                                ? config?.versioning_metadata?.old_branch
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

const Step: React.FC<{
    step: StepType
    index: number
    activeStep: number
    setSubStepFinished: (value: boolean) => void
    stepsLength: number
    animateDemo: boolean
    hasCommits: boolean
    expanded: boolean
    setExpanded: (value: boolean) => void
    selectedRevertStep: number | null
    setSelectedRevertStep: (value: number | null) => void
    sessionActorRef: any
}> = ({
    step,
    index,
    activeStep,
    setSubStepFinished,
    stepsLength,
    animateDemo,
    hasCommits,
    expanded,
    setExpanded,
    selectedRevertStep,
    setSelectedRevertStep,
    sessionActorRef,
}) => {
    const isPulsing = selectedRevertStep !== null && index > selectedRevertStep
    const lineBeforeShouldPulse =
        selectedRevertStep !== null && index === selectedRevertStep
    const [subStepActiveIndex, setSubStepActiveIndex] = useState(
        animateDemo ? -1 : step.subSteps.length - 1
    )
    const [connectorHeight, setConnectorHeight] = useState(0)
    const contentRef: RefObject<HTMLDivElement> = useRef(null)
    const pathRef: RefObject<SVGPathElement> = useRef(null)
    const PADDING_OFFSET = 10
    const CURVE_SVG_WIDTH = 40 + PADDING_OFFSET
    const CURVE_SVG_HEIGHT_OFFSET = 50 // Dynamic height not really working yet... this is needed if there's no subtitle
    const CURVE_SVG_ANIMATION_DURATION = 1000

    const SUBITEM_LEFT_MARGIN = 50 // Only change this if you change the padding of each substep item

    useEffect(() => {
        if (contentRef.current) {
            const totalHeight =
                contentRef.current.clientHeight + CURVE_SVG_HEIGHT_OFFSET
            setConnectorHeight(totalHeight)
        }
    }, [contentRef])

    // New effect to handle non-animated case
    useEffect(() => {
        if (!animateDemo) {
            setSubStepActiveIndex(step.subSteps.length - 1)
        }
    }, [animateDemo, step.subSteps.length])

    // Modify the isActive check to consider non-animated case
    const isActive = animateDemo ? index <= activeStep : true

    useEffect(() => {
        if (animateDemo && activeStep === index && step.subSteps.length > 0) {
            const interval = setInterval(() => {
                setSubStepActiveIndex(prevIndex => {
                    if (prevIndex < step.subSteps.length - 1) {
                        return prevIndex + 1
                    }
                    clearInterval(interval)
                    /**
                     * This setTimeout ensures setSubStepFinished is called after the state update
                        Or else you get the error:
                        Cannot update a component (`TimelinePanel`) while rendering a different component (`Step`). To locate the bad setState() call inside `Step`,
                     */
                    setTimeout(() => {
                        setSubStepFinished(true)
                    }, 0)
                    return prevIndex
                })
            }, 1000)
            return () => clearInterval(interval)
        } else if (activeStep === index) {
            setSubStepFinished(true)
        }
    }, [activeStep, index, setSubStepFinished, step.subSteps.length])

    useEffect(() => {
        if (pathRef.current) {
            const pathLength = pathRef.current.getTotalLength()
            pathRef.current.style.strokeDasharray = `${pathLength}`
            pathRef.current.style.strokeDashoffset = `${pathLength}`
            pathRef.current.getBoundingClientRect()
            pathRef.current.style.transition = `stroke-dashoffset ${CURVE_SVG_ANIMATION_DURATION}ms ease-in-out`
            pathRef.current.style.strokeDashoffset = '0'
        }
    }, [connectorHeight, subStepActiveIndex])

    const connectorPath = `
        M 12 0
        Q 12 ${connectorHeight / 2} ${CURVE_SVG_WIDTH} ${connectorHeight / 2}
    `

    function handleRevertStep(step: StepType) {
        console.log('r', step, step.checkpoint_id)
        sessionActorRef.send({
            type: 'session.revert',
            params: { checkpoint_id: step.checkpoint_id },
        })
    }

    const renderCircle = () => {
        const circle = (
            <div
                className={`z-10 flex items-center justify-center w-6 h-6 bg-white rounded-full ${
                    activeStep >= index ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-1000`}
            >
                {hasCommits && activeStep === index ? (
                    <div className="flex items-center justify-center relative">
                        <div className="w-3 h-3 bg-primary rounded-full animate-pulse-size-lg"></div>
                        <div className="absolute w-3 h-3 bg-primary rounded-full"></div>
                        {/* <div className="absolute w-6 h-6 bg-primary rounded-full opacity-40"></div> */}
                    </div>
                ) : (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
            </div>
        )
        if (expanded) {
            return circle
        }
        return (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger onClick={() => setExpanded(!expanded)}>
                        {circle}
                    </TooltipTrigger>
                    <TooltipContent side="right" align="end">
                        <p>{step.label}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    const renderTextAndSubsteps = () => {
        return (
            <Popover
                onOpenChange={open => {
                    if (open) {
                        setSelectedRevertStep(index)
                    } else {
                        setSelectedRevertStep(null)
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <div
                        className={`flex flex-col hover:opacity-90 hover:cursor-pointer`}
                    >
                        <div ref={contentRef} className="flex flex-col">
                            <span
                                className={`text-white min-h-10 ${
                                    expanded ? 'line-clamp-2' : ''
                                }`}
                            >
                                {expanded && step.label}
                            </span>
                            <span className="mt-1 text-gray-400 whitespace-nowrap">
                                {step.subtitle}
                            </span>
                        </div>
                        {activeStep >= index && step.subSteps.length > 0 && (
                            <div
                                style={{
                                    marginLeft: `calc(${CURVE_SVG_WIDTH}px - ${SUBITEM_LEFT_MARGIN}px)`,
                                }}
                                className="mt-3"
                            >
                                {step.subSteps.map((subStep, subIndex) => (
                                    <SubStep
                                        key={subStep.hash}
                                        subStep={subStep}
                                        showLine={
                                            subIndex < step.subSteps.length - 1
                                        }
                                        active={subStepActiveIndex >= subIndex}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    side="right"
                    className="flex gap-2 items-center pl-2 pr-3 py-2 w-auto border-primary bg-night hover:bg-batman smooth-hover"
                    asChild
                >
                    <button onClick={() => handleRevertStep(step)}>
                        <Undo2 size={16} />
                        Revert to this commit
                    </button>
                </PopoverContent>
            </Popover>
        )
    }

    return (
        <div className={`flex flex-row ${isPulsing ? 'animate-pulse2' : ''}`}>
            <div className="relative flex-start">
                {renderCircle()}
                {/* This is the line */}
                {index < stepsLength - 1 && (
                    <div
                        className={`absolute w-px ${
                            activeStep > index ? 'h-[calc(100%-1.5rem)]' : 'h-0'
                        } bg-white top-6 left-1/2 transform -translate-x-1/2 transition-all
                         ${
                             lineBeforeShouldPulse
                                 ? 'animate-pulse2 duration-2000'
                                 : 'duration-1000'
                         }`}
                    ></div>
                )}
                {step.subSteps.length > 0 && subStepActiveIndex >= 0 && (
                    <svg
                        width={CURVE_SVG_WIDTH}
                        height={connectorHeight}
                        className="absolute"
                    >
                        <path
                            ref={pathRef}
                            d={connectorPath}
                            className="stroke-white"
                            fill="transparent"
                            strokeWidth="1.5"
                        />
                    </svg>
                )}
            </div>
            <div
                className={`flex items-center ml-5 mb-3 ${
                    !animateDemo || activeStep >= index
                        ? 'opacity-100'
                        : 'opacity-0'
                } transition-opacity duration-1000 ${
                    animateDemo ? 'delay-800' : ''
                }`}
            >
                {renderTextAndSubsteps()}
            </div>
        </div>
    )
}

const SubStep: React.FC<{
    subStep: SubStepType
    showLine: boolean
    active: boolean
}> = ({ subStep, showLine, active }) => {
    return (
        <div className="relative flex flex-col pb-3">
            <div className="flex">
                <div
                    className={`z-10 flex items-center justify-center w-4 h-4 bg-gray-400 rounded-full translate-y-1 ${
                        active ? 'opacity-100' : 'opacity-0'
                    } transition-opacity duration-1000`}
                >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div
                    className={`ml-3 ${
                        active ? 'opacity-100' : 'opacity-0'
                    } transition-opacity duration-1000 delay-800`}
                >
                    <span className="text-white">{subStep.label}</span>
                    <span className="block mt-1 text-gray-400">
                        {subStep.subtitle}
                    </span>
                </div>
            </div>
            {showLine && (
                <div
                    className={`absolute w-px ${
                        active ? 'h-full' : 'h-0'
                    } bg-gray-400 left-2 transform translate-y-3 -translate-x-1/2 transition-all duration-1000 delay-800`}
                ></div>
            )}
        </div>
    )
}

function isString(value: unknown) {
    return typeof value === 'string' || value instanceof String
}

export default TimelinePanel
