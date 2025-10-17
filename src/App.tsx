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
    console.log('📍 Ubicación actual:', window.location.origin);
    
    // 1. Verificar Service Worker
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers no soportados');
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('🔧 SW ready:', {
      hasActive: !!registration.active,
      scope: registration.scope,
      state: registration.active?.state
    });

    // 2. Verificar permisos
    if (Notification.permission === 'denied') {
      throw new Error('Permisos de notificación denegados permanentemente');
    }

    const permission = await Notification.requestPermission();
    console.log('📋 Permiso:', permission);

    if (permission !== 'granted') {
      throw new Error('Permiso no concedido');
    }

    // 3. Suscribir
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    console.log('🔑 VAPID Key (primeros 20 chars):', vapidKey?.substring(0, 20));

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    const subData = subscription.toJSON();
    console.log('📨 Suscripción creada:', {
      endpoint: subscription.endpoint,
      keys: subData.keys
    });

    // 4. Enviar al backend - CON MÁS LOGGING
    console.log('🌐 Enviando a API:', `${import.meta.env.VITE_API_URL}/api/subscribe`);
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subData),
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    console.log('✅ Suscripción registrada en backend');

    // 5. TEST INMEDIATO - enviar notificación de prueba
    console.log('🧪 Enviando notificación de prueba...');
    const testResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test desde Netlify',
        body: `Hora: ${new Date().toLocaleTimeString()}`
      }),
    });

    const testResult = await testResponse.json();
    console.log('🧪 Resultado test:', testResult);

  } catch (error) {
    console.error('❌ Error completo:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
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
