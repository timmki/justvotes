import { Link, Route, Routes } from 'react-router-dom';

export function App() { return <Routes><Route path="*" element={<main><h1>JustVotes</h1><p>Die Anwendung ist bereit.</p><nav><Link to="/polls">Polls</Link> · <Link to="/admin">Admin</Link></nav></main>} /></Routes>; }
