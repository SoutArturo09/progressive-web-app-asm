import { useEffect, useState } from 'react';
import { getTasks } from '../db';
import type { MyDB } from '../db';

export default function TaskList() {
  const [tasks, setTasks] = useState<MyDB['tasks']['value'][]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      if (navigator.onLine) {
        console.log('🟢 Online: cargando tareas desde el backend...');
        const res = await fetch('http://localhost:3000/api/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        } else {
          console.warn('⚠️ Error al traer tareas del servidor, usando locales');
          const localTasks = await getTasks();
          setTasks(localTasks);
        }
      } else {
        console.log('📴 Offline: cargando tareas locales...');
        const localTasks = await getTasks();
        setTasks(localTasks);
      }
    } catch (err) {
      console.error('❌ Error cargando tareas:', err);
      const localTasks = await getTasks();
      setTasks(localTasks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();

    const handleNewTask = (e: any) => {
      setTasks((prev) => [...prev, e.detail]);
    };
    window.addEventListener('tasks-added', handleNewTask);

    return () => window.removeEventListener('tasks-added', handleNewTask);
  }, []);

  if (loading) return <p>Cargando tareas...</p>;

  return (
    <div>
      <h2>Tareas guardadas</h2>
      {tasks.length === 0 ? (
        <p>No hay tareas registradas.</p>
      ) : (
        <ul>
          {tasks.map((t, i) => (
            <li key={t.id || i}>
              {t.id ? `${t.id}. ` : ''}{t.text} {t.synced ? '✅' : '📴'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
