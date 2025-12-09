/* —------------------------------------------------------------ */
// SETUP

// load modules
import express from 'express';
import session from 'express-session';
import multer from "multer";
import path, { parse } from 'node:path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import schedule from 'node-schedule';
import { DB } from './dbconnection.js';
import { nanoid } from 'nanoid';
import process from 'node:process';
import {google} from 'googleapis';

const BASE_URL = process.env.BASE_URL || "http://localhost:1234";
const app = express();

const port = 1234; // choose which port to run your server on
const __filename = fileURLToPath(import.meta.url); // get name of current file
const __dirname = path.dirname(__filename); // get name of current directory


/* —------------------------------------------------------------ */
// MIDDLEWARE
const publicFolder = path.join(__dirname, 'public');
app.use(express.static(publicFolder)); // allow users to access public files
app.use(express.json()); // make it easy to parse JSON
app.use(express.urlencoded({ extended: false })); // process form data
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'mysecretkey', // 🔒 Change this to a secure random string in production
  resave: false, // resave only if session is changed
  saveUninitialized: false, // does not force a session to be saved
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000} // Set true if using HTTPS
}));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });


/* —------------------------------------------------------------ */

app.get("/", async(req, res) => {
  const username = req.session.user || null; 
  res.render("index.ejs", {user: username});
});

app.get("/send_calendar/:url", async(req, res) => {
  const calendarUrl = req.params.url;
  const username = req.query.username;
  res.render("send_calendar.ejs", {user: username, calendarUrl: calendarUrl, baseUrl: BASE_URL});
});

app.route("/send_calendar")
  .get(async (req, res) => {
    const calendarUrl = req.query.url;
    const username = req.session.user || null; 
    const url = req.query.url || null;
    if (!url) {
      res.redirect("create_calendar");
    }
    else {
      res.render("send_calendar.ejs", {user: username, calendarUrl: calendarUrl, baseUrl: BASE_URL});
    }
  })

  .post(async(req, res) => {
    const {email_list, url} = req.body;
    const baseUrl = 'https://project-epang1-sglasha1-achong1.onrender.com/finished_calendar';
    const fullUrl = `${baseUrl}/${url}`;
    const failed_emails = [];
    console.log(email_list);
    email_list.forEach(email => {   
    const msg = {
        to: email, 
        from: 'achong1@swarthmore.edu',
        subject: 'Add Your Availability on Friendule!',
        text: `Your friend sent you a request to fill out your availability! Fill it out here: ${fullUrl}`,
        html: `<p>Your friend sent you a request to fill out your availability! Fill it out here: ${fullUrl}</p>`,
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            failed_emails.push(email);
            console.error(error)
        })
    });
    console.log('emails sent!');
    res.sendStatus(200);
})

function getUserID(username){
    return new Promise((resolve, reject) =>{
    DB.get('SELECT * FROM users WHERE username = ?', [username], (err, row)=>{
      if(err) throw err;
      console.log(row);
      console.log("Row.id is: ", row.id);
      const userID = row.id;
      console.log("User ID is: ", userID)
      resolve(userID);
    })
})
}

function getFriendsIDs(userid){
  return new Promise((resolve, reject) => {
  const sql = 'SELECT * FROM friends WHERE user_id = ?';
  DB.all(sql, [userid], (err, rows) =>{
    if(err) throw err;
    if(!rows){
      console.warn("No data found");
      return;
    }
    resolve(rows);
  })
})
}

function getReminders(username){
  return new Promise((resolve, reject)=>{
    const sql = 'SELECT * FROM reminders WHERE username = ?';
    DB.all(sql, [username], (err, rows) =>{
      if(err) throw err;
      if(!rows){
        console.warn("No data found");
        return;
      }
    resolve(rows);
    })
  })
}

function getUserCalendars(username) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM calendars WHERE username = ?';
    DB.all(sql, [username], (err, rows) =>{
      if (err) throw err;
      if(!rows) {
        console.warn("No data found");
        return;
      }
    resolve(rows);
    })
  })
}

