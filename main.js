import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { gsap } from 'https://unpkg.com/gsap@3.12.2/index.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080a0e');
scene.fog = new THREE.FogExp2('#080a0e', 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 30, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI; 
controls.minDistance = 5;
controls.maxDistance = 100;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 30, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 4096;
dirLight.shadow.mapSize.height = 4096;
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x88ccff, 0.6);
fillLight.position.set(-20, -10, -20);
scene.add(fillLight);

const matPCB = new THREE.MeshStandardMaterial({ color: '#092e12', roughness: 0.6, metalness: 0.4 });
const matRedPCB = new THREE.MeshStandardMaterial({ color: '#590a0a', roughness: 0.7, metalness: 0.3 });
const matBluePCB = new THREE.MeshStandardMaterial({ color: '#09154a', roughness: 0.7, metalness: 0.3 });
const matChip = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9, metalness: 0.2 });
const matPin = new THREE.MeshStandardMaterial({ color: '#ffcc00', roughness: 0.3, metalness: 0.9 });
const matSilver = new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 0.4, metalness: 0.9 });
const matSilkscreen = new THREE.MeshBasicMaterial({ color: '#ffffff' });

const interactables = [];
let loadedFont = null;
const loader = new FontLoader();
const pinPositions = {}; 
const allTraces = [];

function createComponentLabel(group, text, x, y, z) {
    if(!loadedFont) return;
    const textGeo = new TextGeometry(text, { font: loadedFont, size: 0.25, height: 0.01 });
    textGeo.computeBoundingBox();
    const width = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
    const textMesh = new THREE.Mesh(textGeo, matSilkscreen);
    textMesh.rotation.x = -Math.PI/2;
    textMesh.position.set(x - width/2, y, z); 
    group.add(textMesh);
}

function createPinTarget(group, name, label, x, y, z, orientZ = false) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16), matSilver);
    pad.position.set(x, y + 0.05, z);
    group.add(pad);

    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), matPin);
    pin.position.set(x, y + 0.3, z);
    pin.castShadow = true;
    group.add(pin);
    
    pin.updateMatrixWorld();
    const worldPos = new THREE.Vector3();
    pin.getWorldPosition(worldPos);
    pinPositions[name] = worldPos;

    if(loadedFont && label) {
        const textGeo = new TextGeometry(label, { font: loadedFont, size: 0.12, height: 0.01 });
        const textMesh = new THREE.Mesh(textGeo, matSilkscreen);
        if(orientZ) {
            textMesh.rotation.y = -Math.PI/2;
            textMesh.position.set(x - 0.5, y + 0.1, z + 0.4);
        } else {
            textMesh.rotation.y = Math.PI/2;
            textMesh.position.set(x + 0.5, y + 0.1, z - 0.4);
        }
        textMesh.rotation.x = -Math.PI/2;
        group.add(textMesh);
    }
}

function addSMDs(group, count, boardRadius) {
    const smdMat = new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.8, metalness: 0.2 });
    for(let i=0; i<count; i++) {
        const smd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), smdMat);
        smd.position.set((Math.random() - 0.5) * boardRadius, 0.25, (Math.random() - 0.5) * boardRadius);
        smd.rotation.y = Math.random() > 0.5 ? Math.PI/2 : 0;
        group.add(smd);
        
        const endMat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.11), matSilver); 
        endMat.position.x = 0.1; smd.add(endMat);
        const end2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.11), matSilver); 
        end2.position.x = -0.1; smd.add(end2);
    }
}

