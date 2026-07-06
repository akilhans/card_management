import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';

const emptyForm = {
  assignedAdmin: '',
  type: 'HUMO',
  number: '',
  expiryDate: '',
  bankName: '',
  cardHolderName: '',
  cardHolderPhone: '',
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState('all');
  const [tab, setTab] = useState('all');
  const [usedFilter, setUsedFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [receivedInput, setReceivedInput] = useState({});
  const [copied, setCopied] = useState(null);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const matchesUsedFilter = (card) => {
    if (!card.takenAt) return false;
    const takenAt = new Date(card.takenAt);
    const now = new Date();

    if (usedFilter === 'all') return true;
    if (usedFilter === 'today') return isSameDay(takenAt, now);
    if (usedFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return isSameDay(takenAt, yesterday);
    }
    if (usedFilter === 'month') {
      return takenAt.getFullYear() === now.getFullYear() && takenAt.getMonth() === now.getMonth();
    }
    if (usedFilter === 'custom' && customDate) {
      const picked = new Date(customDate);
      return isSameDay(takenAt, picked);
    }
    return true;
  };

  const adminFilteredCards = useMemo(() => {
    if (selectedAdmin === 'all') return cards;
    return cards.filter((c) => c.assignedAdmin?._id === selectedAdmin);
  }, [cards, selectedAdmin]);

  const usedCards = adminFilteredCards.filter((c) => c.taken);
  const displayedCards = tab === 'all' ? adminFilteredCards : usedCards.filter(matchesUsedFilter);

  const adminCardCounts = useMemo(() => {
    const counts = { all: cards.length };
    admins.forEach((admin) => {
      counts[admin._id] = cards.filter((c) => c.assignedAdmin?._id === admin._id).length;
    });
    return counts;
  }, [cards, admins]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      assignedAdmin: selectedAdmin !== 'all' ? selectedAdmin : admins[0]?._id || '',
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({
      assignedAdmin: card.assignedAdmin?._id || card.assignedAdmin,
      type: card.type,
      number: card.number,
      expiryDate: card.expiryDate || '',
      bankName: card.bankName || '',
      cardHolderName: card.cardHolderName || '',
      cardHolderPhone: card.cardHolderPhone || '',
    });
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

  const colSpan = tab === 'used' ? 14 : 12;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kartalar</h1>
        <button
          onClick={openCreate}
          disabled={admins.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Karta qo&apos;shish
        </button>
      </div>

      {admins.length === 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Avval admin yarating, keyin kartalarni tayinlang.
        </div>
      )}

      <div className="mb-5">
        <p className="text-sm font-medium text-gray-600 mb-2">Admin bo&apos;yicha ko&apos;rish</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAdmin('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedAdmin === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Barcha adminlar ({adminCardCounts.all || 0})
          </button>
          {admins.map((admin) => (
            <button
              key={admin._id}
              onClick={() => setSelectedAdmin(admin._id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAdmin === admin._id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {admin.username} ({adminCardCounts[admin._id] || 0})
            </button>
          ))}
        </div>
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
          Barcha kartalar ({adminFilteredCards.length})
        </button>
        <button
          onClick={() => setTab('used')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'used'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Ishlatilgan kartalar ({usedCards.length})
        </button>
      </div>

      {tab === 'used' && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            { key: 'today', label: 'Bugun' },
            { key: 'yesterday', label: 'Kecha' },
            { key: 'month', label: 'Shu oy' },
            { key: 'all', label: 'Barchasi' },
            { key: 'custom', label: 'Filter' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setUsedFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                usedFilter === f.key
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          {usedFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">F.I.Sh.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Holat</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
              {tab === 'used' && (
                <>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kim olgan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qachon olingan</th>
                </>
              )}
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
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
                <td className="px-4 py-3 font-medium text-indigo-700">{card.assignedAdmin?.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      card.type === 'HUMO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {card.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{card.bankName}</td>
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
                <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{card.expiryDate}</td>
                <td className="px-4 py-3 text-gray-700">{card.cardHolderName}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{card.cardHolderPhone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
                      Qo&apos;yish
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
                      O&apos;chirish
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedCards.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Kartalar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Kartani tahrirlash' : 'Karta qo\'shish'}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tayinlangan admin</label>
                <select
                  value={form.assignedAdmin}
                  onChange={(e) => setForm({ ...form, assignedAdmin: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Karta olingan bank nomi</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masalan: Kapitalbank"
                  required
                />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amal qilish muddati</label>
                <input
                  type="text"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="OO/YY"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karta egasining F.I.Sh.</label>
                <input
                  type="text"
                  value={form.cardHolderName}
                  onChange={(e) => setForm({ ...form, cardHolderName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Familiya Ism Sharif"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami</label>
                <input
                  type="tel"
                  value={form.cardHolderPhone}
                  onChange={(e) => setForm({ ...form, cardHolderPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+998 90 123 45 67"
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
