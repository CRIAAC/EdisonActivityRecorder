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
        this.homeDir = homeDir || "/home/root/edisondatasender/";
        this.server = server || config.server;
        this.frequency = frequency || 20;

        if(config != undefined && config.hasOwnProperty("edisons")){
            config['edisons'].forEach(function(element){
                element.msg = {
                    send : function(message){
                        console.log(message);
                    }
                }
            });

            async.each(config.edisons, this.initialize.bind(this),this.runServer.bind(this,config.edisons));
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
            this.makeScp.bind(this)
        ],function(err,edison){
            if(err){
                console.log(err);
                callback(err);
                return;
            }
            callback();
        });
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

    runServer(edisons){
        this.killProcesses(edisons, function(){
            async.each(edisons,function(edison,callback){
                edison.commands =
                    [
                        "cd /home/root/edisondatasender",
                        "nohup ./edisondatasender.x &"
                    ];
                edison.onCommandComplete = function (command, response, sshObj) {

                    if (command == "nohup ./edisondatasender.x &") {
                        console.log("server is running on: " + edison.server.host);
                        callback(edison);
                    }
                }.bind(this);

                var SSH = new SSH2Shell(edison);
                SSH.connect();
            });
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
            }
        };

        setTimeout(function () {
            var repl_zmq = repl.start("> ");
            repl_zmq.ignoreUndefined = true;
            repl_zmq.context.cleanup = handler.cleanup;
            repl_zmq.context.activity = handler.activity;
        }, 2000);
    }

    killProcesses(edisons,callback){
        async.each(edisons,function(edison,callback) {
            edison.commands =
                [
                    "kill -9 $(pidof 'edisondatasender.x')"
                ];

            edison.onCommandComplete = function (command, response, sshObj) {

                if (command == "kill -9 $(pidof 'edisondatasender.x')") {
                    console.log("Server terminated on: " + edison.server.host);
                    callback(null);
                }

            };
            var SSH = new SSH2Shell(edison);
            SSH.connect();
        }, function(err){
            callback();
        });
    }
}

module.exports = Init;