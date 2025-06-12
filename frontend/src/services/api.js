import { auth } from '../firebase';

export const getWatchlist = async () => {
  const token = await getIdToken();
  const res = await fetch('/api/watchlist', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load watchlist');
  return res.json(); // returns { symbols, alerts }
};

export const saveWatchlist = async (symbols, alerts) => {
  const token = await getIdToken();
  const res = await fetch('/api/watchlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbols, alerts }),
  });
  if (!res.ok) throw new Error('Failed to save watchlist');
  return res.json();
};

export const fetchPrices = async (symbols) => {
  const res = await fetch('/api/prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error('Failed to fetch prices');
  return res.json();
};

export const fetchHistory = async (symbol) => {
  const res = await fetch(`/api/history/${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
};

const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.getIdToken();
};
