//const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');

const {
  app,
  BrowserWindow,
  ipcMain,
  Menu
} = require('electron')
const mysql = require('mysql')
const { DB } = require('./db.js')
const path = require('path')
const fs = require('fs')
const { application } = require('express')

/**********************************
 * DB stuff, perhaps move somewhere else
 */

const CONFIG = {
  host:'localhost',
  user:'root',
  password:'',
  database:'ur2d_elo'
}
const RACES = []
const RESULTS = []
const DRIVERS = []
const TEAMS = []
const COMPETITIONS = []

class Competition {
  constructor(id, name) {
    this.id = id
    this.name = name
    this.seasons = []
  }
}

class Season {
  constructor(id, competition) {
    this.id = id
    this.competition = competition
    this.races = []
  }
}

class Race {
  constructor(id, location = "Unknown", competition = "Unknown", season = 0, round = 0, date = "Unknown", results = []) {
    console.log("[Race] constructor: " + "starting // id = " + id)
    if (id instanceof Array) {
      console.log('\tis NaN!')
      this.id = id[0]
      this.location = id[1]
      this.competition = id[2]
      this.season = id[3]
      this.round = id[4]
      this.date = id[5]
      this.results = []
    }
    else {
      console.log('\tis a number. Proceeding normally')
      this.id = id
      this.location = location
      this.competition = competition
      this.season = season
      this.round = round
      this.date = date
      this.results = []
    }

  }


  setResults(r) { this.results = r; }
}

class Driver {
  constructor(id, name, flag) {
    this.id = id
    this.name = name
    this.flag = flag
    this.results = []
  }
  printInfo() {
    console.log("Driver ID:\t" + this.id +
      "\nDriver name:\t" + this.name +
      "\nDriver flag:\t" + this.flag + "\n")
  }

  setResults(r) { this.results = r; }
}

class Team {
  constructor(id, name, code, flag) {
    this.id = id
    this.name = name
    this.flag = flag
    this.code = code
    this.results = []
  }
  printInfo() {
    console.log("Team ID:\t" + this.id +
      "\nTeam name:\t" + this.name +
      "\nTeam code:\t" + this.code +
      "\nTeam flag:\t" + this.flag + "\n")
  }

  setResults(r) { this.results = r; }
}

class Result {
  constructor(race, driver, team, quali, finish, fl) {
    this.race = race
    this.driver = driver
    this.team = team
    this.quali = quali
    this.finish = finish
    this.fl = fl
  }
}

function getDriver(id) {
  if (id < 0)
    return { id: "-1", name: "No Driver", flag: "-" }
  for (let d of DRIVERS) {
    if (d.id == id)
      return d
  }
}

function getTeam(id) {
  if (id < 0)
    return { id: "-1", name: "No Team", code: "-", flag: "-" }
  for (let t of TEAMS) {
    if (t.id == id)
      return t
  }
}

function getCompetition(id) {
  if (id < 0)
    return { id: "-1", name: "No Competition" }
  for (let c of COMPETITIONS) {
    if (c.id == id)
      return c
  }
}

function getRace(id) {
  if (id < 0)
    return { id: "-1", name: "No Race", loc: "No Location" }
  for (let r of RACES) {
    if (r.id == id)
      return r
  }
}



/**
 * This will  print a database collection of rows to console
 * It tells you when it's done
 */
function print_rows(data, notify = true) {
  for (let d of data) console.log(d)
  if (notify) console.log('-- end of rows\n')
}



/**********************************
 * initialisation stuff
 */

function init_info() {

  console.log("Beginning initialisation")
  //initialise SL
  COMPETITIONS.push(new Competition(0, "Sunday League"))

  let ignored_first, lines, data

  //initialise drivers
  console.log("reading drivers file...")
  data = fs.readFileSync(path.join(__dirname, "drivers.csv"), 'utf-8')

  console.log("initialising drivers...")
  init_info_drivers(data)
  console.log("DONE!")

  console.log("reading teams file...")
  let team_data = fs.readFileSync(path.join(__dirname, "teams.csv"), 'utf-8')
  console.log("DONE!")

  console.log("initialising teams...")
  init_info_teams(team_data)
  console.log("DONE!")

  console.log("reading results file...")
  let results_data = fs.readFileSync(path.join(__dirname, "races.csv"), 'utf-8')
  console.log("DONE!")

  console.log("initialising races and results...")
  init_info_results(results_data)
  console.log("DONE!")

  console.log("Initialisation complete")
  init_info_debugPrint()

}

