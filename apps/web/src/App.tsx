import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { CreateLegacyPage } from '@/pages/CreateLegacyPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClaimPage } from '@/pages/ClaimPage'
import { Toaster } from '@/components/ui/Toaster'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateLegacyPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/claim" element={<ClaimPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  )
}

export default App









