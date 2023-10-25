const SERVICE_UUID_PESTOBLE = '27df26c5-83f4-4964-bae0-d7b7cb0a1f54';
const CHARACTERISTIC_UUID_GAMEPAD = '452af57e-ad27-422c-88ae-76805ea641a9';

const bleStatus = document.getElementById('bleStatus');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const gamepadStatus = document.getElementById('gamepadStatus');

connectButton.onclick = connectBLE;
disconnectButton.onclick = disconnectBLE;

function displayBleStatus(status) { bleStatus.innerHTML = status; }
function displayGamepadStatus(status) { gamepadStatus.innerHTML = status; }

let device;
let server;
let service;
let characteristic_gamepad;

async function connectBLE() {
   if(device) {
      if(device.gatt.connected){
         displayBleStatus('> Bluetooth Device is already connected');
         return;
      }
   }

   displayBleStatus('Searching for devices with the PestoBLE service');

   try {
      device = await navigator.bluetooth.requestDevice({filters: [{ services: [SERVICE_UUID_PESTOBLE] }] });
      displayBleStatus('Found device ' + device.name);

      server = await device.gatt.connect();
      displayBleStatus('Connected to GATT server');

      service = await server.getPrimaryService(SERVICE_UUID_PESTOBLE);
      displayBleStatus('Service aquired');

      characteristic_gamepad = await service.getCharacteristic(CHARACTERISTIC_UUID_GAMEPAD);
      displayBleStatus('Characteristics aquired, BLE connection successful');

   } catch (error) {
      displayBleStatus("Error: " + error);
   }
}

async function disconnectBLE() {
   if (!device) return;

   try {
      displayBleStatus('Disconnecting from Bluetooth Device...');
      if (device.gatt.connected) {
         await device.gatt.disconnect();
         displayBleStatus('Disconnected');
      } else {
         displayBleStatus('> Bluetooth Device is already disconnected');
      }
   } catch (error) {
      displayBleStatus("Error: " + error);
   }
}
//---------------------------------------------------------------------------//

document.addEventListener("DOMContentLoaded", () => {
   window.setInterval(renderLoop, 20); // call renderLoop every 20ms
   window.addEventListener("gamepadconnected", updateGamepads);
   window.addEventListener("gamepaddisconnected", updateGamepads);
});

function getGamepads() {
   return Array.from(navigator.getGamepads()).filter(gamepad => gamepad);
}

function anyGamepadsConnected() {
   return Boolean(getGamepads().length);
}

function getSelectedGamepad() {
   return getGamepads().find(gamepad => gamepad.index == 0); 
}

function updateGamepads() {
   if (anyGamepadsConnected()) displayGamepadStatus("Connected");
   else displayGamepadStatus("Disconnected");
}

let gamepadPacket = new DataView(new ArrayBuffer(6));

var axisValueElements = document.querySelectorAll('[id^="axisValue"]');
var sliderElements = document.querySelectorAll('[id^="slider"]');
var buttonElements = document.querySelectorAll('.button-gamepad');

function renderLoop() {
   
   var gamepad = getSelectedGamepad();
   if(!gamepad) return;

   var axisValGamepad = 0;
   for (let i = 0; i < 4; i++) {
      if (gamepad.axes[i] == 0) axisValGamepad = 127; else axisValGamepad = Math.round((gamepad.axes[i] + 1) * (255 / 2));

      axisValueElements[i].textContent = axisValGamepad;
      sliderElements[i].value = axisValGamepad;
      gamepadPacket.setUint8(i, axisValGamepad);
   }

   var buttonValGamepad = 0;
   for (let i = 0; i < 8; i++) {
      if(gamepad.buttons[i].pressed){
         buttonValGamepad |= (gamepad.buttons[i].pressed << i);
         buttonElements[i].classList.remove('grey');
         buttonElements[i].classList.add('green');
      } else {
         buttonElements[i].classList.remove('green');
         buttonElements[i].classList.add('grey');        
      }
   }

   gamepadPacket.setUint8(4, buttonValGamepad);
   
   if(device.gatt.connected){
      sendPacketBLE(); // Pass the axis index to the sendAxisBLE function
   }
}

async function sendPacketBLE() {
   try {
       await characteristic_gamepad.writeValueWithoutResponse(gamepadPacket);
   } catch (error) {
       console.error('Error writing characteristic:', error);
   }
}



