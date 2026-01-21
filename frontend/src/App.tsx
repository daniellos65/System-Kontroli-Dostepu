import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css'; // To musi zostać, ładuje style CSS

// Importy Twoich stron
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import LogsPage from './pages/LogsPage';
import VerifyPage from './pages/VerifyPage';

function App() {
  return (
    // 1. Owijamy wszystko w MantineProvider
    <MantineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/employees" element={<EmployeesPage />} />
          <Route path="/admin/logs" element={<LogsPage />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;