import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerifyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-700 mb-8">
          Weryfikacja tożsamości
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <p className="text-gray-600 mb-6">
            Ta funkcjonalność będzie zawierać skanowanie QR kodu i rozpoznawanie twarzy
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition duration-200"
          >
            Powrót do strony głównej
          </button>
        </div>
      </div>
    </div>
  );
}
