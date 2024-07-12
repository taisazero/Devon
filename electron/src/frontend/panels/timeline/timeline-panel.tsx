import { useEffect, useState, useRef, RefObject } from 'react'
import { SessionMachineContext } from '@/contexts/session-machine-context'

type SubStepType = {
    id: number
    label: string
    subtitle?: string
}

type StepType = {
    id: number
    label: string
    subtitle?: string
    subSteps: SubStepType[]
}

const ANIMATE_DEMO = false

const exampleSteps: StepType[] = [
    {
        id: 1,
        label: 'Initialize the project',
        subtitle: 'Setting up the initial project structure',
        subSteps: [
            {
                id: 1.1,
                label: 'Install dependencies',
                subtitle: 'Add necessary packages',
            },
            {
                id: 1.2,
                label: 'Create project files',
                subtitle: 'Setup basic file structure',
            },
            {
                id: 1.3,
                label: 'Initialize the project',
                subtitle: 'Setup the project configuration',
            },
        ],
    },
    {
        id: 2,
        label: 'Create the game loop',
        subtitle: 'Implement the main game loop',
        subSteps: [
            {
                id: 2.1,
                label: 'Define game loop logic',
                subtitle: 'Setup the game loop function',
            },
        ],
    },
    {
        id: 3,
        label: 'Add snake logic',
        subtitle: 'Implement the snake movement and controls',
        subSteps: [],
    },
    {
        id: 4,
        label: 'Implement the game board',
        subtitle: 'Design and code the game board layout',
        subSteps: [],
    },
    {
        id: 5,
        label: 'Add collision detection',
        subtitle: 'Implement logic to detect collisions',
        subSteps: [],
    },
    {
        id: 6,
        label: 'Add food and scoring',
        subtitle: 'Add food items and scoring mechanism',
        subSteps: [],
    },
    {
        id: 7,
        label: 'Finalize the game',
        subtitle: 'Finish up and test the game',
        subSteps: [],
    },
]

// const steps: StepType[] = exampleSteps

const TimelinePanel: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0)
    const [subStepFinished, setSubStepFinished] = useState(false)
    const commits = SessionMachineContext.useSelector(
        state => state.context.serverEventContext.gitData.commits
    )

    const hasCommits = commits && commits.length > 0

    const steps: StepType[] = hasCommits
        ? commits.map((commit, index) => ({
              id: index,
              label: commit,
              // subtitle: commit.author,
              subSteps: [],
          }))
        : exampleSteps

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

    return (
        <div className="inset-0 flex flex-col w-full">
            <div className="relative">
                <h2 className="mb-4 text-lg font-semibold">Devon's Timeline</h2>
                {hasCommits ? (
                    steps.map((step, index) => (
                        <Step
                            key={step.id}
                            step={step}
                            index={index}
                            activeStep={activeStep}
                            setSubStepFinished={setSubStepFinished}
                            stepsLength={steps.length}
                            animateDemo={ANIMATE_DEMO}
                            hasCommits={hasCommits}
                        />
                    ))
                ) : (
                    <div className="inset-0 flex">
                        <p className="whitespace-nowrap pr-4 text-center text-md text-gray-400">
                            Devon hasn't made any commits yet
                        </p>
                    </div>
                )}
            </div>
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
}> = ({
    step,
    index,
    activeStep,
    setSubStepFinished,
    stepsLength,
    animateDemo,
    hasCommits,
}) => {
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

    return (
        <div className="flex flex-row">
            <div className="relative flex-start">
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
                {index < stepsLength - 1 && (
                    <div
                        className={`absolute w-px ${
                            activeStep > index ? 'h-full' : 'h-0'
                        } bg-white top-6 left-1/2 transform -translate-x-1/2 transition-all duration-1000`}
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
                <div className="flex flex-col">
                    <div ref={contentRef} className="flex flex-col">
                        <span className="text-white">{step.label}</span>
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
                                    key={subStep.id}
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

export default TimelinePanel
