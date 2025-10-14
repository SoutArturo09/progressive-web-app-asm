import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import { useEffect, useState } from 'react';
import { syncPendingTasksFromClient } from './utils/syncPending';
import { registerSW } from 'virtual:pwa-register';

function App() {
  const [pushRegistered, setPushRegistered] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 1️⃣ Registro del SW al cargar la app
    registerSW({ onRegistered(r: any) { setSwReg(r); } });

    // cuando la app arranca, intenta sincronizar
    syncPendingTasksFromClient();

    const onOnline = () => {
      console.log('[APP] volver a online -> intento de sync cliente');
      syncPendingTasksFromClient();
      if (swReg && 'sync' in swReg) {
        (swReg as ServiceWorkerRegistration & { sync: SyncManager }).sync.register('sync-tasks')
          .catch(err => console.warn('No se pudo registrar sync en SW:', err));
      }
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [swReg]);

  // -----------------------------
  // 🔹 Función que maneja el registro push
  // -----------------------------
  const handlePushSubscribe = async () => {
    try {
      // 1️⃣ Registrar SW si no está listo
      const registration = swReg ?? await navigator.serviceWorker.register('/sw.js');

      // 2️⃣ Forzar siempre solicitud de permiso
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('⚠️ Permiso de notificaciones denegado');
          return;
        }
      }

      // 3️⃣ Si ya existe una suscripción, cancelamos la vieja para forzar nueva
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
        console.log('⚠️ Suscripción previa eliminada para forzar nueva');
      }

      // 4️⃣ Suscribirse a push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      });

      // 5️⃣ Enviar al backend
      await fetch(`${import.meta.env.VITE_API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      console.log('✅ Suscripción push registrada correctamente');
      setPushRegistered(true);

    } catch (err) {
      console.error('Error registrando push:', err);
    }
  };

  return (
    <div className="app">
      <h1>🚀 PWA con Offline Form</h1>

      {!pushRegistered && (
        <button onClick={handlePushSubscribe}>
          🔔 Activar Notificaciones Push
        </button>
      )}

      <TaskForm />
      <TaskList />
    </div>
  );
}

export default App;

// -----------------------------
// 🔹 Utilidad: convertir clave VAPID base64 a Uint8Array
// -----------------------------
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}
