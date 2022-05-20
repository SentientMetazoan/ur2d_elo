const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron')
const path = require('path')
const fs = require('fs')

const RACES = []
const RESULTS = []
const DRIVERS = []
const TEAMS = []
const COMPETITIONS = []

class Competition{
  constructor(id,name){
    this.id = id
    this.name = name
    this.seasons = []
  }
}

class Season{
  constructor(id,competition){
    this.id = id
    this.competition = competition
    this.races = []
  }
}

class Race{
  constructor(id,location,competition,season,round,date){
    this.id = id
    this.location = location
    this.competition = competition
    this.season = season
    this.round = round
    this.date = date
    this.results = []
  }
}

class Driver{
  constructor(id,name,flag){
    this.id = id
    this.name = name
    this.flag = flag
    this.results = []
  }
  printInfo(){
    console.log("Driver ID:\t"+this.id+
    "\nDriver name:\t"+this.name+
    "\nDriver flag:\t"+this.flag+"\n")
  }
}

class Team{
  constructor(id,name,code,flag){
    this.id = id
    this.name = name
    this.flag = flag
    this.code = code
    this.results = []
  }
  printInfo(){
    console.log("Team ID:\t"+this.id+
    "\nTeam name:\t"+this.name+
    "\nTeam code:\t"+this.code+
    "\nTeam flag:\t"+this.flag+"\n")
  }
}

class Result{
  constructor(race,driver,team,quali,finish,fl){
    this.race = race
    this.driver = driver
    this.team = team
    this.quali = quali
    this.finish = finish
    this.fl = fl
  }
}

function getDriver(id){
  if(id < 0)
    return { id:"-1",name:"No Driver",flag:"-"}
  for(let d of DRIVERS){
    if(d.id == id)
      return d
  }
}

function getTeam(id){
  if(id < 0)
    return { id:"-1",name:"No Team",code:"-",flag:"-"}
  for(let t of TEAMS){
    if(t.id == id)
      return t
  }
}

function getCompetition(id){
  if(id < 0)
    return { id:"-1",name:"No Competition"}
  for(let c of COMPETITIONS){
    if(c.id == id)
      return c
  }
}

function getRace(id){
  if(id < 0)
    return { id:"-1",name:"No Race",loc:"No Location"}
  for(let r of RACES){
    if(r.id == id)
      return r
  }
}

function init_info(){

  console.log("Beginning initialisation")
  //initialise SL
  COMPETITIONS.push(new Competition(0,"Sunday League"))
  
  //initialise drivers
  console.log("reading drivers file...")
  let data =  fs.readFileSync(path.join(__dirname, "drivers.csv"), 'utf-8')
  console.log("initialising drivers...")
  
  let ignored_first = false;
  let lines = data.split('\n')
  for(let line of lines){
    if(!ignored_first){
      ignored_first = true
      continue
    }
    line = line.split(',')
    DRIVERS.push(new Driver(line[0],line[1],line[2]))
  }
  console.log("DONE!")

  console.log("reading teams file...")
  let team_data =  fs.readFileSync(path.join(__dirname, "teams.csv"), 'utf-8')
  console.log("initialising teams...")
  
  ignored_first = false;
  lines = team_data.split('\n')
  for(let line of lines){
    if(!ignored_first){
      ignored_first = true
      continue
    }
    line = line.split(',')
    TEAMS.push(new Team(line[0],line[1],line[2],line[3]))
  }
  console.log("DONE!")

  

  console.log("reading results file...")
  let results_data = fs.readFileSync(path.join(__dirname, "races.csv"), 'utf-8')
  console.log("initialising results...")

  ignored_first = false;
  lines = results_data.split("\n")
  for(let line of lines){
    if(!ignored_first){
      ignored_first = true
      continue
    }
    line = line.split(',')
    if(line[0] == 0){
      console.log("Initialising race...")
      let loc = line[1]
      let r_id = line[2]
      let c_id = line[3]
      let s = line[4]
      let r = line[5]
      let d = line[6]

      let new_race = new Race(r_id,loc,c_id,s,r,d)

      RACES.push(new_race)
      
      let comp = getCompetition(c_id)
      if(comp.seasons.length < s){
        comp.seasons.push(new Season(s,c_id))
      }
      comp.seasons[s-1].races.push(new_race)
    }
    if(line[0] == 1){
      let r_id = line[2]
      let race = getRace(r_id)

      let d_id = line[7]
      let t_id = line[8]
      let quali = line[9]
      let finish = line[10]
      let fl = line[11]

      let new_result = new Result(race,d_id,t_id,quali,finish,fl)

      RESULTS.push(new_result)
      race.results.push(new_result)
      getDriver(d_id).results.push(new_result)
      if(t_id >= 0) getTeam(t_id).results.push(new_result)
    }

  }

  console.log("DONE!")

  console.log("Initialisation complete")
  
  for(let r of RACES){
    console.log("Race #"+r.id + " - " +r.location)
    console.log(getCompetition(r.competition).name+" S"+r.season+"R"+r.round+" ("+r.date+")")
    console.log("Pos\tDriver\tTeam\tQuali\tFL?")
    for(let i of r.results){
      let fl = i.fl > 0 ? "X" : ""
      console.log(i.finish+"\t"+getDriver(i.driver).name+"\t"+getTeam(i.team).code+"\t"+i.quali+"\t"+fl)
    }
  }

  for( let c of COMPETITIONS){
    console.log(c.name)
    for(let s of c.seasons){
      console.log("Season "+s.id)
      for(let r of s.races){
        console.log("ROUND "+r.round+": "+r.location)
        for(let rr of r.results){
          if(rr.finish == 1){
            console.log("Winner: "+getDriver(rr.driver).name+" ("+getTeam(rr.team).name+")\n")
          }
        }
      }
    }
  }
}


function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  console.log("testing")

  win.loadFile('index.html')
  win.removeMenu()
  init_info()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('request-data', (event,arg) => {
  
  var t = ""
  console.log('received request...')
  fs.readFile(path.join(__dirname, arg), 'utf-8', (err,data) => {
    if(err){
      alert("An error ocurred reading the file :" + err.message);
      return;
    }
    console.log('read file...')
    console.log("text contents: "+data)
    
    event.returnValue = data
  })
  
})