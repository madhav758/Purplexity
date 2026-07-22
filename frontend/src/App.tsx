import React from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import { useParams } from 'react-router-dom';
function ConversationWrapper() {
  const { conversationId } = useParams();
  return <Conversations key={conversationId} />
}

function App() {
  return (
    <div className="dark w-full min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversation/:conversationId" element={<ConversationWrapper />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App