import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import { useEffect, useState } from 'react';
import { syncPendingTasksFromClient } from './utils/syncPending';

function App() {
  const [pushRegistered, setPushRegistered] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Registrar SW manualmente
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSwReg(registration);
        console.log('🎯 SW listo en App');
      });
    }

    // Sincronizar al cargar
    syncPendingTasksFromClient();

    const onOnline = () => {
      console.log('[APP] Volviendo online - sincronizando...');
      syncPendingTasksFromClient();
      
      // Registrar sync con el Service Worker
      if (swReg && 'sync' in swReg) {
        (swReg as any).sync.register('sync-tasks')
          .then(() => console.log('✅ Sync registrado en SW'))
          .catch((err: Error) => console.warn('❌ No se pudo registrar sync:', err));
      }
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [swReg]);

  const handlePushSubscribe = async () => {
    try {
      console.log('🔄 Iniciando registro push...');

      const registration = swReg ?? await navigator.serviceWorker.ready;
      
      if (!registration) {
        throw new Error('No se pudo obtener el Service Worker');
      }

      // Solicitar permisos
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

      // Eliminar suscripción existente
      let existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('🗑️ Eliminando suscripción existente...');
        await existingSub.unsubscribe();
      }

      // Verificar clave VAPID
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Falta VITE_VAPID_PUBLIC_KEY');
      }

      console.log('🔑 Clave VAPID:', vapidPublicKey.substring(0, 20) + '...');

      // Suscribirse
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJSON = subscription.toJSON();
      console.log('✅ Suscripción creada:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
      });

      // Enviar al backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionJSON),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      console.log('✅ Suscripción registrada en backend');
      setPushRegistered(true);

      // TEST: Enviar notificación de prueba
      const testResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Prueba desde Netlify',
          body: '¡Notificaciones funcionando!'
        }),
      });

      const testResult = await testResponse.json();
      console.log('🧪 Test notificación:', testResult);

    } catch (err) {
      console.error('❌ Error registrando push:', err);
    }
  };

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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}