"use strict";

var scp2client = require("scp2");
var repl = require('repl');
var SSH2Shell = require('ssh2shell');
var Spouter = require('./spouter');
var async = require("async");
var moment = require("moment");

var config = require("./config.json");
var spouter;

class Init{

    /**
     *
     * @param {string} homeDir
     * @param {string} server
     * @param {number} frequency
     */
    constructor(homeDir,server,frequency){

        this.homeDir = homeDir || "/root/CRIAAC/";
        //this.server = server || "192.168.1.104";
        this.server = server || config.recorder.server;
        this.frequency = frequency || 20;

        if(config != undefined && config.hasOwnProperty("edisons")){
            config['edisons'].forEach(function(element){
                element.msg = {
                    send : function(message){
                        console.log(message);
                    }
                }
            });

            async.each(config.edisons, this.initialize.bind(this),this.runPublisher.bind(this,config.edisons));
        }
        else{
            throw new Error("Invalid configuration file.");
        }
    }

    initialize(edison,callback){
        async.waterfall([
            function (callback) {
                callback(null, edison);
            },
            this.ntpUpdate.bind(this),
            this.makeScp.bind(this),
            this.prepareRunPublisher.bind(this)
        ],function(err,edison){
            if(err){
                console.log(err);
                callback(err);
                return;
            }
            callback();
        });
    }

    ntpUpdate(edison,callback){
        edison.commands =
        [
            //"ntpdate -u 192.168.1.104"
            "ntpdate -u " + config.ntp.server
        ];

        edison.onCommandComplete = function (command, response, sshObj) {
            if (command === ("ntpdate -u " + this.server)) {
                if (response.indexOf("no server suitable for synchronization found") > -1) {
                    throw new Error("Check the " + this.server + " wifi connectivity");
                }
                console.log("Time updated on: " + edison.server.host);
                callback(null,edison);
            }
        }.bind(this);

        var SSH = new SSH2Shell(edison);
        SSH.connect();
    }

    makeScp(edison,callback){
        scp2client.scp(edison.file_to_transfer, {
            host: edison.server.host,
            username: edison.server.userName,
            password: edison.server.password,
            path: this.homeDir
        }, function (err) {
            if(err)
            {
                callback(err);
            }
            callback(null,edison);
        });
    }

    prepareRunPublisher(edison,callback){
        edison.commands =
            [
                "kill -9 $(pidof 'publisher')", //prevent conflicts
                "cd CRIAAC",
                "rm nohup.out"
                //"nohup ./publisher &"
                //("at -f script.sh " + actual_date)
            ];

        edison.onCommandComplete = function (command, response, sshObj) {

            if (command == "rm nohup.out") {
                console.log("Edison is ready : " + edison.server.host);
                callback(null,edison);
            }
        }.bind(this);

        var SSH = new SSH2Shell(edison);
        SSH.connect();
    }

    runPublisher(edisons){
        async.each(edisons,function(edison,callback){
            edison.commands =
                [
                    "cd CRIAAC",
                    "nohup ./publisher &"
                    //("at -f script.sh " + actual_date)
                ];

            edison.onCommandComplete = function (command, response, sshObj) {

                if (command == /*("at -f script.sh " + actual_date)*/ "nohup ./publisher &") {
                    console.log("publisher is running on: " + edison.server.host);
                    callback(edison);
                }
            }.bind(this);

            var SSH = new SSH2Shell(edison);
            SSH.connect();

        },this.runREPL.bind(this,edisons));
    }

    runREPL(edisons){
        var self = this;

        var handler = {
            cleanup: function () {
                async.each(edisons, self.killProcesses, function () {
                    console.log("The end of the world");
                    process.exit();
                });
            },
            activity: function (activity_name) {
                console.log(activity_name + ".log created");
                spouter = new Spouter(activity_name,self.frequency);
            }
        };

        setTimeout(function () {
            var repl_zmq = repl.start("> ");
            repl_zmq.ignoreUndefined = true;
            repl_zmq.context.cleanup = handler.cleanup;
            repl_zmq.context.activity = handler.activity;
            spouter = new Spouter("trash",self.frequency);
        }, 2000);
    }

    killProcesses(edison,callback){
        edison.commands =
            [
                "kill -9 $(pidof 'publisher')"
            ];

        edison.onCommandComplete = function (command, response, sshObj) {

            if (command == "kill -9 $(pidof 'publisher')") {
                console.log("Publisher terminated on: " + edison.server.host);
                callback(null);
            }

        };

        var SSH = new SSH2Shell(edison);
        SSH.connect();
    }
}

module.exports = Init;