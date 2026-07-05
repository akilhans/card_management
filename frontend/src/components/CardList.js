import React from 'react';

export default function CardList({ cards, onTake, onCopy, copied }) {
  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">
        Sizga tayinlangan mavjud kartalar yo'q.
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 truncate max-w-[120px]">
              {card.owner?.name}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                card.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {card.status === 'ACTIVE' ? 'Faol' : 'Limit yetdi'}
            </span>
          </div>

          <p className="font-mono text-base font-bold text-gray-800 mb-1 tracking-widest">
            {card.number}
          </p>
          <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
            <span>{card.cardHolderName}</span>
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
