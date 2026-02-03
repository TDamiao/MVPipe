import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  connect: (details: any) => ipcRenderer.invoke('oracle:connect', details),
  fetchData: (connectionId: string) => ipcRenderer.invoke('oracle:fetchData', connectionId),
  disconnect: (connectionId: string) => ipcRenderer.invoke('oracle:disconnect', connectionId),
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
});
