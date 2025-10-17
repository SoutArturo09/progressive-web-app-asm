import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import { useEffect, useState } from 'react';
import { syncPendingTasksFromClient } from './utils/syncPending';

function App() {
  const [pushRegistered, setPushRegistered] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);
  const [swStatus, setSwStatus] = useState<'loading' | 'active' | 'error'>('loading');

  useEffect(() => {
    const initializeSW = async () => {
      try {
        if ('serviceWorker' in navigator) {
          // Esperar a que el SW esté listo
          const registration = await navigator.serviceWorker.ready;
          setSwReg(registration);
          setSwStatus('active');
          console.log('🎯 SW listo en App - Netlify:', registration.active?.state);
          
          // Verificar si el SW está controlando
          if (navigator.serviceWorker.controller) {
            console.log('✅ SW controlando página - Listo para push');
          } else {
            console.warn('⚠️ SW registrado pero no controlando');
          }
        }
      } catch (error) {
        console.error('❌ Error inicializando SW:', error);
        setSwStatus('error');
      }
    };

    initializeSW();
    syncPendingTasksFromClient();

    const onOnline = () => {
      console.log('[APP] Volviendo online - sincronizando...');
      syncPendingTasksFromClient();
      
      if (swReg && 'sync' in swReg) {
        interface SyncManager {
          register(tag: string): Promise<void>;
        }

        interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
          sync: SyncManager;
        }

                (swReg as ServiceWorkerRegistrationWithSync).sync.register('sync-tasks')
                  .then(() => console.log('✅ Sync registrado en SW'))
                  .catch((err: Error) => console.warn('⚠️ No se pudo registrar sync:', err));
      }
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [swReg]);

  const handlePushSubscribe = async () => {
    try {
      console.log('🔄 Iniciando registro push en Netlify...');

      const registration = swReg ?? await navigator.serviceWorker.ready;
      
      if (!registration) {
        throw new Error('No se pudo obtener el Service Worker');
      }

      // Verificar permisos
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      console.log('📋 Permiso concedido');

      // Eliminar suscripción existente
      const existingSub = await registration.pushManager.getSubscription();
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
      console.log('✅ Suscripción creada - Endpoint:', subscription.endpoint);

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

      // TEST INMEDIATO: Enviar notificación de prueba
      console.log('🧪 Enviando test de notificación...');
      const testResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Test desde Netlify',
          body: `Hora: ${new Date().toLocaleTimeString()} - ¡Funciona!`
        }),
      });

      const testResult = await testResponse.json();
      console.log('🧪 Resultado test:', testResult);

    } catch (err: any) {
      console.error('❌ Error registrando push:', err);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="app">
      <h1>🚀 PWA con Offline Form</h1>

      <div className="status-panel">
        <div style={{ marginBottom: '10px' }}>
          Estado SW: 
          <span style={{ 
            color: swStatus === 'active' ? 'green' : swStatus === 'error' ? 'red' : 'orange',
            fontWeight: 'bold',
            marginLeft: '5px'
          }}>
            {swStatus === 'active' ? '✅ Activo' : swStatus === 'error' ? '❌ Error' : '⏳ Cargando'}
          </span>
        </div>

        {!pushRegistered ? (
          <button onClick={handlePushSubscribe} disabled={swStatus !== 'active'}>
            {swStatus !== 'active' ? '⏳ Esperando SW...' : '🔔 Activar Notificaciones Push'}
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