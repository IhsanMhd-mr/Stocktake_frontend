import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AdminAssignedUnitDetailPage } from './pages/AdminAssignedUnitDetailPage.jsx';
import { AdminAssignedUnitsPage } from './pages/AdminAssignedUnitsPage.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { AssignedUnitBuilderPage, NewAssignedUnitPage } from './pages/AssignedUnitBuilderPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { UserAssignedUnitPage } from './pages/UserAssignedUnitPage.jsx';
import { UserBinPage } from './pages/UserBinPage.jsx';
import { UserWorkPage } from './pages/UserWorkPage.jsx';
import { PreparationPage } from './pages/PreparationPage.jsx';
import { PreparationZonePage } from './pages/PreparationZonePage.jsx';
import { UnitPreparationPage } from './pages/UnitPreparationPage.jsx';
import { BinLabelPrintPage } from './pages/BinLabelPrintPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { AdminHomePage } from './pages/AdminHomePage.jsx';
import { HelpPage } from './pages/HelpPage.jsx';
import { HomeRedirect, ProtectedRoute, RoleRoute } from './routes/guards.jsx';

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route element={<RoleRoute roles={['USER']} />}>
          <Route path="/my-work" element={<UserWorkPage />} />
          <Route path="/my-work/:assignedUnitId" element={<UserAssignedUnitPage />} />
          <Route path="/my-work/:assignedUnitId/bin/:binId" element={<UserBinPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
        <Route element={<RoleRoute roles={['ADMIN', 'SUPER_ADMIN']} />}>
          <Route path="/dashboard" element={<AdminHomePage />} />
          <Route path="/monitor" element={<AdminDashboardPage />} />
          <Route path="/preparation" element={<PreparationPage />} />
          <Route path="/preparation/zones" element={<PreparationPage />} />
          <Route path="/preparation/zones/:zoneId" element={<PreparationZonePage />} />
          <Route path="/preparation/units/:unitId" element={<UnitPreparationPage />} />
          <Route path="/print/bin-labels" element={<BinLabelPrintPage />} />
          <Route path="/assigned-units" element={<AdminAssignedUnitsPage />} />
          <Route path="/assigned-units/new" element={<NewAssignedUnitPage />} />
          <Route path="/assigned-units/:assignedUnitId/edit" element={<AssignedUnitBuilderPage />} />
          <Route path="/assigned-units/:assignedUnitId" element={<AdminAssignedUnitDetailPage />} />
        </Route>
        <Route element={<RoleRoute roles={['SUPER_ADMIN']} />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
