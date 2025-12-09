async function updatePreferences(){
  const username = document.getElementById("username").value;
  const errormsg = document.getElementById("error");
  if (username === "") {
    errormsg.innerHTML = "You must input a name." 
    return;
  }
  errormsg.innerHTML = "";
  const docSpot = document.getElementById("your_schedule");
  const allAvailable = Array.from(docSpot.querySelectorAll(".yellowgreen"));
  const allPreferred = Array.from(docSpot.querySelectorAll(".green"));
  const path = window.location.pathname; 
  const id = path.split("/").pop(); 
  const data = {username: username, id: id}
  try {
    const response = await fetch('/api/calendar/delete_curr', {
      method: "DELETE",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    })
    console.log(response.text());
  }
  catch (error) {
      console.error('Error:', error);
    }

  for(const slot of allAvailable){
    try {
    let slotDate = slot.dataset.date;
    let slotHour = slot.dataset.hour;
    let slotQuarter = slot.dataset.quarter;
    let startDate = slot.dataset.startdate;
    let startTime = slot.dataset.starttime;
    let timeMS = getSlotMS(startDate, startTime, slotDate, slotHour, slotQuarter);
    let rank = 2;
    const data = {username: username, preference: timeMS, rank: rank};
    const path = window.location.pathname;
    console.log('sent post');
    const response = await fetch(path, {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    console.log('finished post');
    if(!response.ok){
      console.error("Server error:", await response.text());
    }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  for(const slot of allPreferred){
    try {
    let slotDate = slot.dataset.date;
    let slotHour = slot.dataset.hour;
    let slotQuarter = slot.dataset.quarter;
    let startDate = slot.dataset.startdate;
    let startTime = slot.dataset.starttime;
    let timeMS = getSlotMS(startDate, startTime, slotDate, slotHour, slotQuarter);
    let rank = 1;
    const data = {username: username, preference: timeMS, rank: rank};
    const path = window.location.pathname;
    console.log('sent post');
    const response = await fetch(path, {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    console.log('finsihed post');
    if(!response.ok){
      console.error("Server error:", await response.text());
    }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const save_message = document.getElementById('save_message');
  save_message.innerHTML = "<p>Successfully added availability!</p>"

}


function getSlotMS(startDate, startTime, slotDate, slotHour, slotQuarter){
  const fifteen = 15 * 60000;
  const day = 86400000;
  let intSlotHour = parseInt(slotHour);
  let intSlotQuarter = parseInt(slotQuarter);
  let intSlotDate = parseInt(slotDate);
  let startHour = intSlotHour;
  let quarterMS = intSlotQuarter * fifteen;
  let startDateObj = new Date(`${startDate}T${startHour.toString().padStart(2, '0')}:00:00`);
  let almostMs = startDateObj.getTime();
  let dayAdjustment = day * intSlotDate;
  let actualMs = almostMs + quarterMS + dayAdjustment;
  let endMs = actualMs + fifteen;
  return [actualMs, endMs];
}

// default is selecting general availability
currentColor = "yellowgreen"

// for rectangle method
let selectionStart = null;

// function to toggle your paintbrush
async function toggleColor() {
	document.getElementById(currentColor).innerHTML = "";
	this.innerHTML = "✓";
	currentColor = this.className;
	console.log("current color is" + currentColor);
}

// add event listeners to each color square
document.getElementById('gray').addEventListener('click', toggleColor);
document.getElementById('yellowgreen').addEventListener('click', toggleColor);
document.getElementById('green').addEventListener('click', toggleColor);

// function to change an individual timeslot's color based on current color
function changeColor() {
  console.log("Changing color");
	this.classList.remove('gray', 'green', 'yellowgreen');
	this.classList.add(currentColor);
}

function changeColorMousedown() {
	isSelecting = true;
        selectionStart = this;
	this.classList.remove('gray', 'green', 'yellowgreen');
	this.classList.add(currentColor);	
}

function changeColorMouseover() {
        if (!isSelecting || !selectionStart) return;

        // Get starting slot coordinates
        const startX = parseInt(selectionStart.dataset.date);
        const startY1 = parseInt(selectionStart.dataset.hour);
        const startY2 = parseInt(selectionStart.dataset.quarter);
        const startY = startY1 * 4 + startY2;                 
        
        // Get current slot coordinates
        const currentX = parseInt(this.dataset.date);
        const currentY1 = parseInt(this.dataset.hour);
        const currentY2 = parseInt(this.dataset.quarter);
        const currentY = currentY1 * 4 + currentY2;

        // Calculate rectangle bounds
        const minX = Math.min(startX, currentX);
        const maxX = Math.max(startX, currentX);
        const minY = Math.min(startY, currentY);
        const maxY = Math.max(startY, currentY);

        // Loop over all slots and color the ones inside the rectangle
        const allSlots = document.querySelectorAll(".hour_timeslot_togglable div");
        allSlots.forEach(slot => {
            const slotX = parseInt(slot.dataset.date);
            const slotY1 = parseInt(slot.dataset.hour);
            const slotY2 = parseInt(slot.dataset.quarter);
            const slotY = 4 * slotY1 + slotY2;
            if (slotX >= minX && slotX <= maxX && slotY >= minY && slotY <= maxY) {
                slot.classList.remove('gray', 'green', 'yellowgreen');
                slot.classList.add(currentColor);
            }
        });

}
let isSelecting = false;

// get all timeslots
const hourElements = document.querySelectorAll(".hour_timeslot_togglable");
hourElements.forEach(hourElement => {
	const elements =  hourElement.querySelectorAll('div');
	elements.forEach(element => {
		element.addEventListener('mousedown', changeColorMousedown);
		element.addEventListener('mouseover', changeColorMouseover);
		element.addEventListener('click', changeColor);
	})
});

document.addEventListener('mouseup', () => {
	isSelecting = false;
});


// prevent text selection while selecting in schedule

const schedule = document.getElementById("your_schedule");
schedule.addEventListener('mousedown', () => {
    document.body.style.userSelect = 'none';
});

schedule.addEventListener('mouseup', () => {
    document.body.style.userSelect = '';
});

document.getElementById("save").addEventListener('click', updatePreferences);

function timeToString(hour){
    if (hour == 0) {
        return "12 AM";
    } 
    else if(hour < 12){
        let retStr = hour.toString() + " AM";
        return retStr;
    }
    else{
        hour -= 12;
        let retStr = hour.toString() + " PM";
        return retStr;
    }
}

let stimespot = document.getElementById("stime");
let etimespot = document.getElementById("etime");
stimespot.textContent = timeToString(stimespot.textContent);
etimespot.textContent = timeToString(etimespot.textContent);

function matchesStart(arr, startTime) {
  for (const entry of arr) {
    if (entry[0] === startTime) return true;
  }
  return false;
}

function colorByScore(score) {
  if (score <= -3) return "Bad4";
  if (score <= -2) return "Bad3";
  if (score <= -1) return "Bad2";
  if (score <=  0) return "Bad1";
  if (score <=  1) return "Neutral";
  if (score <=  2) return "Good1";
  if (score <= 2.5) return "Good2";
  if (score <   3) return "Good3";
  return "Good4";
}

async function displayGroup() {
  let btn = document.getElementById('groupTimes');
  let allSched = document.getElementById('all_schedules');
  let boxes = allSched.querySelectorAll(".slot");

  const showing = btn.innerHTML.includes("Show");

  if (showing) {
    // fetch calendar data ONCE, not once per slot
    const response = await fetch(`/api/calendar/${calendarURL}`);
    const data = await response.json();

    for (const slot of boxes) {
      let slotDate = slot.dataset.date;
      let slotHour = slot.dataset.hour;
      let slotQuarter = slot.dataset.quarter;
      let startDate = slot.dataset.startdate;
      let startTime = slot.dataset.starttime;

      let timeMS = getSlotMS(startDate, startTime, slotDate, slotHour, slotQuarter);

      // compute color directly (no extra fetch)
      let newClass = await (async () => {
        let score = 0;
        let numUsers = data.length;

        for (const row of data) {
          let pref = JSON.parse(row.preferences);
          if (matchesStart(pref.rank1, timeMS[0])) score += 3;
          else if (matchesStart(pref.rank2, timeMS[0])) score += 2;
          else score -= 3;
        }

        return colorByScore(score / numUsers);
      })();

      // assign class cleanly
      slot.className = `slot ${newClass}`;
    }

    btn.innerHTML = `<p>Hide Group Availability</p>`;
  }

  else {
    for (const slot of boxes) {
      slot.className = "gray slot";
    }

    btn.innerHTML = `<p>Show Group Availability</p>`;
  }
}

async function display_curr_choices() {
  username = document.getElementById('username').value;
  your_schedule = document.getElementById('your_schedule');
  const path = window.location.pathname; 
  const id = path.split("/").pop(); 
  const data = {username: username, id: id};
  
  console.log(data);
  try { 
    response = await fetch(`/api/calendar/get_curr_choices/`, {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });


  const result = await response.json();
  const raw = result.choices.preferences;   
  console.log(raw);
  const pref = JSON.parse(raw);
  console.log("pref", pref);
  let boxes = your_schedule.querySelectorAll(".curr_slot");
  console.log(boxes);
  for (const slot of boxes) {
    let slotDate = slot.dataset.date;
    let slotHour = slot.dataset.hour;
    let slotQuarter = slot.dataset.quarter;
    let startDate = slot.dataset.startdate;
    let startTime = slot.dataset.starttime;

    let timeMS = getSlotMS(startDate, startTime, slotDate, slotHour, slotQuarter);

    // compute color directly (no extra fetch)
    let newClass = await (async () => {
      if (matchesStart(pref.rank1, timeMS[0])) {
        return "green";
      }
      else if (matchesStart(pref.rank2, timeMS[0])) {
        return "yellowgreen";
      }
      else {
        return "gray";
      }
    })();

    // assign class cleanly
    slot.classList.remove('gray', 'yellowgreen', 'green');
    slot.className = `curr_slot ${newClass}`;
  }
  } catch (error) {
    console.error('Error:', error);
  }
  }
  
function displayCal() {
  const name = document.getElementById("username").value.trim();
  if (!name) {
      document.getElementById("error").innerText = "Please enter a name!";
      return;
  }
  document.getElementById("error").innerText = "";
  display_curr_choices()
  document.getElementById("content").style.display = "flex";
  document.getElementById("preferences").style.display = "flex";
  document.getElementById("username").disabled = true;
  document.getElementById("button-toggle").style.display = "flex";
  this.disabled = true;
}

document.getElementById('groupTimes').addEventListener('click', displayGroup);
document.getElementById('name_submit').addEventListener('click', displayCal);
