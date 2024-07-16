import { List, Settings, PanelsTopLeft, GitMerge } from 'lucide-react'
import {
    useContext,
    useEffect,
    createContext,
    useState,
    useRef,
    SetStateAction,
    Dispatch,
} from 'react'
import SidebarHeader from './sidebar-header'
import SidebarChatLogs from './sidebar-chat-logs'
import SidebarItem from './sidebar-item'
import TimelinePanel from '@/panels/timeline/timeline-panel'

const defaultValue = {
    expanded: true,
}

const sidebarItems = [
    {
        icon: <GitMerge size={22} />,
        text: '',
        alert: false,
        route: '',
        id: 'timeline',
        comingSoon: false,
    },
    {
        icon: <List size={22} />,
        text: '',
        alert: false,
        route: '',
        id: 'sessions',
        comingSoon: true,
    },
]

const bottomSidebarItems: any = [
    {
        icon: <Settings size={22} />,
        text: 'Settings',
        active: true,
        alert: false,
        route: '/settings',
        comingSoon: true,
    },
]

const SidebarContext = createContext(defaultValue)

export default function Sidebar() {
    const [expanded, setExpanded] = useState(false)
    const [activeTabId, setActiveTabId] = useState(sidebarItems[0].id)
    const contentRef = useRef(null)
    // const showMinimizedTimeline = useRef(false)
    const [showMinimizedTimeline, setShowMinimizedTimeline] = useState(false)

    function handleClick(id: string) {
        if (id === activeTabId) {
            setExpanded(!expanded)
        } else {
            setExpanded(true)
        }
        setActiveTabId(id)
    }

    return (
        <aside className={`flex flex-row bg-midnight ml-3 mb-6 overflow-hidden transition-all duration-300 ease-in-out rounded-l-lg ${expanded ? 'border border-outlinecolor rounded-lg' : 'border-none'}`}>
            <nav className={`h-full flex flex-col border-outlinecolor ${expanded ? 'border-r' : 'rounded-lg border'}`}>
                <ul className="flex-1 flex flex-col justify-between pb-1 items-center">
                    <div>
                        {sidebarItems.map(item => (
                            <SidebarItem
                                key={item.id}
                                {...item}
                                expanded={expanded}
                                active={item.id === activeTabId}
                                handleClick={handleClick}
                            />
                        ))}
                    </div>
                    {bottomSidebarItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            {...item}
                            expanded={expanded}
                            active={item.id === activeTabId}
                            handleClick={handleClick}
                        />
                    ))}
                </ul>
            </nav>
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    expanded
                        ? showMinimizedTimeline
                            ? 'w-[500px]'
                            : 'w-[340px]'
                        : showMinimizedTimeline
                        ? 'w-[42px]'
                        : 'w-[0px]'
                }`}
            >
                <div className={`h-full overflow-auto ${expanded ? 'bg-midnight p-4' : 'bg-night pl-4 py-2'}`}>
                    {activeTabId === 'timeline' ? (
                        <TimelinePanel
                            expanded={expanded}
                            setExpanded={setExpanded}
                            setShowMinimizedTimeline={setShowMinimizedTimeline}
                        />
                    ) : (
                        ''
                    )}
                </div>
            </div>
        </aside>
    )
}
