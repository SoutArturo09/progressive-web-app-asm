import { getPendingTasks, updateTask } from '../db';

export async function syncPendingTasksFromClient() {
  if (!navigator.onLine) return;
  const pending = await getPendingTasks();
  if (pending.length === 0) return;

  for (const task of pending) {
    try {
      // opcional: formatea la fecha aquí si tu backend lo necesita
      const res = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });

      if (res.ok) {
        // marca como sincronizada en IndexedDB
        task.synced = true;
        await updateTask(task);
        console.log('[SYNC_CLIENT] Tarea subida:', task);
      } else {
        const text = await res.text().catch(()=>{});
        console.warn('[SYNC_CLIENT] Server responded not ok', res.status, text);
      }
    } catch (err) {
      console.error('[SYNC_CLIENT] Error subiendo tarea:', err);
      // si falla, no marcamos como synced — se reintenta después
    }
  }
}