app.get("/profile", async(req, res) => {
  if (req.session.user) {
    let username = req.session.user.username;
    let userID = await getUserID(username);
    let friends_ids = await getFriendsIDs(userID);
    let reminders = await getReminders(username);
    let calendars = await getUserCalendars(username);
    console.log(calendars.length);
    res.render("profile.ejs", {user: req.session.user, friends: friends_ids, reminders: reminders, calendars: calendars});
  }
  else {
    res.redirect("/login");
  }
});


app.get("/update_info", async(req, res) => {
  if (req.session.user) {
    res.render("update_info.ejs", {user: req.session.user});
  }
  else {
    res.redirect("/login");
  }
});

// Note: we're using a post request even though we're retrieving information 
// so that this endpoint doesn't render for the user.
app.post("/apis/retrieve_reminders", async(req, res) => {
  const username = req.session.user.username;
  const {friend} = req.body;
  const sql_select = 'SELECT * FROM reminders WHERE username = ? AND friend = ?'
  DB.all(sql_select, [username, friend], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error.");
    }
    else {
      return res.json(rows);
    }
  })
});

app.route("/logout")
.get(async (req, res) => {
    console.log("GET /logout");
    req.session.destroy(err => {
        if (err) {
        return res.send('Error logging out.');
    }
    res.redirect('/login');
  });
})

app.route("/update_friends")
  .get(async(req, res) => {
    if (req.session.user) {
      const username = req.session.user.username;
      console.log(username);
      const sql_select = 'SELECT * FROM friends LEFT JOIN users ON friends.user_id = users.id WHERE users.username = ?';
      DB.all(sql_select, [username], (err, rows) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Database error");
        }
        else {
          const sql = "SELECT mailing_list FROM users WHERE username = ?";
          DB.get(sql, [username], (err, row) => {
            if (err) {
              console.log(err);
              return res.status(500).send("Database error");
            }
            let emails = [];
            if (row && row.mailing_list) {
              emails = JSON.parse(row.mailing_list);
            }
            res.render("update_friends.ejs", {user: req.session.user, rows, emails, message: ''});
          })
        }
      })
      }

    else {
      res.redirect("/login");
    }
  })

  .put(upload.single("image"), async (req, res) => {
   const username = req.session.user.username;
   const {curr_name, new_name, new_desc} = req.body;
   let imagePath = null;
    if (req.file) {
      imagePath = "/uploads/" + req.file.filename;
    }
   // Retrieve user_id that corresponds with current username
   const sql_select = 'SELECT id FROM users WHERE username = ?';
   DB.get(sql_select, [username], (err, row) => {
     if (err) {
       console.log(err);
       return res.status(500).send("Database error");
     }
     console.log(row);
     const userId = row.id;
     let parameters = [];
     let initial_sql = 'UPDATE friends SET '
     let initial_reminder_sql = 'UPDATE reminders SET friend = ? WHERE friend = ?'
     let if_null_sql = []
     if (new_name) {
      if_null_sql.push("name = ?")
      parameters.push(new_name);
     }
     if (new_desc) {
      if_null_sql.push("description = ?")
      parameters.push(new_desc);
     }
     if (imagePath) {
      if_null_sql.push("image_path = ?")
      parameters.push(imagePath);
     }
     parameters.push(curr_name);
     parameters.push(userId);
     let sql_update = initial_sql + if_null_sql.join(", ") + ' WHERE name = ? AND user_id = ?'
     console.log(sql_update);
     if (if_null_sql.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }
     DB.run(sql_update, parameters, (err) => {
       if (err) {
         console.log(err);
         return res.status(500).send("Database error");
       }
       
       //Update reminders accordingly
       if (new_name) {
        DB.run(initial_reminder_sql, [new_name, curr_name], (err) => {
          if (err){
            console.log(err);
            return res.status(500).send("Database error");
          }
          else {
            console.log("User ID from session: ", userId);
            console.log("Friend original name: ", curr_name);
            console.log("success!");
            return res.status(200).json({ message: 'Successfully updated friend! Refresh to see new list.' });
          }
        })
       }
       else {
        console.log("User ID from session: ", userId);
        console.log("Friend original name: ", curr_name);
        console.log("success!");
        return res.status(200).json({ message: 'Successfully updated friend! Refresh to see new list.' });
       }
     })
   })
 })

  .delete(async(req, res) => {
    const {name, desc} = req.body;
    const username = req.session.user.username;
    console.log(username);
    
    // Retrieve user_id that corresponds with current username
    const sql_select = 'SELECT id FROM users WHERE username = ?';
    DB.get(sql_select, [username], (err, row) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Database error");
      }
      console.log(row);
      const userId = row.id;
      const sql_delete = 'DELETE FROM friends WHERE user_id = ? AND name = ?'
      const reminder_delete = 'DELETE from reminders WHERE username = ? AND friend = ?'
      DB.run(sql_delete, [userId, name], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Database error");
        }
        DB.run(reminder_delete, [username, name], (err) => {
          if (err) {
            console.log(err);
            return res.status(500).send("Database error");
          }
          console.log("success!");
        res.status(200).json({ message: 'Successfully deleted friend! Refresh to see new list.' });
        })})
    })
  })

  .post(upload.single('image'), (req, res) => {
    const {name, desc} = req.body;
    const username = req.session.user.username || null;
    let imagePath = null;
    if (req.file) {
      imagePath = "/uploads/" + req.file.filename;
    }
    console.log(imagePath);
    console.log(username);
    
    // Retrieve user_id that corresponds with current username
    const sql_select = 'SELECT id FROM users WHERE username = ?';
    DB.get(sql_select, [username], (err, row) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Database error");
      }
      console.log(row);
      const userId = row.id;

      // User cannot add a duplicate friend
      const dupSql = 'SELECT * FROM friends WHERE user_id = ? AND name = ?';
      DB.all(dupSql, [userId, name], (err, rows) => {
        console.log(rows);
        if (err) {
          console.log(err);
          return res.status(500).send("Database error");
        }
        else if (rows.length !== 0) {
          res.status(500).json({ message: 'Cannot add friend with duplicate name!' });
        }
        else {
          // If we can add the friend, insert into DB
          const insertSql = 'INSERT INTO friends (user_id, name, description, image_path) VALUES (?, ?, ?, ?)';
          DB.run(insertSql, [userId, name, desc, imagePath], (err) => {
            if (err) {
              console.log(err);
              return res.status(500).send("Database error");
            }
            else {
              console.log("success!");
              res.status(200).json({ message: 'Successfully added friend!' });
            }
        });
        }
      })
  })
});

