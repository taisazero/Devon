/* eslint-disable import/no-named-as-default-member */
import {
    app,
    BrowserWindow,
    dialog,
    globalShortcut,
    ipcMain,
    safeStorage,
    shell,
} from 'electron'
import path from 'path'
import { ChildProcess, spawn, spawnSync } from 'child_process'
import portfinder from 'portfinder'
import fs from 'fs'
import './plugins/editor'

const DEBUG_MODE = false
const DEV_MODE = process.env.DEV_MODE ?? false

const winston = require('winston')

const userDataPath = app.getPath('userData')
const logDir = path.join(userDataPath, 'logs')

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
}

function showErrorDialog(title: string, details?: string) {
    dialog
        .showMessageBox({
            type: 'error',
            message: title,
            // title: 'Uncaught Exception:',
            detail: details,
            buttons: ['View Logs'],
            noLink: true,
        })
        .then(result => {
            if (result.response === 0) {
                shell.openPath(logDir)
            }
        })
}

const createLogger = (service: string) => {
    return winston.createLogger({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ level, message, timestamp, service }) => {
                return `${timestamp} [${service}] ${level}: ${message}`
            })
        ),
        defaultMeta: { service },
        transports: [
            new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
            }),
            new winston.transports.File({
                filename: path.join(logDir, 'devon.log'),
            }),
        ],
    })
}

function checkBackendExists() {
    // Check if devon_agent exists and get its version synchronously
    try {
        const result = spawnSync('devon_agent', ['--version'])
        if (result.error) {
            throw result.error
        }
        const version = result.stdout.toString().trim()
        mainLogger.info(`devon_agent v${version}`)
    } catch (error) {
        mainLogger.error(
            'Failed to get devon_agent version. Please make sure you `pipx install devon_agent`:',
            error
        )
        // Handle the error (e.g., show a dialog, prevent app from continuing)
        showErrorDialog(
            'devon_agent not found or failed to run. Please check your installation.',
            'Make sure you have devon_agent installed. To install, run:\npipx install devon_agent'
        )
        app.quit()
        return
    }
}

const mainLogger = createLogger('devon')
const serverLogger = createLogger('devon-agent')
const rendererLogger = createLogger('devon-ui')

const appVersion = app.getVersion()
mainLogger.info('Application started.')
mainLogger.info(
    `devon-ui ${appVersion ? 'v' + appVersion : '(version not found)'}`
)
checkBackendExists()

function clearLogFiles() {
    const logFiles = ['error.log', 'devon.log']
    logFiles.forEach(file => {
        const logPath = path.join(logDir, file)
        fs.writeFileSync(logPath, '', { flag: 'w' })
    })
    mainLogger.info('Log files cleared on startup.')
}

if (process.env.NODE_ENV !== 'production') {
    mainLogger.add(new winston.transports.Console())
    serverLogger.add(new winston.transports.Console())
}

if (process.env.NODE_ENV !== 'production') {
    mainLogger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    )
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit()
}

let serverProcess: ChildProcess
portfinder.setBasePort(10000)
let use_port = NaN

process.on('uncaughtException', error => {
    const detailedError = `
${error.message}
${error.stack}
${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
    `.trim()

    mainLogger.error(`Uncaught Exception in main process: ${detailedError}`)

    showErrorDialog(`Exception: ${error.message}`, error.stack)
})

