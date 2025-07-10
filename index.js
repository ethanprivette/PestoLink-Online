let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

let bleAgent = createBleAgent();
let keyboardAgent = createKeyboardAgent();
let axisAgent = createMobileAxisAgent();
let buttonAgent = createMobileButtonAgent();
let gamepadAgent = createGamepadAgent();

let axisCallback = null
let buttonCallback = null

let mobileElements = document.getElementsByClassName("mobile-only");
let desktopElements = document.getElementsByClassName("desktop-only");

let helpRow = document.getElementsByClassName("help-row");

let terminalElement = document.getElementById("terminal-container");
let hackSpacerElement = document.getElementById("hack-spacer");

let toggleMobile = document.getElementById('toggle-mobile-layout');
let toggleKeyboardWASD = document.getElementById('toggle-keyboard-style');
let toggleTerminal = document.getElementById('toggle-terminal');

let autoEvents = [];

let currentEvent = null;

let flywheelSpinup = null;
let shooterTimeout = null;

let currentTime;
let lastPressed = null;
let startTime = 0;
let timestamp = 0;
let hPressed = false;
let redAlliance = false;
let autotime = false;
let loadedPath;

let robotPosition;

let linearKP;
let linearKI;
let linearKD;
let linearPrevError;
let linearIntegral;
let linearLastTime

let rotationKP;
let rotationKI;
let rotationKD;
let rotationPrevError;
let rotationIntegral;
let rotationLastTime

let subwooferShootButton = null;
let intakeButton = null;
let indexButton = null;

// --------------------------- state management ------------------------------------ //

if (localStorage.getItem(toggleMobile.id) == null) {
    if (isMobile) {
        localStorage.setItem(toggleMobile.id, 'true');
    } else {
        localStorage.setItem(toggleMobile.id, 'false');
    }
    updateMobileSlider(toggleMobile, false);
}

if (isMobile) for (let element of helpRow) element.style.display = "none";

document.addEventListener('DOMContentLoaded', function () {
    updateMobileSlider(toggleMobile, toggleState = false);
    updateSlider(toggleKeyboardWASD, toggleState = false);
    updateTerminalSlider(toggleTerminal, toggleState = false);

    toggleMobile.onmousedown = updateMobileSlider.bind(null, toggleMobile, toggleState = true)
    toggleKeyboardWASD.onmousedown = updateSlider.bind(null, toggleKeyboardWASD, toggleState = true)
    toggleTerminal.onmousedown = updateTerminalSlider.bind(null, toggleTerminal, toggleState = true)

    toggleMobile.ontouchstart = updateMobileSlider.bind(null, toggleMobile, toggleState = true)
    toggleKeyboardWASD.ontouchstart = updateSlider.bind(null, toggleKeyboardWASD, toggleState = true)
    toggleTerminal.ontouchstart = updateTerminalSlider.bind(null, toggleTerminal, toggleState = true)

    window.setInterval(renderLoop, 100); // call renderLoop every num milliseconds
});

function updateMobileSlider(sliderElement, toggleState) {
    updateSlider(sliderElement, toggleState);

    if (localStorage.getItem(toggleMobile.id) === 'true') {
        for (let element of desktopElements) element.style.display = "none";
        for (let element of mobileElements) element.style.display = "grid";
        axisCallback = axisAgent.getAxes
        buttonCallback = buttonAgent.getButtons
    } else {
        for (let element of mobileElements) element.style.display = "none";
        for (let element of desktopElements) element.style.display = "grid";
        axisCallback = gamepadAgent.getAxes
        buttonCallback = gamepadAgent.getButtons
    }
}

function updateTerminalSlider(sliderElement, toggleState) {
    updateSlider(sliderElement, toggleState);

    if (localStorage.getItem(toggleTerminal.id) === 'true') {
        terminalElement.style.display = "grid";
        hackSpacerElement.style.display = "none";
    } else {
        terminalElement.style.display = "none";
        hackSpacerElement.style.display = "grid";
    }
}

function updateSlider(sliderElement, toggleState) {
    if (toggleState) {
        if (localStorage.getItem(sliderElement.id) === 'true') {
            localStorage.setItem(sliderElement.id, 'false');
        } else {
            localStorage.setItem(sliderElement.id, 'true');
        }
    }

    if (localStorage.getItem(sliderElement.id) === 'true') {
        sliderElement.style.backgroundColor = 'var(--alf-green)';
        sliderElement.firstElementChild.style.transform = 'translateX(2vw)';
        sliderElement.firstElementChild.style.webkitTransform = 'translateX(2vw)';
        sliderElement.firstElementChild.style.msTransform = 'translateX(2vw)';

    } else {
        sliderElement.style.backgroundColor = 'rgb(189, 188, 188)';
        sliderElement.firstElementChild.style.transform = 'none';
        sliderElement.firstElementChild.style.webkitTransform = 'none';
        sliderElement.firstElementChild.style.msTransform = 'none';
    }
}

// ----------------------------------------- main --------------------------------------- //

