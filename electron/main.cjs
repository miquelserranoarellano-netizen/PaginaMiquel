/**
 * HomeDesign Studio — proceso principal de Electron.
 *
 * - Ventana con aislamiento de contexto y sandbox (el renderer no accede a Node).
 * - Proyectos en <userData>/projects: <id>.hdsp.json + <id>.meta.json.
 *   Escritura atómica (fichero temporal + rename) y copia .bak de la versión anterior.
 * - Diálogos nativos para exportar e importar.
 * - Al cerrar, se pide al renderer que guarde los cambios pendientes.
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
let mainWindow = null;
let allowClose = false;
let pendingFile = process.argv.find((a) => a.toLowerCase().endsWith('.hdsp')) || null;

const projectsDir = () => path.join(app.getPath('userData'), 'projects');

function safeId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Identificador de proyecto no válido');
  return id;
}

async function ensureDir() {
  await fs.mkdir(projectsDir(), { recursive: true });
}

async function atomicWrite(file, data) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  const handle = await fs.open(tmp, 'w');
  try {
    await handle.writeFile(data, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (fsSync.existsSync(file)) await fs.copyFile(file, `${file}.bak`).catch(() => undefined);
  await fs.rename(tmp, file);
}

async function readJsonWithBackup(file) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    JSON.parse(txt);
    return txt;
  } catch (err) {
    const bak = `${file}.bak`;
    if (fsSync.existsSync(bak)) {
      const txt = await fs.readFile(bak, 'utf8');
      JSON.parse(txt);
      return txt;
    }
    throw err;
  }
}

function registerIpc() {
  ipcMain.handle('projects:list', async () => {
    await ensureDir();
    const files = await fs.readdir(projectsDir());
    const metas = [];
    for (const f of files) {
      if (!f.endsWith('.meta.json')) continue;
      try {
        metas.push(JSON.parse(await readJsonWithBackup(path.join(projectsDir(), f))));
      } catch {
        /* metadatos dañados: se ignoran */
      }
    }
    return metas;
  });

  ipcMain.handle('projects:read', async (_e, id) => {
    return readJsonWithBackup(path.join(projectsDir(), `${safeId(id)}.hdsp.json`));
  });

  ipcMain.handle('projects:write', async (_e, id, docJson, metaJson) => {
    safeId(id);
    if (typeof docJson !== 'string' || typeof metaJson !== 'string') throw new Error('Datos no válidos');
    JSON.parse(docJson);
    JSON.parse(metaJson);
    await ensureDir();
    await atomicWrite(path.join(projectsDir(), `${id}.hdsp.json`), docJson);
    await atomicWrite(path.join(projectsDir(), `${id}.meta.json`), metaJson);
  });

  ipcMain.handle('projects:remove', async (_e, id) => {
    safeId(id);
    for (const suffix of ['.hdsp.json', '.meta.json', '.hdsp.json.bak', '.meta.json.bak']) {
      const file = path.join(projectsDir(), `${id}${suffix}`);
      if (!fsSync.existsSync(file)) continue;
      // Se envía a la papelera del sistema para poder recuperarlo.
      await shell.trashItem(file).catch(() => fs.unlink(file));
    }
  });

  ipcMain.handle('projects:folder', async () => {
    await ensureDir();
    return projectsDir();
  });

  ipcMain.handle('files:save', async (_e, opts) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('documents'), String(opts.defaultName || 'exportacion')),
      filters: opts.filters,
    });
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, Buffer.from(String(opts.data), opts.encoding === 'base64' ? 'base64' : 'utf8'));
    return result.filePath;
  });

  ipcMain.handle('files:open', async (_e, opts) => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: opts.filters });
    if (result.canceled || !result.filePaths[0]) return null;
    const file = result.filePaths[0];
    const buf = await fs.readFile(file);
    return { name: path.basename(file), data: opts.encoding === 'base64' ? buf.toString('base64') : buf.toString('utf8') };
  });

  ipcMain.handle('app:pending-file', async () => {
    if (!pendingFile) return null;
    const file = pendingFile;
    pendingFile = null;
    try {
      return { name: path.basename(file), data: await fs.readFile(file, 'utf8') };
    } catch {
      return null;
    }
  });

  ipcMain.on('app:close-ready', () => {
    allowClose = true;
    mainWindow?.close();
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Archivo',
      submenu: [
        { label: 'Abrir carpeta de proyectos', click: async () => shell.openPath((await ensureDir(), projectsDir())) },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Ampliar interfaz' },
        { role: 'zoomOut', label: 'Reducir interfaz' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de HomeDesign Studio',
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'HomeDesign Studio',
              message: `HomeDesign Studio ${app.getVersion()}`,
              detail: 'Diseño de viviendas en 2D y 3D con recorrido virtual.\nLos proyectos se guardan en tu equipo.',
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: 'HomeDesign Studio',
    backgroundColor: '#f4f5f6',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Enlaces externos en el navegador del sistema; nunca navegar fuera de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (DEV_URL && url.startsWith(DEV_URL)) return;
    e.preventDefault();
  });

  mainWindow.on('close', (e) => {
    if (allowClose) return;
    e.preventDefault();
    mainWindow.webContents.send('app:before-close');
    // Seguridad: si el renderer no responde, se cierra igualmente.
    setTimeout(() => {
      allowClose = true;
      mainWindow?.close();
    }, 5000);
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (DEV_URL) mainWindow.loadURL(DEV_URL);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  const openFromArgs = (argv) => {
    const file = argv.find((a) => a.toLowerCase().endsWith('.hdsp'));
    if (!file) return;
    pendingFile = file;
    mainWindow?.webContents.send('app:file-available');
  };
  app.on('open-file', (e, file) => {
    e.preventDefault();
    openFromArgs([file]);
  });
  app.on('second-instance', (_e, argv) => {
    openFromArgs(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    registerIpc();
    buildMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        allowClose = false;
        createWindow();
      }
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
