const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new Client({
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "bonpoulet",
    database: "morpion",
});

// Création d'un client qui va se connecter à la bd
client
    .connect()
    .then(async () => {
        console.log('Connected to PostgreSQL database');

        // Insérez une entrée initiale si elle n'existe pas
        const initQuery = `INSERT INTO game (id, state, player) VALUES (1, '[[\"\", \"\", \"\"], [\"\", \"\", \"\"], [\"\", \"\", \"\"]]', 'X') ON CONFLICT (id) DO NOTHING;`;
        await client.query(initQuery);
    })
    .catch((err) => {
        console.error('Erreur lors de la connexion', err);
    });

// Etat de base de la partie
let state = [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
];

//Jouer courrant
let currentPlayer = 'X';

// Fonction checkWinner qui va vérifier si 3 symbols son alligner
function checkWinner(symbol) {
    for (let i = 0; i < 3; i++) {
        if (state[i][0] == symbol && state[i][1] == symbol && state[i][2] == symbol) {
            return true;
        }
    }
    for (let j = 0; j < 3; j++) {
        if (state[0][j] == symbol && state[1][j] == symbol && state[2][j] == symbol) {
            return true;
        }
    }
    if ((state[0][0] == symbol && state[1][1] == symbol && state[2][2] == symbol) ||
        (state[0][2] == symbol && state[1][1] == symbol && state[2][0] == symbol)) {
        return true;
    }
    return false;
}

// Fonction isBoardFull qui va vérifier si le tableau est remplis
function isBoardFull() {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (state[i][j] === '') {
                return false;
            }
        }
    }
    return true;
}

// Fonction loadGameState qui va récupérer l'état de la partie depuis ma base de données
async function loadGameSate() {
    try {
        const res = await client.query('SELECT * from game where id = 1');
        if (res.rows.length > 0) {
            state = JSON.parse(res.rows[0].state);
            currentPlayer = res.rows[0].player;
        }
    } catch (err) {
        console.error('Erreur lors du chargement de la partie', err);
    }
}

// Fonction saveGameState qui va sauvegarder l'état dans la base de données
async function saveGameState() {
    const query = 'UPDATE game SET state = $1, player = $2 WHERE id = 1;';
    const values = [JSON.stringify(state), currentPlayer];
    try {
        await client.query(query, values);
    } catch (err) {
        console.error('Erreur lors du chargement de la partie', err);
    }
}

// Affiche la page d'acceuil
app.get('/', (req, res) => {
    res.render('pages/accueil', { title: 'Accueil', state: state });
});

//Affiche la page de jeu
app.get('/index', async (req, res) => {
    await loadGameSate();
    res.render('pages/index', { title: 'Morpion', state: state, currentPlayer: currentPlayer });
});

//Créer une nouvelle partie
app.post('/newgame', async (req, res) => {
    state = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    currentPlayer = 'X';
    await saveGameState();
    res.redirect('/index');
});

// Route pour charger une partie existante
app.post('/loadgame', async (req, res) => {
    await loadGameSate();
    res.redirect('/index');
});

//Verifie quelle elle la personne qui à gagner ou si il y a égaliter
app.post('/submit', async (req, res) => {
    const { choice } = req.body;
    const [row, col] = choice.split('-').map(Number);
    if (state[row][col] === '') {
        state[row][col] = currentPlayer;
        if (checkWinner(currentPlayer)) {
            await saveGameState();
            res.send(`Wow, le joueur ${currentPlayer} a gagné!`);
            return;
        }
        if (isBoardFull()) {
            await saveGameState();
            res.send('Match nul!');
            return;
        }
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        await saveGameState();
    }
    res.redirect('/index');
});

//Redémare la partie de zéro
app.post('/reset', async (req, res) => {
    state = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    currentPlayer = 'X';
    await saveGameState();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
}); 


app.post('/api/games', async (req, res) => {
    const initialState = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    const initialPlayer = 'X';
    const query = 'INSERT INTO game (state, player) VALUES ($1, $2) RETURNING id;';
    const values = [JSON.stringify(initialState), initialPlayer];
    
    try {
        const result = await client.query(query, values);
        const gameId = result.rows[0].id;
        res.status(201).json({ message: 'Nouvelle partie créée avec succès', gameId: gameId });
    } catch (err) {
        console.error('Erreur lors de la création de la partie', err);
        res.status(500).json({ message: 'Erreur lors de la création de la partie' });
    }
});

app.put('/api/games/:id', async (req, res) => {
    try {
      const gameId = req.params.id;
      const { cell } = req.body;
  
      if (!cell) {
        res.status(400).json({ error: 'Cell not selected' });
        return;
      }
  
      const [i, j] = cell.split('-').map(Number);
  
      const result = await pool.query('SELECT state, player FROM games WHERE id = $1', [gameId]);
      const { state, player } = result.rows[0];
      let boardState = JSON.parse(state);
  
      if (boardState[i][j] !== '') {
        res.status(400).json({ error: 'Cell already filled' });
        return;
      }
  
      boardState[i][j] = player;
  
      const winner = checkWinner(boardState);
      if (winner) {
        await endGame(gameId, boardState, res);
      } else {
        const nextPlayer = player === 'X' ? 'O' : 'X';
        await pool.query('UPDATE games SET state = $1, player = $2 WHERE id = $3', [JSON.stringify(boardState), nextPlayer, gameId]);
        res.json({ state: boardState, player: nextPlayer });
      }
  
    } catch (error) {
      console.error('Error playing move:', error);
      res.status(500).send('Internal Server Error');
    }
  });

app.get('/api/games/:id', async (req, res) => {
    const gameId = req.params.id;

    try {
        const result = await client.query('SELECT * FROM game WHERE id = $1', [gameId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Partie non trouvée' });
        }
        const game = result.rows[0];
        res.json({ state: JSON.parse(game.state), currentPlayer: game.player, finished: game.finished });
    } catch (err) {
        console.error('Erreur lors de la récupération de la partie', err);
        res.status(500).json({ message: 'Erreur lors de la récupération de la partie' });
    }
});
