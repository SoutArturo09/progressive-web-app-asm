import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import { useEffect } from 'react';
import { syncPendingTasksFromClient } from './utils/syncPending';



function App() {

  useEffect(() => {
  // cuando la app arranca, intenta sincronizar (por si la conexión se restableció)
  syncPendingTasksFromClient();

  const onOnline = () => {
    console.log('[APP] volver a online -> intento de sync cliente');
    syncPendingTasksFromClient();
    // además registra sync en SW si está disponible (opcional)
    navigator.serviceWorker?.ready.then(reg => {
      if ('sync' in reg) {
        (reg as ServiceWorkerRegistration & { sync: SyncManager }).sync.register('sync-tasks')
          .catch(err => console.warn('No se pudo registrar sync en SW:', err));
      }
    });
  };

  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}, []);


  return (
    <div className="app">
      <h1>🚀 PWA con Offline Form</h1>
      <TaskForm />
      <TaskList />
    </div>
  );
}

export default App;
