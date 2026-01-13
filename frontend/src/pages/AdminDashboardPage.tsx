import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary-700">
            Panel Administratora
          </h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-200"
          >
            Wyloguj
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-primary-700 mb-4">
              Logi wejść
            </h2>
            <p className="text-gray-600">
              Przeglądaj logi wejść pracowników - funkcjonalność do wdrożenia
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-primary-700 mb-4">
              Zarządzanie pracownikami
            </h2>
            <p className="text-gray-600">
              Dodawanie i edycja pracowników - funkcjonalność do wdrożenia
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
