import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';

const emptyForm = {
  assignedAdmin: '',
  department: '',
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
  return `${name}||${phone}`;
};

// Format phone as "99 109 34 14" (2-3-2-2), strip leading +998
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

// Qidiruv mosligini tekshirish (oxirgi 4 ta raqam, bank nomi, egasi, tel, admin, bo'lim)
const matchesCardSearch = (card, q) => {
  if (!q) return false;
  const qTrim = q.trim().toLowerCase();
  const qDigits = qTrim.replace(/\D/g, '');

  const numRaw = String(card.number || '');
  const numDigits = numRaw.replace(/\D/g, '');

  // Oxirgi 4 ta raqam yoki karta raqami bo'yicha moslik
  if (qDigits.length > 0 && numDigits.includes(qDigits)) {
    return true;
  }
  if (numRaw.toLowerCase().includes(qTrim)) {
    return true;
  }

  // Bank nomi (masalan: Kapital Bank, Agrobank, Ipak Yo'li, va h.k.)
  if (String(card.bankName || '').toLowerCase().includes(qTrim)) {
    return true;
  }

  // Karta egasining F.I.Sh.
  if (String(card.cardHolderName || '').toLowerCase().includes(qTrim)) {
    return true;
  }

  // Telefon raqami
  const phoneDigits = String(card.cardHolderPhone || '').replace(/\D/g, '');
  if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) {
    return true;
  }
  if (String(card.cardHolderPhone || '').toLowerCase().includes(qTrim)) {
    return true;
  }

  // Admin username
  if (String(card.assignedAdmin?.username || '').toLowerCase().includes(qTrim)) {
    return true;
  }

  // Bo'lim nomi
  if (String(card.department?.name || '').toLowerCase().includes(qTrim)) {
    return true;
  }

  return false;
};

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [takenCards, setTakenCards] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all'); // 'all', deptId, 'none'
  const [batchDeptId, setBatchDeptId] = useState('');

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptError, setDeptError] = useState('');

  const [adminAssignAll, setAdminAssignAll] = useState('');
  const [adminAssignHumo, setAdminAssignHumo] = useState('');
  const [adminAssignUzcard, setAdminAssignUzcard] = useState('');
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [selectedTypeTab, setSelectedTypeTab] = useState('HUMO');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchView, setActiveSearchView] = useState('cards'); // 'cards' or 'owners'
  const [limitSearchQuery, setLimitSearchQuery] = useState('');
  const [limitSearchView, setLimitSearchView] = useState('cards'); // 'cards' or 'owners'
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('active'); // 'active', 'limit' yoki 'taken'
  const [amounts, setAmounts] = useState({});
  const [copied, setCopied] = useState(null);
  const [takenDateFilter, setTakenDateFilter] = useState('all');
  const [takenCustomDateFrom, setTakenCustomDateFrom] = useState('');
  const [takenCustomDateTo, setTakenCustomDateTo] = useState('');

  // Pagination states for Limit bo'lgan kartalar
  const [limitPage, setLimitPage] = useState(1);
  const [limitItemsPerPage, setLimitItemsPerPage] = useState(12);

  // Pagination states for Aktiv kartalar
  const [activePage, setActivePage] = useState(1);
  const [activeItemsPerPage, setActiveItemsPerPage] = useState(12);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
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
    fetchDepartments();
    fetchCards();
    fetchTakenCards();
  }, [fetchAdmins, fetchDepartments, fetchCards, fetchTakenCards]);

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

  // Department CRUD Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptError('');
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptError('');
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setDeptError('');
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, { name: deptName });
      } else {
        await api.post('/departments', { name: deptName });
      }
      setShowDeptModal(false);
      fetchDepartments();
      fetchCards();
    } catch (err) {
      setDeptError(err.response?.data?.message || 'Bo\'limni saqlashda xatolik yuz berdi');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`"${dept.name}" bo'limini o'chirishni xohlaysizmi? Bu bo'limdagi kartalar bo'limsiz holatga o'tadi.`)) {
      return;
    }
    try {
      await api.delete(`/departments/${dept._id}`);
      if (selectedDepartment === dept._id) {
        setSelectedDepartment('all');
      }
      fetchDepartments();
      fetchCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Bo\'limni o\'chirishda xatolik');
    }
  };

  // Bo'lim bo'yicha filtrlangan kartalar
  const departmentFilteredCards = useMemo(() => {
    if (selectedDepartment === 'all') return cards;
    if (selectedDepartment === 'none') {
      return cards.filter((c) => !c.department);
    }
    return cards.filter(
      (c) => c.department?._id === selectedDepartment || c.department === selectedDepartment
    );
  }, [cards, selectedDepartment]);

  // To'g'ridan-to'g'ri qidiruv bo'yicha faol kartalar (oxirgi 4 ta raqam, bank, egasi va h.k.)
  const directSearchCards = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const pool = selectedDepartment === 'all'
      ? cards.filter((c) => !c.taken)
      : departmentFilteredCards.filter((c) => !c.taken);
    return pool.filter((c) => matchesCardSearch(c, q));
  }, [cards, departmentFilteredCards, searchQuery, selectedDepartment]);

  // To'g'ridan-to'g'ri qidiruv bo'yicha limit kartalar
  const directLimitSearchCards = useMemo(() => {
    const q = limitSearchQuery.trim();
    if (!q) return [];
    const pool = selectedDepartment === 'all'
      ? cards.filter((c) => !c.taken && c.status === 'LIMIT_REACHED')
      : departmentFilteredCards.filter((c) => !c.taken && c.status === 'LIMIT_REACHED');
    return pool.filter((c) => matchesCardSearch(c, q));
  }, [cards, departmentFilteredCards, limitSearchQuery, selectedDepartment]);

  // Egalari bo'yicha guruhlar
  const allOwnerGroups = useMemo(() => {
    const groups = {};
    departmentFilteredCards.forEach((card) => {
      const key = formatOwnerKey(card);
      if (!groups[key]) {
        groups[key] = {
          key,
          cardHolderName: card.cardHolderName,
          cardHolderPhone: card.cardHolderPhone,
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
  }, [departmentFilteredCards]);

  // Barcha kartalar bo'yicha egasi guruhlari (modal tanlash uchun)
  const fullOwnerGroups = useMemo(() => {
    const groups = {};
    cards.forEach((card) => {
      const key = formatOwnerKey(card);
      if (!groups[key]) {
        groups[key] = {
          key,
          cardHolderName: card.cardHolderName,
          cardHolderPhone: card.cardHolderPhone,
          cards: [],
        };
      }
      groups[key].cards.push(card);
    });
    return Object.values(groups);
  }, [cards]);

  // Shart: Guruhdagi BARCHA kartalar to'liq limitga yetgan bo'lsa
  const isGroupFullyLimited = useCallback((group) => {
    return group.cards.length > 0 && group.cards.every((c) => c.status === 'LIMIT_REACHED');
  }, []);

  // 1. Aktiv guruhlar: kamida 1 ta aktiv kartasi bor bo'lgan guruhlar
  const rawActiveGroups = useMemo(() => {
    return allOwnerGroups.filter((g) => !isGroupFullyLimited(g));
  }, [allOwnerGroups, isGroupFullyLimited]);

  // 2. Limit bo'lgan guruhlar: barcha kartalari to'liq limitga yetgan guruhlar
  const rawLimitGroups = useMemo(() => {
    return allOwnerGroups.filter((g) => isGroupFullyLimited(g));
  }, [allOwnerGroups, isGroupFullyLimited]);

  // Kartalar sonlari
  const activeCardsCount = useMemo(() => {
    return rawActiveGroups.reduce((sum, g) => sum + g.cards.length, 0);
  }, [rawActiveGroups]);

  const limitCardsCount = useMemo(() => {
    return rawLimitGroups.reduce((sum, g) => sum + g.cards.length, 0);
  }, [rawLimitGroups]);

  const unassignedDeptCount = useMemo(() => {
    return cards.filter((c) => !c.taken && !c.department).length;
  }, [cards]);

  // Aktiv guruhlar qidiruv va filter
  const filteredActiveGroups = useMemo(() => {
    return rawActiveGroups.filter((group) => {
      if (statusFilter === 'limit' && !group.cards.some((c) => c.status === 'LIMIT_REACHED')) {
        return false;
      }
      const q = searchQuery.trim();
      if (!q) return true;
      return group.cards.some((c) => matchesCardSearch(c, q));
    });
  }, [rawActiveGroups, searchQuery, statusFilter]);

  // Aktiv guruhlar pagination
  const totalActivePages = Math.ceil(filteredActiveGroups.length / activeItemsPerPage) || 1;
  const paginatedActiveGroups = useMemo(() => {
    const start = (activePage - 1) * activeItemsPerPage;
    return filteredActiveGroups.slice(start, start + activeItemsPerPage);
  }, [filteredActiveGroups, activePage, activeItemsPerPage]);

  // Limit guruhlar qidiruv
  const filteredLimitGroups = useMemo(() => {
    const q = limitSearchQuery.trim();
    if (!q) return rawLimitGroups;
    return rawLimitGroups.filter((group) => {
      return group.cards.some((c) => matchesCardSearch(c, q));
    });
  }, [rawLimitGroups, limitSearchQuery]);

  // Limit guruhlar pagination
  const totalLimitPages = Math.ceil(filteredLimitGroups.length / limitItemsPerPage) || 1;
  const paginatedLimitGroups = useMemo(() => {
    const start = (limitPage - 1) * limitItemsPerPage;
    return filteredLimitGroups.slice(start, start + limitItemsPerPage);
  }, [filteredLimitGroups, limitPage, limitItemsPerPage]);

  // Tanlangan guruh
  const selectedOwner = useMemo(() => {
    if (!selectedGroupKey) return null;
    return allOwnerGroups.find((group) => group.key === selectedGroupKey) || null;
  }, [allOwnerGroups, selectedGroupKey]);

  const selectedGroupCards = useMemo(() => {
    if (!selectedOwner) return [];
    return selectedOwner.cards.filter((c) => c.type === selectedTypeTab);
  }, [selectedOwner, selectedTypeTab]);

  const handleSelectOwner = (group) => {
    setSelectedGroupKey(group.key);
    const hasHumo = group.cards.some((c) => c.type === 'HUMO');
    setSelectedTypeTab(hasHumo ? 'HUMO' : 'UZCARD');
  };

  const handleBackToOwners = () => {
    setSelectedGroupKey(null);
    setSelectedTypeTab('HUMO');
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      department: selectedDepartment !== 'all' && selectedDepartment !== 'none' ? selectedDepartment : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (card) => {
    setEditing(card);
    setForm({
      assignedAdmin: card.assignedAdmin?._id || card.assignedAdmin || '',
      department: card.department?._id || card.department || '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      assignedAdmin: form.assignedAdmin || null,
      department: form.department || null,
    };
    try {
      if (editing) {
        await api.put(`/cards/${editing._id}`, payload);
      } else {
        await api.post('/cards', payload);
      }
      setShowModal(false);
      setSelectedGroupKey(null);
      setSelectedTypeTab('HUMO');
      fetchCards();
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const assignAllTo = async (adminId) => {
    if (!adminId) return;
    if (!selectedGroupCards.length) return;
    try {
      const cardIds = selectedGroupCards.map((c) => c._id);
      await api.patch('/cards/batch/admin', { cardIds, adminId });
      fetchCards();
    } catch (err) {
      console.error(err);
      alert('Adminni tayinlashda xatolik');
    }
  };

  const assignByType = async (humoAdminId, uzAdminId) => {
    if (!selectedOwner) return;
    try {
      await Promise.all(
        selectedOwner.cards.map((card) =>
          api.put(`/cards/${card._id}`, {
            assignedAdmin: card.type === 'HUMO' ? humoAdminId || null : uzAdminId || null,
            department: card.department?._id || card.department || null,
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
      alert('Turi bo\'yicha tayinlashda xatolik');
    }
  };

  const handleBatchAssignDept = async () => {
    if (!batchDeptId) return alert('Iltimos, bo\'limni tanlang');
    if (!selectedOwner || !selectedOwner.cards.length) return;
    try {
      const cardIds = selectedOwner.cards.map((c) => c._id);
      await api.patch('/cards/batch/department', {
        cardIds,
        departmentId: batchDeptId === 'none' ? null : batchDeptId,
      });
      fetchCards();
      alert('Egasi barcha kartalari tanlangan bo\'limga biriktirildi');
      setBatchDeptId('');
    } catch (err) {
      alert(err.response?.data?.message || 'Bo\'limga biriktirishda xatolik');
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

  const handleReactivateAll = async (group) => {
    if (!group || !group.cards.length) return;
    if (
      !window.confirm(
        `"${group.cardHolderName || 'Egasi'}" ning barcha (${group.cards.length} ta) kartalarini qayta faollashtirishni xohlaysizmi? Qabul qilingan summalar nolga tushiriladi.`
      )
    ) {
      return;
    }
    try {
      await Promise.all(group.cards.map((c) => api.patch(`/cards/${c._id}/reactivate`)));
      fetchCards();
      handleBackToOwners();
    } catch (err) {
      console.error(err);
      alert('Kartalarni faollashtirishda xatolik yuz berdi');
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
  const ownerCount = rawActiveGroups.length;
  const unassignedCount = departmentFilteredCards.filter((card) => !card?.assignedAdmin && !card.taken).length;

  return (
    <div className="w-full px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kartalar</h1>
          <p className="text-sm text-gray-600 mt-1">
            Kartalar bo'limlar va egalar bo‘yicha guruhlangan. Sahifada karta raqamlari yashirilgan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleOpenCreateDept}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Bo'lim qo'shish
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Karta qo‘shish
          </button>
          <button
            onClick={handleBackToOwners}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Guruhlashni yangilash
          </button>
        </div>
      </div>

      {/* Main Views Navigation */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => { setView('active'); handleBackToOwners(); setSearchQuery(''); }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Aktiv kartalar ({activeCardsCount})
        </button>
        <button
          onClick={() => { setView('limit'); handleBackToOwners(); setLimitSearchQuery(''); }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'limit'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Limit bo'lgan kartalar ({limitCardsCount})
        </button>
        <button
          onClick={() => { setView('taken'); handleBackToOwners(); setSearchQuery(''); }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'taken'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Olingan kartalar ({takenCards.length})
        </button>
      </div>

      {/* Bo'limlar (Departments) Navigation Pills */}
      {(view === 'active' || view === 'limit') && (
        <div className="bg-white rounded-xl shadow-sm p-3 mb-6 border border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1 whitespace-nowrap">Bo'limlar:</span>
            
            <button
              type="button"
              onClick={() => { setSelectedDepartment('all'); setActivePage(1); handleBackToOwners(); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDepartment === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Barcha kartalar</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedDepartment === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {cards.filter((c) => !c.taken).length}
              </span>
            </button>

            {departments.map((dept) => {
              const count = cards.filter(
                (c) => !c.taken && (c.department?._id === dept._id || c.department === dept._id)
              ).length;
              const isSelected = selectedDepartment === dept._id;
              return (
                <div key={dept._id} className="relative group flex items-center">
                  <button
                    type="button"
                    onClick={() => { setSelectedDepartment(dept._id); setActivePage(1); handleBackToOwners(); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{dept.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {count}
                    </span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center ml-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenEditDept(dept); }}
                      title="Nomini o'zgartirish"
                      className="p-1 text-gray-400 hover:text-blue-600 rounded text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDept(dept); }}
                      title="Bo'limni o'chirish"
                      className="p-1 text-gray-400 hover:text-red-600 rounded text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}

            {unassignedDeptCount > 0 && (
              <button
                type="button"
                onClick={() => { setSelectedDepartment('none'); setActivePage(1); handleBackToOwners(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedDepartment === 'none'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>Bo'limsiz</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedDepartment === 'none' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {unassignedDeptCount}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenCreateDept}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-indigo-500 text-indigo-600 hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            + Bo'lim qo'shish
          </button>
        </div>
      )}

      {/* 1. AKTIV KARTALAR SECTION */}
      {view === 'active' && (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Qidiruv (Karta raqami, bank, egasi...)</label>
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim()) {
                      setSelectedGroupKey(null);
                    }
                    setActivePage(1);
                  }}
                  placeholder="Oxirgi 4ta raqam (masalan 4412), bank nomi (Kapital)..."
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActivePage(1);
                    }}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Filterlar</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setStatusFilter('all'); setActivePage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Barchasi
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('limit'); setActivePage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'limit' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Qisman limit yetganlar
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Statistika</p>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Aktiv kartalar: <span className="font-semibold text-gray-900">{activeCardsCount}</span></div>
                <div>Guruhlar: <span className="font-semibold text-gray-900">{ownerCount}</span></div>
                <div>Adminsiz kartalar: <span className="font-semibold text-gray-900">{unassignedCount}</span></div>
              </div>
            </div>
          </div>

          {/* QIDIRUV NATIJALARI: AGAR QIDIRUV KIRITILGAN BO'LSA, KARTALAR TO'G'RIDAN-TO'G'RI CHIQADI */}
          {searchQuery.trim() && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-bold text-sm">🔍 Qidiruv natijasi:</span>
                    <span className="text-gray-900 text-sm font-medium">
                      "{searchQuery}" so'rovi bo'yicha <strong>{directSearchCards.length}</strong> ta karta topildi
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Kartaning oxirgi raqamlari, bank nomi (Kapital Bank va h.k.) yoki egasi bo'yicha topilgan natijalar
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-white rounded-xl p-1 border border-blue-200 shadow-sm text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveSearchView('cards')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeSearchView === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Kartalar ({directSearchCards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSearchView('owners')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeSearchView === 'owners' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Egalar guruhi ({filteredActiveGroups.length})
                    </button>
                  </div>

                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Tozalash ✕
                  </button>
                </div>
              </div>

              {activeSearchView === 'cards' && (
                directSearchCards.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    "{searchQuery}" bo'yicha hech qanday faol karta topilmadi.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta egasi</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tur</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Holat</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {directSearchCards.map((card, index) => (
                          <tr
                            key={card._id}
                            className={`transition-colors ${
                              card.status === 'LIMIT_REACHED' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{card.bankName || "Bank kiritilmagan"}</td>
                            <td className="px-4 py-3 font-mono text-gray-800 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold tracking-wider">{formatCardNumber(card.number)}</span>
                                <button
                                  onClick={() => handleCopy(card.number, card._id)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                  title="Nusxalash"
                                >
                                  {copied === card._id ? '✓' : '📋'}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-800">{card.cardHolderName}</div>
                              <button
                                onClick={() => {
                                  const g = allOwnerGroups.find((x) => x.key === formatOwnerKey(card));
                                  if (g) {
                                    setSearchQuery('');
                                    handleSelectOwner(g);
                                  }
                                }}
                                className="text-[11px] text-blue-600 hover:underline font-medium"
                              >
                                Egasining barcha kartalari &rarr;
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                {card.department?.name || 'Bo\'limsiz'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                card.type === 'HUMO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {card.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                            <td className="px-4 py-3 text-indigo-700 font-medium">{card.assignedAdmin?.username || 'Tayinlanmagan'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                <input
                                  type="number"
                                  min="0"
                                  value={amounts[card._id] ?? ''}
                                  onChange={(e) => handleAmountChange(card._id, e.target.value)}
                                  placeholder="sum"
                                  className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                                />
                                <button
                                  onClick={() => submitReceived(card)}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 font-medium"
                                >
                                  Qo'shish
                                </button>
                                {card.status === 'LIMIT_REACHED' && (
                                  <button
                                    onClick={() => handleReactivate(card._id)}
                                    className="text-xs font-medium border border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-2 py-1 rounded transition-colors"
                                  >
                                    Faollashtirish
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenEdit(card)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Tahrir
                                </button>
                                <button
                                  onClick={() => handleDelete(card._id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  O‘chirish
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* Normal holat (qidiruvsiz yoki egasini ko'rish rejimi) */}
          {!selectedOwner && (!searchQuery.trim() || activeSearchView === 'owners') && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Jami <span className="font-semibold text-gray-800">{filteredActiveGroups.length}</span> ta aktiv guruh mavjud
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Sahifada:</span>
                  <select
                    value={activeItemsPerPage}
                    onChange={(e) => {
                      setActiveItemsPerPage(Number(e.target.value));
                      setActivePage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mb-6">
                {filteredActiveGroups.length === 0 ? (
                  <div className="col-span-full bg-white rounded-xl shadow p-8 text-center text-gray-500">
                    Qidiruv yoki tanlangan bo'lim bo‘yicha faol karta topilmadi.
                  </div>
                ) : (
                  paginatedActiveGroups.map((group) => {
                    const humoCount = group.cards.filter((c) => c.type === 'HUMO').length;
                    const uzcardCount = group.cards.filter((c) => c.type === 'UZCARD').length;
                    const reachedCount = group.cards.filter((c) => c.status === 'LIMIT_REACHED').length;
                    const activeCount = group.cards.filter((c) => c.status === 'ACTIVE').length;

                    // Guruhdagi bo'lim nomlari
                    const deptNames = Array.from(
                      new Set(group.cards.map((c) => c.department?.name).filter(Boolean))
                    );

                    return (
                      <button
                        key={group.key}
                        onClick={() => handleSelectOwner(group)}
                        className="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">{group.cardHolderName || "Noma'lum"}</p>
                              <p className="text-xs text-gray-500">{formatPhone(group.cardHolderPhone || '') || "Noma'lum"}</p>
                            </div>
                            {deptNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {deptNames.map((dName) => (
                                  <span key={dName} className="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {dName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-gray-100 text-gray-600">
                                Bo'limsiz
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-medium text-gray-700">{group.cards.length} ta karta</span>
                            {reachedCount > 0 && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                {reachedCount} ta limit
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                              {activeCount} ta faol
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100">
                          {humoCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                              HUMO {humoCount}
                            </span>
                          )}
                          {uzcardCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                              UZCARD {uzcardCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Aktiv kartalar pagination */}
              {filteredActiveGroups.length > activeItemsPerPage && (
                <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
                  <div>
                    Jami <span className="font-semibold text-gray-800">{filteredActiveGroups.length}</span> ta guruhdan{' '}
                    <span className="font-semibold text-gray-800">
                      {Math.min((activePage - 1) * activeItemsPerPage + 1, filteredActiveGroups.length)}
                    </span>
                    -
                    <span className="font-semibold text-gray-800">
                      {Math.min(activePage * activeItemsPerPage, filteredActiveGroups.length)}
                    </span>{' '}
                    ko'rsatilmoqda
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        activePage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      &larr; Oldingi
                    </button>
                    {Array.from({ length: totalActivePages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setActivePage(page)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                          activePage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActivePage((p) => Math.min(totalActivePages, p + 1))}
                      disabled={activePage === totalActivePages}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        activePage === totalActivePages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Keyingi &rarr;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {selectedOwner && !searchQuery.trim() && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-col gap-4 bg-white rounded-xl shadow p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Tanlangan egasi</p>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedOwner.cardHolderName || "Noma'lum"}</h2>
                    <p className="text-sm text-gray-500">{formatPhone(selectedOwner.cardHolderPhone || '') || "Noma'lum"}</p>
                  </div>
                  <div className="flex gap-2 items-start flex-wrap">
                    <button
                      onClick={handleBackToOwners}
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

                {/* Bo'limga biriktirish va Admin tayinlash boshqaruv paneli */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      Bo'limga biriktirish (Egasi barcha {selectedOwner.cards.length} ta kartasi):
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={batchDeptId}
                        onChange={(e) => setBatchDeptId(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[180px]"
                      >
                        <option value="">Bo'limni tanlang...</option>
                        <option value="none">Bo'limsiz holatga o'tkazish</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBatchAssignDept}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Bo'limga biriktirish
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={adminAssignAll}
                        onChange={(e) => setAdminAssignAll(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px]"
                      >
                        <option value="">Admin: {selectedTypeTab}</option>
                        {admins.map((a) => (
                          <option key={a._id} value={a._id}>{a.username}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => assignAllTo(adminAssignAll)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm whitespace-nowrap font-medium"
                      >
                        {selectedTypeTab} ga tayinlash
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={adminAssignHumo}
                        onChange={(e) => setAdminAssignHumo(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]"
                      >
                        <option value="">HUMO admini</option>
                        {admins.map((a) => (
                          <option key={a._id} value={a._id}>{a.username}</option>
                        ))}
                      </select>
                      <select
                        value={adminAssignUzcard}
                        onChange={(e) => setAdminAssignUzcard(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]"
                      >
                        <option value="">UZCARD admini</option>
                        {admins.map((a) => (
                          <option key={a._id} value={a._id}>{a.username}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => assignByType(adminAssignHumo, adminAssignUzcard)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm whitespace-nowrap font-medium"
                      >
                        Turi bo'yicha tayinlash
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs: Humo / Uzcard */}
                <div className="flex gap-2 border-b border-gray-200">
                  {selectedOwner.cards.some((c) => c.type === 'HUMO') && (
                    <button
                      onClick={() => setSelectedTypeTab('HUMO')}
                      className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
                        selectedTypeTab === 'HUMO'
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      HUMO ({selectedOwner.cards.filter((c) => c.type === 'HUMO').length})
                    </button>
                  )}
                  {selectedOwner.cards.some((c) => c.type === 'UZCARD') && (
                    <button
                      onClick={() => setSelectedTypeTab('UZCARD')}
                      className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
                        selectedTypeTab === 'UZCARD'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      UZCARD ({selectedOwner.cards.filter((c) => c.type === 'UZCARD').length})
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Holat</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedGroupCards.map((card, index) => (
                      <tr
                        key={card._id}
                        className={`transition-colors ${
                          card.status === 'LIMIT_REACHED' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-3 text-gray-400">{index + 1}</td>
                        <td className="px-3 py-3 text-gray-900 font-bold">{card.bankName || "Bank kiritilmagan"}</td>
                        <td className="px-3 py-3 font-mono text-gray-800 whitespace-nowrap">
                          <div className="flex items-center gap-1">
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
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {card.department?.name || 'Bo\'limsiz'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                        <td className="px-3 py-3 text-indigo-700">{card.assignedAdmin?.username || 'Hech kimga tayinlanmagan'}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-700">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <input
                              type="number"
                              min="0"
                              value={amounts[card._id] ?? ''}
                              onChange={(e) => handleAmountChange(card._id, e.target.value)}
                              placeholder="sum"
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
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
                                Faollashtirish
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEdit(card)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Tahrir
                            </button>
                            <button
                              onClick={() => handleDelete(card._id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              O‘chirish
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {selectedGroupCards.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-10 text-center text-gray-400 text-sm">
                          Bu turdagi kartalar yo‘q.
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

      {/* 2. LIMIT BO'LGAN KARTALAR SECTION */}
      {view === 'limit' && (
        <>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="md:col-span-2 bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Limit bo'lgan kartalarni qidirish (oxirgi 4 ta raqam, bank, egasi...)</label>
              <div className="relative">
                <input
                  type="search"
                  value={limitSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLimitSearchQuery(val);
                    if (val.trim()) {
                      setSelectedGroupKey(null);
                    }
                    setLimitPage(1);
                  }}
                  placeholder="Oxirgi 4ta raqam (4412), bank nomi (Kapital), egasi..."
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                {limitSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLimitSearchQuery('');
                      setLimitPage(1);
                    }}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Statistika</p>
              <div className="space-y-2 text-sm text-gray-600">
                <div>To'liq limit guruhlar: <span className="font-semibold text-red-600">{rawLimitGroups.length}</span></div>
                <div>Jami limit kartalar: <span className="font-semibold text-red-600">{limitCardsCount}</span></div>
                <div className="text-xs text-gray-400">
                  (Faqat barcha kartalari to'liq limitga yetgan guruhlar bu yerda ko'rsatiladi)
                </div>
              </div>
            </div>
          </div>

          {/* Limit kartalar qidiruv natijasi (kartalar to'g'ridan-to'g'ri ko'rsatiladi) */}
          {limitSearchQuery.trim() && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-700 font-bold text-sm">🔍 Limit kartalar qidiruv natijasi:</span>
                    <span className="text-gray-900 text-sm font-medium">
                      "{limitSearchQuery}" bo'yicha <strong>{directLimitSearchCards.length}</strong> ta limit karta topildi
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-0.5">
                    Oxirgi 4 ta raqam, bank nomi (Kapital Bank) yoki egasi bo'yicha topilgan natijalar
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-white rounded-xl p-1 border border-red-200 shadow-sm text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLimitSearchView('cards')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        limitSearchView === 'cards' ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Kartalar ({directLimitSearchCards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLimitSearchView('owners')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        limitSearchView === 'owners' ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Egalar guruhi ({filteredLimitGroups.length})
                    </button>
                  </div>

                  <button
                    onClick={() => setLimitSearchQuery('')}
                    className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Tozalash ✕
                  </button>
                </div>
              </div>

              {limitSearchView === 'cards' && (
                directLimitSearchCards.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
                    "{limitSearchQuery}" bo'yicha limit karta topilmadi.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta egasi</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tur</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {directLimitSearchCards.map((card, index) => (
                          <tr key={card._id} className="bg-red-50 hover:bg-red-100 transition-colors">
                            <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{card.bankName || "Bank kiritilmagan"}</td>
                            <td className="px-4 py-3 font-mono text-gray-800 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold tracking-wider">{formatCardNumber(card.number)}</span>
                                <button
                                  onClick={() => handleCopy(card.number, card._id)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                  title="Nusxalash"
                                >
                                  {copied === card._id ? '✓' : '📋'}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-800">{card.cardHolderName}</div>
                              <button
                                onClick={() => {
                                  const g = allOwnerGroups.find((x) => x.key === formatOwnerKey(card));
                                  if (g) {
                                    setLimitSearchQuery('');
                                    handleSelectOwner(g);
                                  }
                                }}
                                className="text-[11px] text-red-700 hover:underline font-medium"
                              >
                                Egasining barcha kartalari &rarr;
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                                {card.department?.name || 'Bo\'limsiz'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-800">
                                {card.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                            <td className="px-4 py-3 text-indigo-700 font-medium">{card.assignedAdmin?.username || 'Tayinlanmagan'}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                <button
                                  onClick={() => handleReactivate(card._id)}
                                  className="text-xs font-medium border border-green-600 bg-white text-green-600 hover:bg-green-600 hover:text-white px-2.5 py-1 rounded transition-colors"
                                >
                                  Faollashtirish
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(card)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1"
                                >
                                  Tahrir
                                </button>
                                <button
                                  onClick={() => handleDelete(card._id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium px-1"
                                >
                                  O‘chirish
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* Normal holat (limit qidiruvsiz yoki egasini ko'rish rejimi) */}
          {!selectedOwner && (!limitSearchQuery.trim() || limitSearchView === 'owners') && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Jami <span className="font-semibold text-gray-800">{filteredLimitGroups.length}</span> ta to'liq limit yetgan guruh mavjud
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Sahifada:</span>
                  <select
                    value={limitItemsPerPage}
                    onChange={(e) => {
                      setLimitItemsPerPage(Number(e.target.value));
                      setLimitPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mb-6">
                {filteredLimitGroups.length === 0 ? (
                  <div className="col-span-full bg-white rounded-xl shadow p-8 text-center text-gray-500">
                    {limitSearchQuery
                      ? 'Qidiruv bo‘yicha to‘liq limit bo‘lgan guruh topilmadi.'
                      : 'Hozircha to‘liq limitga yetgan guruhlar mavjud emas.'}
                  </div>
                ) : (
                  paginatedLimitGroups.map((group) => {
                    const humoCount = group.cards.filter((c) => c.type === 'HUMO').length;
                    const uzcardCount = group.cards.filter((c) => c.type === 'UZCARD').length;

                    return (
                      <div
                        key={group.key}
                        className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-5 hover:shadow-lg hover:border-red-400 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">{group.cardHolderName || "Noma'lum"}</p>
                              <p className="text-xs text-gray-500">{formatPhone(group.cardHolderPhone || '') || "Noma'lum"}</p>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                              To'liq limit: {group.cards.length}/{group.cards.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap mb-4">
                            {humoCount > 0 && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                                HUMO {humoCount}
                              </span>
                            )}
                            {uzcardCount > 0 && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                UZCARD {uzcardCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleSelectOwner(group)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-colors text-center"
                          >
                            Kartalarni ko'rish
                          </button>
                          <button
                            onClick={() => handleReactivateAll(group)}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors text-center"
                            title="Barcha kartalarni faollashtirib, aktiv bo'limiga qaytarish"
                          >
                            Faollashtirish
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Limit bo'lgan kartalar pagination */}
              {filteredLimitGroups.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
                  <div>
                    Jami <span className="font-semibold text-gray-800">{filteredLimitGroups.length}</span> ta guruhdan{' '}
                    <span className="font-semibold text-gray-800">
                      {Math.min((limitPage - 1) * limitItemsPerPage + 1, filteredLimitGroups.length)}
                    </span>
                    -
                    <span className="font-semibold text-gray-800">
                      {Math.min(limitPage * limitItemsPerPage, filteredLimitGroups.length)}
                    </span>{' '}
                    ko'rsatilmoqda
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLimitPage((p) => Math.max(1, p - 1))}
                      disabled={limitPage === 1}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        limitPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      &larr; Oldingi
                    </button>
                    {Array.from({ length: totalLimitPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setLimitPage(page)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                          limitPage === page ? 'bg-red-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLimitPage((p) => Math.min(totalLimitPages, p + 1))}
                      disabled={limitPage === totalLimitPages}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        limitPage === totalLimitPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Keyingi &rarr;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {selectedOwner && !limitSearchQuery.trim() && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-col gap-3 bg-white rounded-xl shadow p-4 lg:p-6 border-t-4 border-red-500">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">Tanlangan limit yetgan egasi</p>
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700">
                        To'liq limit
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedOwner.cardHolderName || "Noma'lum"}</h2>
                    <p className="text-sm text-gray-500">{formatPhone(selectedOwner.cardHolderPhone || '') || "Noma'lum"}</p>
                  </div>
                  <div className="flex gap-2 items-start flex-wrap">
                    <button
                      onClick={handleBackToOwners}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Orqaga
                    </button>
                    <button
                      onClick={() => handleReactivateAll(selectedOwner)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Barcha kartalarni faollashtirish
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 border-b border-gray-200">
                  {selectedOwner.cards.some((c) => c.type === 'HUMO') && (
                    <button
                      onClick={() => setSelectedTypeTab('HUMO')}
                      className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
                        selectedTypeTab === 'HUMO'
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      HUMO ({selectedOwner.cards.filter((c) => c.type === 'HUMO').length})
                    </button>
                  )}
                  {selectedOwner.cards.some((c) => c.type === 'UZCARD') && (
                    <button
                      onClick={() => setSelectedTypeTab('UZCARD')}
                      className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
                        selectedTypeTab === 'UZCARD'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      UZCARD ({selectedOwner.cards.filter((c) => c.type === 'UZCARD').length})
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Holat</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Qabul qilingan</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedGroupCards.map((card, index) => (
                      <tr key={card._id} className="bg-red-50 hover:bg-red-100 transition-colors">
                        <td className="px-3 py-3 text-gray-400">{index + 1}</td>
                        <td className="px-3 py-3 text-gray-900 font-bold">{card.bankName || "Bank kiritilmagan"}</td>
                        <td className="px-3 py-3 font-mono text-gray-800 whitespace-nowrap">
                          <div className="flex items-center gap-1">
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
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            {card.department?.name || 'Bo\'limsiz'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                        <td className="px-3 py-3 text-indigo-700">{card.assignedAdmin?.username || 'Hech kimga tayinlanmagan'}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                            Limit yetdi
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-700">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <button
                              onClick={() => handleReactivate(card._id)}
                              className="text-xs font-medium border border-green-600 bg-white text-green-600 hover:bg-green-600 hover:text-white px-2.5 py-1 rounded transition-colors"
                              title="Kartani faollashtirish (guruh aktiv kartalarga qaytadi)"
                            >
                              Faollashtirish
                            </button>
                            <button
                              onClick={() => handleOpenEdit(card)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Tahrir
                            </button>
                            <button
                              onClick={() => handleDelete(card._id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              O‘chirish
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {selectedGroupCards.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-10 text-center text-gray-400 text-sm">
                          Bu turdagi kartalar yo‘q.
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

      {/* 3. OLINGAN KARTALAR SECTION */}
      {view === 'taken' && (
        <>
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
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Karta egasi</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Admin (olingan)</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Sana</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Vaqt</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Balans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTakenCards.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-gray-400 text-sm">
                      {takenCards.length === 0 ? 'Hali hech qanday karta olinmagan.' : 'Tanlangan vaqt oralig\'ida karta topilmadi.'}
                    </td>
                  </tr>
                ) : (
                  filteredTakenCards.map((card, index) => (
                    <tr key={card._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-3 py-3 text-gray-900 font-bold">{card.bankName || "Bank kiritilmagan"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 whitespace-nowrap">
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
                      <td className="px-3 py-3 text-gray-700">{card.cardHolderName}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {card.department?.name || 'Bo\'limsiz'}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                      <td className="px-3 py-3 text-indigo-700">{card.takenBy?.username || '-'}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatDate(card.takenAt)}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatTime(card.takenAt)}</td>
                      <td className="px-3 py-3 text-gray-700">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Karta qo'shish / tahrirlash modali */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim (Department)</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bo'limsiz</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

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

              {!editing && fullOwnerGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mavjud egalarni tanlash</label>
                  <select
                    onChange={(e) => {
                      const key = e.target.value;
                      const g = fullOwnerGroups.find((x) => x.key === key);
                      if (g) {
                        setForm({
                          ...form,
                          cardHolderName: g.cardHolderName || '',
                          cardHolderPhone: formatPhone(g.cardHolderPhone || ''),
                        });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                  >
                    <option value="">Yangi egani kiritish</option>
                    {fullOwnerGroups.map((g) => (
                      <option key={g.key} value={g.key}>{g.cardHolderName} — {formatPhone(g.cardHolderPhone || '')}</option>
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

      {/* Bo'lim qo'shish / tahrirlash modali */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingDept ? 'Bo\'lim nomini tahrirlash' : 'Yangi bo\'lim qo\'shish'}
            </h2>
            {deptError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{deptError}</div>
            )}
            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim nomi</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: UzSaga, Rubl, Uzcard..."
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  {editingDept ? 'Saqlash' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
