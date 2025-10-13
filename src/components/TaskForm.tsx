import { useState, useEffect } from 'react';
import { addTask, markTaskSynced } from '../db';
import type { MyDB } from '../db';

export default function TaskForm() {
  const [text, setText] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [saving, setSaving] = useState(false);

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

  function tryRegisterSyncTag() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (!('sync' in reg)) return;
      (reg as ServiceWorkerRegistration & { sync: SyncManager }).sync.register('sync-tasks')
        .catch((err) => console.warn('[SYNC] no se pudo registrar sync-tasks:', err));
    }).catch(() => {});
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    if (!text.trim()) return;

    setSaving(true);

    const task: MyDB['tasks']['value'] = {
      text,
      date: new Date().toISOString(),
      synced: false,
    };

    try {
      const id = await addTask(task);

      if (navigator.onLine) {
        const ok = await sendTaskToServer(task);
        if (ok) {
          await markTaskSynced(id);
          setText('');
          alert('✅ Tarea guardada ONLINE');

          // 🔹 Actualiza TaskList solo con esta tarea
          window.dispatchEvent(new CustomEvent('tasks-added', { detail: { ...task, id, synced: true } }));
        } else {
          setText('');
          alert('⚠️ Error al guardar en el servidor, se mantiene localmente');
        }
      } else {
        tryRegisterSyncTag();
        setText('');
        setTimeout(() => {
          alert('📴 Tarea guardada OFFLINE (se subirá cuando vuelvas a conectarte)');
        }, 0);

        window.dispatchEvent(new CustomEvent('tasks-added', { detail: { ...task, id, synced: false } }));
      }
    } catch (err) {
      console.error('Error en submit:', err);
      alert('❌ Error al guardar la tarea');
    } finally {
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