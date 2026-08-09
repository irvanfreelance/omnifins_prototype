import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import CoaPage from './pages/master-data/CoaPage'
import CostCenterPage from './pages/master-data/CostCenterPage'
import AsetPage from './pages/master-data/AsetPage'
import RegisterPage from './pages/RegisterPage'
import RapbPage from './pages/RapbPage'
import CashAdvancePage from './pages/CashAdvancePage'
import ApprovalPage from './pages/ApprovalPage'
import DonasiPage from './pages/DonasiPage'
import DistribusiPage from './pages/DistribusiPage'
import ProgramDanaPage from './pages/ProgramDanaPage'
import KontakPage from './pages/KontakPage'
import KasBankPage from './pages/KasBankPage'
import RekonsiliasiPage from './pages/RekonsiliasiPage'
import JurnalPage from './pages/JurnalPage'
import TutupBukuPage from './pages/TutupBukuPage'
import LaporanPage from './pages/LaporanPage'
import SettingPage from './pages/SettingPage'
import AuditTrailPage from './pages/AuditTrailPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/master-data/coa" element={<CoaPage />} />
        <Route path="/master-data/cost-center" element={<CostCenterPage />} />
        <Route path="/master-data/aset" element={<AsetPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rapb" element={<RapbPage />} />
        <Route path="/cash-advance" element={<CashAdvancePage />} />
        <Route path="/approval" element={<ApprovalPage />} />
        <Route path="/donasi" element={<DonasiPage />} />
        <Route path="/distribusi" element={<DistribusiPage />} />
        <Route path="/program-dana" element={<ProgramDanaPage />} />
        <Route path="/kontak" element={<KontakPage />} />
        <Route path="/kas-bank" element={<KasBankPage />} />
        <Route path="/rekonsiliasi" element={<RekonsiliasiPage />} />
        <Route path="/jurnal" element={<JurnalPage />} />
        <Route path="/tutup-buku" element={<TutupBukuPage />} />
        <Route path="/laporan" element={<LaporanPage />} />
        <Route path="/setting" element={<SettingPage />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
      </Route>
    </Routes>
  )
}

export default App
