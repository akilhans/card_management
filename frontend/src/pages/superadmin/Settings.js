import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default function Settings() {
  const [globalLimit, setGlobalLimit] = useState('');
  const [limitResetDays, setLimitResetDays] = useState('');
  const [current, setCurrent] = useState(null);
  const [limitCards, setLimitCards] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      setCurrent(res.data);
      setGlobalLimit(res.data.globalLimit.toString());
      setLimitResetDays((res.data.limitResetDays ?? 30).toString());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchLimitCards = useCallback(async () => {
    try {
      const res = await api.get('/cards');
      setLimitCards(res.data.filter((c) => c.status === 'LIMIT_REACHED' && c.limitReachedAt));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchLimitCards();
  }, [fetchSettings, fetchLimitCards]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    const parsedResetDays = parseInt(limitResetDays, 10);
    if (isNaN(parsedResetDays) || parsedResetDays < 1) {
      setError('Qayta faollashtirish muddati kamida 1 kun bo\'lishi kerak');
      return;
    }

    try {
      const res = await api.put('/settings', {
        globalLimit: parseFloat(globalLimit),
        limitResetDays: parsedResetDays,
      });
      setCurrent(res.data);
      setGlobalLimit(res.data.globalLimit.toString());
      setLimitResetDays((res.data.limitResetDays ?? parsedResetDays).toString());
      setSaved(true);
      fetchLimitCards();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const savedResetDays = current?.limitResetDays ?? 30;
  const previewResetDays = parseInt(limitResetDays, 10) || savedResetDays;

  const filteredLimitCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return limitCards;
    return limitCards.filter((card) => {
      return (
        String(card.number || '').toLowerCase().includes(q) ||
        String(card.cardHolderName || '').toLowerCase().includes(q) ||
        String(card.cardHolderPhone || '').toLowerCase().includes(q) ||
        String(card.bankName || '').toLowerCase().includes(q) ||
        String(card.type || '').toLowerCase().includes(q) ||
        String(card.assignedAdmin?.username || '').toLowerCase().includes(q)
      );
    });
  }, [limitCards, searchQuery]);

  const totalPages = Math.ceil(filteredLimitCards.length / itemsPerPage) || 1;
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLimitCards.slice(start, start + itemsPerPage);
  }, [filteredLimitCards, currentPage, itemsPerPage]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sozlamalar</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Global karta limiti</h2>
        <p className="text-sm text-gray-500 mb-6">
          Kartaning qabul qilingan summasi ushbu limitga yetganda yoki undan oshganda, u avtomatik ravishda{' '}
          <span className="font-medium text-red-600">LIMIT YETDI</span> deb belgilanadi.
          Avtomatik tekshirishni o'chirish uchun 0 qo'ying.
        </p>

        {current !== null && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Joriy limit</p>
            <p className="text-2xl font-bold text-gray-800">{current.globalLimit.toLocaleString()}</p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Global limit</label>
            <input
              type="number"
              value={globalLimit}
              onChange={(e) => setGlobalLimit(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Yangi limitni kiriting"
              min="0"
              step="any"
              required
            />
          </div>

          <div>
            <label htmlFor="limitResetDays" className="block text-sm font-medium text-gray-700 mb-1">
              Limit qayta tiklanish muddati (kun)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Limit yetgan kartalar shu kundan keyin avtomatik ravishda qayta faollashtiriladi.
              Masalan: 5, 6 yoki 10 kun.
            </p>
            <input
              id="limitResetDays"
              type="text"
              inputMode="numeric"
              value={limitResetDays}
              onChange={(e) => setLimitResetDays(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masalan: 10"
              required
            />
            {current !== null && (
              <p className="mt-2 text-xs text-gray-500">
                Saqlangan muddat: <span className="font-medium text-gray-700">{savedResetDays} kun</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            Saqlash
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Limit yetgan kartalar</h2>
            <p className="text-sm text-gray-500">
              Limit boshlangan va qayta faollash sanalari ({previewResetDays} kunlik muddat bo'yicha).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              Jami: {limitCards.length} ta
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Karta raqami, admin, tur, egasi..."
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-sm text-gray-600">
            <span>Sahifada:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta raqami</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karta egasi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Limit bo&apos;lgan sana</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aktiv bo&apos;ladigan sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCards.map((card) => {
                const limitDate = new Date(card.limitReachedAt);
                const activeDate = addDays(limitDate, previewResetDays);
                const isPastDue = activeDate <= new Date();

                return (
                  <tr key={card._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-800">{card.number}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{card.cardHolderName || '-'}</div>
                      {card.cardHolderPhone && (
                        <div className="text-xs text-gray-400">{card.cardHolderPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{card.assignedAdmin?.username || '-'}</td>
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
                    <td className="px-4 py-3 text-red-700 font-medium whitespace-nowrap">
                      {formatDate(limitDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={isPastDue ? 'text-green-700 font-medium' : 'text-gray-700'}>
                        {formatDate(activeDate)}
                      </span>
                      {isPastDue && (
                        <span className="ml-2 text-xs text-green-600">(keyingi tekshiruvda faollashadi)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredLimitCards.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    {searchQuery ? 'Qidiruv bo\'yicha karta topilmadi' : 'Limit yetgan kartalar yo\'q'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredLimitCards.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
            <div>
              Jami <span className="font-semibold text-gray-800">{filteredLimitCards.length}</span> tadan{' '}
              <span className="font-semibold text-gray-800">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLimitCards.length)}
              </span>
              -
              <span className="font-semibold text-gray-800">
                {Math.min(currentPage * itemsPerPage, filteredLimitCards.length)}
              </span>{' '}
              ko'rsatilmoqda
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                &larr; Oldingi
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, and pages around current page
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Keyingi &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
