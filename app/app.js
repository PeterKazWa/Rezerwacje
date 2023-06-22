const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Konfiguracja bazy danych PostgreSQL
const pool = new Pool({
    user: 'citus',
    host: 'c-clustnamepkfp.dsjym2j6e5ye7i.postgres.cosmos.azure.com',
    database: 'citus',
    password: 'Lato2018',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

// Tworzenie tabel w bazie danych PostgreSQL
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS biurka (
        oznaczenie SERIAL PRIMARY KEY,
        pietro INTEGER,
        monitor INTEGER
    );
`;
const createReservationsTableQuery = `
    CREATE TABLE IF NOT EXISTS rezerwacje (
        id SERIAL PRIMARY KEY,
        miejsce INTEGER,
        data DATE
    );
`;

(async () => {
    const client = await pool.connect();
    try {
        await client.query(createTableQuery);
        await client.query(createReservationsTableQuery);
    } finally {
        client.release();
    }
})();

// Konfiguracja sesji
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: false
}));

// Klasa użytkownika
class User {
    constructor(id) {
        this.id = id;
    }
}

// Strona logowania
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { user_id } = req.body;
    // Sprawdź poprawność danych logowania
    if (user_id) {
        const user = new User(user_id);
        req.session.user = user;
        res.redirect('/reservation');
    } else {
        res.redirect('/login');
    }
});

// Strona rezerwacji
app.get('/reservation', (req, res) => {
    res.render('reservation');
});

app.post('/reservation', [
    body('miejsce').notEmpty().withMessage('Miejsce jest wymagane.'),
    body('data').notEmpty().withMessage('Data jest wymagana.')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map(error => error.msg);
        res.render('reservation', { errors: messages });
    } else {
        const { miejsce, data } = req.body;
        // Sprawdź dostępność miejsca i zapisz rezerwację w bazie danych
        (async () => {
            const client = await pool.connect();
            try {
                const selectQuery = `
                    SELECT miejsce FROM rezerwacje WHERE miejsce = $1 AND data = $2
                `;
                const selectParams = [miejsce, data];
                const selectResult = await client.query(selectQuery, selectParams);
                const existingReservation = selectResult.rows[0];
                if (existingReservation) {
                    // Miejsce jest już zarezerwowane
                    const message = 'To miejsce jest już zarezerwowane w wybranym dniu.';
                    res.render('reservation', { message });
                } else {
                    // Miejsce jest dostępne
                    const insertQuery = `
                    INSERT INTO rezerwacje (miejsce, data) VALUES ($1, $2)
                `;
                const insertParams = [miejsce, data];
                await client.query(insertQuery, insertParams);
                req.session.flash = 'Rezerwacja została dokonana pomyślnie!';
                res.redirect('/calendar');
            }
        } finally {
            client.release();
        }
    })();
}
});

// Strona kalendarza
app.get('/calendar', (req, res) => {
(async () => {
    const client = await pool.connect();
    try {
        const selectReservationsQuery = `
            SELECT miejsce, data FROM rezerwacje
        `;
        const selectReservationsResult = await client.query(selectReservationsQuery);
        const reservations = selectReservationsResult.rows;

        // Utwórz słownik przechowujący informacje o dostępności miejsc na kalendarzu
        const calendarData = {};
        reservations.forEach(reservation => {
            const { miejsce, data } = reservation;
            if (!calendarData[data]) {
                calendarData[data] = [miejsce];
            } else {
                calendarData[data].push(miejsce);
            }
        });

        res.render('calendar', { calendarData });
    } finally {
        client.release();
    }
})();
});

// Wylogowanie użytkownika
app.get('/logout', (req, res) => {
req.session.destroy(() => {
    res.redirect('/login');
});
});

// Strona główna
app.get('/', (req, res) => {
res.render('index');
});

app.listen(3000, () => {
console.log('Server started on port 3000');
});