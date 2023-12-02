const joystick = createJoystick(document.getElementById('joystick-container'));
const bleAgent = createBleAgent(document.getElementById('ButtonBLE'));
const buttonAgent = createButtonAgent();

const debugInfo = document.getElementById('debug-info');

function createJoystick(parent) {
  const maxDiffScale = 0.5;
  const stick = document.createElement('div');
  stick.classList.add('joystick');

  stick.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  stick.addEventListener('touchstart', handleTouchDown, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchUp, { passive: false });

  document.addEventListener('keydown', handleKeyboardInput);
  document.addEventListener('keyup', handleKeyboardInput);

  stick.style.transition = '0s';

  let dragStart = null;
  let currentTouch = null;
  let currentPos = { x: 0, y: 0 };

  let keyControl = false;
  let keyDeltaX = 0;
  let keyDeltaY = 0;  

  function handleKeyboardInput(event) {
    let keyFactor = 0;
    if(event.type === 'keydown') keyFactor = parent.offsetWidth * maxDiffScale;
    else if (event.type === 'keyup') keyFactor = 0;
    else return;

    switch (event.key) {
      case 'w':
      case 'i':
          keyDeltaY = -keyFactor; // 'w' key moves up along the y-axis
          break;
      case 'a':
      case 'j':
          keyDeltaX = -keyFactor; // 'a' key moves left along the x-axis
          break;
      case 's':
      case 'k':
          keyDeltaY = keyFactor; // 's' key moves down along the y-axis
          break;
      case 'd':
      case 'l':
          keyDeltaX = keyFactor; // 'd' key moves right along the x-axis
          break;
      default:
        return;
    }
    
    if(keyDeltaX || keyDeltaY) {
      keyControl = true;
    } else {
      keyControl = false;
    }

    dragStart = { x: 0, y: 0 };
    console.log('Axes:', keyDeltaY);
    moveStick(keyDeltaX, keyDeltaY);
  }

  function handleMouseDown(event) {
    dragStart = {
      x: event.clientX,
      y: event.clientY,
    };

  }

  function handleTouchDown(event) {
    event.preventDefault();

    dragStart = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
    };

    currentTouch = event.changedTouches[0];
    return;
  }

  function handleMouseMove(event) {
    if (dragStart === null) return;
    if (keyControl) return;

    moveStick(event.clientX, event.clientY);
  }

  function handleTouchMove(event) {
    event.preventDefault();

    if (dragStart === null) return;
    if (keyControl) return;
 
    var touches = event.changedTouches;
    for (var i = 0; i < touches.length; i++) {
      if (touches[i].identifier === currentTouch.identifier) {
        moveStick(touches[i].clientX, touches[i].clientY);
      }
    }
  }

  function moveStick(deltaX, deltaY){
    const xDiff = deltaX - dragStart.x;
    const yDiff = deltaY - dragStart.y;

    //math to get a circle:
    //const angle = Math.atan2(yDiff, xDiff);
		//const distance = Math.min(parent.offsetWidth * maxDiffScale, Math.hypot(xDiff, yDiff));
		//const xNew = distance * Math.cos(angle);
		//const yNew = distance * Math.sin(angle);

    //square math
		const xNew = Math.sign(xDiff) * Math.min(parent.offsetWidth * maxDiffScale, Math.sign(xDiff) * xDiff);
		const yNew = Math.sign(yDiff) * Math.min(parent.offsetWidth * maxDiffScale, Math.sign(yDiff) * yDiff);

    stick.style.transform = `translate3d(${xNew}px, ${yNew}px, 0px)`;
    currentPos = { x: xNew, y: yNew };    
  }

  function handleMouseUp(event) {
    if (dragStart === null) return;
    stick.style.transform = `translate3d(0px, 0px, 0px)`;
    dragStart = null;
    currentPos = { x: 0, y: 0 };
  }

  function handleTouchUp(event) {
    event.preventDefault();

    if (dragStart === null) return;
  
    var touches = event.changedTouches;
    for (var i = 0; i < touches.length; i++) {
      if (touches[i].identifier == currentTouch.identifier) {
        stick.style.transform = `translate3d(0px, 0px, 0px)`;
        dragStart = null;
        currentTouch = null;
        currentPos = { x: 0, y: 0 };
      }
    }
  }
  

  parent.appendChild(stick);

  function getScaledPos(){
    const xScaled = currentPos.x / (parent.offsetWidth * maxDiffScale);
    const yScaled = currentPos.y / (parent.offsetWidth * maxDiffScale);
    return { x: xScaled, y: yScaled };
  }

  return {
    getPosition: getScaledPos,
  };
}

