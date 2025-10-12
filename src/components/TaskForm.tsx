import { useState, useEffect } from 'react';
import { addTask, markTaskSynced } from '../db';
import type { MyDB } from '../db';

export default function TaskForm() {
  const [text, setText] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [saving, setSaving] = useState(false); // evita doble submit

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

  // Intento no bloqueante de registrar sync en el SW
  function tryRegisterSyncTag() {
    // fire-and-forget: no await que bloquee
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) {
        // no hay SW registrado/controlando la página ahora mismo
        console.warn('[SYNC] No hay ServiceWorker registrado para registrar sync.');
        return;
      }
      if (!('sync' in reg)) {
        console.warn('[SYNC] SyncManager no disponible en esta plataforma');
        return;
      }
      (reg as ServiceWorkerRegistration & { sync: SyncManager }).sync
        .register('sync-tasks')
        .then(() => console.log('[SYNC] sync-tasks registrado (client)'))
        .catch((err) => console.warn('[SYNC] no se pudo registrar sync-tasks:', err));
    }).catch((err) => {
      console.warn('[SYNC] error al obtener registration:', err);
    });
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return; // evita doble submit
    if (!text.trim()) return;

    setSaving(true);

    const task: MyDB['tasks']['value'] = {
      text,
      date: new Date().toISOString(),
      synced: false,
    };

    try {
      // 1) Guardar local y obtener id
      const id = await addTask(task);

      // 2) Si hay conexión, subir al backend y marcar
      if (navigator.onLine) {
        const ok = await sendTaskToServer(task);
        if (ok) {
          await markTaskSynced(id);
          // limpiar y alert
          setText('');
          alert('✅ Tarea guardada ONLINE');
        } else {
          setText('');
          alert('⚠️ Error al guardar en el servidor, se mantiene localmente');
        }
      } else {
        // OFFLINE: intentar registrar sync de forma no bloqueante
        tryRegisterSyncTag();

        // Mostrar alerta y limpiar input inmediatamente sin bloquear render
        // Usamos setTimeout 0 para evitar problemas con alert() y React render
        setTimeout(() => {
          alert('📴 Tarea guardada OFFLINE (se subirá cuando vuelvas a conectarte)');
        }, 0);

        setText('');
      }
    } catch (err) {
      console.error('Error en submit:', err);
      alert('❌ Error al guardar la tarea');
    } finally {
      // permitir nuevos submits
      // retraso corto para evitar clicks rapidísimos
      setTimeout(() => setSaving(false), 300);
    }
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
        disabled={saving}
      />
      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
      {isOffline && <p style={{ color: 'red' }}>Estás sin conexión ⚠️</p>}
    </form>
  );
}

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
