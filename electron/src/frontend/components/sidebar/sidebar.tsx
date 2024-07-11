import { List, Settings, PanelsTopLeft, GitMerge } from 'lucide-react'
import {
    useContext,
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
    // {
    //     icon: <List />,
    //     text: '',
    //     alert: false,
    //     route: '/chat',
    //     id: '1',
    // },
    {
        icon: <GitMerge />,
        text: '',
        alert: false,
        route: '',
        id: '2',
        content: <TimelinePanel />
    },
]

const bottomSidebarItems: any = [
    // {
    //     icon: <Settings className="text-primary" />,
    //     text: 'Settings',
    //     active: true,
    //     alert: false,
    //     route: '/settings',
    // },
]

const SidebarContext = createContext(defaultValue)

export default function Sidebar() {
    const [expanded, setExpanded] = useState(false)
    const [activeTabId, setActiveTabId] = useState(sidebarItems[0].id)

    function handleClick(id: string) {
        if (id === activeTabId) {
            setExpanded(!expanded)
        } else {
            setExpanded(true)
        }
        if (activeTabId !== id) {
            setActiveTabId(id)
        }
    }

    return (
        // <aside className="h-full flex flex-row bg-midnight border-r-[1px] border-t-[1px] border-outline-night">
        <aside className="flex flex-row bg-midnight rounded-lg mx-3 mb-6 border border-outlinecolor">
            {/* <button
                onClick={() => setExpanded(!expanded)}
                className="no-drag relative p-2 z-10 focus:outline-none"
            >
                <PanelsTopLeft size="1.4rem" />
            </button> */}
            {/* <a
                href="/"
                className="no-drag text-white text-xl font-semibold z-10"
            >
                Devon
            </a> */}
            <nav className="h-full flex flex-col rounded-sm pb-2">
                <SidebarContext.Provider value={{ expanded }}>
                    <ul className={`flex-1 flex flex-col justify-between pb-2`}>
                        <div>
                            {/* <SidebarHeader expanded={expanded} /> */}
                            {/* {expanded && <SidebarChatLogs />} */}
                            {sidebarItems.map((item, index) => (
                                <SidebarItem
                                    key={item.text}
                                    {...item}
                                    expanded={expanded}
                                    active={item.id === activeTabId}
                                    handleClick={handleClick}
                                />
                            ))}
                        </div>
                        {/* {bottomSidebarItems.map((item, index) => (
                            <SidebarItem
                                key={item.text}
                                {...item}
                                expanded={expanded}
                                active={item.id === activeTabId}
                                handleClick={handleClick}
                            />
                        ))} */}
                    </ul>
                </SidebarContext.Provider>
            </nav>
            {expanded ? <div className="py-5 overflow-auto px-2"><TimelinePanel/></div> : null}
        </aside>
    )
}
