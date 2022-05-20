const { ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }
})