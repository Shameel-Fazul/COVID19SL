const moongoose = require('mongoose')

const Schema = moongoose.Schema; 

const WeekLogsSchema = new Schema({
    Monday: {
        type: String,
        required: true
    },
    Tuesday: {
        type: String,
        required: true
    },
    Wednesday: {
        type: String,
        required: true
    },
    Thursday: {
        type: String,
        required: true
    },
    Friday: {
        type: String,
        required: true
    },
    Saturday: {
        type: String,
        required: true
    },
    Sunday: {
        type: String,
        required: true
    },
    Yesterday: {
        type: String,
        required: true
    },
    Deaths_Today: {
        type: String,
        required: true
    }
});

const logs = moongoose.model('weeklog', WeekLogsSchema);
module.exports = logs;