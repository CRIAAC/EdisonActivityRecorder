function increase(){
	db.MakeCoffee_descriptions_backup.drop();
	var subActivities = db.MakeCoffee_descriptions.find({},{_id:0, __v:0}).toArray();
	var reIndexed = [];
	for(var i = 0; i < subActivities.length; i++){
		var cur = subActivities[i];
		cur.index += 20;
		db.MakeCoffee_descriptions_backup.save(subActivities[i]);
		reIndexed.push(cur);
	}
	db.MakeCoffee_descriptions.drop();
	for(var i = 0; i < reIndexed.length; i++){
		db.MakeCoffee_descriptions.save(reIndexed[i]);
	}
}

increase();