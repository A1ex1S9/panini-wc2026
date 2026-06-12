import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import { Layout } from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Album from './pages/Album'
import Packs from './pages/Packs'
import Inventory from './pages/Inventory'
import Trade from './pages/Trade'
import UserAlbum from './pages/UserAlbum'

function RequireAuth() {
  const token = useAuth((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<RequireAuth />}>
          <Route path="/album" element={<Album />} />
          <Route path="/packs" element={<Packs />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/users/:id" element={<UserAlbum />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
