document.addEventListener('WebComponentsReady', function () {

    $(function () {
        var activitiesName = document.querySelector('#activitiesLabel');
        var activitiesNumber = document.querySelector('#activitiesNumber');
        var startIterationButton = document.querySelector("#startIterationButton");
        var currentActivityName = document.querySelector("#currentActivityName");
        var currentIterationValue = document.querySelector("#currentIterationValue");
        var createNewActivityButton = document.querySelector("#createNewActivityButton");
        var deleteLastIterationButton = document.querySelector("#deleteLastIterationButton");
        var toast = document.querySelector('#toast');
        var currentActivity = 0;
        var nbActivity = 0;
        var currentIteration = 0;
        var activitiesArray = undefined;

        createNewActivityButton.disabled = true;
        deleteLastIterationButton.disabled = true;

        $(document).keypress(function (evt) {
            if (evt.keyCode == 32) {

                if (currentActivity == nbActivity) {
                    saveActivity();
                    deleteLastIterationButton.disabled = false;
                    startIterationButton.disabled = false;
                    currentIteration++;
                    currentActivity = 0;
                }
                if (currentIteration == activitiesNumber.value) {
                    startIterationButton.disabled = true;
                    toast.text = "Done record all iteration";
                    toast.show();
                    createNewActivityButton.disabled = false;
                    return;
                }
                startNewActivity();
            }
        });

        createNewActivityButton.onclick = function () {
            activitiesName.disabled = false;
            activitiesNumber.disabled = false;
            activitiesName.value = "";
            activitiesNumber.value = "";
            startIterationButton.disabled = false;
            currentIterationValue.innerHTML = "";
            currentActivityName.innerHTML = "";
            currentActivity = 0;
            nbActivity = 0;
            currentIteration = 0;
            activitiesArray = undefined;
            createNewActivityButton.disabled = true;
            deleteLastIterationButton.disabled = true;
        };

        deleteLastIterationButton.onclick = function(){
            if(currentIteration == 0) return;
            $.post("/delete/"+currentIteration)
                .done(function (data) {
                    if (data.status == 200) {
                        toast.text = "Delete success";
                        toast.show();
                    }
                    else {
                        toast.text = "Delete failed";
                        toast.show();
                    }
                }).fail(function () {
                    toast.text = "Delete failed";
                    toast.show();
                });
            currentIteration--;
            currentIterationValue.innerHTML = "Current iteration : " + (currentIteration + 1);
        };

        startIterationButton.onclick = function () {
            startIterationButton.blur();
            if (startIterationButton.disabled) {
                return;
            }
            if (activitiesName.invalid || activitiesName.value == "" || activitiesNumber.value == "" || activitiesNumber.invalid) {
                toast.text = "Invalid subactivity name or iteration number";
                toast.show();
                return;
            }
            activitiesName.disabled = true;
            activitiesNumber.disabled = true;
            activitiesArray = activitiesName.value.split(",");
            activitiesArray.pop();
            nbActivity = activitiesArray.length;
            startIterationButton.disabled = true;
            startNewActivity();
        };

        var startNewActivity = function () {
            currentIterationValue.innerHTML = "Current iteration : " + (currentIteration + 1);
            currentActivityName.innerHTML = "Current Subactivity Name : " + activitiesArray[currentActivity];
            if (!startIterationButton.disabled) {
                return;
            }
            if(currentActivity == 0){
                $.post("/", {start: true, subActivityName: activitiesArray[currentActivity], subActivitiesIteration: (currentIteration + 1)})
                    .done(function (data) {
                        if (data.status == 200) {
                            toast.text = "Record started";
                            toast.show();
                        }
                        else {
                            toast.text = "Record not started";
                            toast.show();
                        }
                    }).fail(function () {
                        toast.text = "Record not started";
                        toast.show();
                    });
            } else {
                $.post("/change", {subActivityName: activitiesArray[currentActivity], subActivitiesIteration: (currentIteration + 1)})
                    .done(function (data) {
                        if (data.status == 200) {
                            toast.text = "Record started";
                            toast.show();
                        }
                        else {
                            toast.text = "Record not started";
                            toast.show();
                        }
                    }).fail(function () {
                        toast.text = "Record not started";
                        toast.show();
                    });
            }

            currentActivity++;
        };

        var saveActivity = function () {
            $.post("/", {stop: true})
                .done(function (data) {
                    if (data.status == 200) {
                        toast.text = "Record stopped";
                        toast.show();
                    }
                    else {
                        toast.text = "Record not stopped";
                        toast.show();
                    }
                }).fail(function () {
                    toast.text = "Record not stopped";
                    toast.show();
                });
        };
    });
});