function createButtonAgent() {
  var buttonStates = [0,0,0,0];

  const buttons = [
    document.getElementById('button-0'),
    document.getElementById('button-1'),
    document.getElementById('button-2'),
    document.getElementById('button-3'),
  ];

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].onmousedown = handleButton.bind(null, i, true);
    buttons[i].ontouchstart = handleButton.bind(null, i, true);
    buttons[i].onclick = handleButton.bind(null, i, false);
    buttons[i].ontouchend = handleButton.bind(null, i, false);
  }
  document.addEventListener('keydown', handleKeyboardInput);
  document.addEventListener('keyup', handleKeyboardInput);

  function handleKeyboardInput(event) {
    let keyFactor = 0;
    if(event.type === 'keydown') keyFactor = 1;
    else if (event.type === 'keyup') keyFactor = 0;
    else return;

    switch (event.key) {
      case 'z':
      case 'n':
        handleButton(0, keyFactor);
        break;
      case 'x':
      case 'm':
        handleButton(1, keyFactor);
        break;
      case 'c':
      case ',':
        handleButton(2, keyFactor);
        break;
      case 'v':
      case '.':
        handleButton(3, keyFactor);
        break;
    }
  }

  function handleButton(buttonNumber, buttonState) {
    if(buttonState){
      buttonStates[buttonNumber] = 1;
      buttons[buttonNumber].style.backgroundColor = '#4dae50';
    }
    else {
      buttonStates[buttonNumber] = 0;
      buttons[buttonNumber].style.backgroundColor = 'grey';
    }
  }

  return {
    states: buttonStates,
  };
}

function createBleAgent(parent) {
  const SERVICE_UUID_PESTOBLE = '27df26c5-83f4-4964-bae0-d7b7cb0a1f54';
  const CHARACTERISTIC_UUID_GAMEPAD = '452af57e-ad27-422c-88ae-76805ea641a9';
  
  parent.onclick = changeBleState;
  parent.ontouchend = changeBleState;

  function displayBleStatus(status) { 
    parent.innerHTML = status;
    switch(status) {
      case 'Connecting':
        parent.style.backgroundColor = 'grey';
        break;
      case 'Connected':
        parent.style.backgroundColor = '#4dae50';
        break;
      case 'Disconnecting':
        parent.style.backgroundColor = 'grey';
        break;
      case 'Not Connected':
        parent.style.backgroundColor = 'grey';
        break;
      default:
        parent.style.backgroundColor = '#eb5b5b';
    }
  }
  
  let device;
  let server;
  let service;
  let characteristic_gamepad;
  let isConnectedBLE = false;

  async function changeBleState() {
    if(!isConnectedBLE) connectBLE();
    else disconnectBLE();
  }
 
  async function connectBLE() { 
    displayBleStatus('Connecting');
    // try {
    //   let available = await navigator.bluetooth.getAvailability();
    //   console.log(available);
   
    // } catch (error) {
    //   displayBleStatus("Error");
    //   console.error('Error:', error);      
    // }

    try {
        //let filters = [];
        //filters.push({services: [SERVICE_UUID_PESTOBLE]});
        //let options = { filters }

        //device = await navigator.bluetooth.requestDevice(options);
        //device = await navigator.bluetooth.requestDevice({optionalServices: [SERVICE_UUID_PESTOBLE], acceptAllDevices: true});
        device = await navigator.bluetooth.requestDevice({filters: [{services: [SERVICE_UUID_PESTOBLE]}]});
        server = await device.gatt.connect();
        service = await server.getPrimaryService(SERVICE_UUID_PESTOBLE);
        characteristic_gamepad = await service.getCharacteristic(CHARACTERISTIC_UUID_GAMEPAD);

        displayBleStatus('Connected');
        isConnectedBLE = true;

    } catch (error) {
        displayBleStatus("Error");
        console.error('Error:', error);
      }
  }

  async function disconnectBLE() { 
    displayBleStatus('Disconnecting');
    try {
        await device.gatt.disconnect();

        displayBleStatus('Not Connected');
        isConnectedBLE = false;
    
    } catch (error) {
        displayBleStatus("Error");
        console.error('Error:', error);
      }
  }

  async function sendPacketBLE(byteArray) {
    if(!isConnectedBLE) return;

    try {
      await characteristic_gamepad.writeValueWithoutResponse(new Uint8Array(byteArray));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return {
    send: sendPacketBLE,
  };
}


document.addEventListener("DOMContentLoaded", () => {
  window.setInterval(renderLoop, 40); // call renderLoop every num milliseconds
});

let rawPacket = new Uint8Array(8);
function renderLoop() {
  if (joystick.getPosition().y == 0) rawPacket[0] = 127; else rawPacket[0] = Math.round((joystick.getPosition().y + 1) * (255 / 2));
  if (joystick.getPosition().x == 0) rawPacket[1] = 127; else rawPacket[1] = Math.round((joystick.getPosition().x + 1) * (255 / 2));

  var buttonValGamepad = 0;
  for (let i = 0; i < buttonAgent.states.length; i++) {
    if(buttonAgent.states[i]) buttonValGamepad |= (1 << i);
  }

  rawPacket[4] = buttonValGamepad;
  debugInfo.innerHTML = rawPacket;
  bleAgent.send(rawPacket);
}