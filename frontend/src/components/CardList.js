import React from 'react';

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
          className={`bg-white rounded-xl shadow p-5 border-l-4 transition-shadow hover:shadow-md ${
            card.status === 'LIMIT_REACHED' ? 'border-red-500' : 'border-green-500'
          }`}
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

          <p className="text-xs text-gray-500 mb-2">{card.bankName}</p>

          <p className="font-mono text-base font-bold text-gray-800 mb-1 tracking-widest">
            {card.number}
          </p>
          <div className="mb-1 text-xs text-gray-600">
            <span className="font-medium">{card.cardHolderName}</span>
          </div>
          <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
            <span className="font-mono">{card.cardHolderPhone}</span>
            <span className="font-mono">{card.expiryDate}</span>
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
