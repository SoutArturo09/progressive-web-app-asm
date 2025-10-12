import { useState, useEffect } from 'react';
import { addTask, markTaskSynced } from '../db';
import type { MyDB } from '../db';

export default function TaskForm() {
  const [text, setText] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Detectar conexión/desconexión
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const task: MyDB['tasks']['value'] = {
      text,
      date: new Date().toISOString(),
      synced: false,
    };

    // 1️⃣ Guardar en IndexedDB y obtener ID local
    const id = await addTask(task);

    // 2️⃣ Si hay conexión, subir al backend
    if (navigator.onLine) {
      const ok = await sendTaskToServer(task);

      if (ok) {
        // ✅ Marcar como sincronizada en IndexedDB
        await markTaskSynced(id);
        alert('✅ Tarea guardada ONLINE');
      } else {
        alert('⚠️ Error al guardar en el servidor, se mantiene localmente');
      }
    } else {
      // 3️⃣ Si no hay conexión, registrar background sync
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        await (reg as ServiceWorkerRegistration & { sync: SyncManager }).sync.register('sync-tasks');
      } else {
        console.warn('⚠️ Background Sync no soportado');
      }
      alert('📴 Tarea guardada OFFLINE');
    }

    // 4️⃣ Borrar input después del alert
    setText('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Lista de tareas</h2>
      <input
        type="text"
        placeholder="Nueva tarea..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <button type="submit">Guardar</button>
      {isOffline && <p style={{ color: 'red' }}>Estás sin conexión ⚠️</p>}
    </form>
  );
}

// 🔹 Enviar al servidor
async function sendTaskToServer(task: MyDB['tasks']['value']): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.ok;
  } catch (err) {
    console.error('sendTaskToServer error', err);
    return false;
  }
}