function init_info_drivers(data) {
  let ignored_first = false;
  let lines = data.split('\n')
  for (let line of lines) {
    if (ignored_first) {
      line = line.split(',')
      DRIVERS.push(new Driver(line[0], line[1], line[2]))
    }
    else ignored_first = true
  }
}

function init_info_teams(data) {
  let ignored_first = false;
  let lines = data.split('\n')
  for (let line of lines) {
    if (ignored_first) {
      line = line.split(',')
      TEAMS.push(new Team(line[0], line[1], line[2], line[3]))
    }
    else ignored_first = true
  }
}

function init_info_results(data) {
  let ignored_first = false;
  let lines = data.split("\n")
  for (let line of lines) {
    if (ignored_first) {
      line = line.split(',')
      // If it's a race
      if (line[0] == 0) {
        console.log("Initialising race...")
        let loc = line[1]
        let r_id = line[2]
        let c_id = line[3]
        let s = line[4]
        let r = line[5]
        let d = line[6]

        let new_race = new Race([r_id, loc, c_id, s, r, d])
        //let new_race = new Race(r_id, loc, c_id, s, r, d)

        RACES.push(new_race)

        let comp = getCompetition(c_id)
        while (comp.seasons.length < s) {
          comp.seasons.push(new Season(s, c_id))
        }
        comp.seasons[s - 1].races.push(new_race)
      }
      // If it's a race result
      else if (line[0] == 1) {
        let r_id = line[2]
        let race = getRace(r_id)

        let d_id = line[7]
        let t_id = line[8]
        let quali = line[9]
        let finish = line[10]
        let fl = line[11]

        let new_result = new Result(race, d_id, t_id, quali, finish, fl)

        RESULTS.push(new_result)
        if (race.results == undefined)
          race.results = []
        race.results.push(new_result)
        getDriver(d_id).results.push(new_result)
        if (t_id >= 0) getTeam(t_id).results.push(new_result)
      }

    }
    else ignored_first = true

  }
}

function init_info_debugPrint() {
  console.log('debugprint--------')
  for (let r of RACES) {
    console.log("Race #" + r.id + " - " + r.location)
    console.log(getCompetition(r.competition).name + " S" + r.season + "R" + r.round + " (" + r.date + ")")
    console.log("Pos\tDriver\tTeam\tQuali\tFL?")
    for (let i of r.results) {
      let fl = i.fl > 0 ? "X" : ""
      console.log(i.finish + "\t" + getDriver(i.driver).name + "\t" + getTeam(i.team).code + "\t" + i.quali + "\t" + fl)
    }
  }

  for (let c of COMPETITIONS) {
    console.log(c.name)
    for (let s of c.seasons) {
      console.log("Season " + s.id)
      for (let r of s.races) {
        console.log("ROUND " + r.round + ": " + r.location)
        for (let rr of r.results) {
          if (rr.finish == 1) {
            console.log("Winner: " + getDriver(rr.driver).name + " (" + getTeam(rr.team).name + ")\n")
          }
        }
      }
    }
  }
}


/**
 * Parses the driver list from drivers.csv, deletes any created drivers table, creates a new table, then adds the info to it
 */
function init_drivers_table(){
  let connection = mysql.createConnection(CONFIG);
  let drivers = []
  let raw = fs.readFileSync(path.join(__dirname, "drivers.csv"), 'utf-8')
  raw = raw.split('\r').slice(1)
  console.log('Raw driver info: '+raw)

  for(let d of raw){
    let vals = d.split(',')
    let driver = {
      id: vals[0],
      name: vals[1],
      flag: vals[2]
    }
    drivers.push(driver)
  }

  connection.connect( err => {
    connection.query('USE ur2d_elo;')
    connection.query(`DROP TABLE drivers;`)
    connection.query(
    `CREATE TABLE drivers (
      id int NOT NULL AUTO_INCREMENT,
      name varchar(255) NOT NULL,
      flag char(3),
      PRIMARY KEY (id)
    );`)
    
    for(let d of drivers){
      console.log(`Adding driver: ${d.name} (${d.flag})`)
      let sql = `INSERT INTO drivers (name, flag) VALUES ("${d.name}", "${d.flag}");`
      console.log(sql)
      connection.query(sql)
    }
  })
}



/**
 * Server, might be used later
 */

