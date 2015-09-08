function resample(){
	var subActivities = db.MakeCoffee_descriptions.find({},{_id:0, __v:0}).sort({start:1}).toArray();
	for(var i = 0; i < subActivities.length; i++){
		var mac = db.MakeCoffee_datas.distinct("mac");
		for(var j = 0; j < mac.length; j++){
			var datas = db.MakeCoffee_datas.find({mac: mac[j],timestamp: {$lte : subActivities[i].end, $gte : subActivities[i].start}}, {_id:0, __v:0}).sort({timestamp: 1}).toArray();
			var size = datas.length;
			if(size%2 != 0){
				size--;
			} 
			for(var k = 0; k < size; k+=2){
				var first = datas[k];
				var second = datas[k+1];
				db.MakeCoffee_resampled.insert({
					subActivityName: subActivities[i].subActivityName,
					index: subActivities[i].index,
					timestamp: first.timestamp,
					mac: mac[j],
					accel_X : (first.accel_X + second.accel_X)/2,
					accel_Y : (first.accel_Y + second.accel_Y)/2,
					accel_Z : (first.accel_Z + second.accel_Z)/2,
					gyro_X : (first.gyro_X + second.gyro_X)/2,
					gyro_Y : (first.gyro_Y + second.gyro_Y)/2,
					gyro_Z : (first.gyro_Z + second.gyro_Z)/2,
					magneto_X : (first.magneto_X + second.magneto_X)/2,
					magneto_Y : (first.magneto_Y + second.magneto_Y)/2,
					magneto_Z : (first.magneto_Z + second.magneto_Z)/2
				});
			}	
		}
	}
}

function synchronizeSample(){
	var subActivities = db.MakeCoffee_descriptions.find({},{_id:0, __v:0}).sort({start:1}).toArray();
	for(var i = 0; i < subActivities.length; i++){
		var times = db.MakeCoffee_resampled.distinct("timestamp", {subActivityName: subActivities[i].subActivityName,index: subActivities[i].index}).sort({timestamp: 1});
		for(var j = 0; j < times.length; j++){
			var datas = db.MakeCoffee_resampled.find({subActivityName: subActivities[i].subActivityName,index: subActivities[i].index, timestamp: times[j]}).sort({mac: -1}).toArray();
			var arr = [];
			for(var k = 0; k < datas.length; k++){
				arr.push({
					mac: datas[k].mac,
					accel_X : datas[k].accel_X,
					accel_Y : datas[k].accel_Y,
					accel_Z : datas[k].accel_Z,
					gyro_X : datas[k].gyro_X,
					gyro_Y : datas[k].gyro_Y,
					gyro_Z : datas[k].gyro_Z,
					magneto_X : datas[k].magneto_X,
					magneto_Y : datas[k].magneto_Y,
					magneto_Z : datas[k].magneto_Z
				});
			}
			db.MakeCoffee_synchronized.insert({
				subActivityName: subActivities[i].subActivityName,
				index: subActivities[i].index,
				timestamp: times[j],
				content: arr
			});
		}
	}
}

function saveToCsv(){
	var datas = db.MakeCoffee_synchronized.find().sort({timestamp: 1}).toArray();
	for(var i = 0; i < datas.length; i++){
		var values = datas[i].content;
		var toWrite = "";
		toWrite += datas[i].subActivityName + ",";
		toWrite += datas[i].index + ",";
		toWrite += datas[i].timestamp + ",";
		for(var j = 0; j < values.length; j++){
			toWrite += values[j].accel_X + ",";
			toWrite += values[j].accel_Y + ",";
			toWrite += values[j].accel_Z + ",";
			toWrite += values[j].gyro_X + ",";
			toWrite += values[j].gyro_Y + ",";
			toWrite += values[j].gyro_Z + ",";
			toWrite += values[j].magneto_X + ",";
			toWrite += values[j].magneto_Y + ",";
			toWrite += values[j].magneto_Z + ",";
		}
		print(toWrite);
	}
}

function do_all(){
	db.MakeCoffee_resampled.drop();
	db.MakeCoffee_synchronized.drop();
	resample();
	synchronizeSample();
	saveToCsv();
}

do_all();

/*

{
                "subActivityName" : "CloseWaterReservoirLids",
                "index" : 30,
                "start" : 1441485956441,
                "end" : 1441485959296
        }
		1 44 14 85 95 64 41
		1 44 14 85 95 58 16
		"fc:c2:de:32:6a:21"
		"78:4b:87:ab:1e:0e"
db.MakeCoffee_datas.find({mac: "fc:c2:de:32:6a:21"}, {_id:0, __v:0}).sort({timestamp: -1}).toArray();*/