import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import {
    UserMessage,
    BotMessage,
    ToolResponseMessage,
    ThoughtMessage,
    SpinnerMessage,
    RateLimitWarning,
    ErrorMessage,
} from '@/panels/chat/components/messages/chat.message-variants'
import { NotebookPen } from 'lucide-react'
import type { Message } from '@/lib/types'
import { useScrollAnchor } from '../../lib/hooks/chat.use-scroll-anchor'

export interface ChatMessagesProps {
    messages: Message[]
    spinning: boolean
    paused: boolean
    scrollToCheckpointHash?: number
    onScrollComplete?: () => void
}

const ChatMessages = React.memo(
    ({
        messages,
        spinning,
        paused,
        scrollToCheckpointHash,
        onScrollComplete,
    }: ChatMessagesProps) => {
        console.log('Rerender')
        // console.log('Rerender')
        const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
        const [isScrolling, setIsScrolling] = useState(false)
        const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
        const { scrollRef, isAtBottom, scrollToBottom } = useScrollAnchor()

        useEffect(() => {
            if (!spinning && isAtBottom) {
                scrollToBottom()
            }
        }, [spinning, isAtBottom, scrollToBottom])

        const scrollToMessage = useCallback(
            (checkpointHash: string) => {
                const messageElement = messageRefs.current.get(checkpointHash)
                if (messageElement && !isScrolling) {
                    setIsScrolling(true)

                    messageElement.scrollIntoView({
                        behavior: 'instant',
                        // behavior: 'smooth', // Not working rn, I think due to rerenders it stops scrolling prematurely
                        block: 'end',
                    })

                    if (scrollTimeoutRef.current) {
                        clearTimeout(scrollTimeoutRef.current)
                    }

                    scrollTimeoutRef.current = setTimeout(() => {
                        setIsScrolling(false)
                        onScrollComplete?.()
                    }, 100)
                }
            },
            [isScrolling, onScrollComplete]
        )

        useEffect(() => {
            if (scrollToCheckpointHash !== undefined && !isScrolling) {
                console.log(scrollToCheckpointHash)
                scrollToMessage(scrollToCheckpointHash)
            }
        }, [scrollToCheckpointHash, isScrolling])

        useEffect(() => {
            return () => {
                if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current)
                }
            }
        }, [])

        const memoizedMessages = useMemo(() => {
            return messages.map((message, index) => (
                <MemoizedDisplayedChatMessage
                    key={`${index}-${message.type}-${message.text}`}
                    message={message}
                    index={index}
                    setRef={el => {
                        if (el && message.type === 'checkpoint') {
                            console.log("CHECKPOINT", message.text)
                            messageRefs.current.set(message.text,
                                el
                            )
                        }
                        // else if (el && index === 0) {
                        //     messageRefs.current.set(index, el)
                        // }
                    }}
                />
            ))
        }, [messages])

        return (
            <div className="relative px-6 mt-6">
                {messages && messages.length ? memoizedMessages : null}
                {spinning && <SpinnerMessage paused={paused} />}
            </div>
        )
    }
)

const MemoizedDisplayedChatMessage = React.memo(
    ({
        message,
        index,
        setRef,
    }: {
        message: Message
        index: number
        setRef: (el: HTMLDivElement | null) => void
    }) => {
        return (
            <div ref={setRef} className="mb-8">
                {message.type === 'agent' ? (
                    <BotMessage content={message.text} />
                ) : message.type === 'thought' ? (
                    <ThoughtMessage content={message.text} />
                ) : message.type === 'command' ? (
                    <ChatTypeWrapper type="Command">
                        {message.text}
                    </ChatTypeWrapper>
                ) : message.type === 'rateLimit' ? (
                    <RateLimitWarning className="text-gray-400" />
                ) : message.type === 'tool' ? (
                    <ToolResponseMessage
                        className="text-gray-400"
                        content={message.text}
                        index={index}
                    />
                ) : message.type === 'user' ? (
                    <UserMessage>{message.text}</UserMessage>
                ) : message.type === 'error' ? (
                    <ErrorMessage
                        className={index === 1 ? '' : 'ml-[49px]'}
                        content={message.text}
                    />
                ) : null}
            </div>
        )
    }
)

const ChatTypeWrapper = React.memo(
    ({
        type,
        children,
        className,
    }: {
        type: string
        children: string | JSX.Element
        className?: string
    }) => {
        return <p className={className}>{children}</p>
    }
)

export default ChatMessages
