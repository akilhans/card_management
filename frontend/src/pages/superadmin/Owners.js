import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function Owners() {
  const [owners, setOwners] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fetchOwners = async () => {
    try {
      const res = await api.get('/owners');
      setOwners(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchOwners(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (owner) => {
    setEditing(owner);
    setName(owner.name);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/owners/${editing._id}`, { name });
      } else {
        await api.post('/owners', { name });
      }
      setShowModal(false);
      fetchOwners();
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu egani o\'chirishni xohlaysizmi? Uning tayinlashlari ham o\'chiriladi.')) return;
    try {
      await api.delete(`/owners/${id}`);
      fetchOwners();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Egalar</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Ega qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ism</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Yaratilgan</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {owners.map((owner, i) => (
              <tr key={owner._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{owner.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(owner.createdAt).toLocaleDateString('uz-UZ')}
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button onClick={() => openEdit(owner)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Tahrirlash</button>
                  <button onClick={() => handleDelete(owner._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">O'chirish</button>
                </td>
              </tr>
            ))}
            {owners.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">Hali egalar yo'q</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Egani tahrirlash' : 'Ega qo\'shish'}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Eganing to'liq ismi"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {editing ? 'O\'zgarishlarni saqlash' : 'Ega yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