const spawnAppWindow = async () => {
    const db_path = path.join(app.getPath('userData'))

    await portfinder
        .getPortPromise()
        .then((port: number) => {
            use_port = port
            // process.resourcesPath

            // when we move to zip package
            // let agent_path = path.join(__dirname, "devon_agent")
            // if (fs.existsSync(path.join(process.resourcesPath, "devon_agent"))) {
            //   agent_path = path.join(process.resourcesPath, "devon_agent")
            // }
            // fs.chmodSync(agent_path, '755');
            serverProcess = spawn(
                'devon_agent',
                [
                    'server',
                    '--port',
                    port.toString(),
                    '--db_path',
                    db_path,
                    // '--model',
                    // modelName as string,
                    // '--api_key',
                    // api_key as string,
                    // '--api_base',
                    // api_base as string,
                    // '--prompt_type',
                    // prompt_type as string,
                ],
                {
                    signal: controller.signal,
                }
            )

            serverProcess.stdout?.on('data', (data: string) => {
                const message = data.toString().trim()
                if (message.startsWith('INFO:')) {
                    serverLogger.info(message.substring(5).trim())
                }
            })

            serverProcess.stderr?.on('data', (data: string) => {
                const message = data.toString().trim()
                if (message.startsWith('INFO:')) {
                    serverLogger.info(message.substring(5).trim())
                } else {
                    serverLogger.error(message)
                    if (appWindow) {
                        // Displaying server errors in ui
                        appWindow.webContents.send(
                            'server-error',
                            data.toString()
                        )
                    }
                }
            })

            serverProcess.on('close', (code: unknown) => {
                mainLogger.info(`Server process exited with code ${code}`)
            })
        })
        .catch(error => {
            mainLogger.error('Failed to find a free port:', error)
            return { success: false, message: 'Failed to find a free port.' }
        })

    // const RESOURCES_PATH = electronIsDev
    //   ? path.join(__dirname, '../../assets')
    //   : path.join(process.resourcesPath, 'assets')

    // const getAssetPath = (...paths: string[]): string => {
    //   return path.join(RESOURCES_PATH, ...paths)
    // }

    const PRELOAD_PATH = path.join(__dirname, 'preload.js')

    let appWindow = new BrowserWindow({
        width: 800,
        height: 600,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 15, y: 10 },
        // icon: getAssetPath('icon.png'),
        show: false,
        webPreferences: {
            preload: PRELOAD_PATH,
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--port=${use_port}`],
        },
    })

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        appWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        appWindow.loadFile(
            path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
            )
        )
    }

    // appWindow.loadURL(
    //   electronIsDev
    //     ? `http://localhost:3000?port=${use_port}`
    //     : `file://${path.join(__dirname, '../../frontend/build/index.html')}`
    // )
    appWindow.maximize()
    appWindow.setMenu(null)
    appWindow.show()
    // appWindow.webContents.openDevTools()
    appWindow.on('closed', () => {
        appWindow = null
    })
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(
            path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
            )
        )
    }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
}
const controller = new AbortController()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    clearLogFiles() // Clear logs on startup

    // For safeStorage of secrets
    if (safeStorage.isEncryptionAvailable()) {
        mainLogger.info('Encryption is available and can be used.')
    } else {
        mainLogger.warn(
            'Encryption is not available. Fallback mechanisms might be required.'
        )
    }

    mainLogger.info('Application is ready. Spawning app window.')
    spawnAppWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    mainLogger.info('All windows closed. Quitting application.')
    // if (process.platform !== 'darwin') {
    app.quit()
    // }
})

app.on('browser-window-focus', function () {
    if (!DEV_MODE) {
        globalShortcut.register('CommandOrControl+R', () => {
            console.log('CommandOrControl+R is pressed: Shortcut Disabled')
            mainLogger.debug('CommandOrControl+R is pressed: Shortcut Disabled')
        })
        globalShortcut.register('F5', () => {
            console.log('F5 is pressed: Shortcut Disabled')
            mainLogger.debug('F5 is pressed: Shortcut Disabled')
        })
    }
})