app.route("/send_reminder_gcal")
.get(async(req, res) => {
  const {name, desc, frequency, time} = req.body;
  const username = req.session.user.username;
  let recurringRule = "";
  if (frequency === "daily") {
    recurringRule = "RRULE:FREQ=DAILY";
  }
  else if (frequency === "weekly") {
    recurringRule = "RRULE:FREQ=WEEKLY";
  }
  else if (frequency === "monthly") {
    recurringRule = "RRULE:FREQ=MONTHLY";
  }

  // Retrieve email from DB
  const select_email = 'SELECT * FROM users WHERE username = ?'
  DB.all(select_email, [username], (err, rows) => {
    if (err) {
      return res.status(500).send("Database error");
    }
    else {
    const email = rows[0].email;


    const calendar = google.calendar({version: 'v3', auth});
    const event = {
      'summary': `${desc}}`,
      'start': {
        'dateTime': start_time,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      'end': {
        'dateTime': 'end_time',
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      'recurrence': [
        `${recurringRule}`
      ],
      'reminders': {
        'useDefault': true,
      },
    };
    
    calendar.events.insert({
      auth: auth,
      calendarId: 'primary',
      resource: event,
    }, function(err, event) {
      if (err) {
        console.log('There was an error contacting the Calendar service: ' + err);
        return;
      }
      console.log('Event created: %s', event.htmlLink);
    });  
  }})
});

app.route("/update_reminder")
.get(async(req, res) => {
  if (req.session.user) {
    let username = req.session.user.username;
    let userID = await getUserID(username);
    let friends_ids = await getFriendsIDs(userID);
    let reminders = await getReminders(username);
    res.render("update_reminder.ejs", {user: req.session.user, friends: friends_ids, reminders: reminders});
  }
  else {
    res.redirect("/login");
  }
})

// Allows user to add a new reminder
.post(async(req, res) => {
  const {friendName, frequency, description} = req.body;
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const username = req.session.user.username;
  const rule = new schedule.RecurrenceRule();
  const curr_date = new Date();

  // Retrieve email from DB
  const select_email = 'SELECT * FROM users WHERE username = ?'
  DB.all(select_email, [username], (err, rows) => {
    if (err) {
      return res.status(500).send("Database error");
    }
    else {
      const email = rows[0].email;

      //Send reminders at the start of every day in user's current timezone
      rule.hour = 0;
      rule.minute = 0;
      rule.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (frequency === "daily") {
        rule.dayOfWeek = [0,1,2,3,4,5,6];
      }

      else if (frequency === "weekly") {
        rule.dayOfWeek = curr_date.getDay();
      }

      else if (frequency === "monthly") {
        rule.date = curr_date.getDate();
      }

      // Unique job ID based on unique username and current timestamp
      const job_id = `job-${username}-${Date.now()}`;
      console.log(job_id);

      // Schedule a new job to send out reminder email
      const job = schedule.scheduleJob(job_id, rule, () => {
        const msg = {
          to: email, 
          from: 'achong1@swarthmore.edu',
          subject: 'Reminder!',
          text: `This is your ${frequency} reminder to ${description}!`,
          html: `<p>This is your ${frequency} reminder to ${description}!</p>`,
        }
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
                console.error(error)
            })
      });

      // Can auto invoke to verify that it works
      // job.invoke();

      // Console logs to verify that job was scheduled as intended.
      if (job) {
        console.log('Currently scheduled jobs:', Object.keys(schedule.scheduledJobs));
        console.log(job);
        console.log('Next run:', job.nextInvocation());
      } else {
        console.error('Job failed to schedule.');
      }

        // Insert reminder into DB
        const insertSql = 'INSERT INTO reminders (job_id, username, friend, frequency, description) VALUES (?, ?, ?, ?, ?)';
        DB.run(insertSql, [job_id, username, friendName, frequency, description], (err) => {
          if (err) {
            console.log(err);
            return res.status(500).send("Database error");
          }else{
            console.log("success!");
            res.status(200).json({ message: 'Successfully added reminder!' });
          }
        });
    }
  })
})

