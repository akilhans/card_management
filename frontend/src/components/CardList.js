import React from 'react';

const formatExpiry = (val) => {
  if (!val) return '';
  const v = String(val);
  if (v.includes('/')) return v;
  const digits = v.replace(/[^0-9]/g, '');
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2, 4);
};

// same phone formatter as in Cards.js
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

export default function CardList({ cards, onTake, onCopy, copied }) {
  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
        Sizga tayinlangan mavjud kartalar yo&apos;q.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card._id}
          className={`bg-white rounded-xl shadow p-6 border-l-4 transition-shadow hover:shadow-md ${
            card.status === 'LIMIT_REACHED' ? 'border-red-500' : 'border-green-500'
          }`}
          style={{ minWidth: 260 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-600 truncate max-w-[120px]">
              {card.assignedAdmin?.username}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">{card.bankName}</p>

          <p className="font-mono text-base font-bold text-gray-800 mb-1 tracking-widest">
            <span className="mr-2">{card.number}</span>
            <button
              onClick={() => onCopy(card.number, card._id)}
              className="text-sm text-gray-500 hover:text-gray-700"
              title="Karta raqamini nusxalash"
            >
              {copied === card._id ? '✓' : '📋'}
            </button>
          </p>
          <div className="mb-1 text-sm text-gray-700">
            <span className="font-medium">{card.cardHolderName}</span>
          </div>
          <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
            <span className="font-mono">{formatPhone(card.cardHolderPhone || '')}</span>
            <span className="font-mono">{formatExpiry(card.expiryDate)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onCopy(card.number, card._id)}
              className="flex-1 border border-gray-300 rounded-lg py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              {copied === card._id ? '✓ Nusxalandi' : 'Nusxa olish'}
            </button>
            <button
              onClick={() => onTake(card._id)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 text-sm font-medium transition-colors"
            >
              Kartani olish
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}