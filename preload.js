const { ipcRenderer, contextBridge } = require('electron')

const ipc = {
  'render': {
    // render to main
    'send': [
      'page-loaded'
    ],
    // main to render
    'receive': [
    ],
    // from rend to main and back
    'sendReceive': [
      'message',
      'init-frames',
      'page-loaded'
    ]
  }
};

contextBridge.exposeInMainWorld(
  // allowed 'ipcRenderer' methods
  'ipcRender',
  {
    // render to main
    send: (channel, args) => {
      let validChannels = ipc.render.send;
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, args)
      }
    },
    // main to render
    receive: (channel, args) => {
      let validChannels = ipc.render.receive;
      if (validChannels.includes(channel)) {
        // deliberately strip event as it includes 'sender'.
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
      }
    },
    invoke: (channel, args) => {
      let validChannels = ipc.render.sendReceive;
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, args);
      }
    }
  }
)

const API = {
  loadFrames: (args) => {
    for (let arg of args) {
      log(arg['html'])
      window.document.getElementById(arg['id']).innerHTML = arg['html']
    }
  },
  log: (message) => {
    ipcRenderer.send('print-message', message)
  }
}

contextBridge.exposeInMainWorld('api', API)

/*****************************************/


function log(message) {
  ipcRenderer.send('print-message', message)
}

function loadFrames(args) {
  for (let arg of args) {
    log(arg['html'])
    window.document.getElementById(arg['id']).innerHTML = arg['html']
  }
}

ipcRenderer.on(
  'page-loaded',
  (event, data) => {
    log('answer received: '+data)
  }
)


window.addEventListener('DOMContentLoaded', () => {
  log('[preload.js] DOM fully loaded and parsed, starting');
  ipcRenderer.invoke('page-loaded', 'index')
    .then((answer) => {
      log(`[preload.js] Invoke > answer from page-loaded: ${answer}`)
      ipcRenderer.invoke('init-frames', [{ "id": "frame-top", "file_path": "frame_top.html" }, { "id": "frame-content", "file_path": "frame_content.html" }])
        .then((args) => {
          for (let arg of args) {
            //log('received args: ' + arg['html'])
            log('Elements found: '+window.document.getElementById(arg['id']).id)
            window.document.getElementById(arg['id']).innerHTML = arg['html']
          }
        })
        .catch((err) => {
          log(err)
        })
    })
})




 /*ipcRenderer.on('update-element', (event, args) => {
    log('[preload.js] on(update-element)')
    for (let arg of args) {
      log(arg['html'])
      window.document.getElementById(arg['id']).innerHTML = arg['html']
    }
  })

  //ipcRenderer.send('dom-loaded', [{ id: "frame-top", file_path: "frame_top.html" }, { id: "frame-content", file_path: "frame_content.html" }])
  log('[preload.js] invoking dom-loaded...')
  let res = ipcRenderer.send('dom-loaded', [{ id: "frame-top", file_path: "frame_top.html" }, { id: "frame-content", file_path: "frame_content.html" }])
  log('[preload.js] res=\n' + res);
  loadFrames(res)
  log('[preload.js] Loaded frames!');*/




/* ipcRenderer.on('load-frame', (event, arg) => {
  ipcRenderer.send('print-message', 'Renderer frame loader working')
  window.document.getElementById("frame-top").innerHTML = `<object type="text/html" data="${arg}" ></object>`;
  event.returnValue = true
})

ipcRenderer.send('load-frame', 'frame_top.html') */