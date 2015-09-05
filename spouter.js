"use strict";
var _mongoose = require('mongoose'),
    _config = require("./config.js"),
    WebSocket = require("ws").Server;
var DescriptionSchema = new _mongoose.Schema({
    subActivityName : {type: String},
    index : {type : Number},
    start : {type: Number},
    end : {type: Number}
});
var DataSchema = new _mongoose.Schema({
    mac : {type : String},
    timestamp : {type: Number},
    accel_X : {type : Number},
    accel_Y : {type : Number},
    accel_Z : {type : Number},
    gyro_X : {type : Number},
    gyro_Y : {type : Number},
    gyro_Z : {type : Number},
    magneto_X : {type : Number},
    magneto_Y : {type : Number},
    magneto_Z : {type : Number}
});
var TimeSchema = new _mongoose.Schema({
    mac : {type : String},
    timestamp : {type: Number}
});
DescriptionSchema.set('collection', _config.mongo.collection + "_descriptions");
DataSchema.set('collection', _config.mongo.collection + "_datas");
TimeSchema.set('collection', _config.mongo.collection + "_times");
var DescriptionModel = _mongoose.model('Descriptions', DescriptionSchema);
var DataModel = _mongoose.model('Datas', DataSchema);
var TimeModel = _mongoose.model('Times', TimeSchema);
class Spouter{

    constructor(frequency){
        _mongoose.connect('mongodb://'+ (_config.mongo.host || 'localhost') +':'+ (_config.mongo.port || 27017) +'/'+_config.mongo.database);
        this.dataset = _mongoose.connection;
        this.dataset.once("open", function(){
            console.log("Connected to database");
        });
        this.frequency = frequency;
        this.recording = false;
        this.startTime = null;
        this.edisonsTime = {};
        this.stopTime = null;
        this.server = new WebSocket({"host":_config.server, "port":_config.websocket}, function(){
            console.log("Server start on ws://"+_config.server+":"+_config.websocket);
        }).on("error", function(e){
                console.log("Server error " + e);
            }).on('connection', function (ws) {
                ws.on('message', this.onDataReceived.bind(this));
            }.bind(this));
    }

    deleteCollection(iteration){
        DescriptionModel.find({index: iteration}, {start:1, end:1}).sort({_id:-1}).exec(function(err, docs){
            if(err) console.log("delete error : " + err);
            docs.forEach(function(elem){
                DataModel.remove({timestamp : {$gte: elem.start, $lte: elem.end}}, function(err){
                    if(err) throw err;
                    DescriptionModel.remove({index: iteration}, function(err){
                        if(err) console.log("delete error : " + err);
                    });
                });
            });
        });
    }

    onDataReceived(message){
        if(!this.recording) return;

        var data = message.split(',');
        data.pop();
        var mac = data[1];

        if(this.edisonsTime.hasOwnProperty(mac)) {
            this.edisonsTime[mac] += this.frequency;
        } else {
            this.edisonsTime[mac] = this.startTime;
        }
        if(this.stopTime != null){
            var nbEdisonDone = 0;
            for(var key in this.edisonsTime){
                if(this.stopTime < this.edisonsTime[key]) nbEdisonDone++;
            }
            if(nbEdisonDone == this.edisonsTime.length) this.recording = false;
            if(this.stopTime < this.edisonsTime[mac]) return;
        }
        var timeToSave = new TimeModel({
            mac : mac,
            timestamp: data[0]
        });
        timeToSave.save(function (err) {
            if(err) console.log("time save error : " + err);
        });
        var toSave = new DataModel({
            mac : mac,
            timestamp : this.edisonsTime[mac],
            accel_X : data[2],
            accel_Y : data[3],
            accel_Z : data[4],
            gyro_X : data[5],
            gyro_Y : data[6],
            gyro_Z : data[7],
            magneto_X : data[8],
            magneto_Y : data[9],
            magneto_Z : data[10]
        });
        toSave.save(function (err) {
            if(err) console.log("data save error : " + err);
        });
    }

    startRecordingActivity(activity, iteration){
        if(activity == undefined || activity == ""){
            throw "Activity undefined";
        }
        this.currentSubActivityName = activity;
        this.currentIteration = iteration;
        this.startTime = new Date().getTime();
        this.currentSubActivityStart = new Date().getTime();
        this.recording = true;
    }

    changeSubActivity(activity, iteration){
        if(activity == undefined || activity == ""){
            throw "Activity undefined";
        }
        if(this.currentSubActivityName != undefined) {
            var data = new DescriptionModel({
                subActivityName: this.currentSubActivityName,
                index: this.currentIteration,
                start: this.currentSubActivityStart,
                end: new Date().getTime()
            });
            data.save();
        }
        this.currentSubActivityName = activity;
        this.currentIteration = iteration;
        this.currentSubActivityStart = new Date().getTime();
    }

    stopRecording(){
        this.recording = false;
        if(this.currentSubActivityName != undefined) {
            var data = new DescriptionModel({
                subActivityName: this.currentSubActivityName,
                index: this.currentIteration,
                start: this.currentSubActivityStart,
                end: new Date().getTime()
            });
            data.save();
        }
        this.stopTime = new Date().getTime();
        this.edisonsTime = {};
    }
}

module.exports = Spouter;