// Allows user to revise an exiting reminder
.put(async(req, res) =>{
  const rule = new schedule.RecurrenceRule();
  const curr_date = new Date();
  const {friendName, reminder, frequency, description} = req.body;
  const jobId = reminder.job_id;
  const username = req.session.user.username;

  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  
  //Send reminders at the start of every day in user's current timezone
  rule.hour = 0;
  rule.minute = 0;
  rule.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (frequency === "daily") {
    rule.dayOfWeek = [0,1,2,3,4,5,6];
  }

  else if (frequency === "weekly") {
    rule.dayOfWeek = curr_date.getDay();
  }

  else if (frequency === "monthly") {
    rule.date = curr_date.getDate();
  }

  // Cancel old job. This is because it won't let me revise existing schedule.
  const old_job = schedule.cancelJob(jobId);
  console.log(old_job);

  // Retrieve user email
  const select_email = 'SELECT * FROM users WHERE username = ?'
  DB.all(select_email, [username], (err, rows) => {
    if (err) {
      return res.status(500).send("Database error");
    }
    else {
      const email = rows[0].email;
      const new_job = schedule.scheduleJob(jobId, rule, () => {
        const msg = {
          to: email, 
          from: 'achong1@swarthmore.edu',
          subject: 'Reminder!',
          text: `This is your ${frequency} reminder to ${description}!`,
          html: `<p>This is your ${frequency} reminder to ${description}!</p>`,
        }
      sgMail
          .send(msg)
          .then(() => {
              console.log('Email sent')
          })
          .catch((error) => {
              console.error(error)
          })
      console.log('scheduled emails!');
      });

      // Auto invoke to see if it works!
      // new_job.invoke();
    
      if (new_job) {
        console.log('Currently scheduled jobs:', Object.keys(schedule.scheduledJobs));
        console.log(new_job);
        console.log('Next run:', new_job.nextInvocation());
      } else {
        console.error('Job failed to schedule.');
      }
    
      // Update reminder in DB
      const sql_update = 'UPDATE reminders SET frequency = ?, description = ? WHERE username = ? AND friend = ? AND job_id = ?';
      DB.run(sql_update, [frequency, description, username, friendName, jobId], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Database error");
        }
        console.log("Reminder updated!");
        return res.status(200).json({ message: 'Successfully updated reminder! Refresh to see new list.' });
      })
    }
  })
})

  .delete(async(req, res) => {
    console.log('in delete');
    const {reminder} = req.body;
    const jobId = reminder.job_id;
    const username = req.session.user.username;
    const old_job = schedule.cancelJob(jobId);
    console.log('old job:', old_job);
  
    const sql_delete = 'DELETE FROM reminders WHERE job_id = ? AND username = ?'
    DB.run(sql_delete, [jobId, username], (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Database error");
      }
      console.log("success!");
      res.status(200).json({ message: 'Successfully deleted reminder! Refresh to see new list.' });
    })
});


