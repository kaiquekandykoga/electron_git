import { BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron';
import { IPC_CHANNELS, RouteId } from '../shared/ipc';

function navigate(mainWindow: BrowserWindow, route: RouteId): void {
  mainWindow.webContents.send(IPC_CHANNELS.NAVIGATE, route);
}

export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'editMenu' as const },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => navigate(mainWindow, 'dashboard'),
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+2',
          click: () => navigate(mainWindow, 'settings'),
        },
      ],
    },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
