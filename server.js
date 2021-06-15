const mongoose = require('mongoose');
const cron = require('node-cron');
const http = require('http');
mongoose.set('useFindAndModify', false);
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config()
const Twit = require('twit');
const id = process.env.document_id;
const T = new Twit({ consumer_key: process.env.consumer_key, consumer_secret: process.env.consumer_secret, access_token: process.env.access_token, access_token_secret: process.env.access_token_secret });
const { findTimeZone, getZonedTime } = require('timezone-support');
const moment = require('moment');
moment.suppressDeprecationWarnings = true;
const ChartJSImage = require('chart.js-image');
const textToImage = require('text-to-image');
const logs = require('./db/model');
const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(process.env.discord_webhook);

const server = http.createServer((req, res) => {
    if (req.method == 'GET' && req.url === '/') {
        let file = fs.readFileSync('./client/index.html')
        res.write(file)
    } else if (req.method == 'POST' && req.url == '/') {
        console.log(req.body)
    }
    res.end()
})

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
    }
    tweet(report_type) {
        if (report_type == 'week report') {
            let chart = fs.readFileSync('./chart_week.png', { encoding: 'base64' })

            T.post('media/upload', { media_data: chart }, ({ data }) => {
                let text = `Coronavirus Cases in Sri Lanka is currently ${this.total_cases}!\n\n→ Active : ${this.active}\n→ Cases Today : ${this.cases_today}\n→ Deaths : ${this.deaths}\n→ Cases Yesterday : ${this.cases_yesterday}\n→ Recovered : ${this.recovered}\n→ Deaths Today : ${this.deaths_today}\n→ Total PCR Tests : ${this.pcr_tests}`;
                let tweet = {
                    status: text + `\n\n    ~ 🇱🇰  STATUS ID ${Math.floor(Math.random()*1000)} ~\n[#COVID19SL #COVID19LK]`,
                    media_ids: [data.media_id_string]
                }
                T.post('statuses/update', tweet, ({ err }) => {
                    fs.unlinkSync('./chart_week.png')
                    hook.setUsername(`Shameel Server - @COVID19_SL`);
                    hook.setAvatar(process.env.avatar);
                    hook.send(tweetText)
                    if (err) throw Error(err)
                    else return;
                })
            })
        } 
        else if (report_type == 'death report') {
            let chart = fs.readFileSync('./chart_death.png', { encoding: 'base64' })
            T.post('media/upload', { media_data: chart }, ({ data }) => {
                let text = `${this.deaths_today} new reported deaths today in Sri Lanka, bringing the total to ${this.deaths} deaths!`;
                let tweet = {
                    status: text + `\n\n    ~ 🇱🇰  STATUS ID ${Math.floor(Math.random()*1000)} ~\n[#COVID19SL #COVID19LK]`,
                    media_ids: [data.media_id_string]
                }
                T.post('statuses/update', tweet, ({ err }) => {
                    fs.unlinkSync('./chart_death.png')
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
                label: 'COVID CASES IN SRI LANKA THIS WEEK — ' + time,
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

function formatTime (date, timeZone) {
    const zonedTime = getZonedTime(date, timeZone)
    const { year, month, day, hours, minutes, seconds } = zonedTime
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
    
function displayTime (date, timeZone) {
    const formattedTime = formatTime(date, timeZone)
    return formattedTime;
}
    
function displayHour (date, timeZone) {
    const zonedTime = getZonedTime(date, timeZone)
    const { hours } = zonedTime
    return `${hours}`
}

cron.schedule('0 0-23 * * *', async () => {
    await mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true })
    let api = await fetch('https://www.hpb.health.gov.lk/api/get-current-statistical')
    let res = await api.json()
    let data = res.data
    let date = new Date()
    let local_timezone = displayTime(date, findTimeZone('Asia/Colombo'))
    let local_day = moment(local_timezone).format('dddd');
    let local_hour = displayHour(date, findTimeZone('Asia/Colombo'))
    let local_timezone_format = moment(local_timezone).format('LLLL')
    let death_index = () => logs.findById(id).then(index => index.Deaths_Today)

    local_day != moment(data.update_date_time).format('dddd') ? (data.local_new_cases = 0) : (null)
    local_day != moment(data.update_date_time).format('dddd') ? (data.local_new_deaths = 0) : (null)
    data.local_new_deaths != await death_index() ? (death_report(data)) : (null)
    
    switch(moment(data.update_date_time).format('dddd')) {
        case 'Monday':
            await logs.findByIdAndUpdate({ _id: id }, { Monday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        case 'Tuesday':
            await logs.findByIdAndUpdate({ _id: id }, { Tuesday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        case 'Wednesday':
            await logs.findByIdAndUpdate({ _id: id }, { Wednesday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        case 'Thursday':
            await logs.findByIdAndUpdate({ _id: id }, { Thursday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        case 'Friday':
            await logs.findByIdAndUpdate({ _id: id }, { Friday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        case 'Saturday':
            await logs.findByIdAndUpdate({ _id: id }, { Saturday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        case 'Sunday':
            await logs.findByIdAndUpdate({ _id: id }, { Sunday: data.local_new_cases.toString() })
            await logs.findByIdAndUpdate({ _id: id }, { Deaths_Today: data.local_new_deaths.toString() })
            break;
        default:
            break;
    }
    let week_data = await logs.findById(id)
    let day_data = Object.assign(data, { local_yesterday_cases: parseInt(week_data.Yesterday) })
    let report = new Report(day_data)

    try {
        await report.chart_week(week_data, local_timezone_format)
        await report.tweet('week report')
    }
    catch (err) {
        console.error(err.message)
    }

    async function death_report(day_data) {
        try {
            let report = new Report(day_data)
            await report.chart_death(day_data.local_new_deaths, local_timezone_format)
            setTimeout(async () => { await report.tweet('death report'), 60000 * 30 })
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
        let cases_today = await api.json().then((res) => res.data.local_new_cases)
        await logs.updateMany({ Yesterday: cases_today.toString(), Deaths_Today: "0"})
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