function renderLoop() {
    //bytes 0: packet version
    //bytes 1-4: axes
    //bytes 5-6: button states
    //bytes 7-17: pressed keyboard keys
    let rawPacket = new Uint8Array(1 + 4 + 2 + 11)

    rawPacket[0] = 0x01; //packet version

    rawPacket[1] = axisCallback().axis0
    rawPacket[2] = axisCallback().axis1
    rawPacket[3] = axisCallback().axis2
    rawPacket[4] = axisCallback().axis3

    rawPacket[5] = buttonCallback().byte0
    rawPacket[6] = buttonCallback().byte1

    keyboardArray = keyboardAgent.getKeyboardArray()

    for (let i = 0; i < 12; i++) {
        if (keyboardArray.length > i) {
            rawPacket[7 + i] = keyboardArray[i];
        } else {
            rawPacket[7 + i] = 0;
        }
    }

    function clampUint8(value) { return Math.max(0, Math.min(value, 255)) }

    if (localStorage.getItem(toggleKeyboardWASD.id) === 'true') {
        for (let key of keyboardArray) {
            // WASD for axis 0 and 1
            if (key === keyToNum["KeyA"]) rawPacket[1] = clampUint8(rawPacket[1] - 128);
            if (key === keyToNum["KeyD"]) rawPacket[1] = clampUint8(rawPacket[1] + 128);
            if (key === keyToNum["KeyW"]) rawPacket[2] = clampUint8(rawPacket[2] - 128);
            if (key === keyToNum["KeyS"]) rawPacket[2] = clampUint8(rawPacket[2] + 128);

            // IJKL for axis 2 and 3
            if (key === keyToNum["KeyJ"]) rawPacket[3] = clampUint8(rawPacket[3] - 128);
            if (key === keyToNum["KeyL"]) rawPacket[3] = clampUint8(rawPacket[3] + 128);
            if (key === keyToNum["KeyI"]) rawPacket[4] = clampUint8(rawPacket[4] - 128);
            if (key === keyToNum["KeyK"]) rawPacket[4] = clampUint8(rawPacket[4] + 128);

            // override buttons
            if (key === keyToNum["KeyZ"]) rawPacket[5] |= (1 << 0);
            if (key === keyToNum["KeyX"]) rawPacket[5] |= (1 << 1);
            if (key === keyToNum["KeyC"]) rawPacket[5] |= (1 << 2);
            if (key === keyToNum["KeyV"]) rawPacket[5] |= (1 << 3);
            if (key === keyToNum["KeyB"]) rawPacket[5] |= (1 << 4);
            if (key === keyToNum["KeyN"]) rawPacket[5] |= (1 << 5);
            if (key === keyToNum["KeyM"]) rawPacket[5] |= (1 << 6);
            if (key === keyToNum["Comma"]) rawPacket[5] |= (1 << 7);
        }
    }

    for (let key of keyboardArray) {
        if (key === keyToNum["KeyH"]) {
            hPressed = true;
        }
    }

    if (hPressed) {
        if (Date.now() > startTime + 15000) {
            startTime = Date.now();
        }

        currentTime = Date.now();
        timestamp = (currentTime - startTime) / 1000;

        if (timestamp >= 15) {
            hPressed = false;
        } else {
            hPressed = true;
        }

        let currentIndex = 0;

        let { desiredThrottle, desiredRot, nextIndex } = getControlFromWaypoints(currentIndex);

        currentIndex = nextIndex;

        console.log("Desired: " + desiredThrottle + " " + desiredRot + " " + currentIndex);

        let throttleOutput = calculateLinearPID(desiredThrottle, clamp((128 - rawPacket[2]) / 127, -1, 1));
        let rotationOutput = calculateRotationPID(desiredRot, robotRot);

        // console.log(robotX + " " + robotY + " " + robotRot);

        // console.log("Throttle: ", + throttleOutput);
        // console.log("Rotation: ", + rotationOutput);

        // for (let event of autoEvents) {
        //     if (event.start <= timestamp && event.end > timestamp) {
        //         currentEvent = event;
        //         console.log(currentEvent);
        //         break;
        //     } else {
        //         currentEvent = null;
        //     }
        // }

        // if (currentEvent != null) {
        //     if (currentEvent.type == "namedCommand") {
        //         if (currentEvent.commandName == "shoot") {
        //             if (subwooferShootButton < 8) {
        //                 rawPacket[5] |= (1 << subwooferShootButton);
        //             } else if (subwooferShootButton > 8 && intakeButton < 16) {
        //                 rawPacket[6] |= (1 << subwooferShootButton);
        //             }

        //             if (timestamp >= currentEvent.end - shooterTimeout) {
        //                 if (indexButton < 8) {
        //                     rawPacket[5] |= (1 << indexButton);
        //                 } else if (indexButton > 8 && indexButton < 16) {
        //                     rawPacket[6] |= (1 << indexButton);
        //                 }
        //             }
        //         } else if (currentEvent.commandName == "intake") {
        //             if (intakeButton < 8) {
        //                 rawPacket[5] |= (1 << intakeButton);
        //             } else if (intakeButton > 8 && intakeButton < 16) {
        //                 rawPacket[6] |= (1 << intakeButton)
        //             }
        //         }
        //         // console.log("E", rawPacket[5])
        //         // console.log(rawPacket[6])
        //     } else {
        //         console.error("erm what the sigma, but for events");
        //     }
        // }
    }

    if (!document.hasFocus()) {
        rawPacket.fill(0, 0, 20);
        rawPacket[0] = 1;
        rawPacket[1] = 127;
        rawPacket[2] = 127;
        rawPacket[3] = 127;
        rawPacket[4] = 127;
    }

    // console.log(rawPacket)
    bleAgent.attemptSend(rawPacket);
}

