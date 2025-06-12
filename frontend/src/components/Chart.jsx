import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchHistory } from '../services/api';

export default function Chart({ symbol }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!symbol) return;
    fetchHistory(symbol)
      .then(setData)
      .catch(err => console.error('Chart error:', err));
  }, [symbol]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
        <YAxis />
        <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
        <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
