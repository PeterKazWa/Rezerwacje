const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const session = require('express-session');
const pool = require('./database');

const port = 3000;

const sessionConfig = {
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true
};

const app = express();

app.use(express.static('public'));

app.use(session(sessionConfig));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.redirect('/index');
  });

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Przykładowa logika uwierzytelniania użytkownika
  if (username === 'admin' && password === 'admin') {
    req.session.user = username;
    res.redirect('/ListaRezerwacji');
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/index', (req, res) => {
  // Renderowanie strony głównej
  renderTemplate('index', {})
    .then((html) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    })
    .catch((error) => {
      console.error('Błąd podczas renderowania szablonu:', error);
      res.statusCode = 500;
      res.end('Wystąpił błąd podczas renderowania strony');
    });
});

app.get('/login', (req, res) => {
  // Renderowanie strony logowania
  renderTemplate('login', {})
    .then((html) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    })
    .catch((error) => {
      console.error('Błąd podczas renderowania szablonu:', error);
      res.statusCode = 500;
      res.end('Wystąpił błąd podczas renderowania strony');
    });
});

app.get('/reservation', async (req, res) => {
  try {
    const selectQuery = 'SELECT * FROM biurka';
    const selectResult = await pool.query(selectQuery);
    const desks = selectResult.rows;

    renderTemplate('reservation', { desks })
      .then((html) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      })
      .catch((error) => {
        console.error('Błąd podczas renderowania szablonu:', error);
        res.statusCode = 500;
        res.end('Wystąpił błąd podczas renderowania strony');
      });
  } catch (error) {
    console.error('Błąd podczas pobierania danych z bazy danych:', error);
    res.statusCode = 500;
    res.end('Wystąpił błąd podczas pobierania danych z bazy danych');
  }
});

app.post('/reservation', async (req, res) => {
  const { floor, monitors, date, desk } = req.body;

  try {
    const insertQuery = 'INSERT INTO rezerwacje (miejsce, pietro, monitor, data, "user") VALUES ($1, $2, $3, $4, $5)';
    const insertParams = [desk, floor, monitors, date, req.session.user];
    await pool.query(insertQuery, insertParams);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('Zarezerwowano');
  } catch (error) {
    console.error('Błąd podczas zapisywania rezerwacji:', error);
    res.statusCode = 500;
    res.end('Wystąpił błąd podczas zapisywania rezerwacji');
  }
});

app.get('/ListaRezerwacji', (req, res) => {
  // Renderowanie strony listy rezerwacji
  renderTemplate('ListaRezerwacji', {})
    .then((html) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    })
    .catch((error) => {
      console.error('Błąd podczas renderowania szablonu:', error);
      res.statusCode = 500;
      res.end('Wystąpił błąd podczas renderowania strony');
    });
});

app.get('*', (req, res) => {
  res.statusCode = 404;
  res.end('Strona nie została znaleziona');
});

// Uruchomienie serwera
app.listen(port, () => {
  console.log(`Serwer nasłuchuje na porcie ${port}`);
});

// Funkcja renderująca szablon EJS
function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, 'views', `${templateName}.ejs`);
  return new Promise((resolve, reject) => {
    fs.readFile(templatePath, 'utf8', (error, template) => {
      if (error) {
        reject(error);
      } else {
        const renderedHtml = ejs.render(template, data);
        resolve(renderedHtml);
      }
    });
  });
}