// -------------------------------------------- bluetooth --------------------------------------- //

function createBleAgent() {
    let buttonBLE = document.getElementById('ble-button')
    let statusBLE = document.getElementById('ble-status')
    let telemetryDisplay = document.getElementById('telemetry')
    let terminalLog = document.getElementById("terminal-log");
    let terminalClearButton = document.getElementById("terminal-clear-button");
    let terminalLockButton = document.getElementById("terminal-lock-button");

    let pathDisplay = document.getElementById('path-selector')
    let allianceSelector = document.getElementById('alliance-selector')

    const SERVICE_UUID_PESTOBLE = '27df26c5-83f4-4964-bae0-d7b7cb0a1f54';
    const CHARACTERISTIC_UUID_GAMEPAD = '452af57e-ad27-422c-88ae-76805ea641a9';
    const CHARACTERISTIC_UUID_TELEMETRY = '266d9d74-3e10-4fcd-88d2-cb63b5324d0c';
    const CHARACTERISTIC_UUID_TERMINAL = '433ec275-a494-40ab-98c2-4785a19bf830';

    if (isMobile) {
        buttonBLE.ontouchend = updateBLE;
        terminalClearButton.ontouchend = clearTerminal;
        terminalLockButton.ontouchend = toggleTerminalLock;
        pathDisplay.ontouchend = updatePath;
        allianceSelector.ontouchend = updateAlliance;
    } else {
        buttonBLE.onclick = updateBLE;
        terminalClearButton.onclick = clearTerminal;
        terminalLockButton.onclick = toggleTerminalLock;
        pathDisplay.onclick = updatePath;
        allianceSelector.onclick = updateAlliance;
    }

    function displayBleStatus(status, color) {
        statusBLE.innerHTML = status;
        console.log(status)
        statusBLE.style.backgroundColor = color;
    }

    function displayPathName(name, color) {
        pathDisplay.innerHTML = name;
        console.log(name)
        pathDisplay.style.backgroundColor = color;
    }

    function displayAllianceColor(color) {
        allianceSelector.style.backgroundColor = color;
    }

    let device = null;
    let server;
    let service;
    let characteristic_gamepad;
    let characteristic_telemetry;
    let characteristic_terminal;

    let isConnectedBLE = false;
    let bleUpdateInProgress = false;
    let pathUpdateInProgress = false;
    let pathSelected = false;
    let settingsConfirmed = false;

    let maxSpeed = 0.0;
    let maxAccel = 0.0;
    let maxAngleSpeed = 0.0;
    let maxAngleAccel = 0.0;

    async function updateBLE() {
        if (bleUpdateInProgress) return
        bleUpdateInProgress = true;
        if (!isConnectedBLE) connectBLE();
        else disconnectBLE();
        bleUpdateInProgress = false;
    }

    async function updatePath() {
        if (pathUpdateInProgress) return
        pathUpdateInProgress = true;
        if (!settingsConfirmed) chooseFile();
        else if (settingsConfirmed && !pathSelected) chooseFile();
        else removeFile();
        pathUpdateInProgress = false;
    }

    async function updateAlliance() {
        if (redAlliance) {
            displayAllianceColor('blue');
            redAlliance = false;
        } else if (!redAlliance) {
            displayAllianceColor('red');
            redAlliance = true;
        } else {
            console.error("something went wrong :(");
        }
    }

    async function chooseFile() {
        try {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.path, .json';
            input.onchange = async e => {
                let file = e.target.files[0];

                const content = await readFile(file);
                const fileJson = JSON.parse(content);

                if (!file) {
                    displayPathName('no auto selected', 'grey');
                } else if (file.name == "settings.json") {
                    maxSpeed = fileJson.defaultMaxVel;
                    maxAccel = fileJson.defaultMaxAccel;
                    maxAngleSpeed = fileJson.defaultMaxAngVel;
                    maxAngleAccel = fileJson.defaultMaxAngAccel;

                    encoderTicks = fileJson.encoderTicksPerRev;
                    wheelRadiusIn = fileJson.wheelRadiusInches;
                    wheelBaseIn = fileJson.wheelBaseWidthIn;

                    linearKP = fileJson.linearKP;
                    linearKI = fileJson.linearKI;
                    linearKD = fileJson.linearKI;

                    rotationKP = fileJson.rotationKP;
                    rotationKI = fileJson.rotationKI;
                    rotationKD = fileJson.rotationKD;

                    subwooferShootButton = fileJson.subWooferShoot;
                    intakeButton = fileJson.intakeButton;
                    indexButton = fileJson.indexButton;

                    flywheelSpinup = fileJson.flywheelSpinup;
                    shooterTimeout = fileJson.shooterTimeout;

                    console.log(flywheelSpinup);
                    console.log(shooterTimeout);

                    if (settingsConfirmed) {
                        displayPathName('✔, settings overridden', 'green');
                        settingsConfirmed = true;
                    } else {
                        displayPathName('✔, select path', 'green');
                        settingsConfirmed = true;
                    }
                } else if (!settingsConfirmed && file.name != "settings.json") {
                    displayPathName('Select settings first', 'red');
                } else {
                    try {
                        displayPathName(file.name, 'green');

                        loadedPath = fileJson
                        pathSelected = true;

                        console.log(fileJson)
                        // console.log(fileJson.waypoints[0].anchor.x);
                    } catch (error) {
                        displayPathName('Invalid JSON', 'red');
                        console.error(error);
                    }
                }
            };
            input.click();
        } catch (error) {
            console.log(error)
        }
    }

    async function readFile(file) {
        const reader = new FileReader();

        reader.readAsText(file);

        const content = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
        });

        return content;
    }

    async function removeFile() {
        displayPathName('no auto selected', '');
        pathSelected = false;
    }

    async function calculatePathTime() {
        const numWaypoints = loadedPath.waypoints.length;
        const waypoints = loadedPath.waypoints;
        const eventMarkers = loadedPath.eventMarkers;
        const startAngle = loadedPath.idealStartingState.rotation;
        let currentAngle = 0.0;
        let pathTime = 0.0;
        let commandTime = 0.0;
        let index = 0;
        let markers = [];

        autoIntructions = [];

        for (let i = 0; i < eventMarkers.length; i++) {
            const position = eventMarkers[i].waypointRelativePos;

            namedCommands = eventMarkers[i].command.data.commands;

            for (let y = 0; y < namedCommands.length; y++) {
                let commandName = namedCommands[y].data.name;

                markers.push({
                    type: "namedCommand",
                    position: position,
                    start: null,
                    end: null,
                    commandName: commandName
                });
            }
        }

        for (let i = 1; i < numWaypoints; i++) {
            const start = waypoints[i - 1];
            const end = waypoints[i];

            const dx = end.anchor.x - start.anchor.x;
            const dy = end.anchor.y - start.anchor.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const targetAngle = Math.atan2(dy, dx);

            let turnAngle = targetAngle - currentAngle;

            if (i == 1) {
                currentAngle = startAngle;
            } else {
                currentAngle = targetAngle;
            }

            console.log("ang", targetAngle);
            console.log("other ang", turnAngle);

            if (i - 1 < markers.length) {
                if (markers[i - 1].start == 0 || markers[i - 1].commandName == "shoot") {
                    pathTime += flywheelSpinup;
                }
            }

            let turnDir;
            if (turnAngle > 0) {
                turnDir = "CCW";
            } else if (targetAngle < 0) {
                turnDir = "CW";
            } else if (turnAngle == 0) {
                turnDir = "No Turn";
            } else {
                console.error("something went bad :(");
                break;
            }

            while (turnAngle > Math.PI) turnAngle -= 2 * Math.PI;
            while (turnAngle < -Math.PI) turnAngle += 2 * Math.PI;

            const absTurnAngle = Math.abs(turnAngle);
            const timeToMaxSpeedAngle = maxAngleSpeed / maxAngleAccel;
            const angleToMaxSpeed = 0.5 * maxAngleAccel * Math.pow(timeToMaxSpeedAngle, 2);

            let turnTime;
            if (absTurnAngle <= 2 * angleToMaxSpeed) {
                turnTime = Math.sqrt(2 * absTurnAngle / maxAngleAccel);
            } else {
                const remainingAngle = absTurnAngle - 2 * angleToMaxSpeed;
                const constantSpeedTime = remainingAngle / maxAngleSpeed;
                turnTime = 2 * timeToMaxSpeedAngle + constantSpeedTime;
            }

            pathTime += turnTime;

            if (turnDir != "No Turn") {
                autoIntructions.push({
                    index: index,
                    type: "Turn Time",
                    start: pathTime - turnTime,
                    end: pathTime,
                    direction: turnDir
                });
                index++;
            }

            const timeToMaxSpeed = maxSpeed / maxAccel;
            const distToMaxSpeed = 0.5 * maxAccel * Math.pow(timeToMaxSpeed, 2);

            let segmentTime;
            if (dist <= 2 * distToMaxSpeed) {
                segmentTime = Math.sqrt(2 * dist / maxAccel);
            } else {
                const remainingDist = dist - 2 * distToMaxSpeed;
                const constantSpeedTime = remainingDist / maxSpeed;
                segmentTime = 2 * timeToMaxSpeed + constantSpeedTime;
            }

            pathTime += segmentTime;

            if (segmentTime > 0.05) {
                autoIntructions.push({
                    index: index,
                    type: "Drive Time",
                    start: pathTime - segmentTime,
                    end: pathTime
                });
                index++;
            }
        }
        for (let marker of markers) {
            if (marker.commandName == "shoot") {
                if (marker.position == 0) {
                    autoEvents.push({
                        type: "namedCommand",
                        position: marker.position,
                        start: 0,
                        end: 0 + flywheelSpinup,
                        commandName: marker.commandName
                    });
                } else {
                    autoEvents.push({
                        type: "namedCommand",
                        position: marker.position,
                        start: autoIntructions[marker.position].end,
                        end: autoIntructions[marker.position].end + flywheelSpinup,
                        commandName: marker.commandName
                    });
                }
            }
        }

        console.log(pathTime + commandTime);
        console.log(autoIntructions);
        console.log(autoEvents);
        if (pathTime + commandTime > 15) {
            displayPathName('Will cut at 15 sec', 'orange');
        }
    }

    async function connectBLE() {

        try {
            if (device == null) {
                displayBleStatus('Connecting', 'black');
                device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID_PESTOBLE] }] });
            } else {
                displayBleStatus(`Reconnecting to <br> ${device.name}`, 'black');
            }

            server = await device.gatt.connect();
            service = await server.getPrimaryService(SERVICE_UUID_PESTOBLE);

            characteristic_gamepad = await service.getCharacteristic(CHARACTERISTIC_UUID_GAMEPAD);

            // Try to get and subscribe to telemetry
            try {
                characteristic_telemetry = await service.getCharacteristic(CHARACTERISTIC_UUID_TELEMETRY);
                await characteristic_telemetry.startNotifications();
                characteristic_telemetry.addEventListener('characteristicvaluechanged', handleTelemetryCharacteristic);
            } catch {
                console.log("Telemetry characteristic not available.");
            }

            // Try to get and subscribe to terminal
            try {
                characteristic_terminal = await service.getCharacteristic(CHARACTERISTIC_UUID_TERMINAL);
                await characteristic_terminal.startNotifications();
                characteristic_terminal.addEventListener('characteristicvaluechanged', handleTerminalCharacteristic);
            } catch {
                console.log("Terminal characteristic not available.");
            }

            await device.addEventListener('gattserverdisconnected', robotDisconnect);

            isConnectedBLE = true;
            buttonBLE.innerHTML = '❌';
            displayBleStatus(`Connected to <br> ${device.name}`, '#4dae50'); //green

        } catch (error) {
            if (error.name === 'NotFoundError') {
                displayBleStatus('No Device Selected', '#eb5b5b');
            } else if (error.name === 'SecurityError') {
                displayBleStatus('Security error', '#eb5b5b');
            } else {
                console.log(error);
                displayBleStatus('Connection failed', '#eb5b5b');
                connectBLE();
            }
        }
    }

    function handleTelemetryCharacteristic(event) {
        batteryWatchdogReset();

        const value = event.target.value; // DataView of the characteristic's value

        let asciiString = '';
        for (let i = 0; i < Math.min(8, value.byteLength); i++) {
            asciiString += String.fromCharCode(value.getUint8(i));
        }
        //console.log('Received ASCII string:', asciiString);
        telemetryDisplay.innerHTML = asciiString;

        // Parse the last three bytes as an RGB hex color code
        if (value.byteLength >= 9) {
            const r = value.getUint8(8).toString(16).padStart(2, '0');  // Red
            const g = value.getUint8(9).toString(16).padStart(2, '0');  // Green
            const b = value.getUint8(10).toString(16).padStart(2, '0');  // Blue
            const hexColor = `#${r}${g}${b}`;

            //console.log('Hex color:', hexColor);

            // Set the text shadow color
            telemetryDisplay.style.textShadow = `0 0 2px ${hexColor}, 0 0 2px ${hexColor}, 0 0 2px ${hexColor}, 0 0 2px ${hexColor}`;
        }


        //batteryDisplay.innerHTML = "&#x1F50B;&#xFE0E; " + voltage.toFixed(1) + "V";
    }

    let terminalLocked = false;

    function handleTerminalCharacteristic(event) {

        if (terminalLocked) return;

        const value = event.target.value; // DataView of the characteristic's value

        let controlCharacter = value.getUint8(0);
        let asciiString = '';

        for (let i = 0; i < Math.min(64, value.byteLength - 1); i++) {
            asciiString += String.fromCharCode(value.getUint8(i + 1));
        }

        if (asciiString.substring(0, 2) == "PP") {
            robotPosition = asciiString.substring(3)
            console.log(robotPosition)
        }

        if (controlCharacter == 1) {
            // Get current lines
            const lines = terminalLog.innerHTML.split('<br>').filter(line => line !== '');

            // Add new line
            lines.push(asciiString);

            // Keep only the last 7 lines
            while (lines.length > 7) {
                lines.shift(); // Remove the oldest line
            }

            // Re-render terminal
            terminalLog.innerHTML = lines.join('<br>');
        }

        if (controlCharacter == 2) {
            terminalLog.innerHTML = "";
        }

    }

    function clearTerminal() {
        terminalLog.innerHTML = "";
    }

    function toggleTerminalLock() {
        if (terminalLocked) {
            terminalLocked = false;
            terminalLockButton.innerHTML = "🔓";
        } else {
            terminalLocked = true;
            terminalLockButton.innerHTML = "🔒";
        }
    }

    async function disconnectBLE() {
        displayBleStatus('Disconnecting', 'gray');
        try {
            batteryWatchdogStop();
            await device.removeEventListener('gattserverdisconnected', robotDisconnect);
            await device.gatt.disconnect();

            displayBleStatus('Not Connected', 'black');
            isConnectedBLE = false;
            buttonBLE.innerHTML = '🔗';


        } catch (error) {
            displayBleStatus("Error", '#eb5b5b');
            console.error('Error:', error);
        }
    }

    function robotDisconnect(event) {
        batteryWatchdogStop();
        displayBleStatus('Not Connected', 'black');
        isConnectedBLE = false;
        connectBLE();
    }

    async function sendPacketBLE(byteArray) {
        if (!isConnectedBLE) return;

        try {
            await characteristic_gamepad.writeValueWithoutResponse(new Uint8Array(byteArray));
        } catch (error) {
            console.error('Error:', error);
        }
    }

    let timer;
    const timeout = 1000; // 400ms
    // Function to start or reset the watchdog timer
    function batteryWatchdogReset() {
        displayBleStatus('Connected', '#4dae50'); //green
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => {
            displayBleStatus('timeout?', 'black');
        }, timeout);
    }
    // Function to stop the watchdog timer
    function batteryWatchdogStop() {
        batteryWatchdogReset()
        if (timer) { clearTimeout(timer); timer = null; }
    }

    return {
        attemptSend: sendPacketBLE
    };
}

