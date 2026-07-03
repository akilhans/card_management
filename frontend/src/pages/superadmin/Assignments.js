import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [owners, setOwners] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ adminId: '', ownerId: '' });
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      const [aRes, admRes, ownRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/users'),
        api.get('/owners'),
      ]);
      setAssignments(aRes.data);
      setAdmins(admRes.data);
      setOwners(ownRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openModal = () => {
    setForm({ adminId: '', ownerId: '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/assignments', form);
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu tayinlashni o\'chirishni xohlaysizmi?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const grouped = assignments.reduce((acc, a) => {
    const adminName = a.admin?.username || 'Noma\'lum';
    if (!acc[adminName]) acc[adminName] = [];
    acc[adminName].push(a);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tayinlashlar</h1>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Egani adminga tayinlash
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
          Hali tayinlashlar yo'q. Adminlar kartalarni ko'rishi uchun egalarni ularga tayinlang.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([adminName, list]) => (
            <div key={adminName} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <span className="font-semibold text-gray-700">{adminName}</span>
                <span className="ml-2 text-xs text-gray-400">{list.length} ta ega</span>
              </div>
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {list.map((a) => (
                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-700">{a.owner?.name}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDelete(a._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          O'chirish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Egani adminga tayinlash</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                <select
                  value={form.adminId}
                  onChange={(e) => setForm({ ...form, adminId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Admin tanlang...</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>{a.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ega</label>
                <select
                  value={form.ownerId}
                  onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Ega tanlang...</option>
                  {owners.map((o) => (
                    <option key={o._id} value={o._id}>{o.name}</option>
                  ))}
                </select>
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
                  Tayinlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
