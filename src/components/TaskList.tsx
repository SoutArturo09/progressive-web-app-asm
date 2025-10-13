import { useEffect, useState } from 'react';
import { getTasks } from '../db';
import type { MyDB } from '../db';

export default function TaskList() {
  const [tasks, setTasks] = useState<MyDB['tasks']['value'][]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    const localTasks = await getTasks();
    setTasks(localTasks);
    setLoading(false);
  };

  useEffect(() => {
    // 🔹 Cargar tareas locales al inicio
    loadTasks();

    // 🔹 Escuchar tareas nuevas
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

