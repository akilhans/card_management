import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function Settings() {
  const [globalLimit, setGlobalLimit] = useState('');
  const [current, setCurrent] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setCurrent(res.data.globalLimit);
      setGlobalLimit(res.data.globalLimit.toString());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api.put('/settings', { globalLimit: parseFloat(globalLimit) });
      setSaved(true);
      fetchSettings();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sozlamalar</h1>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Global karta limiti</h2>
        <p className="text-sm text-gray-500 mb-6">
          Kartaning qabul qilingan summasi ushbu limitga yetganda yoki undan oshganda, u avtomatik ravishda{' '}
          <span className="font-medium text-red-600">LIMIT YETDI</span> deb belgilanadi.
          Avtomatik tekshirishni o'chirish uchun 0 qo'ying.
        </p>

        {current !== null && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Joriy limit</p>
            <p className="text-2xl font-bold text-gray-800">{current.toLocaleString()}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-4 text-sm">
            Sozlamalar muvaffaqiyatli saqlandi!
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="number"
            value={globalLimit}
            onChange={(e) => setGlobalLimit(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Yangi limitni kiriting"
            min="0"
            step="any"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            Saqlash
          </button>
        </form>
      </div>
    </div>
  );
}