// -------------------------------------------- mobile --------------------------------------- //

function createMobileAxisAgent() {
    let parent = document.getElementById('joystick-container');
    const maxDiffScale = 0.5;
    const stick = document.createElement('div');
    stick.classList.add('joystick');

    stick.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    stick.addEventListener('touchstart', handleTouchDown, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchUp, { passive: false });

    stick.style.transition = '0s';

    let dragStart = null;
    let currentTouch = null;
    let currentPos = { x: 0, y: 0 };

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

        moveStick(event.clientX, event.clientY);
    }

    function handleTouchMove(event) {
        event.preventDefault();

        if (dragStart === null) return;

        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            if (touches[i].identifier === currentTouch.identifier) {
                moveStick(touches[i].clientX, touches[i].clientY);
            }
        }
    }

    function moveStick(deltaX, deltaY) {
        const xDiff = deltaX - dragStart.x;
        const yDiff = deltaY - dragStart.y;
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

    function getScaledPos() {
        let yScaled = 127
        if (currentPos.y != 0) yScaled = Math.round((currentPos.y / (parent.offsetWidth * maxDiffScale) + 1) * (255 / 2));

        let xScaled = 127
        if (currentPos.x != 0) xScaled = Math.round((currentPos.x / (parent.offsetWidth * maxDiffScale) + 1) * (255 / 2));

        return { axis0: xScaled, axis1: yScaled, axis2: 127, axis3: 127 };
    }

    return {
        getAxes: getScaledPos
    };
}