app.get("/login", async(req, res) => {
  if (req.query.next) {
    res.render("login.ejs", {user: '', next: req.query.next, errorMessage: ''})
  } else {
    res.render("login.ejs", {user: '', next: null, errorMessage: ''});
  }
});

app.get("/register", async(req, res) => {
  res.render("register.ejs", {user: '', errorMessage: ''});
});

app.route("/create_calendar")
.get(async(req, res) => {
  if (req.session.user) {
    res.render("create_calendar.ejs", {user: req.session.user});
  }
  else {
    console.log(req.session.user);
    res.render("create_calendar.ejs", {user: undefined});
  }
})
.post(async (req, res) => {
  console.log("post request from create_calendar!");
  console.log(req.body);
  const data = req.body;
  let usernameTemp;
  if (req.session.user) {
    usernameTemp = req.session.user.username;
  } else {
    usernameTemp = null;
  }
  const username = usernameTemp;

  const url = nanoid(15);
  const sql = 'INSERT INTO calendars (username, title, duration, start_date, end_date, start_time, end_time, info, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  DB.run(sql, [username, data.title, data.duration, data.start_date, data.end_date, data.start_time, data.end_time, data.info, url], async function (err) {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error");
    } else {
      console.log("successful calendar creation!")
      return res.status(200).json({redirect: "/send_calendar?url=" + url});
    }
  })
  }
);

async function getCalendar(calendarUrl){
  const sql = 'SELECT * FROM calendars WHERE url = ?'
  return new Promise((resolve, reject) =>{
    DB.get(sql, [calendarUrl], function(err, row){
    if(err){
      reject(err);
    }else if (!row){
      resolve(null);
    }else{
      resolve(row);
    }
  })
  })
  
}

async function getCalendarInfo(calendarUrl, username){
  const sql = 'SELECT * FROM calendar_info WHERE hashed_id = ? AND username = ?'
  return new Promise((resolve, reject) =>{
    DB.get(sql, [calendarUrl, username], function(err, row){
    if(err){
      reject(err);
    }else if (!row){
      resolve(null);
    }else{
      resolve(row);
    }
  })
  })
  
}

async function getCalendarInfo2(hashed_id){
    const sql = 'SELECT * FROM calendar_info WHERE hashed_id = ?';
    return new Promise((resolve, reject)=>{
        DB.all(sql, [hashed_id], (err, rows) => {
            if(err) reject(err);
            else resolve(rows);
        });
    });
}


app.get("/api/calendar/:id", async(req, res)=> {
  const hashed_id = req.params.id;
  const rows = await getCalendarInfo2(hashed_id);
  res.json(rows);
});

