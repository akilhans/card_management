import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';

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

const formatPhone = (val) => {
  if (!val && val !== '') return '';
  const v = String(val);
  let digits = v.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.slice(0, 2) + ' ' + digits.slice(2);
  if (digits.length <= 7) return digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' + digits.slice(5);
  return digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' + digits.slice(5, 7) + (digits.length > 7 ? ' ' + digits.slice(7, 9) : '');
};

const formatCardNumber = (number) => {
  if (!number) return '';
  return String(number)
    .replace(/\D/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
};

const formatOwnerKey = (card) => {
  const name = card.cardHolderName ? String(card.cardHolderName).trim() : 'No name';
  const phone = card.cardHolderPhone ? String(card.cardHolderPhone).trim() : 'No phone';
  return `${name}||${phone}`;
};

export default function AdminCardsPage() {
  const [cards, setCards] = useState([]);
  const [usedCards, setUsedCards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [selectedProfileKey, setSelectedProfileKey] = useState(null);
  const [selectedTypeTab, setSelectedTypeTab] = useState('HUMO'); // 'HUMO' or 'UZCARD'
  const [view, setView] = useState('available'); // 'available' or 'used'
  const [copied, setCopied] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Used cards filters
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [usedDeptFilter, setUsedDeptFilter] = useState('all');

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
      // Agar bo'limlar mavjud bo'lsa va selectedDeptId 'all' bo'lsa, birinchi bo'limni tanlash
      if (res.data.length > 0 && selectedDeptId === 'all') {
        setSelectedDeptId(res.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedDeptId]);

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsedCards = useCallback(async () => {
    try {
      const res = await api.get('/cards/my-used');
      setUsedCards(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchCards();
    fetchUsedCards();
  }, [fetchDepartments, fetchCards, fetchUsedCards]);

  const handleTake = async (cardId) => {
    if (!window.confirm('Bu kartani olishni xohlaysizmi? U ishlatilgan kartalaringizga o\'tkaziladi.')) return;
    try {
      await api.patch(`/cards/${cardId}/take`);
      await fetchCards();
      await fetchUsedCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Kartani olishda xatolik yuz berdi');
    }
  };

  const handleCopy = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Tanlangan bo'lim bo'yicha kartalarni filtrlash
  const deptCards = useMemo(() => {
    if (selectedDeptId === 'all') return cards;
    if (selectedDeptId === 'none') {
      return cards.filter((c) => !c.department);
    }
    return cards.filter(
      (c) => c.department?._id === selectedDeptId || c.department === selectedDeptId
    );
  }, [cards, selectedDeptId]);

  // Bo'limdagi kartalarni egasi (profil) bo'yicha guruhlash
  const profileGroups = useMemo(() => {
    const groups = {};
    deptCards.forEach((card) => {
      const key = formatOwnerKey(card);
      if (!groups[key]) {
        groups[key] = {
          key,
          cardHolderName: card.cardHolderName,
          cardHolderPhone: card.cardHolderPhone,
          department: card.department,
          cards: [],
        };
      }
      groups[key].cards.push(card);
    });
    return Object.values(groups).sort((a, b) => {
      const nameA = String(a.cardHolderName ?? '').trim().toLowerCase();
      const nameB = String(b.cardHolderName ?? '').trim().toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }, [deptCards]);

  // Qidiruv bo'yicha profillarni filtrlash
  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profileGroups;
    return profileGroups.filter((group) => {
      const matchHolder =
        String(group.cardHolderName || '').toLowerCase().includes(q) ||
        String(group.cardHolderPhone || '').toLowerCase().includes(q);
      if (matchHolder) return true;
      return group.cards.some(
        (c) =>
          String(c.number || '').toLowerCase().includes(q) ||
          String(c.bankName || '').toLowerCase().includes(q)
      );
    });
  }, [profileGroups, searchQuery]);

  // Tanlangan profil ob'ekti
  const currentProfile = useMemo(() => {
    if (!selectedProfileKey) return null;
    return profileGroups.find((g) => g.key === selectedProfileKey) || null;
  }, [profileGroups, selectedProfileKey]);

  // Tanlangan profil ichidagi kartalar (Humo yoki Uzcard)
  const profileCardsByType = useMemo(() => {
    if (!currentProfile) return [];
    return currentProfile.cards.filter((c) => c.type === selectedTypeTab);
  }, [currentProfile, selectedTypeTab]);

  const handleSelectProfile = (group) => {
    setSelectedProfileKey(group.key);
    const hasHumo = group.cards.some((c) => c.type === 'HUMO');
    setSelectedTypeTab(hasHumo ? 'HUMO' : 'UZCARD');
  };

  const handleBackToProfiles = () => {
    setSelectedProfileKey(null);
  };

  // Ishlatilgan kartalar filtrlash
  const filteredUsedCards = useMemo(() => {
    let filtered = [...usedCards];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    if (dateFilter === 'today') {
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= todayStart && cardDate <= todayEnd;
      });
    } else if (dateFilter === 'yesterday') {
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(todayStart.getTime() - 1);
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= yesterdayStart && cardDate <= yesterdayEnd;
      });
    } else if (dateFilter === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= monthStart && cardDate <= monthEnd;
      });
    } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
      const fromDate = new Date(customDateFrom);
      const toDate = new Date(customDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((card) => {
        const cardDate = new Date(card.takenAt);
        return cardDate >= fromDate && cardDate <= toDate;
      });
    }

    if (usedDeptFilter !== 'all') {
      if (usedDeptFilter === 'none') {
        filtered = filtered.filter((c) => !c.department);
      } else {
        filtered = filtered.filter(
          (c) => c.department?._id === usedDeptFilter || c.department === usedDeptFilter
        );
      }
    }

    return filtered;
  }, [usedCards, dateFilter, customDateFrom, customDateTo, usedDeptFilter]);

  const totalUsedBalance = useMemo(() => {
    return filteredUsedCards.reduce((sum, card) => sum + (card.receivedAmount || 0), 0);
  }, [filteredUsedCards]);

  const unassignedCardsCount = useMemo(() => {
    return cards.filter((c) => !c.department).length;
  }, [cards]);

  return (
    <div className="w-full px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kartalar boshqaruvi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bo'limlar va profillar bo'yicha biriktirilgan faol kartalar
          </p>
        </div>
      </div>

      {/* Main View Navigation (Mavjud kartalar vs Ishlatilgan kartalar) */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => { setView('available'); handleBackToProfiles(); }}
          className={`px-5 py-3 font-semibold border-b-2 text-sm transition-colors ${
            view === 'available'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Mavjud kartalar ({cards.length})
        </button>
        <button
          onClick={() => { setView('used'); handleBackToProfiles(); }}
          className={`px-5 py-3 font-semibold border-b-2 text-sm transition-colors ${
            view === 'used'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Ishlatilgan kartalar ({usedCards.length})
        </button>
      </div>

      {/* VIEW: MAVJUD KARTALAR */}
      {view === 'available' && (
        <>
          {/* Bo'limlar (Departments) Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 whitespace-nowrap">
                Bo'limlar:
              </span>

              {departments.length === 0 && (
                <button
                  type="button"
                  onClick={() => { setSelectedDeptId('all'); handleBackToProfiles(); }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedDeptId === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>Barcha kartalar</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] ${selectedDeptId === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {cards.length}
                  </span>
                </button>
              )}

              {departments.map((dept) => {
                const count = cards.filter(
                  (c) => c.department?._id === dept._id || c.department === dept._id
                ).length;
                const isSelected = selectedDeptId === dept._id;
                return (
                  <button
                    key={dept._id}
                    type="button"
                    onClick={() => { setSelectedDeptId(dept._id); handleBackToProfiles(); }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{dept.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${isSelected ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {unassignedCardsCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setSelectedDeptId('none'); handleBackToProfiles(); }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedDeptId === 'none'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>Bo'limsiz</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] ${selectedDeptId === 'none' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {unassignedCardsCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 1-QADAM: PROFILLAR RO'YXATI (Profil tanlanmaganda) */}
          {!currentProfile && (
            <>
              {/* Qidiruv */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Profil nomi, egasi yoki telefon raqami bo'yicha qidirish..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute left-3 top-3 text-gray-400 text-sm">🔍</span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Profillar kartalari */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
                {filteredProfiles.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-base font-semibold text-gray-700">
                      Ushbu bo'limda sizga biriktirilgan faol kartalar yo'q.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Super admin sizga yangi kartalarni biriktirganda ular shu yerda ko'rinadi.
                    </p>
                  </div>
                ) : (
                  filteredProfiles.map((group) => {
                    const humoCount = group.cards.filter((c) => c.type === 'HUMO').length;
                    const uzcardCount = group.cards.filter((c) => c.type === 'UZCARD').length;

                    return (
                      <div
                        key={group.key}
                        onClick={() => handleSelectProfile(group)}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {group.cardHolderName || "Noma'lum"}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">
                                {formatPhone(group.cardHolderPhone || '') || "Noma'lum"}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                              {group.cards.length} ta karta
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap my-3">
                            {humoCount > 0 && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-100 text-purple-700">
                                HUMO: {humoCount}
                              </span>
                            )}
                            {uzcardCount > 0 && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700">
                                UZCARD: {uzcardCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-blue-600 group-hover:text-blue-700">
                          <span>Kartalarni ko'rish</span>
                          <span>&rarr;</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* 2-QADAM: TANLANGAN PROFIL ICHIDAGI KARTALAR */}
          {currentProfile && (
            <div className="space-y-6">
              {/* Profil tepa sarlavhasi va orqaga tugmasi */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleBackToProfiles}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>&larr;</span>
                      <span>Orqaga</span>
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900">
                          {currentProfile.cardHolderName || "Noma'lum"}
                        </h2>
                        {currentProfile.department && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                            {currentProfile.department.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mt-0.5">
                        {formatPhone(currentProfile.cardHolderPhone || '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Mavjud kartalar:</span>
                    <span className="text-sm font-bold text-gray-800">
                      {currentProfile.cards.length} ta
                    </span>
                  </div>
                </div>

                {/* Profil ichidagi Humo va Uzcard tablari */}
                <div className="flex gap-3 mt-6 border-b border-gray-200">
                  <button
                    onClick={() => setSelectedTypeTab('HUMO')}
                    className={`px-5 py-3 font-semibold border-b-2 text-sm transition-colors flex items-center gap-2 ${
                      selectedTypeTab === 'HUMO'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>HUMO</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedTypeTab === 'HUMO' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {currentProfile.cards.filter((c) => c.type === 'HUMO').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedTypeTab('UZCARD')}
                    className={`px-5 py-3 font-semibold border-b-2 text-sm transition-colors flex items-center gap-2 ${
                      selectedTypeTab === 'UZCARD'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>UZCARD</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedTypeTab === 'UZCARD' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {currentProfile.cards.filter((c) => c.type === 'UZCARD').length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Kartalar ro'yxati (Grid ko'rinishi) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profileCardsByType.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
                    Ushbu egada tanlangan turdagi ({selectedTypeTab}) aktiv karta yo'q.
                  </div>
                ) : (
                  profileCardsByType.map((card) => (
                    <div
                      key={card._id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {card.bankName}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            card.type === 'HUMO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {card.type}
                          </span>
                        </div>

                        {/* Karta raqami */}
                        <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100 flex items-center justify-between">
                          <span className="font-mono text-base font-bold text-gray-800 tracking-wider">
                            {formatCardNumber(card.number)}
                          </span>
                          <button
                            onClick={() => handleCopy(card.number, card._id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                            title="Karta raqamini nusxalash"
                          >
                            {copied === card._id ? '✓' : '📋'}
                          </button>
                        </div>

                        {/* Muddati va Telefon */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
                          <div>
                            <span className="block text-[10px] text-gray-400">Muddati</span>
                            <span className="font-mono font-medium text-gray-700">{formatExpiry(card.expiryDate)}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-gray-400">Telefon</span>
                            <span className="font-mono font-medium text-gray-700">{formatPhone(card.cardHolderPhone || '')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Amallar: Nusxa olish va Kartani olish */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleCopy(card.number, card._id)}
                          className="flex-1 border border-gray-300 rounded-xl py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
                        >
                          {copied === card._id ? '✓ Nusxalandi' : 'Nusxa'}
                        </button>
                        <button
                          onClick={() => handleTake(card._id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-xs font-semibold transition-colors text-center shadow-sm"
                        >
                          Kartani olish
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW: ISHLATILGAN KARTALAR */}
      {view === 'used' && (
        <>
          {/* Balans Kartochkasi */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 mb-6 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Jami Balans</p>
              <p className="text-3xl sm:text-4xl font-extrabold mt-1">
                {Number(totalUsedBalance).toLocaleString()} <span className="text-xl font-normal">so'm</span>
              </p>
              <p className="text-xs text-blue-200 mt-2">
                Olingan kartalar soni: {filteredUsedCards.length} ta
              </p>
            </div>
            <div className="text-5xl opacity-80">💳</div>
          </div>

          {/* Filterlar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Vaqt bo'yicha filter</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => { setDateFilter('all'); setCustomDateFrom(''); setCustomDateTo(''); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      dateFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Barchasi
                  </button>
                  <button
                    onClick={() => { setDateFilter('today'); setCustomDateFrom(''); setCustomDateTo(''); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      dateFilter === 'today'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Bugun
                  </button>
                  <button
                    onClick={() => { setDateFilter('yesterday'); setCustomDateFrom(''); setCustomDateTo(''); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      dateFilter === 'yesterday'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Kecha
                  </button>
                  <button
                    onClick={() => { setDateFilter('thisMonth'); setCustomDateFrom(''); setCustomDateTo(''); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      dateFilter === 'thisMonth'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Shu oy
                  </button>
                  <button
                    onClick={() => setDateFilter('custom')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      dateFilter === 'custom'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📅 Sana tanlash
                  </button>
                </div>
              </div>

              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bo'lim bo'yicha filter</label>
                  <select
                    value={usedDeptFilter}
                    onChange={(e) => setUsedDeptFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Barcha bo'limlar</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                    <option value="none">Bo'limsiz</option>
                  </select>
                </div>
              )}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex gap-3 items-end flex-wrap pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Boshlanish sanasi</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tugash sanasi</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ishlatilgan kartalar jadvali */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Egasi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Olingan sana</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vaqt</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Balans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsedCards.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                      {usedCards.length === 0
                        ? 'Siz hali hech qanday kartani olmadingiz.'
                        : 'Tanlangan parametrlar bo\'yicha olingan karta topilmadi.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsedCards.map((card, index) => (
                    <tr key={card._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{card.bankName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono tracking-wider text-gray-800">
                            {formatCardNumber(card.number)}
                          </span>
                          <button
                            onClick={() => handleCopy(card.number, card._id)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            title="Nusxalash"
                          >
                            {copied === card._id ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{card.cardHolderName}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {card.department?.name || 'Bo\'limsiz'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(card.takenAt)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(card.takenAt)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 whitespace-nowrap">
                        {Number(card.receivedAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
