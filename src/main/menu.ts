/**
 * src/main/menu.ts
 *
 * @process      Main. Owns the application menu and drives renderer navigation from it.
 * @purpose      Build the platform-appropriate menu and turn its Navigate items into
 *               route messages for the window.
 * @exports      createApplicationMenu.
 * @dependencies electron: the menu template and webContents.send; ../shared/ipc: the
 *               NAVIGATE channel and RouteId.
 * @sideEffects  Replaces the process-wide application menu.
 * @notes        Navigation is one-way, main → renderer; the renderer turns the route
 *               into a hash change.
 */

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