app.get("/api2/calendar/:id", async(req, res)=> {
  const hashed_id = req.params.id;
  const row = await getCalendar(hashed_id);
  res.json(row);
});

app.delete("/api/calendar/delete_curr", async(req, res) => {
  const hashed_id = req.body.id;
  const username = req.body.username;

  const sql = 'DELETE FROM calendar_info WHERE hashed_id = ? AND username = ?'
  DB.run(sql, [hashed_id, username], function (err) {
      if(err) {
          console.log("Database error:", err);
          return res.status(500).send("Database error");
      }
      else {
        return res.status(200).send("OK");
      }
    })
    
})

app.get("/finished_calendar/:url", async(req, res) => {
  const calendarUrl = req.params.url;
  console.log(calendarUrl);
  const calendar = await getCalendar(calendarUrl);
  if(!calendar){
    console.log('not found')
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({ error: "Calendar not found" });
    }
    return res.status(404).send("Calendar not found");
  }
  let username = null;
  if (req.session.user) {
    username = req.session.user.username;
  }
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ redirect: `/finished_Calendar/${calendarUrl}` });
  }
  res.render("finished_calendar.ejs", {calendar: calendar, user: username});
});

app.post("/api/calendar/get_curr_choices", async(req, res) => {
  const hashed_id = req.body.id;
  const username = req.body.username;
  const calendarInfo = await getCalendarInfo(hashed_id, username);
  console.log(calendarInfo)
  if (calendarInfo !== null) {
    res.status(200).json({ choices: calendarInfo });
  } else {
    res.status(200).json({ choices: null });
  }
});


app.post("/finished_calendar/:url", async(req, res) => {
  console.log('finished calendar')
  const calendarUrl = req.params.url;
  //getCalendarInfo returns the row of information corresponding to 
  // that user on that url
  
  const username = req.body.username;
  const calendarInfo = await getCalendarInfo(calendarUrl, username);
  console.log(calendarInfo);
  const interval = req.body.preference;
  const rank = req.body.rank;
  const calendar = await getCalendar(calendarUrl);
  const calId = calendar.id;
  console.log(calendar.id);

  console.log("Interval is:", interval);
  if(calendarInfo === null){
    // Then, this user is editing the calendar for the first time!
    
    let preferences = {rank1: [], rank2: []};
    if(rank === 1){
      preferences.rank1.push(interval);
      console.log("preferences.rank1 updated:", preferences.rank1);
    }
    else{
      preferences.rank2.push(interval);
      console.log("preferences.rank2 updated:", preferences.rank2);
    }
    const sql = 'INSERT into calendar_info (calendar_id, username, preferences, hashed_id) VALUES (?, ?, ?, ?)';
    const values = [calId, username, JSON.stringify(preferences), calendarUrl];
    DB.run(sql, values, function (err) {
      if(err) {
          console.log("Database error:", err);
          return res.status(500).send("Database error");
      }
      else {
        return res.status(200).send("OK");
      }
    });
      

  }
  else{
    let oldPrefsJSON = calendarInfo.preferences;
    let oldPrefs = JSON.parse(oldPrefsJSON);
    if(rank === 1){
      console.log("oldPrefs is: ", oldPrefs);
      console.log("It's rank 1");
      console.log("Its rank1: ", oldPrefs.rank1);
      console.log("Its rank2: ", oldPrefs.rank2);
      oldPrefs.rank1.push(interval);
    }
    else{
      console.log("oldPrefs is: ", oldPrefs);
      console.log("Its rank1: ", oldPrefs.rank1);
      console.log("Its rank2: ", oldPrefs.rank2);
      console.log("It's rank 2");
      oldPrefs.rank2.push(interval);
    }
    const sql = 'UPDATE calendar_info SET preferences = ? WHERE username = ? AND hashed_id = ?';
    const values = [JSON.stringify(oldPrefs), username, calendarUrl];
    DB.run(sql, values, function (err) {
      if(err) {
          console.log("Database error:", err);
          return res.status(500).send("Database error");
      }
    else{
      return res.status(200).send("OK");
    }});
  }
  
});



