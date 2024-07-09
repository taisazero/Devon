// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Electron doesnt support ESM for renderer process. Alternatively, pass this file
// through a bundler but that feels like an overkill
const { contextBridge, ipcRenderer } = require('electron')

type Channel = // Used for:

        | 'ping' // N/A
        | 'server-error' // Displaying backend errors in UI
        | 'open-logs-directory' // Logging with winston
        | 'get-file-path' // Folder picker
        | 'file-path-response' // Folder picker
        | 'encrypt-data' // Storing keys in safe storage
        | 'decrypt-data' // Storing keys in safe storage
        | 'save-data' // Storing keys in safe storage
        | 'load-data' // Storing keys in safe storage
        | 'check-has-encrypted-data' // Storing keys in safe storage
        | 'delete-encrypted-data' // Storing keys in safe storage
        | 'get-port' // Getting backend url
        | 'get-port-response' // Getting backend url
        | 'watch-dir' // Code editor
        | 'editor-file-changed' // Code editor
        | 'editor-add-open-file' // Code editor
        | 'unsubscribe' // Code editor

const channels: { send: Channel[]; invoke: Channel[]; receive: Channel[] } = {
    send: ['get-file-path', 'ping', 'get-port', 'unsubscribe'],
    invoke: [
        'ping',
        'get-file-path',
        'encrypt-data',
        'decrypt-data',
        'save-data',
        'load-data',
        'delete-encrypted-data',
        'check-has-encrypted-data',
        'watch-dir',
        'editor-add-open-file',
        'open-logs-directory',
    ],
    receive: [
        'server-error',
        'file-path-response',
        'get-port-response',
        'editor-file-changed',
    ],
}

type ReceiveHandler = (event: any, ...arg: [any?, any?, any?]) => void

interface API {
    send: (channel: Channel, data: any) => void
    invoke: (channel: Channel, data: any) => Promise<any>
    receive: (channel: Channel, func: ReceiveHandler) => void
    removeAllListeners: (channel: Channel) => void
}

const api: API = {
    send: (channel, data) => {
        // Whitelist channels
        const validChannels: Channel[] = channels.send
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        } else {
            throw new Error(`Invalid channel: ${channel}`)
        }
    },
    invoke: (channel, data) => {
        // Whitelist channels
        const validChannels: Channel[] = channels.invoke
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data)
        } else {
            throw new Error(`Invalid channel: ${channel}`)
        }
    },
    receive: (channel, func) => {
        const validChannels: Channel[] = channels.receive
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event: any, ...args: [any?, any?, any?]) =>
                func(...args)
            )
        } else {
            throw new Error(`Invalid channel: ${channel}`)
        }
    },
    removeAllListeners: channel => {
        ipcRenderer.removeAllListeners(channel)
    },
}

contextBridge.exposeInMainWorld('api', api)
