import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tab, setTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ owner: '', type: 'HUMO', number: '' });
  const [error, setError] = useState('');
  const [receivedInput, setReceivedInput] = useState({});
  const [copied, setCopied] = useState(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchOwners = useCallback(async () => {
    try {
      const res = await api.get('/owners');
      setOwners(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchOwners();
  }, [fetchCards, fetchOwners]);

  const displayedCards = tab === 'all' ? cards : cards.filter((c) => c.taken);

  const openCreate = () => {
    setEditing(null);
    setForm({ owner: owners[0]?._id || '', type: 'HUMO', number: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({ owner: card.owner._id, type: card.type, number: card.number });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/cards/${editing._id}`, form);
      } else {
        await api.post('/cards', form);
      }
      setShowModal(false);
      fetchCards();
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kartani butunlay o\'chirishni xohlaysizmi?')) return;
    try {
      await api.delete(`/cards/${id}`);
      fetchCards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetReceived = async (card) => {
    const val = receivedInput[card._id];
    if (val === undefined || val === '') return;
    const amount = parseFloat(val);
    if (isNaN(amount)) return;
    try {
      await api.patch(`/cards/${card._id}/received`, { amount });
      setReceivedInput((prev) => ({ ...prev, [card._id]: '' }));
      fetchCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Summani yangilashda xatolik');
    }
  };

  const handleReactivate = async (id) => {
    if (!window.confirm('Bu kartani qayta faollashtirishni xohlaysizmi? Qabul qilingan summa nolga tushiriladi.')) return;
    try {
      await api.patch(`/cards/${id}/reactivate`);
      fetchCards();
    } catch (err) {
      console.error(err);
    }
  };

  const copyNumber = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kartalar</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Karta qo'shish
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Barcha kartalar ({cards.length})
        </button>
        <button
          onClick={() => setTab('used')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'used'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Ishlatilgan kartalar ({cards.filter((c) => c.taken).length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ega</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Karta raqami</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Holat</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qabul qilingan summa</th>
              {tab === 'used' && (
                <>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kim olgan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qachon olingan</th>
                </>
              )}
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedCards.map((card, i) => (
              <tr
                key={card._id}
                className={`transition-colors ${
                  card.status === 'LIMIT_REACHED' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{card.owner?.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      card.type === 'HUMO'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {card.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">{card.number}</span>
                    <button
                      onClick={() => copyNumber(card.number, card._id)}
                      title="Karta raqamini nusxalash"
                      className="text-gray-400 hover:text-gray-700 transition-colors text-base"
                    >
                      {copied === card._id ? '✓' : '⧉'}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      card.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">{card.receivedAmount.toLocaleString()}</span>
                    <input
                      type="number"
                      value={receivedInput[card._id] || ''}
                      onChange={(e) =>
                        setReceivedInput((prev) => ({ ...prev, [card._id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleSetReceived(card)}
                      placeholder="Belgilash"
                      min="0"
                      className="border border-gray-300 rounded px-2 py-0.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSetReceived(card)}
                      className="bg-gray-700 hover:bg-gray-900 text-white text-xs px-2 py-0.5 rounded transition-colors"
                    >
                      Qo'yish
                    </button>
                  </div>
                </td>
                {tab === 'used' && (
                  <>
                    <td className="px-4 py-3 text-gray-600">{card.takenBy?.username || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {card.takenAt ? new Date(card.takenAt).toLocaleString('uz-UZ') : '—'}
                    </td>
                  </>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {card.status === 'LIMIT_REACHED' && (
                      <button
                        onClick={() => handleReactivate(card._id)}
                        className="text-xs font-medium border border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-2 py-0.5 rounded transition-colors"
                      >
                        Qayta faollashtirish
                      </button>
                    )}
                    {!card.taken && (
                      <button
                        onClick={() => openEdit(card)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Tahrirlash
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(card._id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      O'chirish
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedCards.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Kartalar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Kartani tahrirlash' : 'Karta qo\'shish'}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ega</label>
                <select
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Ega tanlang...</option>
                  {owners.map((o) => (
                    <option key={o._id} value={o._id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karta turi</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HUMO">HUMO</option>
                  <option value="UZCARD">UZCARD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karta raqami</label>
                <input
                  type="text"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8600 0000 0000 0000"
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
                  {editing ? 'O\'zgarishlarni saqlash' : 'Karta qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
