// import Link from 'next/link'

function SidebarItem({
    id,
    icon,
    text,
    active,
    route,
    alert,
    expanded,
    handleClick,
    content,
}: {
    id: string
    icon: JSX.Element
    text: string
    active: boolean
    route: string
    alert: boolean
    expanded: boolean
    handleClick: (id: string) => void
    content?: JSX.Element
}) {
    return (
        <div
            className={`
        relative flex  my-1
        font-medium
        transition-colors group
        ${active && expanded ? 'border-l-2 border-primary' : ''}
    `}
        >
            {/* <Link href={route} className="flex"> */}
            <button
                onClick={() => handleClick(id)}
                className={`py-2 px-3 ${
                    active ? 'text-toned-text-color' : 'text-neutral-500'
                }`}
            >
                {icon}
            </button>
            {/* <span
                className={`overflow-hidden transition-all flex items-start ${
                    expanded ? 'w-52 ml-3' : 'w-0'
                }`}
            >
                {expanded && text}
            </span> */}
            {/* </Link> */}
            {alert && (
                <div
                    className={`absolute right-2 w-2 h-2 rounded bg-primary ${
                        expanded ? '' : 'top-2'
                    }`}
                />
            )}
        </div>
    )
}

export default SidebarItem
