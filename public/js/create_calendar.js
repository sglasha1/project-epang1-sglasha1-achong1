const submitButton = document.getElementById("submit");
const title = document.getElementById("eventTitle");
const duration = document.getElementById("duration");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const startTime = document.getElementById("startTime");
const startTimeAMPM = document.getElementById("startTimeAMPM");
const endTime = document.getElementById("endTime");
const endTimeAMPM = document.getElementById("endTimeAMPM");
const info = document.getElementById("eventInfo")
const errorMessage = document.getElementById("error")
submitButton.addEventListener('click', async (event) => {
    //verify if everything is fine; if not send error message
    if (title.value === "") {
        errorMessage.innerHTML = "Please provide a title for the event."
        return;
    } else if (startDate.value === "") {
        errorMessage.innerHTML = "Please provide a start date."
        return;
    } else if (endDate.value === "") {
        errorMessage.innerHTML = "Please provide an end date."
        return;
    }
    let startTime24 = parseInt(startTime.value, 10);
    if ((startTimeAMPM.value === "PM") && (startTime24 !== 12)) {
        startTime24 = startTime24 + 12;
    } else if ((startTimeAMPM.value === "AM") && (startTime24 === 12)) {
        startTime24 = 0;
    }
    let endTime24 = parseInt(endTime.value, 10);
    if ((endTimeAMPM.value === "PM") && (endTime24 !== 12)) {
        endTime24 = endTime24 + 11;
    } else if ((endTimeAMPM.value === "AM") && (endTime24 === 12)) {
        endTime24 = 23;
    } else {
        endTime24--;
    }
    if (startTime24 > endTime24) {
        errorMessage.innerHTML = "End time must be after start time."
        return;
    }
    
    if (startDate.value > endDate.value) {
        errorMessage.innerHTML = "End date must be after start date."
        return;
    }

    const difference = (new Date(endDate.value)).getTime() - (new Date(startDate.value)).getTime();
    if (difference > 30 * 1000 * 60 * 60 * 24) {
        errorMessage.innerHTML = "Maximum interval is 30 days."
        return; 
    }
    errorMessage.innerHTML = ""
    // can do more error checking later
    // if everything passes make, make post request
    const data = {
        title: title.value,
        start_date: startDate.value,
        end_date: endDate.value,
        start_time: startTime24,
        end_time: endTime24,
    };
    
    if (duration.value !== "") {
        data.duration = parseInt(duration.value, 10);
    } else {
        data.duration = null;
    }
    if (info.value !== "") {
        data.info = info.value;
    } else {
        data.info = null;
    }
    
    try {
        console.log("working on submitting calendar");
        const response = await fetch('/create_calendar', {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.redirect) {
            window.location.href = result.redirect;
        }
        console.log(result);
        
    } catch (error) {
        console.error('Error:', error);
    }
});
