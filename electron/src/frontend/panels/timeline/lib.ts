import { atom } from 'jotai'
import { CheckpointTracker, Checkpoint } from '@/lib/types'

export const checkpointTrackerAtom = atom<CheckpointTracker | null>(null)

export type SubStepType = {
    commit_hash: string
    label: string
    subtitle?: string
}

export type StepType = Checkpoint & {
    subtitle?: string
    subSteps: SubStepType[]
}

export const exampleSteps: StepType[] = [
    {
        commit_hash: '1',
        commit_message: 'Initialize the project',
        subtitle: 'Setting up the initial project structure',
        subSteps: [
            {
                commit_hash: '1.1',
                label: 'Install dependencies',
                subtitle: 'Add necessary packages',
            },
            {
                commit_hash: '1.2',
                label: 'Create project files',
                subtitle: 'Setup basic file structure',
            },
            {
                commit_hash: '1.3',
                label: 'Initialize the project',
                subtitle: 'Setup the project configuration',
            },
        ],
        checkpoint_id: 1,
        event_id: 1,
        agent_history: [],
    },
    {
        commit_hash: '2',
        commit_message: 'Create the game loop',
        subtitle: 'Implement the main game loop',
        subSteps: [
            {
                commit_hash: '2.1',
                label: 'Define game loop logic',
                subtitle: 'Setup the game loop function',
            },
        ],
        checkpoint_id: 2,
        event_id: 2,
        agent_history: [],
    },
    {
        commit_hash: '3',
        commit_message: 'Add snake logic',
        subtitle: 'Implement the snake movement and controls',
        subSteps: [],
        checkpoint_id: 3,
        event_id: 3,
        agent_history: [],
    },
    {
        commit_hash: '4',
        commit_message: 'Implement the game board',
        subtitle: 'Design and code the game board layout',
        subSteps: [],
        checkpoint_id: 4,
        event_id: 4,
        agent_history: [],
    },
    {
        commit_hash: '5',
        commit_message: 'Add collision detection',
        subtitle: 'Implement logic to detect collisions',
        subSteps: [],
        checkpoint_id: 5,
        event_id: 5,
        agent_history: [],
    },
    {
        commit_hash: '6',
        commit_message: 'Add food and scoring',
        subtitle: 'Add food items and scoring mechanism',
        subSteps: [],
        checkpoint_id: 6,
        event_id: 6,
        agent_history: [],
    },
    {
        commit_hash: '7',
        commit_message: 'Finalize the game',
        subtitle: 'Finish up and test the game',
        subSteps: [],
        checkpoint_id: 7,
        event_id: 7,
        agent_history: [],
    },
]