function init_server() {
  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ur2d_elo'
  });
  console.log('Connection created')
  connection.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    connection.query("USE ur2d_elo", function (err, result) {
      if (err) throw err;
      console.log("Using ur2d_elo database");
    });
    connection.query(`
    DROP TABLE results;`, function (err, result) {
      if (err) throw err;
      console.log("Query successful! Result:\n");
    });

  });
}



/******************************************
 * Menu
 */
const menuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "Test",
      },
      {
        type: "separator",
      },
      {
        label: "Exit",
        click: () => app.quit(),
      },
    ],
  },
  {
    label: "Tables",
    submenu: [
      {
        label: "Teams",
        click: () => BrowserWindow.getAllWindows()[0].loadFile('team.html'),
      },
      {
        label: "Drivers",
        click: () => BrowserWindow.getAllWindows()[0].loadFile('drivers.html'),
      },
      {
        label: "Competitions",
        click: () => BrowserWindow.getAllWindows()[0].loadFile('comps.html'),
      },
      {
        label: "Races",
        click: () => BrowserWindow.getAllWindows()[0].loadFile('races.html'),
      },
    ],
  },
  {
    label: "Minimise",
    role: "minimize"
  },
  {
    label: "Exit",
    role: "close"
  }
];

const menu = Menu.buildFromTemplate(menuTemplate)
Menu.setApplicationMenu(menu)



/******************************************
 * Creates a window, initialised with preload.
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  return win
}


/*************************************
 * APP INIT
 * 
 * Creates the window when the app is ready
 * Loads index.html and initialises info
 */
app.whenReady().then(() => {
  let win = createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      win = createWindow()
    }
  })

  init_drivers_table();

  console.log("about to load index")
  win.loadFile('index.html')
    .then( (event) => console.log('index.html loaded!'))
    .catch( (err) => console.log('index.html failed loading. Error:',err) )
  //win.removeMenu()

  //console.log("about to init_server")
  //init_server()
  //init_info()
  
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


/************
 * IPC MAIN *
 ************/

ipcMain.on('request-data', (event, arg) => {

  var t = ""
  console.log('received request...')
  fs.readFile(path.join(__dirname, arg), 'utf-8', (err, data) => {
    if (err) {
      alert("An error ocurred reading the file :" + err.message);
      return;
    }
    console.log('read file...')
    console.log("text contents: " + data)
    console.log('----DONE----')

    event.returnValue = data
  })
  console.log('request done!')

})



/**
 * Basic logging for the renderer process
 */
ipcMain.on('print-message', (event, arg) => {
  console.log(arg)
})

ipcMain.handle('page-loaded', (event, args) => {
  console.log('[ipcMain] page-loaded event fired: '+args)
  event.sender.send('page-loaded','main knows page is loaded')
  return 'PAGE WAS LOADED'
})


// print the frames
ipcMain.handle('init-frames', (event, args) => {
  let result = []

  for (let arg of args) {
    result.push({
      id: arg['id'],
      html: fs.readFileSync(path.join(__dirname, './' + arg['file_path']), 'utf-8', (err, data) => {
        if (err) {
          console.log("An error ocurred reading the file :" + err.message);
          return;
        }
        console.log("Finished reading file: ",arg['file_path'])
        console.log("data is:",data)
        return data;
      })
    })
  }
  //console.log("result=",result)
  //event.sender.send('init-frames',result)
  return result
})


/**
 * Query the database
 */
ipcMain.handle('query', (event, args) => {
  let arg = args
  let connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ur2d_elo'
  });

  console.log('Database connection created')
  connection.connect(function (err) {
    let res = []
    if (err) throw err;
    console.log("--- Connected ---");
    connection.query("USE ur2d_elo;", function (err, result) {
      if (err) throw err;
      console.log("Using ur2d_elo database");
    });

    connection.query("" + arg.query, function (err, result) {
      if (err) throw err;
      console.log(`Performed query: ${arg.query}`);
      for (let r of result)
        res.push(JSON.stringify(r))

      connection.end(function (err) {
        if (err) throw err;
        console.log('--- Ended connection ---')
        event.sender.send(arg.channel, res)
        return res;
      })
    });

    /* connection.end((err) => {
      if (err) throw err;
      console.log('ending connection...')
    })

    console.log('Returning query result')
    return res; */
  });

  
})



//DevTools stuff, not working
/* app.whenReady().then(async () => {
  await installExtension(REDUX_DEVTOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));
  

}) */