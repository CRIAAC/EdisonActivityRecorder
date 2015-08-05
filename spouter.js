"use strict";

var MongoClient = require('mongodb').MongoClient;
var zmq = require("zmq");
var msgpack = require("msgpack5")();
var moment = require("moment");
var ss = require('simple-statistics');

var config = require("./config.json");

class Spouter{

    constructor(activityName, frequency){
        this.activity = activityName;
        this.frequency = frequency;

        this.dataResampled = {};
        MongoClient.connect('mongodb://'+ (config.mongo.host || 'localhost') + ':'+ (config.mongo.port || 27017) + '/' + config.mongo.database, this.mongoCallback.bind(this));
    }

    mongoCallback(err,db){
        if (err) throw err;
        this.dataset = db;
        this.coll = this.dataset.collection(this.activity);
        this.rawColl = this.dataset.collection(this.activity + "_raw");
        this.coll.drop(function(err,reply){
            this.rawColl.drop(function(err,reply) {
                this.socket = zmq.socket("sub");
                this.socket.connect("tcp://127.0.0.1:6666");
                this.socket.subscribe("");
                this.socket.on("message",this.zmqListener.bind(this));
                setTimeout(this.insert_into_collections.bind(this), this.frequency);
            }.bind(this));
        }.bind(this));
    }

    zmqListener(topic,message){
        if (message != undefined) {
            if(this.dataset != undefined)
            {
                var receivedString = msgpack.decode(message);
                receivedString[1] = moment(receivedString[1] / 1000).format("YYYY-MM-DD HH:mm:ss.SSS");

                var pose = receivedString[2].split(',').map(Number);
                var accel = receivedString[3].split(',').map(Number);
                var gyro = receivedString[4].split(',').map(Number);
                var magneto = receivedString[5].split(',').map(Number);

                if(!this.dataResampled.hasOwnProperty(receivedString[0])){
                    this.dataResampled[receivedString[0]]= {
                        yaw: [],
                        pitch: [],
                        roll: [],

                        accel_X: [],
                        accel_Y: [],
                        accel_Z: [],

                        gyro_X: [],
                        gyro_Y: [],
                        gyro_Z: [],

                        magneto_X: [],
                        magneto_Y: [],
                        magneto_Z: []
                    };
                }

                var data ={
                    mac : receivedString[0],
                    timestamp_sent : moment(receivedString[1]).toDate(),
                    timestamp_received : moment().toDate(),
                    yaw : pose[0],
                    pitch : pose[1],
                    roll : pose[2],

                    accel_X : accel[0],
                    accel_Y : accel[1],
                    accel_Z : accel[2],

                    gyro_X : gyro[0],
                    gyro_Y : gyro[1],
                    gyro_Z : gyro[2],

                    magneto_X : magneto[0],
                    magneto_Y : magneto[1],
                    magneto_Z : magneto[2]
                };

                this.dataResampled[receivedString[0]].yaw.push(pose[0]);
                this.dataResampled[receivedString[0]].pitch.push(pose[1]);
                this.dataResampled[receivedString[0]].roll.push(pose[2]);

                this.dataResampled[receivedString[0]].accel_X.push(accel[0]);
                this.dataResampled[receivedString[0]].accel_Y.push(accel[1]);
                this.dataResampled[receivedString[0]].accel_Z.push(accel[2]);

                this.dataResampled[receivedString[0]].gyro_X.push(gyro[0]);
                this.dataResampled[receivedString[0]].gyro_Y.push(gyro[1]);
                this.dataResampled[receivedString[0]].gyro_Z.push(gyro[2]);

                this.dataResampled[receivedString[0]].magneto_X.push(magneto[0]);
                this.dataResampled[receivedString[0]].magneto_Y.push(magneto[1]);
                this.dataResampled[receivedString[0]].magneto_Z.push(magneto[2]);

                this.rawColl.insertOne(data,function(err,doc){
                    if(err){
                        console.log(err);
                    }
                });
            }
        }
    }

    insert_into_collections(){
        var data_to_insert = {};

        var now = moment().toDate();

        if(Object.keys(this.dataResampled).length <= 1){
            setTimeout(this.insert_into_collections.bind(this), this.frequency);
            return;
        }

        for (var key in this.dataResampled) {
            // deep copy
            var local_list = {};
            for (var i in this.dataResampled[key]){
                local_list[i] = this.dataResampled[key][i].slice();
            }

            //init value
            this.dataResampled[key] = {
                yaw: [],
                pitch: [],
                roll: [],

                accel_X: [],
                accel_Y: [],
                accel_Z: [],

                gyro_X: [],
                gyro_Y: [],
                gyro_Z: [],

                magneto_X: [],
                magneto_Y: [],
                magneto_Z: []
            };

            data_to_insert[key] = {};

            data_to_insert[key].yaw =  ss.mean(local_list.yaw);
            data_to_insert[key].pitch = ss.mean(local_list.pitch);
            data_to_insert[key].roll = ss.mean(local_list.roll);

            data_to_insert[key].accel_X = ss.mean(local_list.accel_X);
            data_to_insert[key].accel_Y = ss.mean(local_list.accel_Y);
            data_to_insert[key].accel_Z = ss.mean(local_list.accel_Z);

            data_to_insert[key].gyro_X = ss.mean(local_list.gyro_X);
            data_to_insert[key].gyro_Y = ss.mean(local_list.gyro_Y);
            data_to_insert[key].gyro_Z = ss.mean(local_list.gyro_Z);

            data_to_insert[key].magneto_X = ss.mean(local_list.magneto_X);
            data_to_insert[key].magneto_Y = ss.mean(local_list.magneto_Y);
            data_to_insert[key].magneto_Z = ss.mean(local_list.magneto_Z);
        }

        var data = {
            timestamp : now,
            content : data_to_insert
        };


        this.coll.insertOne(data,function(err,doc){
            if(err){
                console.log(err);
            }
        });

        setTimeout(this.insert_into_collections.bind(this), this.frequency);
    }
}

module.exports = Spouter;