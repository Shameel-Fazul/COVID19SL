const mongoose = require('mongoose');
const cron = require('node-cron');
const herokuAwake = require("heroku-awake");
const http = require('http');
mongoose.set('useFindAndModify', false);
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config()
const Twit = require('twit');
const id = process.env.document_id;
const T = new Twit({ consumer_key: process.env.consumer_key, consumer_secret: process.env.consumer_secret, access_token: process.env.access_token, access_token_secret: process.env.access_token_secret });
const { findTimeZone, getZonedTime } = require('timezone-support');
const { converter, SYSTEM } = require("@kushalst/numbers-to-words-converter");
const moment = require('moment');
moment.suppressDeprecationWarnings = true;
const ChartJSImage = require('chart.js-image');
const textToImage = require('text-to-image');
const logs = require('./db/model');
const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(process.env.discord_webhook);

const server = http.createServer((req, res) => {
    if (req.method == 'GET' && req.url === '/') {
        res.writeHead(200, {"Content-Type": "application/json"})
        res.write(JSON.stringify({ COVID19SL: 'server is running'}))
    } else if (req.method == 'POST' && req.url == '/') {
        res.writeHead(200, {"Content-Type": "application/json"})
        res.write(JSON.stringify({ COVID19SL: 'panel is inactive'}))
    }
    res.end()
})

herokuAwake("http://covid.shameel-fazul.systems/");
server.listen(process.env.PORT || 3000, () => console.log('COVID19SL > server is running'))

class Report {
    constructor(stats) {
        this.total_cases = stats.local_total_cases
        this.active = stats.local_active_cases
        this.deaths = stats.local_deaths
        this.recovered = stats.local_recovered
        this.cases_today = stats.local_new_cases
        this.deaths_today = stats.local_new_deaths
        this.cases_yesterday = stats.local_yesterday_cases
        this.pcr_tests = stats.total_pcr_testing_count
        this.total_vaccinations = stats.total_vaccinations
        this.people_vaccinated = stats.people_vaccinated
        this.people_fully_vaccinated = stats.people_fully_vaccinated
        this.daily_vaccinations = stats.daily_vaccinations
        this.population = stats.population
    }
    
