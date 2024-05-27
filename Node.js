const express = require('express');
const bodyParser = require('body-parser'); 
const app = express();
const port = 3000;

app.set('view engine', 'ejs'); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({extended: true}));



let state = [
    ['','',''],
    ['','',''],
    ['','','']
]; 

function checkWinner(s){
    for(let i=0; i<3; i++) {
        if (state [i][0] === symbol && state [i][1] === symbol && state[i][2] == symbol) {
            return true
        }
}
    for(let j=0; j<3; i++) {
        if (state [0][j] === symbol && state [1][j] === symbol && state[2][j] == symbol) {
            return true
        }
    }

    if ((state [0][0] === symbol && state [1][1] === symbol && state[2][2] == symbol) || (state [0][2] === symbol && state [1][1] === symbol && state[2][0] == symbol)) {
        return true
    }
    return false
}




app.get('/', (req, res) => {
res.render('pages/index');
});

app.post('/submit', (req, res) => {
    const { choice } = req.body
    const [row, col] = choice.split('-').map(Number); 
    if(state[row,col] === ''){
        state[row, col] === 'X'; 
        if(checkWinner('X')){
            res.send('Wow, le joueur X à gagner')
            return; 
        } 
    }
});



app.listen(port, () => {
console.log(`Example app listening at http://localhost:${port}`);
});