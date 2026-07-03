import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import CardList from '../../components/CardList';

export default function HumoPage() {
  const [cards, setCards] = useState([]);
  const [copied, setCopied] = useState(null);

  const fetchCards = async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data.filter((c) => c.type === 'HUMO'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCards(); }, []);

  const handleTake = async (id) => {
    if (!window.confirm('Bu kartani olishni xohlaysizmi? U ro\'yxatingizdan o\'chiriladi.')) return;
    try {
      await api.patch(`/cards/${id}/take`);
      fetchCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Kartani olishda xatolik');
    }
  };

  const handleCopy = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Humo kartalari</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cards.length} ta karta mavjud</p>
        </div>
      </div>
      <CardList cards={cards} onTake={handleTake} onCopy={handleCopy} copied={copied} />
    </div>
  );
}
