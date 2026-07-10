import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import CardList from '../../components/CardList';

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
  if (digits.length <= 5) return digits.slice(0,2) + ' ' + digits.slice(2);
  if (digits.length <= 7) return digits.slice(0,2) + ' ' + digits.slice(2,5) + ' ' + digits.slice(5);
  return digits.slice(0,2) + ' ' + digits.slice(2,5) + ' ' + digits.slice(5,7) + (digits.length > 7 ? ' ' + digits.slice(7,9) : '');
};

export default function UzcardPage() {
  const [cards, setCards] = useState([]);
  const [usedCards, setUsedCards] = useState([]);
  const [copied, setCopied] = useState(null);
  const [view, setView] = useState('available'); // 'available' yoki 'used'
  const [totalBalance, setTotalBalance] = useState(0);
  const [dateFilter, setDateFilter] = useState('all'); // 'today', 'yesterday', 'thisMonth', 'all', 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const fetchCards = async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data.filter((c) => c.type === 'UZCARD'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsedCards = async () => {
    try {
      const res = await api.get('/cards/my-used');
      const uzcardCards = res.data.filter((c) => c.type === 'UZCARD');
      setUsedCards(uzcardCards);
      
      // Balansni hisoblash
      const balance = uzcardCards.reduce((sum, card) => sum + (card.receivedAmount || 0), 0);
      setTotalBalance(balance);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { 
    fetchCards(); 
    fetchUsedCards();
  }, []);

  const handleTake = async (id) => {
    if (!window.confirm('Bu kartani olishni xohlaysizmi? U ro\'yxatingizdan o\'chiriladi.')) return;
    try {
      await api.patch(`/cards/${id}/take`);
      fetchCards();
      fetchUsedCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Kartani olishda xatolik');
    }
  };

  const handleCopy = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getFilteredCards = () => {
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

    return filtered;
  };

  const filteredUsedCards = getFilteredCards();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Uzcard kartalari</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cards.length} ta karta mavjud</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setView('available')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'available'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Mavjud kartalar ({cards.length})
        </button>
        <button
          onClick={() => setView('used')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'used'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Ishlatilgan kartalar ({usedCards.length})
        </button>
      </div>

      {view === 'available' && (
        <CardList cards={cards} onTake={handleTake} onCopy={handleCopy} copied={copied} />
      )}

      {view === 'used' && (
        <>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow p-6 mb-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Jami Balans</p>
                <p className="text-3xl font-bold text-gray-900">{Number(totalBalance).toLocaleString()} so'm</p>
              </div>
              <div className="text-4xl text-blue-600">💳</div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Vaqt bo'yicha filter</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => { setDateFilter('all'); setCustomDateFrom(''); setCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Barchasi
              </button>
              <button
                onClick={() => { setDateFilter('today'); setCustomDateFrom(''); setCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'today'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bugun
              </button>
              <button
                onClick={() => { setDateFilter('yesterday'); setCustomDateFrom(''); setCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'yesterday'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kecha
              </button>
              <button
                onClick={() => { setDateFilter('thisMonth'); setCustomDateFrom(''); setCustomDateTo(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'thisMonth'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Shu oy
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'custom'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📅 Sana tanlash
              </button>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Boshlanish sanasi</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tugash sanasi</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {usedCards.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
              Siz hali hech qanday kartani olmadingiz.
            </div>
          ) : filteredUsedCards.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
              Tanlangan vaqt oralig'ida karta topilmadi.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Karta egasi</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Muddati</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Olingan sana</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Vaqt</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Balans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsedCards.map((card, index) => (
                    <tr key={card._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4 text-gray-700">{card.bankName}</td>
                      <td className="px-6 py-4 text-gray-700">{card.cardHolderName}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatPhone(card.cardHolderPhone || '')}</td>
                      <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">{formatExpiry(card.expiryDate)}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatDate(card.takenAt)}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{formatTime(card.takenAt)}</td>
                      <td className="px-6 py-4 text-right font-medium text-blue-600">{Number(card.receivedAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