    tweet(report_type) {                                     
        if (report_type == 'week report') {
            while (!fs.existsSync(__dirname + '/chart_week.png')) {
                console.log('week chart does not exist')
            }
            const week_chart = fs.readFileSync(__dirname + '/chart_week.png', { encoding: 'base64' })
            const vaccination_chart = fs.readFileSync(__dirname + '/contents/vaccination_report_thumbnail.jpg', { encoding: 'base64' })

            T.post('media/upload', { media_data: week_chart }, (err, data) => {
                let text = `Coronavirus Cases in Sri Lanka is currently ${Number(this.total_cases).toLocaleString()}!\n\n– Active : ${Number(this.active).toLocaleString()}\n– Cases Today : ${Number(this.cases_today).toLocaleString()}\n– Deaths : ${Number(this.deaths).toLocaleString()}\n– Cases Yesterday : ${Number(this.cases_yesterday).toLocaleString()}\n– Recovered : ${Number(this.recovered).toLocaleString()}\n– Deaths Today : ${Number(this.deaths_today).toLocaleString()}\n– Total PCR Tests : ${Number(this.pcr_tests).toLocaleString()}`;
                let tweet = {
                    status: text + `\n\n    ~ 🇱🇰  STATUS ID ${Math.floor(Math.random()*1000)} ~\n[#COVID19SL #COVID19LK]`,
                    media_ids: [data.media_id_string]
                }
                T.post('statuses/update', tweet, (err) => {
                    fs.unlinkSync(__dirname + '/chart_week.png')
                    hook.setUsername(`Shameel Server - @COVID19_SL`);
                    hook.setAvatar(process.env.avatar);
                    hook.send(text + `\n– Vaccinated : ${this.people_vaccinated / 21919000 * 100}%`)
                    if (err) throw Error(err)
                    else return;
                })
            })

            setTimeout(() => {
                T.post('media/upload', { media_data: vaccination_chart }, (err, data) => {
                    let text = `💉 About ${converter.toWords(this.people_vaccinated, SYSTEM.INTL).split(",")[0]} (${Math.floor(this.people_vaccinated / 21919000 * 100)}%) Sri Lankans have gotten at least one vaccine dose so far!\n\n– Total Vaccinations: ${Number(this.total_vaccinations).toLocaleString()}\n– Fully Vaccinated : ${Number(this.people_fully_vaccinated).toLocaleString()}\n– Daily Vaccinations : ${Number(this.daily_vaccinations).toLocaleString()}`;
                    let tweet = {
                        status: text + `\n\n    ~ 🇱🇰  STATUS ID ${Math.floor(Math.random()*1000)} ~\n[#COVID19SL #COVID19LK]`,
                        media_ids: [data.media_id_string]
                    }
                    T.post('statuses/update', tweet, (err) => {
                        if (err) throw Error(err)
                        else return;          
                    })
                })
            }, 60000 * 20);
        } 
        else if (report_type == 'death report') {
            while (!fs.existsSync(__dirname + '/chart_death.png')) {
                console.log('death chart does not exist')
            }
            let death_chart = fs.readFileSync(__dirname + '/chart_death.png', { encoding: 'base64' })
            T.post('media/upload', { media_data: death_chart }, (err, data) => {
                let text = `${Number(this.deaths_today).toLocaleString()} new reported deaths today in Sri Lanka, bringing the total to ${Number(this.deaths).toLocaleString()} deaths!`;
                let tweet = {
                    status: text + `\n\n    ~ 🇱🇰  STATUS ID ${Math.floor(Math.random()*1000)} ~\n[#COVID19SL #COVID19LK]`,
                    media_ids: [data.media_id_string]
                }
                T.post('statuses/update', tweet, (err) => {
                    fs.unlinkSync(__dirname + '/chart_death.png')
                    if (err) throw Error(err)
                    else return;
                })
            })
        }
       
    }
    chart_week(weeklogs, time) {
        let ChartLabel = `Monday : ${weeklogs.Monday} | Tuesday : ${weeklogs.Tuesday} | Wednesday : ${weeklogs.Wednesday} | Thursday : ${weeklogs.Thursday} | Friday : ${weeklogs.Friday} | Saturday : ${weeklogs.Saturday} | Sunday : ${weeklogs.Sunday}`;
    
        let w_log = [parseInt(weeklogs.Monday), parseInt(weeklogs.Tuesday), parseInt(weeklogs.Wednesday), parseInt(weeklogs.Thursday), parseInt(weeklogs.Friday), parseInt(weeklogs.Saturday), parseInt(weeklogs.Sunday)]

        let buffer = ChartJSImage()
        
        .chart({
        type: 'line',
        data: {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            datasets: [
            {
                label: 'COVID CASES IN SRI LANKA THIS WEEK — ' + time.toUpperCase(),
                borderColor: 'rgb(128, 0, 0)',
                backgroundColor: 'rgba(194, 24, 7, .4)',
                data: [w_log[0], w_log[1], w_log[2], w_log[3], w_log[4], w_log[5], w_log[6]],
            },
            ],
        },
        options: {
            responsive: false,
            title: {
            textAlign: 'center',
            display: true,
            text: ChartLabel,
            fontSize: 10,
            },
            tooltips: {
            mode: 'index',
            },
            hover: {
            mode: 'index',
            },
            scales: {
            xAxes: [
                {
                scaleLabel: {
                    fontColor: '#808080',
                    fontSize: 9,
                    display: true,
                    labelString: `TWITTER - @COVID19_SL - Shameel Fazul`,
                },
                },
            ],
            yAxes: [
                {
                stacked: true,
                scaleLabel: {
                    display: false,
                    labelString: 'Shameel Fazul',
                },
                },
            ],
            },
        },
        })
        .bkg('black')
        .width(600)
        .height(335)
        .toFile('./chart_week.png')  
        .then(() => { return })
        .catch(err => { throw Error(err) }) 
    }
    chart_death(deathlogs, time) {
        textToImage.generate(`\nCoronavirus - Sri Lanka\n\n${deathlogs}\nDEATH(S)\nTODAY\n\n${time}`.toUpperCase(), {
            debug: true,
            maxWidth: 600,
            fontSize: 28,
            fontWeight: 'bold',
            fontFamily: 'DejaVu Sans Mono, monospace',
            textAlign: 'center',
            lineHeight: 40,
            margin: 20,
            bgColor: "black",
            textColor: "red",
            customHeight: 335,
            debugFilename: 'chart_death.png'
          })
          .then(() => { return })
          .catch(err => { throw Error(err) })  
    }
}

function vaccination(data) {
    let LKA_vaccinations;
    for (let i = 0; i < data.length; i++) {
        if (data[i].iso_code === "LKA") {
            LKA_vaccinations = data[i];
        }
    }
    return LKA_vaccinations.data[LKA_vaccinations.data.length - 1];
}

