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

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};


const formatExpiry = (val) => {
  if (!val) return '';
  const v = String(val);
  if (v.includes('/')) return v;
  const digits = v.replace(/[^0-9]/g, '');
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2, 4);
};

const formatOwnerKey = (card) => {
  const name = card.cardHolderName ? String(card.cardHolderName).trim() : 'No name';
  const phone = card.cardHolderPhone ? String(card.cardHolderPhone).trim() : 'No phone';
  const type = card.type || 'UNKNOWN';
  return `${name}||${phone}||${type}`;
};

// Format phone as "99 109 34 14" (2-3-2-2), strip leading +998
const formatPhone = (val) => {
  if (!val && val !== '') return '';
  const v = String(val);
  let digits = v.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1); // optional
  // progressive formatting
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.slice(0,2) + ' ' + digits.slice(2);
  if (digits.length <= 7) return digits.slice(0,2) + ' ' + digits.slice(2,5) + ' ' + digits.slice(5);
  // up to 9
  return digits.slice(0,2) + ' ' + digits.slice(2,5) + ' ' + digits.slice(5,7) + (digits.length > 7 ? ' ' + digits.slice(7,9) : '');
};

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [takenCards, setTakenCards] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [adminAssignAll, setAdminAssignAll] = useState('');
  const [adminAssignHumo, setAdminAssignHumo] = useState('');
  const [adminAssignUzcard, setAdminAssignUzcard] = useState('');
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('assigned'); // 'assigned' yoki 'taken'
  const [amounts, setAmounts] = useState({});
  const [copied, setCopied] = useState(null);
  const [takenDateFilter, setTakenDateFilter] = useState('all');
  const [takenCustomDateFrom, setTakenCustomDateFrom] = useState('');
  const [takenCustomDateTo, setTakenCustomDateTo] = useState('');

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

  const fetchTakenCards = useCallback(async () => {
    try {
      const res = await api.get('/cards/taken/all');
      setTakenCards(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchCards();
    fetchTakenCards();
  }, [fetchAdmins, fetchCards, fetchTakenCards]);

  // saveGlobalLimit removed from this page — settings managed in Settings page

  const handleAmountChange = (cardId, val) => {
    setAmounts((s) => ({ ...s, [cardId]: val }));
  };

  const submitReceived = async (card) => {
    const raw = amounts[card._id];
    const amount = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount < 0) return alert('Iltimos, to\'g\'ri summa kiriting');
    try {
      await api.patch(`/cards/${card._id}/received`, { amount });
      setAmounts((s) => ({ ...s, [card._id]: '' }));
      fetchCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Summani qo\'shishda xatolik');
    }
  };

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
      const nameA = String(a.cardHolderName ?? "").trim().toLowerCase();
      const nameB = String(b.cardHolderName ?? "").trim().toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      const typeA = String(a.type ?? "");
      const typeB = String(b.type ?? "");

      return typeA.localeCompare(typeB);
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
      cardHolderPhone: formatPhone(card.cardHolderPhone || ''),
    });
    setError('');
    setShowModal(true);
  };

  const formatCardNumber = (number) => {
    if (!number) return "";
  
    return String(number)
      .replace(/\D/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim();
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

  const assignAllTo = async (adminId) => {
    if (!adminId) return;
    if (!selectedGroup) return;
    try {
      await Promise.all(
        selectedGroup.cards.map((card) =>
          api.put(`/cards/${card._id}`, {
            assignedAdmin: adminId,
            type: card.type,
            number: card.number,
            expiryDate: card.expiryDate || '',
            bankName: card.bankName || '',
            cardHolderName: card.cardHolderName || '',
            cardHolderPhone: card.cardHolderPhone || '',
          })
        )
      );
      fetchCards();
    } catch (err) {
      console.error(err);
    }
  };

  const assignByType = async (humoAdminId, uzAdminId) => {
    if (!selectedGroup) return;
    try {
      await Promise.all(
        selectedGroup.cards.map((card) =>
          api.put(`/cards/${card._id}`, {
            assignedAdmin: card.type === 'HUMO' ? humoAdminId || null : uzAdminId || null,
            type: card.type,
            number: card.number,
            expiryDate: card.expiryDate || '',
            bankName: card.bankName || '',
            cardHolderName: card.cardHolderName || '',
            cardHolderPhone: card.cardHolderPhone || '',
          })
        )
      );
      fetchCards();
    } catch (err) {
      console.error(err);
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

  const handleCopy = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getFilteredTakenCards = () => {
    let filtered = [...takenCards];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    if (takenDateFilter === 'today') {
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= todayStart && cardDate <= todayEnd;
      });
    } else if (takenDateFilter === 'yesterday') {
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(todayStart.getTime() - 1);
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= yesterdayStart && cardDate <= yesterdayEnd;
      });
    } else if (takenDateFilter === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= monthStart && cardDate <= monthEnd;
      });
    } else if (takenDateFilter === 'custom' && takenCustomDateFrom && takenCustomDateTo) {
      const fromDate = new Date(takenCustomDateFrom);
      const toDate = new Date(takenCustomDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= fromDate && cardDate <= toDate;
      });
    }

    return filtered;
  };

  const filteredTakenCards = getFilteredTakenCards();

  const ownerCount = groupedOwners.length;
  const unassignedCount = cards.filter((card) => !card?.assignedAdmin).length;

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

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => { setView('assigned'); setSelectedGroupKey(null); setSearchQuery(''); }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'assigned'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Tayinlangan Kartalar ({cards.length})
        </button>
        <button
          onClick={() => { setView('taken'); setSearchQuery(''); }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'taken'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Olingan Kartalar ({takenCards.length})
        </button>
      </div>

      {view === 'assigned' && (
        <>

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
            {/*
            <div className="pt-2">
              <label className="text-xs text-gray-600">Global karta limiti</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={globalLimit}
                  onChange={(e) => setGlobalLimit(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                  placeholder="Masalan: 2000"
                />
                <button
                  onClick={saveGlobalLimit}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm"
                >
                  Saqlash
                </button>
              </div>
            </div>
            */}
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
                    <p className="text-lg font-semibold text-gray-900">{group.cardHolderName || "Noma'lum"}</p>
                    <p className="text-xs text-gray-500">{formatPhone(group.cardHolderPhone || '') || "Noma'lum"}</p>
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
          <div className="flex flex-col gap-3 bg-white rounded-xl shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Tanlangan guruh</p>
                <h2 className="text-xl font-semibold text-gray-900">{selectedGroup.cardHolderName || "Noma'lum"} — {selectedGroup.type}</h2>
                <p className="text-sm text-gray-500">{formatPhone(selectedGroup.cardHolderPhone || '') || "Noma'lum"}</p>
              </div>
              <div className="flex gap-3 items-start">
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={adminAssignAll}
                  onChange={(e) => setAdminAssignAll(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
                >
                  <option value="">Tayinlash: Barchasi</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>{a.username}</option>
                  ))}
                </select>
                <button
                  onClick={() => assignAllTo(adminAssignAll)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm whitespace-nowrap"
                >
                  Barchasini tayinlash
                </button>
              </div>

              <div className="w-full border-t border-gray-100 mt-3 pt-3 sm:mt-0 sm:pt-0 sm:flex sm:items-center sm:gap-2">
                <select
                  value={adminAssignHumo}
                  onChange={(e) => setAdminAssignHumo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
                >
                  <option value="">HUMO uchun admin</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>{a.username}</option>
                  ))}
                </select>
                <select
                  value={adminAssignUzcard}
                  onChange={(e) => setAdminAssignUzcard(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
                >
                  <option value="">UZCARD uchun admin</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>{a.username}</option>
                  ))}
                </select>
                <button
                  onClick={() => assignByType(adminAssignHumo, adminAssignUzcard)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm whitespace-nowrap"
                >
                  Turi bo'yicha tayinlash
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Karta</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
  Karta raqami
</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Holat</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
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
                    <td className="px-6 py-4 text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-700">{card.bankName}</td>
                    <td className="px-6 py-4 font-mono text-gray-700">
  <div className="flex items-center gap-2">
    <span>{card.number}</span>
    <button
      onClick={() => handleCopy(card.number, card._id)}
      className="text-xs text-gray-500 hover:text-gray-700"
      title="Nusxalash"
    >
      {copied === card._id ? '✓' : '📋'}
    </button>
  </div>
</td>
                    <td className="px-6 py-4 font-mono text-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{card.number}</span>
                        <button
                          onClick={() => handleCopy(card.number, card._id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          title="Karta raqamini nusxalash"
                        >
                          {copied === card._id ? '✓' : '📋'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                    <td className="px-6 py-4 text-indigo-700">{card.assignedAdmin?.username || 'Hech kimga tayinlanmagan'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          value={amounts[card._id] ?? ''}
                          onChange={(e) => handleAmountChange(card._id, e.target.value)}
                          placeholder="sum"
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => submitReceived(card)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700"
                        >
                          Qo'shish
                        </button>

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
                      </div>
                    </td>
                  </tr>
                ))}
                {selectedGroup.cards.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-10 text-center text-gray-400 text-sm">
                      Bu guruhda hech qanday karta yo‘q.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {view === 'taken' && (
        <>
          {/* Filter Controls */}
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Vaqt bo'yicha filter</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => { setTakenDateFilter('all'); setTakenCustomDateFrom(''); setTakenCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  takenDateFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Barchasi
              </button>
              <button
                onClick={() => { setTakenDateFilter('today'); setTakenCustomDateFrom(''); setTakenCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  takenDateFilter === 'today'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bugun
              </button>
              <button
                onClick={() => { setTakenDateFilter('yesterday'); setTakenCustomDateFrom(''); setTakenCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  takenDateFilter === 'yesterday'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kecha
              </button>
              <button
                onClick={() => { setTakenDateFilter('thisMonth'); setTakenCustomDateFrom(''); setTakenCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  takenDateFilter === 'thisMonth'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Shu oy
              </button>
              <button
                onClick={() => setTakenDateFilter('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  takenDateFilter === 'custom'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📅 Sana tanlash
              </button>
            </div>

            {takenDateFilter === 'custom' && (
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Boshlanish sanasi</label>
                  <input
                    type="date"
                    value={takenCustomDateFrom}
                    onChange={(e) => setTakenCustomDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tugash sanasi</label>
                  <input
                    type="date"
                    value={takenCustomDateTo}
                    onChange={(e) => setTakenCustomDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
  KARTA RAQAMI
</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Karta egasi</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Admin (olingan)</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Sana</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Vaqt</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Balans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTakenCards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-400 text-sm">
                    {takenCards.length === 0 ? 'Hali hech qanday karta olinmagan.' : 'Tanlangan vaqt oralig\'ida karta topilmadi.'}
                  </td>
                </tr>
              ) : (
                filteredTakenCards.map((card, index) => (
                  <tr key={card._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-700">{card.bankName}</td>
                    <td className="px-6 py-4">
  <div className="flex items-center gap-2 whitespace-nowrap">
    <span className="font-mono tracking-wider text-gray-800">
      {formatCardNumber(card.number)}
    </span>

    <button
      onClick={() => handleCopy(card.number, card._id)}
      className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
      title="Copy"
    >
      {copied === card._id ? "✓" : "📋"}
    </button>
  </div>
</td>
                    <td className="px-6 py-4 text-gray-700">{card.cardHolderName}</td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                    <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                    <td className="px-6 py-4 text-indigo-700">{card.takenBy?.username || '-'}</td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatDate(card.takenAt)}</td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatTime(card.takenAt)}</td>
                    <td className="px-6 py-4 text-gray-700">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
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
                {!editing && groupedOwners.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mavjud egalarni tanlash</label>
                    <select
                      onChange={(e) => {
                        const key = e.target.value;
                        const g = groupedOwners.find((x) => x.key === key);
                        if (g) {
                          setForm({
                            ...form,
                            cardHolderName: g.cardHolderName || '',
                            cardHolderPhone: formatPhone(g.cardHolderPhone || ''),
                            type: g.type || form.type,
                          });
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Yangi egani kiritish</option>
                      {groupedOwners.map((g) => (
                        <option key={g.key} value={g.key}>{g.cardHolderName} — {g.cardHolderPhone} ({g.type})</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  onChange={(e) => setForm({ ...form, expiryDate: formatExpiry(e.target.value) })}
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
                  onChange={(e) => setForm({ ...form, cardHolderPhone: formatPhone(e.target.value) })}
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