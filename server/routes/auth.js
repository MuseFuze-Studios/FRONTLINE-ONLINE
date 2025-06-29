import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

export function createAuthRoutes(pool, JWT_SECRET) {
  // Register
  router.post('/register', async (req, res) => {
    try {
      const { email, username, password } = req.body;
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Insert user
      const [result] = await pool.execute(
        'INSERT INTO players (email, username, password_hash) VALUES (?, ?, ?)',
        [email, username, passwordHash]
      );
      
      const token = jwt.sign({ id: result.insertId, email, username }, JWT_SECRET);
      
      res.json({
        success: true,
        token,
        user: { id: result.insertId, email, username, nation: null, role: 'player' }
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const [rows] = await pool.execute(
        'SELECT * FROM players WHERE email = ?',
        [email]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        JWT_SECRET
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          nation: user.nation,
          plotId: user.plot_id,
          role: user.role || 'player'
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
}