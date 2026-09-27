import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

const tasks = [
  { to: '/preparation', title: 'Prepare' },
  { to: '/assigned-units', title: 'Assign Work' },
  { to: '/monitor', title: 'Monitor' },
  { to: '/print/bin-labels', title: 'Print' }
];

export function AdminHomePage() {
  const { user } = useAuth();
  const visibleTasks = user.role === 'SUPER_ADMIN'
    ? [...tasks.slice(0, 3), { to: '/users', title: 'People' }, tasks[3]]
    : tasks;
  return <>
    <div className="page-heading minimal-heading"><h1>What do you want to do?</h1></div>
    <div className="task-grid">{visibleTasks.map((task) => <Link className="card task-card" to={task.to} key={task.to}><h2>{task.title}</h2></Link>)}</div>
  </>;
}