function buildBoard() {
    const base = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 30), matPCB.clone());
    base.position.y = -0.2;
    base.receiveShadow = true;
    scene.add(base);

    const gridHelper = new THREE.GridHelper(30, 60, '#104a20', '#0a3014');
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Mounting Holes
    const holeGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 16);
    const holeMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    [[-15, -13], [15, -13], [-15, 13], [15, 13]].forEach(pos => {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(pos[0], -0.2, pos[1]);
        scene.add(hole);
    });

    // 2. Realistic ESP32
    const espGroup = new THREE.Group(); espGroup.position.set(-8, 0, 0); scene.add(espGroup);
    const espBoard = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.4, 15), matChip.clone());
    espBoard.position.y = 0.2; espBoard.castShadow = true; espGroup.add(espBoard);
    espBoard.userData = { 
        name: 'ESP32 WROOM PROCESSOR', 
        type: 'Main Controller Unit',
        desc: 'Dual-Core WiFi/BT Processor.<br>Central hub gathering all medical telemetry.',
        measure: 'Acts as the central Processing Hub for the Remote Health Monitoring IoT System.',
        principle: 'A low-power Dual-Core 32-bit System-on-Chip (SoC) running at 240 MHz. It processes all sensor data and leverages built-in Wi-Fi & Bluetooth to transmit complex medical telemetry.'
    };
    interactables.push(espBoard);

    // Antenna & Shield
    const espMetal = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 5.5), matSilver);
    espMetal.position.set(0, 0.5, -4); espGroup.add(espMetal);
    
    // USB Port at bottom
    const usbGeo = new THREE.BoxGeometry(2, 0.3, 1.5);
    const usbPort = new THREE.Mesh(usbGeo, matSilver);
    usbPort.position.set(0, 0.45, 7.5); espGroup.add(usbPort);

    addSMDs(espGroup, 15, 4);
    createComponentLabel(espGroup, 'ESP32 SYSTEM', 0, 0.405, 2);

    // REAL ESP32 Pinout! Antenna faces back (Z is negative). Left side = X=-3.2, Right side = X=+3.2
    const leftPins = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND_L', 'VIN'];
    const rightPins = ['3V3', 'GND_R', 'D15', 'D2', 'D4', 'RX2', 'TX2', 'D5', 'D18', 'D19', 'D21', 'RX0', 'TX0', 'D22', 'D23'];
    
    leftPins.forEach((label, i) => {
        const zPos = -1.5 + (i * 0.55); // Spaced from just below shield to the bottom
        createPinTarget(espGroup, `ESP_${label}`, label, -3.2, 0, zPos, false);
    });
    rightPins.forEach((label, i) => {
        const zPos = -1.5 + (i * 0.55);
        createPinTarget(espGroup, `ESP_${label}`, label, 3.2, 0, zPos, true);
    });

    // We manually map the logical nets to the new realistic physical pins:
    // AD8232 connections: OUTPUT->VP, LO- -> D2, LO+ -> RX0
    // I2C: SDA->D21, SCL->D22. 

    // 3. AD8232 (Heart Rate)
    const adGroup = new THREE.Group(); adGroup.position.set(10, 0, -10); scene.add(adGroup);
    const adBoard = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 5.5), matRedPCB.clone());
    adBoard.position.y = 0.1; adBoard.castShadow = true; adGroup.add(adBoard);
    adBoard.userData = { 
        name: 'AD8232 ECG SENSOR', 
        type: 'Bio-Signal Amplifier',
        desc: 'Single-Lead Heart Rate Monitor.<br>Detects ECG bio-potentials.',
        measure: 'Detects small electrical signals generated by the heart\'s activity via physical electrodes (RA and LA).',
        principle: 'Uses a built-in Instrumentation Amplifier to amplify minute electrical potential differences from the body. The module processes these signals and sends them to the ESP32 as a continuous analog voltage for ADC conversion.'
    };
    interactables.push(adBoard);
    
    const adChip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), matChip); adChip.position.set(1, 0.3, 0); adGroup.add(adChip);
    addSMDs(adGroup, 6, 3);
    createComponentLabel(adGroup, 'AD8232 ECG', 0, 0.205, -1.8); 
    
    createPinTarget(adGroup, 'AD_GND', 'GND', -1.8, 0, -1.5, false);
    createPinTarget(adGroup, 'AD_3V3', '3.3V', -1.8, 0, -0.5, false);
    createPinTarget(adGroup, 'AD_OUT', 'OUTPUT', -1.8, 0, 0.5, false);
    createPinTarget(adGroup, 'AD_LO_MINUS', 'LO-', -1.8, 0, 1.5, false);
    createPinTarget(adGroup, 'AD_LO_PLUS', 'LO+', -1.8, 0, 2.5, false);

    // 4. MAX30100 (Oximeter)
    const maxGroup = new THREE.Group(); maxGroup.position.set(10, 0, -2); scene.add(maxGroup);
    const maxBoard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 4.5), matBluePCB.clone());
    maxBoard.position.y = 0.1; maxBoard.castShadow = true; maxGroup.add(maxBoard);
    maxBoard.userData = { 
        name: 'MAX30100 OXIMETER', 
        type: 'Pulse Ox & Heart Rate',
        desc: 'Integrated Optical Sensor.<br>Measures blood oxygen saturation.',
        measure: 'Calculates Heart Rate (BPM) from light reflection peaks, and calculates SpO2 (Oxygen Saturation) based on light absorption ratios.',
        principle: 'Uses a Red LED (660nm) and Infrared LED (940nm) to shine light through the skin. A photodetector measures the returning light. Because oxygenated blood absorbs more IR light and deoxygenated blood absorbs more Red light, the exact ratio determines SpO2 levels via I2C.'
    };
    interactables.push(maxBoard);
    
    const maxChip = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), matChip); maxChip.position.set(0.5, 0.3, 0); maxGroup.add(maxChip);
    addSMDs(maxGroup, 4, 1.5);
    createComponentLabel(maxGroup, 'MAX30100', 0, 0.205, -1.5);
    
    createPinTarget(maxGroup, 'MAX_VIN', 'VIN', -1.4, 0, -1.5, false);
    createPinTarget(maxGroup, 'MAX_SCL', 'SCL', -1.4, 0, -0.5, false);
    createPinTarget(maxGroup, 'MAX_SDA', 'SDA', -1.4, 0, 0.5, false);
    createPinTarget(maxGroup, 'MAX_INT', 'INT', -1.4, 0, 1.5, false);
    createPinTarget(maxGroup, 'MAX_GND', 'GND', -1.4, 0, 2.5, false); // Rearranged for clarity

    // 5. MLX90614 (Temp)
    const mlxGroup = new THREE.Group(); mlxGroup.position.set(10, 0, 5); scene.add(mlxGroup);
    const mlxBoard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 3.5), matBluePCB.clone());
    mlxBoard.position.y = 0.1; mlxBoard.castShadow = true; mlxGroup.add(mlxBoard);
    mlxBoard.userData = { 
        name: 'MLX90614 TEMP SENSOR', 
        type: 'Infrared Thermometer',
        desc: 'Non-contact body temperature sensing.<br>High accuracy medical grade.',
        measure: 'Continuously and hygienically monitors patient body temperature without requiring direct physical skin contact.',
        principle: 'Features an internal thermopile detector that senses microscopic infrared energy radiating from a body. A built-in signal processing unit converts this raw infrared radiation into an exact temperature value, transmitted over I2C.'
    };
    interactables.push(mlxBoard);
    
    const mlxSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16), matSilver);
    mlxSensor.position.set(0.5, 0.7, -0.5); mlxGroup.add(mlxSensor);
    createComponentLabel(mlxGroup, 'MLX90614', 0, 0.205, 1);
    
    createPinTarget(mlxGroup, 'MLX_VIN', 'VIN', -1.4, 0, -1, false);
    createPinTarget(mlxGroup, 'MLX_GND', 'GND', -1.4, 0, -0.3, false);
    createPinTarget(mlxGroup, 'MLX_SCL', 'SCL', -1.4, 0, 0.4, false);
    createPinTarget(mlxGroup, 'MLX_SDA', 'SDA', -1.4, 0, 1.1, false);

    // 6. MPU6050 (Motion)
    const mpuGroup = new THREE.Group(); mpuGroup.position.set(10, 0, 11); scene.add(mpuGroup);
    const mpuBoard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 5.5), matBluePCB.clone());
    mpuBoard.position.y = 0.1; mpuBoard.castShadow = true; mpuGroup.add(mpuBoard);
    mpuBoard.userData = { 
        name: 'MPU6050 IMU', 
        type: 'Accelerometer & Gyro',
        desc: '6-Axis Motion Tracking.<br>Detects patient movement and falls.',
        measure: 'Monitors patient movement, orientation, and abnormal events like sudden falls using a 6-axis IMU.',
        principle: 'Combines a 3-axis accelerometer (for linear movement/tilt) and a 3-axis gyroscope (for rotational velocity). It continuously tracks specific changes in body position and orientation, and transmits this motion data via I2C.'
    };
    interactables.push(mpuBoard);
    
    const mpuChip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), matChip); mpuChip.position.set(0.5, 0.3, 0); mpuGroup.add(mpuChip);
    addSMDs(mpuGroup, 5, 2);
    createComponentLabel(mpuGroup, 'MPU6050', 0, 0.205, -1.8);

    createPinTarget(mpuGroup, 'MPU_VCC', 'VCC', -1.4, 0, -2, false);
    createPinTarget(mpuGroup, 'MPU_GND', 'GND', -1.4, 0, -1, false);
    createPinTarget(mpuGroup, 'MPU_SCL', 'SCL', -1.4, 0, 0, false);
    createPinTarget(mpuGroup, 'MPU_SDA', 'SDA', -1.4, 0, 1, false);
    createPinTarget(mpuGroup, 'MPU_XDA', 'XDA', -1.4, 0, 1.5, false); 
    createPinTarget(mpuGroup, 'MPU_XCL', 'XCL', -1.4, 0, 2, false); 
    createPinTarget(mpuGroup, 'MPU_ADD', 'ADD', -1.4, 0, 2.5, false); // From Photo
    createPinTarget(mpuGroup, 'MPU_INT', 'INT', -1.4, 0, 3, false);

    scene.updateMatrixWorld(true);
    drawConnections();
}

