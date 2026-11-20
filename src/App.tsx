import { useEffect } from 'react';
import { AppShell } from '@/modules/UI/AppShell';
import { Toaster } from '@/modules/UI/toast';
import { DialogHost } from '@/modules/UI/dialog';
import { ProjectsScreen } from '@/modules/ProjectManager/ProjectsScreen';
import { installAutosave } from '@/modules/ProjectManager/persistence';
import { initCloud } from '@/modules/ProjectManager/cloud';
import { initAccount, useAccount } from '@/modules/ProjectManager/account';
import { LoginScreen } from '@/modules/ProjectManager/LoginScreen';
import { useEditorStore } from '@/store/editorStore';

export default function App() {
  const screen = useEditorStore((s) => s.screen);
  // En la web con cuentas, lo primero es iniciar sesión (o elegir seguir sin cuenta).
  const needsLogin = useAccount((s) => s.available === true && !s.username && !s.guest);
  useEffect(() => {
    installAutosave();
    void initCloud();
    void initAccount();
  }, []);
  return (
    <>
      {screen === 'editor' ? <AppShell /> : needsLogin ? <LoginScreen /> : <ProjectsScreen />}
      <Toaster />
      <DialogHost />
    </>
  );
}
