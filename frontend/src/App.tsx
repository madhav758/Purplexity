import React from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
function App() {
  return (
    <div className="dark w-full min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversation/:conversationId" element={<Conversations />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App