function drawOrthogonalTrace(pin1Name, pin2Name, hexColor, netClass, yLayer, customSplitX = null, flipZX = false, humanName = null) {
    const p1 = pinPositions[pin1Name];
    const p2 = pinPositions[pin2Name];
    if (!p1 || !p2) return;

    const traceMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.2, metalness: 0.7 });
    const tWidth = (netClass === 'power') ? 0.25 : 0.1;
    const group = new THREE.Group();
    
    group.userData = { 
        netClass: netClass,
        name: humanName || `Trace: ${pin1Name.replace('ESP_','')} ➔ ${pin2Name}`,
        type: `Net Class: ${netClass.toUpperCase()}`,
        desc: netClass === 'power' ? 'Power Supply & Ground Return Path.<br>Delivers Power to module.' :
              netClass === 'i2c' ? 'I2C Serial Data/Clock Bus.<br>Facilitates digital communication.' : 
              'Analog / Digital Signal Line.<br>Transmits vital physiological data.'
    };

    function createRouteSeg(vA, vB) {
        const dist = vA.distanceTo(vB);
        if(dist < 0.01) return;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(tWidth, 0.02, dist), traceMat);
        mesh.position.copy(vA).lerp(vB, 0.5);
        mesh.lookAt(vB); group.add(mesh);
    }

    let start = new THREE.Vector3(p1.x, yLayer, p1.z);
    let end = new THREE.Vector3(p2.x, yLayer, p2.z);

    const viaGeo = new THREE.CylinderGeometry(tWidth/1.5, tWidth/1.5, 0.03, 16);

    if (customSplitX !== null) {
        const pt2 = new THREE.Vector3(customSplitX, yLayer, p1.z);
        const pt3 = new THREE.Vector3(customSplitX, yLayer, p2.z);
        createRouteSeg(start, pt2);
        createRouteSeg(pt2, pt3);
        createRouteSeg(pt3, end);
        [start, pt2, pt3, end].forEach(p => {
            const v = new THREE.Mesh(viaGeo, traceMat); v.position.copy(p); group.add(v);
        });
    } else {
        const midPoint = flipZX ? new THREE.Vector3(end.x, yLayer, start.z) : new THREE.Vector3(start.x, yLayer, end.z);
        createRouteSeg(start, midPoint);
        createRouteSeg(midPoint, end);
        [start, midPoint, end].forEach(p => {
            const v = new THREE.Mesh(viaGeo, traceMat); v.position.copy(p); group.add(v);
        });
    }

    const dropVia = new THREE.CylinderGeometry(0.1, 0.1, Math.abs(p1.y - yLayer), 8);
    const v1 = new THREE.Mesh(dropVia, matSilver); v1.position.set(start.x, (p1.y + yLayer)/2, start.z); group.add(v1);
    const v2 = new THREE.Mesh(dropVia, matSilver); v2.position.set(end.x, (p2.y + yLayer)/2, end.z); group.add(v2);

    scene.add(group);
    allTraces.push(group);
    interactables.push(group); 
}

