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
  // 🔹 Función que maneja el registro push - CORREGIDA
  // -----------------------------
  const handlePushSubscribe = async () => {
    try {
      console.log('🔄 Iniciando registro push...');

      // 1️⃣ Registrar SW si no está listo
      const registration = swReg ?? await navigator.serviceWorker.ready;
      
      if (!registration) {
        throw new Error('No se pudo obtener el Service Worker');
      }

      // 2️⃣ Solicitar permisos
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('📋 Permiso resultante:', permission);
        
        if (permission !== 'granted') {
          console.warn('⚠️ Permiso de notificaciones denegado');
          return;
        }
      } else if (Notification.permission === 'denied') {
        console.warn('❌ Permiso de notificaciones previamente denegado');
        return;
      }

      // 3️⃣ Obtener suscripción existente y eliminar si hay
      let existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('🗑️ Eliminando suscripción existente...');
        await existingSub.unsubscribe();
        existingSub = null;
      }

      // 4️⃣ Verificar clave VAPID
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Falta VITE_VAPID_PUBLIC_KEY en las variables de entorno');
      }

      console.log('🔑 Clave VAPID:', vapidPublicKey.substring(0, 20) + '...');

      // 5️⃣ Suscribirse a push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // ✅ CORRECCIÓN: Usar toJSON() para acceder a las keys
      const subscriptionJSON = subscription.toJSON();
      console.log('✅ Suscripción creada:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        keys: subscriptionJSON.keys
      });

      // 6️⃣ Enviar al backend - usar el objeto JSON completo
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionJSON),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      console.log('✅ Suscripción push registrada correctamente en el backend');
      setPushRegistered(true); // ✅ ESTA LÍNEA FALTABA O ESTABA COMENTADA

      // 7️⃣ Verificar suscripción en el backend
      const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/subscriptions`);
      const subsData = await verifyResponse.json();
      console.log(`📊 Suscripciones en backend: ${subsData.total}`);

    } catch (err) {
      console.error('❌ Error registrando push:', err);
      alert('Error al activar notificaciones. Revisa la consola.');
    }
  };

  // En tu App.tsx, actualiza el return:
  return (
    <div className="app">
      <h1>🚀 PWA con Offline Form</h1>

      <div className="status-panel">
        {!pushRegistered ? (
          <button onClick={handlePushSubscribe}>
            🔔 Activar Notificaciones Push
          </button>
        ) : (
          <div style={{color: 'green', fontWeight: 'bold'}}>
            ✅ Notificaciones push activadas
          </div>
        )}
      </div>

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