function createMobileButtonAgent() {
    var buttonStates = [0, 0, 0, 0];

    const buttons = [
        document.getElementById('button-0'),
        document.getElementById('button-1'),
        document.getElementById('button-2'),
        document.getElementById('button-3')
    ];

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].onmousedown = handleButton.bind(null, i, true);
        buttons[i].ontouchstart = handleButton.bind(null, i, true);
        buttons[i].onclick = handleButton.bind(null, i, false);
        buttons[i].ontouchend = handleButton.bind(null, i, false);
    }

    function handleButton(buttonNumber, buttonState) {
        if (buttonState) {
            buttonStates[buttonNumber] = 1;
            buttons[buttonNumber].style.backgroundColor = '#4dae50';
        }
        else {
            buttonStates[buttonNumber] = 0;
            buttons[buttonNumber].style.backgroundColor = 'grey';
        }
    }

    function getButtonBytes() {
        var buttonValMobile = 0;
        for (let i = 0; i < buttonStates.length; i++) {
            if (buttonStates[i]) buttonValMobile |= (1 << i)
        }

        return { byte0: buttonValMobile, byte1: 0 }
    }

    return {
        getButtons: getButtonBytes
    }
}

// -------------------------------------------- desktop --------------------------------------- //

function createGamepadAgent() {

    function getFirstGamepad() {
        let rawGamepads = navigator.getGamepads();
        let gamepadsArray = Array.from(rawGamepads).filter(gamepad => gamepad);

        //console.log(" ");
        //console.log("raw gamepads from webAPI:");
        //console.log(rawGamepads);
        //console.log("filtered gamepad list:");
        //console.log(gamepadsArray);

        return gamepadsArray.find(gamepad => gamepad.index == 0);
    }

    var axisValueElements = document.querySelectorAll('[id^="axisValue"]');
    var barElements = document.querySelectorAll('[id^="bar"]');
    var buttonElements = document.querySelectorAll('[id^="buttonDesktop"]');

    function convertUnitFloatToByte(unitFloat) {
        let byte = 127
        if (unitFloat != 0) byte = Math.round((unitFloat + 1) * (255 / 2));
        return byte
    }

    let axisArray = []
    function getGamepadAxes() {
        let gamepad = getFirstGamepad();
        if (gamepad) {
            //console.log(gamepad);
            //console.log(gamepad.axes);
            for (let i = 0; i < 4; i++) {
                let axisValGamepad = convertUnitFloatToByte(gamepad.axes[i])
                axisValueElements[i].textContent = axisValGamepad
                let percentage = Math.round((gamepad.axes[i] + 1) * (100 / 2))
                barElements[i].style.background = `linear-gradient(to right, var(--alf-green) ${percentage}%, grey 0%)`;
                axisArray[i] = axisValGamepad
            }
        } else {
            axisArray = [127, 127, 127, 127]
        }

        return { axis0: axisArray[0], axis1: axisArray[1], axis2: axisArray[2], axis3: axisArray[3] };
    }

    function getButtonBytes() {
        const gamepad = getFirstGamepad();
        let buttonStates = 0; // Single integer to hold all 16 button states

        if (gamepad) {
            const buttonCount = Math.min(gamepad.buttons.length, 16); // Limit to 16 buttons

            for (let i = 0; i < buttonCount; i++) {
                const button = gamepad.buttons[i];
                if (button && button.pressed) {
                    buttonStates |= (1 << i); // Set the corresponding bit if the button is pressed
                }

                // Update button visuals if DOM element exists
                if (buttonElements[i]) {
                    const newColor = button && button.pressed ? 'var(--alf-green)' : 'grey';
                    if (buttonElements[i].style.background !== newColor) {
                        buttonElements[i].style.background = newColor;
                    }
                }
            }
        }

        // Separate the 16-bit integer into two bytes
        const firstByte = buttonStates & 0xFF;        // Lower 8 bits
        const secondByte = (buttonStates >> 8) & 0xFF; // Upper 8 bits

        return { byte0: firstByte, byte1: secondByte };
    }

    return {
        getAxes: getGamepadAxes,
        getButtons: getButtonBytes
    }
}

