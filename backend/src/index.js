import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import yahooFinance from 'yahoo-finance2'
import admin from 'firebase-admin'

// ✅ fix dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../serviceAccountKey.json'))
)

dotenv.config()

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const app = express()
app.use(cors({
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}))

app.use(express.json())

// 🔐 Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) throw new Error('No token')
    const idToken = header.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    req.uid = decoded.uid
    return next()
  } catch (err) {
    console.error('Auth error:', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

app.get('/api/watchlist', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.uid).get();
    const data = doc.exists ? doc.data() : {};
    const watchlist = data.watchlist || [];
    const alerts = data.alerts || {};
    return res.json({ symbols: watchlist, alerts });
  } catch (err) {
    console.error('/api/watchlist GET error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/watchlist', authMiddleware, async (req, res) => {
  const { symbols, alerts } = req.body;
  if (!Array.isArray(symbols) || typeof alerts !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    await db.collection('users').doc(req.uid).set({ watchlist: symbols, alerts }, { merge: true });
    return res.json({ symbols, alerts });
  } catch (err) {
    console.error('/api/watchlist POST error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// 💸 POST Prices (Fixed)
app.post('/api/prices', async (req, res) => {
  const { symbols } = req.body;

  if (!Array.isArray(symbols)) {
    return res.status(400).json({ error: 'Symbols must be an array of strings' });
  }

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol);
          return {
            symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChangePercent,
          };
        } catch (err) {
          console.warn(`Failed to fetch quote for ${symbol}:`, err.message);
          return null; // Skip if error
        }
      })
    );

    res.json(results.filter(Boolean)); // Remove any nulls
  } catch (err) {
    console.error('Failed to fetch prices:', err);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// 📊 GET History
app.get('/api/history/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const history = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d',
    });

    const formatted = history.map((entry) => ({
      date: entry.date,
      price: entry.close,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch history', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`✅ API listening on http://localhost:${PORT}`))
