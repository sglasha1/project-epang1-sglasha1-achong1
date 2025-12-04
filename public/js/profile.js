const calendarCode = document.getElementById("code");
const errormsg = document.getElementById("calendarerror")
document.querySelectorAll(".friend-details").forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.getAttribute("data-target");
        const hidden_p = document.getElementById(id);
        hidden_p.classList.toggle('hidden');
        if(hidden_p.classList.contains("hidden")){
            btn.textContent = "Show Details";
        } else{
            btn.textContent = "Hide Details";
        }
    });
});

async function send_email() {
    const email = document.getElementById('emails');
    const data = {
        email: email.value
      };
    try {
        const response = await fetch('/send_email', {
          method: "POST",
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data)
        });
        const result = await response.json();
        messageDiv = document.getElementById('email_msg');
        messageDiv.textContent = result.message;
        console.log('success!');
      } catch (error) {
        console.error('Error:', error);
      }
}

async function updateLastSeen() {
  const friend_id = this.dataset.friendId;
  const last_seen = this.value;

  // Send update to backend
  try {
    const response = await fetch("/update_last_seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      friend_id: friend_id,
      last_seen: last_seen
    })
  }) 
  const result = await response.json();
  messageDiv = document.getElementById(`friend_update_msg-${friend_id}`);
  messageDiv.textContent = result.message;
  console.log(result);
} catch (error) {
  console.error('Error:', error);
}
}

document.querySelectorAll(".last_seen_input").forEach(input => {
  input.addEventListener("change", updateLastSeen);
});
document.getElementById('submit_email').addEventListener('click', send_email);

const btn1 = document.getElementById("toggleInfoBtn1");
const box1 = document.getElementById("infoBox1");
btn1.addEventListener("click", () => {
  if (box1.style.display === "none") {
    box1.style.display = "block";
  } else {
    box1.style.display = "none";
  }
});

const btn2 = document.getElementById("toggleInfoBtn2");
const box2 = document.getElementById("infoBox2");
btn2.addEventListener("click", () => {
  if (box2.style.display === "none") {
    box2.style.display = "block";
  } else {
    box2.style.display = "none";
  }
});


const btn3 = document.getElementById("toggleInfoBtn3");
const box3 = document.getElementById("infoBox3");
btn3.addEventListener("click", () => {
  if (box3.style.display === "none") {
    box3.style.display = "block";
  } else {
    box3.style.display = "none";
  }
});
