const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize SQLite database
const db = new sqlite3.Database('schedules.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    schedule_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    solution_number INTEGER DEFAULT 1
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER,
    employee_name TEXT NOT NULL,
    total_shifts INTEGER NOT NULL,
    shift_breakdown TEXT NOT NULL,
    FOREIGN KEY (schedule_id) REFERENCES schedules (id)
  )`);
});

// API Routes

// Get all schedules for a month/year
app.get('/api/schedules/:year/:month', (req, res) => {
  const { year, month } = req.params;
  
  db.all(
    'SELECT * FROM schedules WHERE year = ? AND month = ? ORDER BY solution_number',
    [year, month],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Save a new schedule
app.post('/api/schedules', (req, res) => {
  const { month, year, scheduleData, statistics } = req.body;
  
  // Get next solution number for this month/year
  db.get(
    'SELECT MAX(solution_number) as max_num FROM schedules WHERE year = ? AND month = ?',
    [year, month],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const nextSolutionNumber = (row.max_num || 0) + 1;
      
      // Insert schedule
      db.run(
        'INSERT INTO schedules (month, year, schedule_data, solution_number) VALUES (?, ?, ?, ?)',
        [month, year, JSON.stringify(scheduleData), nextSolutionNumber],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const scheduleId = this.lastID;
          
          // Insert statistics
          const statPromises = statistics.map(stat => {
            return new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO statistics (schedule_id, employee_name, total_shifts, shift_breakdown) VALUES (?, ?, ?, ?)',
                [scheduleId, stat.name, stat.total, JSON.stringify(stat.breakdown)],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });
          
          Promise.all(statPromises)
            .then(() => {
              res.json({ 
                id: scheduleId, 
                solutionNumber: nextSolutionNumber,
                message: 'Schedule saved successfully' 
              });
            })
            .catch(err => {
              res.status(500).json({ error: err.message });
            });
        }
      );
    }
  );
});

// Get statistics for a specific schedule
app.get('/api/schedules/:id/statistics', (req, res) => {
  const { id } = req.params;
  
  db.all(
    'SELECT * FROM statistics WHERE schedule_id = ?',
    [id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Delete a schedule
app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM schedules WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Also delete associated statistics
    db.run('DELETE FROM statistics WHERE schedule_id = ?', [id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ message: 'Schedule deleted successfully' });
    });
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
