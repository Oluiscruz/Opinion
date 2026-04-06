import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from './App.tsx'
import './index.scss'
import User from './pages/profile/user.tsx';
import { AuthProvider } from './context/context.tsx';
import Register from './pages/profile/register.tsx';
import Login from './pages/profile/login.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />{/* home page */}
        <Route path="/register" element={<Register />} />{/* user Register */}
        <Route path="/login" element={<Login />} />{/* user login */}
        <Route path="/profile" element={<User />} />{/* user page */}
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
