import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { registerDragContext } from './drag3d';
import { registerViewer } from './viewerRef';

/** Conecta la cámara y los controles con el arrastre de muebles y la exportación. */
export function DragBridge() {
  const { camera, gl, scene, controls } = useThree();
  useEffect(() => {
    registerDragContext({
      camera,
      dom: gl.domElement,
      setControlsEnabled: (v) => {
        if (controls) (controls as unknown as { enabled: boolean }).enabled = v;
      },
    });
    registerViewer({ camera, gl, scene, controls: controls as never });
    return () => {
      registerDragContext(null);
      registerViewer(null);
    };
  }, [camera, gl, scene, controls]);
  return null;
}
