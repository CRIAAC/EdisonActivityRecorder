"use strict";

var _mongoose = require('mongoose'),
    _async = require("async"),
    _moment = require("moment"),
    _config = require("./config.json"),
    Kurunt = require("kurunt"),
    dgram = require('dgram'),
    _socket = dgram.createSocket('udp4');
var NanoTimer = require('nanotimer');

var DataSchema = new _mongoose.Schema({
    subActivityName : {type: String},
    index : {type : Number},
    timestamp : {type: Date},
    content : [{
        yaw : {type : Number},
        pitch : {type : Number},
        roll : {type : Number},
        accel_X : {type : Number},
        accel_Y : {type : Number},
        accel_Z : {type : Number},
        gyro_X : {type : Number},
        gyro_Y : {type : Number},
        gyro_Z : {type : Number},
        magneto_X : {type : Number},
        magneto_Y : {type : Number},
        magneto_Z : {type : Number}
    }]
});
DataSchema.set('collection', _config.mongo.collection);
var DataModel = _mongoose.model('Data', DataSchema);

class Spouter{

    constructor(frequency){
        _mongoose.connect('mongodb://'+ (_config.mongo.host || 'localhost') +':'+ (_config.mongo.port || 27017) +'/'+_config.mongo.database);
        this.dataset = _mongoose.connection;
        this.dataset.once("open", function(){
            console.log("Connected to database");
        });
        this.frequency = frequency;
        this.recording = false;
        this.timer = new NanoTimer();
        this.accumulatedData = {};
        _socket.on('listening', function () {
            var address = _socket.address();
            console.log('UDP Client listening on ' + address.address + ":" + address.port);
            _socket.setBroadcast(true);
            _socket.setMulticastTTL(128);
            _socket.addMembership(_config.multicast.addr, _config.server);
        });
        _socket.on('message', this.onDataReceived.bind(this));
        _socket.bind(_config.multicast.port, _config.server);
    }

    deleteCollection(subactivities, iteration){
        for(var i = 0; i < subactivities.length; i++) {
            DataSchema.remove({index: iteration}, function(err){
                if(err) throw err;
            });
        }
    }

    onDataReceived(message){
        if(!this.recording) return;
        message = message + "";
        this.accumulatedData[message.split(",")[0]] = message;
    }

    startRecordingActivity(activity, iteration){
        if(activity == undefined || activity == ""){
            throw "Activity undefined";
        }
        this.currentSubActivityName = activity;
        this.currentIteration = iteration;
        this.recording = true;
        this.timer.setTimeout(this.saveData.bind(this, activity, iteration), "", this.frequency + "m");
        //this.timer = setInterval(this.saveData.bind(this, activity, iteration), this.frequency);

    }

    changeSubActivity(activity, iteration){
        if(activity == undefined || activity == ""){
            throw "Activity undefined";
        }
        if(this.currentSubActivityName != undefined) {
            DataModel.count({
                subActivityName: this.currentSubActivityName,
                index: this.currentIteration
            }, function (err, res) {
                if (err) throw err;
                console.log(res);
            });
        }
        this.currentSubActivityName = activity;
        this.currentIteration = iteration;
    }

    stopRecording(){
        this.recording = false;
        this.accumulatedData = {};
        this.timer.clearTimeout();
        if(this.currentSubActivityName != undefined) {
            DataModel.count({
                subActivityName: this.currentSubActivityName,
                index: this.currentIteration
            }, function (err, res) {
                if (err) throw err;
                console.log(res);
            });
        }
    }

    saveData(activity, iteration){
        var now = _moment().toDate();
        this.timer.setTimeout(this.saveData.bind(this, activity, iteration), "", this.frequency + "m");
        // START ASYNC NON BLOQUANT
        var results = [];
        _config['edisons'].forEach(function(element){
            if(this.accumulatedData.hasOwnProperty(element.server.mac)){
                var explode = this.accumulatedData[element.server.mac].split(",");
                results.push({
                    yaw : explode[1],
                    pitch : explode[2],
                    roll : explode[3],
                    accel_X : explode[4],
                    accel_Y : explode[5],
                    accel_Z : explode[6],
                    gyro_X : explode[7],
                    gyro_Y : explode[8],
                    gyro_Z : explode[9],
                    magneto_X : explode[10],
                    magneto_Y : explode[11],
                    magneto_Z : explode[12]
                });
            } else {
                results.push({
                    yaw : null,
                    pitch : null,
                    roll : null,
                    accel_X : null,
                    accel_Y : null,
                    accel_Z : null,
                    gyro_X : null,
                    gyro_Y : null,
                    gyro_Z : null,
                    magneto_X : null,
                    magneto_Y : null,
                    magneto_Z : null
                });
            }
        }.bind(this));
        var data = new DataModel({
            subActivityName: this.currentSubActivityName,
            index: this.currentIteration,
            timestamp : now,
            content : results
        });
        data.save(function(err){
            if(err) throw err;
        });
        this.accumulatedData = {};
        // FIN ASYNC NON BLOQUANT
    }

    /*saveData(name, index){
        if(!this.recording) return;

        //var now = _moment().toDate();
        console.time("gets");
        _async.parallel(this.getterArray, function(err, results){
            console.timeEnd("gets");
            var data = new DataModel({
                subActivityName: name,
                index: index,
                timestamp : _moment().toDate(),
                content : results
            });
            data.save(function(err){
                if(err) throw err;
            });
            console("toto");
        });
        this.timer = setTimeout(this.saveData.bind(this, name, index),this.frequency);
    }*/
}

module.exports = Spouter;