function drawConnections() {
    // UPDATED CONNECTIONS - Mapped to a clean Parallel Central Bus (customSplitX values 4.0 through 7.0)
    
    // 1. AD8232 (Table: OUTPUT->GPIO34, LO+ -> GPIO32, LO- -> GPIO33)
    drawOrthogonalTrace('ESP_3V3', 'AD_3V3', '#ff3b30', 'power', 0.08, 4.0, false, 'Trace: 3.3V ➔ 3.3V');
    drawOrthogonalTrace('ESP_GND_R', 'AD_GND', '#888888', 'power', 0.06, 4.4, false, 'Trace: GND ➔ GND');
    drawOrthogonalTrace('ESP_D34', 'AD_OUT', '#30d158', 'analog', 0.12, -4.5, false, 'Trace: GPIO34 ➔ OUTPUT'); 
    drawOrthogonalTrace('ESP_D32', 'AD_LO_PLUS', '#30d158', 'analog', 0.14, -4.8, false, 'Trace: GPIO32 ➔ LO+');
    drawOrthogonalTrace('ESP_D33', 'AD_LO_MINUS', '#30d158', 'analog', 0.16, -5.1, false, 'Trace: GPIO33 ➔ LO-');

    // 2. MAX30100 (SDA->D21, SCL->D22, INT->D19)
    drawOrthogonalTrace('ESP_3V3', 'MAX_VIN', '#ff3b30', 'power', 0.08, 4.0, false, 'Trace: 3.3V ➔ VIN');
    drawOrthogonalTrace('ESP_GND_R', 'MAX_GND', '#888888', 'power', 0.06, 4.4, false, 'Trace: GND ➔ GND');
    drawOrthogonalTrace('ESP_D22', 'MAX_SCL', '#0a84ff', 'i2c', 0.10, 4.8, false, 'Trace: GPIO22 ➔ SCL');
    drawOrthogonalTrace('ESP_D21', 'MAX_SDA', '#0a84ff', 'i2c', 0.10, 6.0, false, 'Trace: GPIO21 ➔ SDA');
    drawOrthogonalTrace('ESP_D19', 'MAX_INT', '#30d158', 'analog', 0.18, 6.4, false, 'Trace: GPIO19 ➔ INT');

    // 3. MLX90614
    drawOrthogonalTrace('ESP_3V3', 'MLX_VIN', '#ff3b30', 'power', 0.13, 4.0, false, 'Trace: 3.3V ➔ VIN');
    drawOrthogonalTrace('ESP_GND_R', 'MLX_GND', '#888888', 'power', 0.11, 4.4, false, 'Trace: GND ➔ GND');
    drawOrthogonalTrace('ESP_D22', 'MLX_SCL', '#0a84ff', 'i2c', 0.15, 4.8, false, 'Trace: GPIO22 ➔ SCL');
    drawOrthogonalTrace('ESP_D21', 'MLX_SDA', '#0a84ff', 'i2c', 0.15, 6.0, false, 'Trace: GPIO21 ➔ SDA');

    // 4. MPU6050
    drawOrthogonalTrace('ESP_3V3', 'MPU_VCC', '#ff3b30', 'power', 0.18, 4.0, false, 'Trace: 3.3V ➔ VCC');
    drawOrthogonalTrace('ESP_GND_R', 'MPU_GND', '#888888', 'power', 0.16, 4.4, false, 'Trace: GND ➔ GND');
    drawOrthogonalTrace('ESP_D22', 'MPU_SCL', '#0a84ff', 'i2c', 0.20, 4.8, false, 'Trace: GPIO22 ➔ SCL');
    drawOrthogonalTrace('ESP_D21', 'MPU_SDA', '#0a84ff', 'i2c', 0.20, 6.0, false, 'Trace: GPIO21 ➔ SDA');
    drawOrthogonalTrace('ESP_D18', 'MPU_INT', '#30d158', 'analog', 0.22, 6.8, false, 'Trace: GPIO18 ➔ INT');
}

