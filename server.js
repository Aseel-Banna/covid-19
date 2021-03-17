'use strict';

const express= require('express');
const superagent = require('superagent');
const cors= require('cors');
const methodOverride = require('method-override');
const pg = require('pg');

const app = express();

require('dotenv').config();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
const client = new pg.Client(process.env.DATABASE_URL);
// const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const PORT = process.env.PORT || 3000;
app.get('/', homeHandler);
app.get('/getCountryResult', getCountryResultHandler);
app.get('/allCountries', allCountriesHandler);
app.post('/myRecords', myRecordsHandler);
app.get('/myRecords', renderAllRecords);
app.get('/recordDetails/:id', recordDetailsHandler);
app.delete('/deleteRecord/:id', deleteRecordHandler);

function homeHandler(req,res){
    let url = `https://api.covid19api.com/world/total`;

    superagent.get(url)
    .then(data =>{
        res.render('pages/home', {data : data.body});
    });
}

function getCountryResultHandler(req,res){
    let country = req.query.country;
    let from = req.query.from;
    let to = req.query.to;
    let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;

    superagent.get(url)
    .then(data =>{
        let countryData = data.body.map(item => {
            return new Country(item);
        });
        res.render('pages/getCountryResult', {data : countryData});
    });
}

function allCountriesHandler(req,res){
    let url = `https://api.covid19api.com/summary`;

    superagent.get(url)
    .then(data =>{
        let allCountriesData = data.body.Countries.map(item =>{
            return new AllCountries(item);
        });
        res.render('pages/allCountries', {data : allCountriesData});
    });
}

function myRecordsHandler(req,res){
    let SQL = `INSERT INTO countries (country, totalconfirmed, totaldeaths, totalrecovered, date) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    let value = req.body;
    let safeValues = [value.country, value.totalconfirmed, value.totaldeaths, value.totalrecovered, value.date];

    client.query(SQL, safeValues)
    .then(data =>{
        res.redirect('/myRecords');
    });
}

function renderAllRecords(req, res){
    let SQL = `SELECT * FROM countries;`;

    client.query(SQL)
    .then(data =>{
        res.render('pages/myRecords', {data : data.rows});
    });
}

function recordDetailsHandler(req,res){
    let id = req.params.id;
    let SQL = `SELECT * FROM countries WHERE id=$1`;
    let safeValue = [id];

    client.query(SQL, safeValue)
    .then(data =>{
        res.render('pages/recordDetails', {data : data.rows[0]});
    });
}

function deleteRecordHandler(req,res){
    let id = req.params.id;
    let SQL = `DELETE FROM countries WHERE id=$1;`;
    let safeValue = [id];

    client.query(SQL, safeValue)
    .then(data =>{
        res.redirect('/myRecords');
    });
}


function Country(data){
    this.country = data.Country;
    this.date = data.Date;
    this.cases = data.Cases;
}

function AllCountries(data){
    this.country = data.Country;
    this.totalconfirmed = data.TotalConfirmed;
    this.totaldeaths = data.TotalDeaths;
    this.totalrecovered = data.TotalRecovered;
    this.date = data.Date;
}

client.connect()
.then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Listening to PORT ${PORT}`);
    })
})

