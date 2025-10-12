import { useEffect, useState } from 'react';
import { getTasks } from '../db';
import type { MyDB } from '../db';

export default function TaskList() {
  const [tasks, setTasks] = useState<MyDB['tasks']['value'][]>([]);

  const loadTasks = async () => {
    const data = await getTasks();
    setTasks(data);
  };

  useEffect(() => {
    // 🔹 Cargar al inicio
    loadTasks();

    // 🔹 Escuchar cambios desde localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tasks-updated') loadTasks();
    };
    window.addEventListener('storage', handleStorageChange);

    // 🔹 Refresco automático cada 4 seg por seguridad
    const interval = setInterval(() => loadTasks(), 4000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <ul>
      {tasks.map((t) => (
        <li key={t.id}>
          {t.text} — {new Date(t.date).toLocaleString()}
        </li>
      ))}
    </ul>
  );
}
