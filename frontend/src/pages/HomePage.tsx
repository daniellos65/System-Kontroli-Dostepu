import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary-700 mb-16">
          System kontroli dostępu
        </h1>
        
        <div className="flex flex-col gap-6 max-w-sm mx-auto">
          <button
            onClick={() => navigate('/verify')}
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition duration-200 shadow-md hover:shadow-lg"
          >
            Zweryfikuj tożsamość
          </button>
          
          <button
            onClick={() => navigate('/admin')}
            className="px-8 py-4 bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold rounded-lg transition duration-200 shadow-md hover:shadow-lg"
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}