app.on('browser-window-blur', function () {
    globalShortcut.unregister('CommandOrControl+R')
    globalShortcut.unregister('F5')
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit()
//     }
// })

app.on('before-quit', () => {
    if (!serverProcess) {
        mainLogger.info('No server process found. Quitting application.')
        return
    }
    if (serverProcess.pid) {
        mainLogger.info('Killing server process with pid:', serverProcess.pid)
        process.kill(serverProcess.pid, 'SIGTERM')
    }
    serverProcess.kill(9) // Make sure to kill the server process when the app is closing

    if (serverProcess.killed) {
        mainLogger.info('Server process was successfully killed.')
    } else {
        mainLogger.warn('Failed to kill the server process.')
    }
})

/*
 * ======================================================================================
 *                                IPC Main Events
 * ======================================================================================
 */

ipcMain.handle('ping', () => {
    console.log('PONG!')
    return 'pong'
})

ipcMain.on('log-error', (event, error) => {
    rendererLogger.error(error)
})

ipcMain.handle('open-logs-directory', () => {
    shell.openPath(logDir)
})

ipcMain.on('get-port', event => {
    event.reply('get-port-response', use_port)
})

ipcMain.on('get-file-path', event => {
    dialog
        .showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
        })
        .then(result => {
            if (!result.canceled && result.filePaths.length > 0) {
                event.reply('file-path-response', result.filePaths[0])
            } else {
                event.reply('file-path-response', 'cancelled')
            }
        })
        .catch(err => {
            mainLogger.error(
                '(IPC Event get-file-path) Failed to open dialog:',
                err
            )
            event.reply('file-path-response', 'error')
        })
})

// IPC handlers for encrypting and decrypting data
ipcMain.handle('encrypt-data', async (event, plainText) => {
    try {
        const encrypted = safeStorage.encryptString(plainText)
        return encrypted.toString('hex') // send as string to render process
    } catch (error) {
        mainLogger.error(
            '(IPC Event encrypt-data) Failed to encrypt data:',
            error
        )
        throw error
    }
})

ipcMain.handle('decrypt-data', async (event, encryptedHex) => {
    try {
        const encryptedBuffer = Buffer.from(encryptedHex, 'hex')
        const decrypted = safeStorage.decryptString(encryptedBuffer)
        return decrypted
    } catch (error) {
        mainLogger.error(
            '(IPC Event decrypt-data) Failed to decrypt data:',
            error
        )
        throw error
    }
})

ipcMain.handle('save-data', async (event, plainText) => {
    if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(plainText)
        const filePath = path.join(app.getPath('userData'), 'secureData.bin')
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '')
        }
        try {
            fs.writeFileSync(filePath, encrypted)
            return { success: true }
        } catch (error) {
            mainLogger.error(
                '(IPC Event save-data) Failed to save encrypted data:',
                error
            )
            return { success: false, message: 'Failed to save encrypted data' }
        }
    } else {
        return { success: false, message: 'Encryption not available' }
    }
})

ipcMain.handle('load-data', async () => {
    const filePath = path.join(app.getPath('userData'), 'secureData.bin')
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '')
    }
    try {
        const encryptedData = fs.readFileSync(filePath)
        if (safeStorage.isEncryptionAvailable()) {
            const decrypted = safeStorage.decryptString(encryptedData)
            return { success: true, data: decrypted }
        } else {
            return { success: false, message: 'Decryption not available' }
        }
    } catch (error) {
        mainLogger.error(
            '(IPC Event load-data) Failed to read encrypted data:',
            error
        )
        return { success: false, message: 'Failed to read encrypted data' }
    }
})

ipcMain.handle('check-has-encrypted-data', async () => {
    const filePath = path.join(app.getPath('userData'), 'secureData.bin')
    try {
        await fs.promises.access(filePath, fs.constants.F_OK)
        if (safeStorage.isEncryptionAvailable()) {
            return { success: true }
        } else {
            return { success: false, message: 'Data not available' }
        }
    } catch (error) {
        // This just means the file doesn't exist
        // logger.error('(IPC Event check-has-encrypted-data) Failed to get encrypted data:', error)
        return { success: false, message: 'Failed to get encrypted data' }
    }
})

ipcMain.handle('delete-encrypted-data', async () => {
    const filePath = path.join(app.getPath('userData'), 'secureData.bin')
    try {
        // Check if file exists before attempting to delete
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath) // Delete the file
            return {
                success: true,
                message: 'Encrypted data deleted successfully.',
            }
        } else {
            return { success: false, message: 'File does not exist.' }
        }
    } catch (error) {
        mainLogger.error(
            '(IPC Event delete-encrypted-data) Failed to delete encrypted data:',
            error
        )
        return { success: false, message: 'Failed to delete encrypted data.' }
    }
})
