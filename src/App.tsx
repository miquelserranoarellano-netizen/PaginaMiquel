import { useEffect } from 'react';
import { AppShell } from '@/modules/UI/AppShell';
import { Toaster } from '@/modules/UI/toast';
import { DialogHost } from '@/modules/UI/dialog';
import { ProjectsScreen } from '@/modules/ProjectManager/ProjectsScreen';
import { installAutosave } from '@/modules/ProjectManager/persistence';
import { initCloud } from '@/modules/ProjectManager/cloud';
import { initAccount } from '@/modules/ProjectManager/account';
import { useEditorStore } from '@/store/editorStore';

export default function App() {
  const screen = useEditorStore((s) => s.screen);
  useEffect(() => {
    installAutosave();
    void initCloud();
    void initAccount();
  }, []);
  return (
    <>
      {screen === 'editor' ? <AppShell /> : <ProjectsScreen />}
      <Toaster />
      <DialogHost />
    </>
  );
}