function formatTime (date, timeZone) {
    const zonedTime = getZonedTime(date, timeZone)
    const { year, month, day, hours, minutes, seconds } = zonedTime
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
    
function displayTime (date, timeZone) {
    const formattedTime = formatTime(date, timeZone)
    return formattedTime;
}
    
cron.schedule('0 0-23 * * *', async () => {
    await mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true })
    let infection_api = await fetch('https://www.hpb.health.gov.lk/api/get-current-statistical')
    let vaccination_api = await fetch('https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/vaccinations/vaccinations.json')
    let population_api = await fetch("https://restcountries.eu/rest/v2/alpha/lka")
    let infection_api_res = await infection_api.json()
    let vaccination_api_res = await vaccination_api.json()
    let population_api_res = await population_api.json()
    let infection_data = infection_api_res.data
    let vaccination_data = vaccination(vaccination_api_res)
    let population_data = population_api_res.population
    let date = new Date()
    let local_timezone = displayTime(date, findTimeZone('Asia/Colombo'))
    let local_day = moment(local_timezone).format('dddd')
    let local_timezone_format = moment(local_timezone).format('LLLL')
    let index = async () => await logs.findById(id)

    local_day != moment(infection_data.update_date_time).format('dddd') ? (infection_data.local_new_cases = 0) : (null)
    local_day != moment(infection_data.update_date_time).format('dddd') ? (infection_data.local_new_deaths = 0) : (null)
    infection_data.local_new_cases == index.Yesterday ? (infection_data.local_new_cases = 0) : (null)
    infection_data.local_new_deaths == index.Deaths_Yesterday ? (infection_data.local_new_deaths = 0) : (null)
    infection_data.local_new_deaths != index.Deaths_Today ? (death_report(infection_data)) : (null)
    
    switch(local_day) {
        case 'Monday':
            await logs.findByIdAndUpdate({ _id: id }, { Monday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        case 'Tuesday':
            await logs.findByIdAndUpdate({ _id: id }, { Tuesday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        case 'Wednesday':
            await logs.findByIdAndUpdate({ _id: id }, { Wednesday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        case 'Thursday':
            await logs.findByIdAndUpdate({ _id: id }, { Thursday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        case 'Friday':
            await logs.findByIdAndUpdate({ _id: id }, { Friday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        case 'Saturday':
            await logs.findByIdAndUpdate({ _id: id }, { Saturday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        case 'Sunday':
            await logs.findByIdAndUpdate({ _id: id }, { Sunday: infection_data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: infection_data.local_new_deaths.toString() })
            break;
        default:
            break;
    }

    let week_data = await logs.findById(id)
    let day_data = Object.assign(infection_data, { local_yesterday_cases: parseInt(week_data.Yesterday), population: population_data, total_vaccinations: vaccination_data.total_vaccinations, people_vaccinated: vaccination_data.people_vaccinated, people_fully_vaccinated: vaccination_data.people_fully_vaccinated, daily_vaccinations: vaccination_data.daily_vaccinations})
    let get = new Report(day_data)

    try {
        await get.chart_week(week_data, local_timezone_format)
        setTimeout(async () => { 
            let report = new Report(day_data)
            await report.tweet('week report')
        }, 10000);
    }
    catch (err) {
        console.error(err.message)
    }

    async function death_report(day_data) {
        let get = new Report(day_data)
        await get.chart_death(day_data.local_new_deaths, local_timezone_format)

        try {          
            setTimeout(async () => {
              let report = new Report(day_data)
              await report.tweet('death report')
            }, 60000 * 30)
        }
        catch (err) {
            console.error(err.message)
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Colombo"
});

cron.schedule('57 23 * * *', async () => {
    await mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true })
    try {
        let api = await fetch('https://www.hpb.health.gov.lk/api/get-current-statistical')
        let index = await api.json()
        await logs.updateMany({ Yesterday: index.data.local_new_cases.toString(), Deaths_Today: "0", Deaths_Yesterday: index.data.local_new_deaths.toString() })
    }
    catch (err) {
        console.error(err.message)
    }
}, {
    scheduled: true,
    timezone: "Asia/Colombo"
});

cron.schedule('57 23 * * 7', async () => {
    await mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true })
    try {
        await logs.updateMany({ Monday: "0", Tuesday: "0", Wednesday: "0", Thursday: "0", Friday: "0", Saturday: "0", Sunday: "0" })
    }
    catch (err) {
        console.error(err.message)
    }
}, {
    scheduled: true,
    timezone: "Asia/Colombo"
});
