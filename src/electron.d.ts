/** API expuesta por electron/preload.cjs (solo existe en la app de escritorio). */
export interface DesktopFileFilter {
  name: string;
  extensions: string[];
}

export interface HomeDesignDesktopApi {
  isDesktop: true;
  platform: string;
  projects: {
    list(): Promise<unknown[]>;
    read(id: string): Promise<string>;
    write(id: string, docJson: string, metaJson: string): Promise<void>;
    remove(id: string): Promise<void>;
    folder(): Promise<string>;
  };
  files: {
    /** Guarda datos en un fichero elegido por el usuario. Devuelve la ruta o null si cancela. */
    save(options: { defaultName: string; filters: DesktopFileFilter[]; data: string; encoding: 'utf8' | 'base64' }): Promise<string | null>;
    /** Abre un fichero elegido por el usuario. */
    open(options: { filters: DesktopFileFilter[]; encoding: 'utf8' | 'base64' }): Promise<{ name: string; data: string } | null>;
  };
  takePendingFile(): Promise<{ name: string; data: string } | null>;
  onFileAvailable(handler: () => void): void;
  onBeforeClose(handler: () => Promise<void>): void;
}

declare global {
  interface Window {
    homeDesign?: HomeDesignDesktopApi;
  }
}
