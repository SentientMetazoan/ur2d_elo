const { ipcRenderer } = require('electron')

function log(message) {
  ipcRenderer.send('print-message', message)
}

/* window.addEventListener('DOMContentLoaded', () => {
    window.electron.log('[renderer.js] DOM fully loaded and parsed');

    ipcRenderer.on('update-element', (event, args) => {
        log('[renderer.js] on(update-element)')
        for(let arg of args){
            log(arg['html'])
            window.document.getElementById(arg['id']).innerHTML = arg['html']
        }  
    })

    ipcRenderer.send('dom-loaded', [{id: "frame-top", file_path: "frame_top.html"}, {id: "frame-content", file_path: "frame_content.html"}])
    ipcRenderer.invoke('dom-loaded', [{id: "frame-top", file_path: "frame_top.html"}, {id: "frame-content", file_path: "frame_content.html"}])
}) */

log('[renderer.js] boo')
