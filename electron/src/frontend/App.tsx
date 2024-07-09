import './globals.css'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import AppHeader from '@/components/app-header'
import { BackendUrlProvider } from './contexts/backend-url-context'
import Page from './page'

function App() {
    useEffect(() => {
        const handleServerError = (error: unknown) => {
            console.error('Server Error:', error)
            // alert('Server Error: ' + error); // Display as a popup
        }

        // Set up the IPC receive listener
        window.api.receive('server-error', handleServerError)

        // Clean up the listener on unmount
        return () => {
            window.api.removeAllListeners('server-error')
        }
    }, [])

    return (
        <div lang="en" className="dark h-full">
            <div className={` flex h-full flex-col`}>
                <div className="flex w-full h-full overflow-hidden">
                    <div className="relative w-full overflow-hidden bg-day transition-colors duration-200 dark:bg-night flex">
                        <BackendUrlProvider>
                            <AppHeader />
                            <main className="mt-[54px] flex flex-row w-full">
                                <button
                                className="absolute top-4 right-0 z-10 p-4 text-sm text-neutral-500 hover:text-white duration-200"
                                    onClick={() =>
                                        window.api.invoke(
                                            'open-logs-directory',
                                            null
                                        )
                                    }
                                >
                                    Open Logs
                                </button>
                                <Page />
                            </main>
                        </BackendUrlProvider>
                    </div>
                </div>
                <Toaster />
            </div>
        </div>
    )
}

export default App
