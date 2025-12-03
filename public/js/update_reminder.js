function show_days() {
    const customDiv = document.getElementById('customDaysDiv');

    if (this.value === 'custom') {
        customDiv.classList.remove('d-none');
    } else {
        customDiv.classList.add('d-none');
    }
}

function show_days_add() {
    const customDiv = document.getElementById('showDaysAdd');

    if (this.value === 'custom') {
        customDiv.classList.remove('d-none');
    } else {
        customDiv.classList.add('d-none');
    }
}

async function submit_reminder() {
    event.preventDefault();
    const selectedName = document.getElementById('nameSelect');
    const selected = document.getElementById('addSelect');
    const desc = document.getElementById('description');
    if (selected.value !== 'custom' && selected.value !== '') {
        const data = {
            friendName: selectedName.value,
            frequency: selected.value,
            description: desc.value
        };
        

        try {
            const response = await fetch('/update_reminder', {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log(result);
            messageDiv = document.getElementById('reminder_notif');
            messageDiv.textContent = result.message;
            
        } catch (error) {
            console.error('Error:', error);
        }
    } 
    selected.value = "";
    desc.value = "";
}

async function update_reminder() {
    console.log('button clicked');
    const selectedName = document.getElementById('nameSelect2');
    console.log('selected name')
    const selected = document.getElementById('addSelect2');
    const desc = document.getElementById('description2');
    const selected_reminder = document.getElementById('selectReminder');
    const selectedOption = selected_reminder.options[selected_reminder.selectedIndex];
    const reminder = JSON.parse(selectedOption.dataset.reminder);

    if (selected.value !== 'custom' && selected.value !== '') {
        const data = {
            friendName: selectedName.value,
            reminder: reminder,
            frequency: selected.value,
            description: desc.value,
        };
        
        try {
            console.log("working on submitting reminder");
            const response = await fetch('/update_reminder', {
            method: "PUT",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log(result);
            selected.value = "";
            desc.value = "";
            selected_reminder.value = "";
            messageDiv = document.getElementById('update_notif');
            messageDiv.textContent = result.message;
            
        } catch (error) {
            console.error('Error:', error);
        }
    } 
    
}

async function delete_reminder() {
    const selected_reminder = document.getElementById('selectReminder');
    const selectedOption = selected_reminder.options[selected_reminder.selectedIndex];
    const reminder = JSON.parse(selectedOption.dataset.reminder);
    const data = {
      reminder: reminder
    };
  
    try {
      const response = await fetch('/update_reminder', {
        method: "DELETE",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
  
      const result = await response.json();
      if (response.ok) {
        messageDiv = document.getElementById('update_notif');
        messageDiv.textContent = result.message;
      }
    } catch (error) {
      console.error('Error:', error);
    }

}
async function show_reminder_menu() {
    const friend_select = document.getElementById('nameSelect2');
    const selected_reminder = document.getElementById('selectReminder');
    const data = {
            friend: friend_select.value
        };

    try {
        const response = await fetch('/apis/retrieve_reminders', {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        const reminders = await response.json();
        console.log(reminders);
        selected_reminder.innerHTML = "";

        reminders.forEach(reminder => {
        const option = document.createElement('option');
        option.dataset.reminder = JSON.stringify(reminder);
        option.textContent = reminder.frequency + ' reminder for: ' + reminder.description;
        selected_reminder.appendChild(option);
        });

    } catch (error) {
        console.error('Error:', error);
    }
};

const friend_select = document.getElementById('nameSelect2');
friend_select.addEventListener('change', show_reminder_menu);

const select = document.getElementById('nameSelect');
select.addEventListener('change', show_days.bind(select));

const addSelect = document.getElementById('addSelect');
addSelect.addEventListener('change', show_days_add.bind(addSelect));

const add_reminder_submit = document.getElementById('addReminderForm');
add_reminder_submit.addEventListener('submit', submit_reminder);

const select2 = document.getElementById('nameSelect2');
select2.addEventListener('change', show_days.bind(select));

const addSelect2 = document.getElementById('addSelect2');
addSelect2.addEventListener('change', show_days_add.bind(addSelect));

const update_reminder_save = document.getElementById('updateReminderSaveButton');
update_reminder_save.addEventListener('click', update_reminder);

const delete_reminder_save = document.getElementById('delete_reminder_submit');
delete_reminder_save.addEventListener('click', delete_reminder);


window.addEventListener('DOMContentLoaded', () => {
    const nameSelect = document.getElementById('nameSelect');
    const nameSelect2 = document.getElementById('nameSelect2');

    // Force select to use the placeholder option
    nameSelect.value = "";
    nameSelect2.value = "";
    
    // Refresh the Bootstrap Select UI
    // $('#nameSelect').selectpicker('refresh');
    // $('#nameSelect2').selectpicker('refresh');
});
