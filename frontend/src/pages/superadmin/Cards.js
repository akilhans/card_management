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

const maskCardNumber = (number) => {
  if (!number) return '';
  return number.replace(/\d(?=\d{4})/g, '*');
};

const formatOwnerKey = (card) => {
  const name = card.cardHolderName ? String(card.cardHolderName).trim() : 'No name';
  const phone = card.cardHolderPhone ? String(card.cardHolderPhone).trim() : 'No phone';
  const type = card.type || 'UNKNOWN';
  return `${name}||${phone}||${type}`;
};

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
    fetchCards();
  }, [fetchAdmins, fetchCards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (statusFilter === 'limit' && card.status !== 'LIMIT_REACHED') return false;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        String(card.cardHolderName || '').toLowerCase().includes(query) ||
        String(card.cardHolderPhone || '').toLowerCase().includes(query) ||
        String(card.number || '').toLowerCase().includes(query)
      );
    });
  }, [cards, searchQuery, statusFilter]);

  const groupedOwners = useMemo(() => {
    const groups = {};
    filteredCards.forEach((card) => {
      const key = formatOwnerKey(card);
      if (!groups[key]) {
        groups[key] = {
          key,
          cardHolderName: card.cardHolderName,
          cardHolderPhone: card.cardHolderPhone,
          type: card.type,
          cards: [],
        };
      }
      groups[key].cards.push(card);
    });
    return Object.values(groups).sort((a, b) => {
      if (a.cardHolderName.toLowerCase() < b.cardHolderName.toLowerCase()) return -1;
      if (a.cardHolderName.toLowerCase() > b.cardHolderName.toLowerCase()) return 1;
      if (a.type < b.type) return -1;
      if (a.type > b.type) return 1;
      return 0;
    });
  }, [filteredCards]);

  const selectedGroup = useMemo(
    () => groupedOwners.find((group) => group.key === selectedGroupKey) || null,
    [groupedOwners, selectedGroupKey]
  );

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (card) => {
    setEditing(card);
    setForm({
      assignedAdmin: card.assignedAdmin?._id || '',
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
    const payload = {
      ...form,
      assignedAdmin: form.assignedAdmin || null,
    };
    try {
      if (editing) {
        await api.put(`/cards/${editing._id}`, payload);
      } else {
        await api.post('/cards', payload);
      }
      setShowModal(false);
      setSelectedGroupKey(null);
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

  const handleReactivate = async (id) => {
    if (!window.confirm('Bu kartani qayta faollashtirishni xohlaysizmi? Qabul qilingan summa nolga tushiriladi.')) return;
    try {
      await api.patch(`/cards/${id}/reactivate`);
      fetchCards();
    } catch (err) {
      console.error(err);
    }
  };

  const ownerCount = groupedOwners.length;
  const unassignedCount = cards.filter((card) => !card.assignedAdmin).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kartalar</h1>
          <p className="text-sm text-gray-600 mt-1">
            Kartalar egalar bo‘yicha guruhlangan. Sahifada karta raqamlari yashirilgan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Karta qo‘shish
          </button>
          <button
            onClick={() => setSelectedGroupKey(null)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Guruhlashni yangilash
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Qidiruv</label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Karta raqami, egasi yoki telefon..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Filterlar</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Barchasi
            </button>
            <button
              onClick={() => setStatusFilter('limit')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'limit' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Limitga yetganlar
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Statistika</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div>Barcha kartalar: <span className="font-semibold text-gray-900">{cards.length}</span></div>
            <div>Guruhlar: <span className="font-semibold text-gray-900">{ownerCount}</span></div>
            <div>Adminsiz kartalar: <span className="font-semibold text-gray-900">{unassignedCount}</span></div>
          </div>
        </div>
      </div>

      {!selectedGroup && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-6">
          {groupedOwners.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Qidiruv yoki filter bo‘yicha mos keladigan hech qanday karta topilmadi.
            </div>
          ) : (
            groupedOwners.map((group) => (
              <button
                key={group.key}
                onClick={() => setSelectedGroupKey(group.key)}
                className="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{group.cardHolderName}</p>
                    <p className="text-xs text-gray-500">{group.cardHolderPhone}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    group.type === 'HUMO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {group.type}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {group.cards.length} ta karta
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedGroup && (
        <div className="space-y-4 mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-xl shadow p-5">
            <div>
              <p className="text-sm text-gray-500">Tanlangan guruh</p>
              <h2 className="text-xl font-semibold text-gray-900">{selectedGroup.cardHolderName} — {selectedGroup.type}</h2>
              <p className="text-sm text-gray-500">{selectedGroup.cardHolderPhone}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGroupKey(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Orqaga
              </button>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Qidiruvni tozalash
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Holat</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedGroup.cards.map((card, index) => (
                  <tr
                    key={card._id}
                    className={`transition-colors ${
                      card.status === 'LIMIT_REACHED' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700">{card.bankName}</td>
                    <td className="px-4 py-3 font-mono text-gray-800">{maskCardNumber(card.number)}</td>
                    <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{card.expiryDate}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{card.cardHolderPhone}</td>
                    <td className="px-4 py-3 text-indigo-700">{card.assignedAdmin?.username || 'Hech kimga tayinlanmagan'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{card.receivedAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {card.status === 'LIMIT_REACHED' && (
                        <button
                          onClick={() => handleReactivate(card._id)}
                          className="text-xs font-medium border border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-2 py-1 rounded transition-colors"
                        >
                          Qayta faollashtirish
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(card)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Tahrirlash
                      </button>
                      <button
                        onClick={() => handleDelete(card._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedGroup.cards.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">
                      Bu guruhda hech qanday karta yo‘q.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? 'Kartani tahrirlash' : 'Karta qo‘shish'}
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
                >
                  <option value="">Hech kimga tayinlanmagan</option>
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
                  {editing ? 'O‘zgarishlarni saqlash' : 'Karta qo‘shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