function ticksToDistance(ticks) {
    const revolutions = ticks / encoderTicks;
    return revolutions * 2 * Math.PI * wheelRadiusIn;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getControlFromWaypoints(currentIndex) {
    const positionArray = robotPosition.split(" ");
    const waypoints = loadedPath.waypoints;

    if (currentIndex >= waypoints.length) return { throttle: 0, rotation: 0, nextIndex: currentIndex };

    const targetPoint = waypoints[currentIndex];

    const dx = targetPoint.anchor.x - positionArray[0];
    const dy = targetPoint.anchor.y - positionArray[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    let nextIndex = currentIndex;
    if (dist < 0.25 && currentIndex < waypoints.length - 1) {
        nextIndex++;
    }

    const targetAngle = Math.atan2(dy, dx);
    let angleError = targetAngle - positionArray[2];
    angleError = Math.atan2(Math.sin(angleError), Math.cos(angleError)); // normalize

    // Generate control signals
    let rotation = angleError / Math.PI; // normalized [-1, 1]
    let throttle = dist * Math.cos(angleError); // scale throttle toward target

    // Clamp
    throttle = clamp(throttle, -1, 1);
    rotation = clamp(rotation, -1, 1);

    return { throttle, rotation, nextIndex };
}

function calculateLinearPID(setpoint, actual, currentTime = Date.now()) {
    const error = setpoint - actual;

    const dt = linearLastTime ? (currentTime - linearLastTime) / 1000 : 0;
    linearLastTime = currentTime;

    linearIntegral += error * dt;
    const derivative = dt > 0 ? (error - linearPrevError) / dt : 0;

    const output = (linearKP * error) + (linearKI * linearIntegral) + (linearKP * derivative);

    linearPrevError = error;
    return output;
}

function calculateRotationPID(setpoint, actual, currentTime = Date.now()) {
    const error = setpoint - actual;

    const dt = rotationLastTime ? (currentTime - rotationLastTime) / 1000 : 0;
    rotationLastTime = currentTime;

    rotationIntegral += error * dt;
    const derivative = dt > 0 ? (error - rotationPrevError) / dt : 0;

    const output = (rotationKP * error) + (rotationKI * rotationIntegral) + (rotationKP * derivative);

    rotationPrevError = error;
    return output;
}

// -------------------------------------------- keyboard --------------------------------------- //

function createKeyboardAgent() {

    document.addEventListener('keydown', handleKeyboardInput);
    document.addEventListener('keyup', handleKeyboardInput);

    function handleKeyboardInput(event) {
        if (event.repeat != true) {
            keyEventQueue.push(event);
        }
    }

    var keyEventQueue = [];
    var keyboardState = [];

    function getNumKeyboardState() {
        let keyEventsForThisFrame = [];

        for (let keyEvent of keyEventQueue) {
            var keyAlreadyUsed = false
            for (let usedEvent of keyEventsForThisFrame) {
                if (keyEvent.key == usedEvent.key) {
                    keyAlreadyUsed = true
                }
            }

            if (!keyAlreadyUsed) keyEventsForThisFrame.push(keyEvent);
        }

        for (let event of keyEventsForThisFrame) {
            if (event.type === 'keydown') {
                keyboardState.push(event.code);
            }

            if (event.type === 'keyup') {
                //do it twice just for good luck ;)
                let indexOfKeyToRemove = keyboardState.indexOf(event.code);
                if (indexOfKeyToRemove !== -1) keyboardState.splice(indexOfKeyToRemove, 1)
                indexOfKeyToRemove = keyboardState.indexOf(event.code);
                if (indexOfKeyToRemove !== -1) keyboardState.splice(indexOfKeyToRemove, 1)
            }

            let indexOfKeyEventToRemove = keyEventQueue.indexOf(event);
            if (indexOfKeyEventToRemove !== -1) {
                keyEventQueue.splice(indexOfKeyEventToRemove, 1);
            }
        }

        //for (let keyEvent of keyEventsForThisFrame) console.log(keyEvent.key + " " + keyEvent.type );
        //console.log(keyboardState)

        let numState = []
        for (let key of keyboardState) {
            numState.push(keyToNum[key]);
        }

        return numState
        //console.log(numState)
    }

    return {
        getKeyboardArray: getNumKeyboardState
    }
}

const keyToNum = {
    // Alphanumeric
    Backquote: 0,
    Backslash: 1,
    BracketLeft: 2,
    BracketRight: 3,
    Comma: 4,
    Digit0: 5,
    Digit1: 6,
    Digit2: 7,
    Digit3: 8,
    Digit4: 9,
    Digit5: 10,
    Digit6: 11,
    Digit7: 12,
    Digit8: 13,
    Digit9: 14,
    Equal: 15,
    IntlBackslash: 16,
    IntlRo: 17,
    IntlYen: 18,
    KeyA: 19,
    KeyB: 20,
    KeyC: 21,
    KeyD: 22,
    KeyE: 23,
    KeyF: 24,
    KeyG: 25,
    KeyH: 26,
    KeyI: 27,
    KeyJ: 28,
    KeyK: 29,
    KeyL: 30,
    KeyM: 31,
    KeyN: 32,
    KeyO: 33,
    KeyP: 34,
    KeyQ: 35,
    KeyR: 36,
    KeyS: 37,
    KeyT: 38,
    KeyU: 39,
    KeyV: 40,
    KeyW: 41,
    KeyX: 42,
    KeyY: 43,
    KeyZ: 44,
    Minus: 45,
    Period: 46,
    Quote: 47,
    Semicolon: 48,
    Slash: 49,

    // Functional
    AltLeft: 50,
    AltRight: 51,
    Backspace: 52,
    CapsLock: 53,
    ContextMenu: 54,
    ControlLeft: 55,
    ControlRight: 56,
    Enter: 57,
    MetaLeft: 58,
    MetaRight: 59,
    ShiftLeft: 60,
    ShiftRight: 61,
    Space: 62,
    Tab: 63,

    // Control Pad
    Delete: 64,
    End: 65,
    Help: 66,
    Home: 67,
    Insert: 68,
    PageDown: 69,
    PageUp: 70,
    ArrowDown: 71,
    ArrowLeft: 72,
    ArrowRight: 73,
    ArrowUp: 74,

    // Numpad
    NumLock: 75,
    Numpad0: 76,
    Numpad1: 77,
    Numpad2: 78,
    Numpad3: 79,
    Numpad4: 80,
    Numpad5: 81,
    Numpad6: 82,
    Numpad7: 83,
    Numpad8: 84,
    Numpad9: 85,
    NumpadAdd: 86,
    NumpadBackspace: 87,
    NumpadClear: 88,
    NumpadClearEntry: 89,
    NumpadComma: 90,
    NumpadDecimal: 91,
    NumpadDivide: 92,
    NumpadEnter: 93,
    NumpadEqual: 94,
    NumpadHash: 95,
    NumpadMemoryAdd: 96,
    NumpadMemoryClear: 97,
    NumpadMemoryRecall: 98,
    NumpadMemoryStore: 99,
    NumpadMemorySubtract: 100,
    NumpadMultiply: 101,
    NumpadParenLeft: 102,
    NumpadParenRight: 103,
    NumpadStar: 104,
    NumpadSubtract: 105,
};