loader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', function(font) {
    loadedFont = font;
    buildBoard();
});

// Raycaster Logic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

let hoveredObj = null;
const inspector = document.getElementById('inspector-panel');

function toggleHighlight(object, isActive) {
    if(!object) return;
    if(object.userData && object.userData.netClass) {
        object.children.forEach(c => {
            if(c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(isActive ? 0x223344 : 0x000000);
        });
    } else if (object.isMesh) {
        object.material.emissive.setHex(isActive ? 0x112233 : 0x000000);
    }
}

// --- Tech Modal HTML Bindings ---
const techModalOverlay = document.getElementById('tech-modal-overlay');
const techModalCloseBtn = document.getElementById('modal-close-btn');
const modalType = document.getElementById('modal-type');
const modalTitle = document.getElementById('modal-title');
const modalMeasure = document.getElementById('modal-measure');
const modalPrinciple = document.getElementById('modal-principle');

if (techModalCloseBtn) {
    techModalCloseBtn.addEventListener('click', () => {
        techModalOverlay.classList.add('modal-hidden');
    });
}

// --- Raycaster Event Logic ---
window.addEventListener('click', (event) => {
    if(event.target.tagName === 'BUTTON' || !techModalOverlay.classList.contains('modal-hidden')) return;

    // Use current mouse pos logic to intersect
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables, true);
    
    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !object.userData.name) {
            object = object.parent;
        }

        if (object.userData && object.userData.measure && object.userData.principle) {
            modalType.innerText = object.userData.type || 'SYSTEM COMPONENT';
            modalTitle.innerText = object.userData.name || 'UNKNOWN COMPONENT';
            modalMeasure.innerHTML = object.userData.measure;
            modalPrinciple.innerHTML = object.userData.principle;
            techModalOverlay.classList.remove('modal-hidden');
        }
    }
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    if(interactables.length > 0) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
            let targetNode = intersects[0].object;
            while(targetNode && !targetNode.userData.name && targetNode !== scene) {
                targetNode = targetNode.parent;
            }

            if(targetNode && targetNode.userData.name) {
                if (hoveredObj !== targetNode) {
                    toggleHighlight(hoveredObj, false); 
                    hoveredObj = targetNode;
                    toggleHighlight(hoveredObj, true); 
                    
                    document.body.style.cursor = 'pointer';
                    inspector.className = 'status-bar inspector-active';
                    inspector.innerHTML = `<strong>${hoveredObj.userData.name}</strong><br><span style="color:#7f95ac; font-size: 9px;">${hoveredObj.userData.type}</span><div style="margin-top:5px; font-size: 9px; line-height: 1.2; font-weight:normal; color:#fff;">${hoveredObj.userData.desc}</div>`;
                }
            }
        } else {
            if (hoveredObj) {
                toggleHighlight(hoveredObj, false);
                hoveredObj = null;
                document.body.style.cursor = 'default';
                inspector.className = 'status-bar inspector-none';
                inspector.innerHTML = 'HOVER OVER COMPONENT';
            }
        }
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const buttons = ['top', 'bottom', 'left', 'right', 'iso'];
buttons.forEach(id => {
    const btn = document.getElementById('btn-' + id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        buttons.forEach(b => document.getElementById('btn-' + b).classList.remove('active'));
        btn.classList.add('active');
        const pos = {top: [0,45,0], bottom: [0,-45,0], left: [-40,15,0], right: [40,15,0], iso: [20,30,35]}[id];
        gsap.to(camera.position, {x: pos[0], y: pos[1], z: pos[2], duration: 1.5, ease: "power3.inOut", onUpdate: () => controls.update()});
    });
});

['power', 'i2c', 'analog'].forEach(type => {
    const el = document.getElementById('toggle-' + type);
    if(el) el.addEventListener('change', (e) => {
        allTraces.forEach(group => { if(group.userData.netClass === type) group.visible = e.target.checked; });
    });
});