app.post('/submit-reg', async (req, res) => {
  console.log("POST /register");
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Attempting to register:", username, password, hashedPassword, email);

    const check_username = 'SELECT * FROM users WHERE username = ?';
    DB.get(check_username, [username], function (err, rows) {
    if(rows) {
      console.log('inside');
      res.render("register.ejs", { errorMessage: "Username is taken." });
    }
    else {
      const sql = 'INSERT into users (username, password, email) VALUES (?, ?, ?)';
      const values = [username, hashedPassword, email];
      // DB.run needs older function() {} syntax instead of ES6 ()=> syntax.
      DB.run(sql, values, function (err) {
      if(err) {
          console.log("Database error:", err);
          return res.status(500).send("Database error");
      }
      console.log(`A user has been created with userid ${this.lastID}`);
      req.session.user = { username: username };
      res.redirect("/profile");
    });
    }
    });
    

});

app.post('/submit-login', async (req, res) => {
    console.log("POST /login");
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    console.log("Attempting to login:", username, password);
    
    //prepare SQL query
    const sql = 'SELECT * FROM users WHERE username = ?';  

    // query for single (or first) row that matches query
    DB.get(sql, [username], async (err, row) => {
    if(err) {
      console.log("Database error:", err);
      res.send(`<h2>Login failed ❌</h2><p>Invalid username or password. <a href="login">Try again</a></p>`);
    }
    else if (!row) {
      console.warn(`No user found with username = ${username}`);
      res.render("login.ejs", { errorMessage: "No user found with username + password combination." });
    }
else {
    try { 
      if (await bcrypt.compare(password, row.password) ) {
          req.session.user = { username: username };
          console.log(req.body.next);
          if (req.body.next) {
            res.redirect(req.body.next);
          } else {
            res.redirect('/profile');
          }
        } else {
          res.render("login.ejs", { errorMessage: "No user found with username + password combination.", next: req.body.next || "", user: null });
        }
    } catch (error) {
      console.log(error);
        res.send(`<h2>Login failed ❌</h2><p>Invalid username or password. <a href="/login">Try again</a></p>`);
    }
  }});
});

app.route("/create_mailing_list")
.post(async(req, res) => {
  const email_list = JSON.stringify(req.body.email_list);
  const username = req.session.user.username;
  const updateSql = `UPDATE users SET mailing_list = ? WHERE username = ?`;
  DB.run(updateSql, [email_list, username], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error");
    }
    else {
      console.log("success!");
      res.status(200).json({ message: 'Successfully added mailing list!' });
    }
  })
});


//Making it a post route so that users can't access it from browser, even though it's retrieving info
app.route("/send_email")
.post(async(req, res) => {
  const email = req.body.email;
  const username = req.session.user.username;
  const select = `SELECT mailing_list FROM users WHERE username = ?`;
  DB.get(select, [username], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error");
    }
    if (!rows) {
      return res.status(500).json({message: 'Sending email failed! No mailing list set.'})
    }
    else {
      console.log("success!");
      const mailing_list = JSON.parse(rows.mailing_list);
      console.log(mailing_list)
      mailing_list.forEach(individual => {   
        const msg = {
            to: individual, 
            from: 'achong1@swarthmore.edu',
            subject: `${username} sent you a message through FriendDule!`,
            text: `Message: ${email}`,
            html: `<p>Message: ${email}</p>`,
        }
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
                console.error(error)
            })
        });
        console.log('emails sent!');
      res.status(200).json({ message: 'Successfully sent email to mailing list!' });
    }
  })
});

app.post("/update_last_seen", async (req, res) => {
  const {friend_id, last_seen} = req.body;

  const update = `UPDATE friends SET last_seen = ? WHERE id = ?`;
  DB.run(update, [last_seen, friend_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(200).json({message: "Last seen date updated! Refresh to update."});
  });
});

// have the server start listening for requests made on a port
// also print out to the console
app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
  });

