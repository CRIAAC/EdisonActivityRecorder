"use strict";
var restify = require('restify');
var fs = require('fs');

var Init = require("./init.js");
var Spouter = require("./spouter");

var eventEmitter = require("events").EventEmitter;


var init = new Init();
var spouter;
var frequency = 20;

var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0',
    key: fs.readFileSync('./ssl/server.key'),
    certificate: fs.readFileSync('./ssl/server.crt')
});


server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var indexContent = fs.readFileSync("./client/index.html");

server.get("/",function(req,res,next){
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(indexContent);
});

server.get(/\/(css|js|img|bower_components)\/?.*/, restify.serveStatic({directory: './client/'}));

spouter = new Spouter(frequency);


server.post("/",function(req,res,next){
	if(req.params.start && req.params.activityName)
	{
        spouter.startRecordingActivity(req.params.activityName);
        //spouter.changeCollection(req.params.activityName);
        res.send(200,{status : 200});
	}
	else if(req.params.stop)
	{
        spouter.stopRecording();
        //spouter.changeCollection(undefined);
        res.send(200,{status : 200});
	}

    res.json(400,{
        message : "Bad request"
    });
});

server.post("/delete/:id",function(req,res,next){
    var iteration = req.params.id;
    var subactivitiesName = req.params.subactivities;
    spouter.deleteCollection(subactivitiesName, iteration);
    res.send(200,{status : 200});
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});