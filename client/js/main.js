document.addEventListener('WebComponentsReady', function() {
        
	$(function(){
	  var activityName = document.querySelector('#activityLabel');
	  var startButton =  document.querySelector("#startButton");
	  var stopButton =  document.querySelector("#stopButton");
	  var toast = document.querySelector('#toast');
	  
	  startButton.disabled = false;
	  stopButton.disabled = true;
	  
	  var startHandler = startButton.onclick = function()
	  {
	      if(activityName.invalid || activityName.value == "")
	      {
	          toast.text = "Invalid activity name";
	          toast.show();
	          return;
	      }
	      
	      $.post("/",{start : true,activityName : activityName.value})
					  .done(function(data)
					  {
						   if(data.status == 200){
	             toast.text = "Record started";
	             toast.show();
	             startButton.disabled = true;
	             stopButton.disabled = false;
	           }
	           else{
	             toast.text = "Record not started";
	             toast.show();
	           }
					  }).fail(function()
	        {
	          toast.text = "Record not started";
	          toast.show();
	        });
	  };

		var stopHandler = stopButton.onclick = function()
	  {
	      $.post("/",{stop : true})
						.done(function(data)
						{
	            if(data.status == 200){
	              toast.text = "Record stopped";
	              toast.show(); 
	              startButton.disabled = false;
	              stopButton.disabled = true; 
	            }
	            else{
	              toast.text = "Record not stopped";
	              toast.show();  
	            }
						}).fail(function()
	          {
	            toast.text = "Record not stopped";
	            toast.show();
	          });
	  };

		if (annyang) {
			// Let's define our first command. First the text we expect, and then the function it should call
			var commands = {
				'begin': startHandler,
				'end': stopHandler
			};

			// Add our commands to annyang
			annyang.addCommands(commands);

			// Start listening. You can call this here, or attach this call to an event, button, etc.
			annyang.start();
		}

	});
});