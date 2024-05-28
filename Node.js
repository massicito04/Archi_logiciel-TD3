const express = require('express');
const bodyParser = require('body-parser'); 
const { Client } = require('pg'); 
const app = express();
const port = 3000;

app.set('view engine', 'ejs'); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({extended: true}));

const client = new Client ({
    host: "127.0.0.1", 
    port: 5432, 
    user: "postgres",
    password: "bonpoulet",
    database: "morpion",   

}); 

client
	.connect()
	.then(() => {
		console.log('Connected to PostgreSQL database');
	})
	.catch((err) => {
		console.error('Erreur lors de la connection', err);
	});

client.query('SELECT * from game', (err,result) => {
    if(err){
        console.error('Erreur dans l\'execution de la query', err); 
    } else {
        console.log('Resultat de la requete', result)
    }
}); 

let state = [
    ['','',''],
    ['','',''],
    ['','','']
]; 

function checkWinner(symbol){
    for(let i=0; i<3; i++) {
        if (state[i][0] == symbol && state[i][1] == symbol && state[i][2] == symbol) {
            return true;
        }
    }
    for(let j=0; j<3; j++) {
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

app.get('/', (req, res) => {
    res.render('pages/index', { title: 'Jeu de morpion', message: 'Morpion', state });
});

app.post('/submit', (req, res) => {
    const { choice } = req.body;
    const [row, col] = choice.split('-').map(Number); 
    if(state[row][col] === ''){
        state[row][col] = 'X'; 
        if(checkWinner('X')){
            res.send('Wow, le joueur X à gagner');
            return; 
        } 
    }
    res.redirect('/');
});

app.post('/reset', (req,res) => {
    state = [
        ['','',''],
        ['','',''],
        ['','','']
    ];
    res.redirect('/');
}); 

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
