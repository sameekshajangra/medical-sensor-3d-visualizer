# 🫀 Remote Health Monitoring System: 3D Visualization

A professional, interactive 3D WebGL presentation of an ESP32-based medical IoT sensor hub. This application mimics industrial CAD software, providing a deep-dive interactive dashboard for viewing component topologies, multi-layer high-density routing, and physiological telemetry parameters.

## 🚀 Live Demo
**View the Interactive 3D Application Here:**<br>
👉 [**medical-sensor-3d-visualizer**](https://sameekshajangra.github.io/medical-sensor-3d-visualizer/)

> **Note:** For the above link to work, ensure you have enabled **GitHub Pages** in your repository settings. (Go to `Settings` -> `Pages` -> Build and deployment source: `Deploy from a branch` -> Select `main` -> Click `Save`).

## 🧬 Sensor Hardware Modeled
- **ESP32 WROOM**: Central Wireless Processing Hub.
- **MAX30100**: Photoplethysmography (PPG) Pulse Oximeter & SpO2.
- **AD8232**: Single-Lead ECG / Bio-Potential Instrumentation Amplifier.
- **MLX90614**: Non-contact Infrared Thermopile Sensor.
- **MPU6050**: 6-Axis Micro-Electro-Mechanical (MEMS) IMU.

## 🛠 Features
- **Immersive 3D Space**: Fully rotatable WebGL environment built over Three.js with hardware footprint mappings.
- **Intelligent Orthogonal Pathfinding**: All 3.3V, GND, I2C, and Analog traces logically route alongside a custom multi-lane CAD data bus.
- **Interactive Component Modals**: Click on any module to open an overlay explaining the exact physiological metrics it extracts and its core scientific operating principles.
