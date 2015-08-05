"use strict";
var restify = require('restify');
var fs = require('fs');

var Init = require("./init.js");
var Spouter = require("./spouter");

var init = new Init();
var spouter;
var frequency = 50;

var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
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

server.post("/",function(req,res,next){
	if(req.params.start && req.params.activityName)
	{
        spouter = new Spouter(req.body.activityName,frequency);
        res.send(200,{status : 200});
	}
	else if(req.params.stop)
	{
        spouter = new Spouter("trash".activityName,frequency);
        res.send(200,{status : 200});
	}

    res.json(400,{
        message : "Bad request"
    });
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});