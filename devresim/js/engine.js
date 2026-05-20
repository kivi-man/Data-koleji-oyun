/**
 * VoltSim Simulation Engine
 * Handles circuit state and connectivity
 */

class SimulationEngine {
    constructor() {
        this.components = [];
        this.wires = [];
        this.isRunning = false;
    }

    addComponent(comp) {
        this.components.push(comp);
    }

    addWire(points) {
        const wire = {
            id: Math.random().toString(36).substr(2, 9),
            points: points
        };
        this.wires.push(wire);

        // Update pin states based on start and end points
        const start = points[0];
        const end = points[points.length - 1];

        if (start.pin) {
            const comp = this.components.find(c => c.id === start.pin.compId);
            if (comp) {
                const pin = comp.pins.find(p => p.id === start.pin.pinId);
                if (pin) pin.connectedTo = wire.id;
            }
        }

        if (end.pin) {
            const comp = this.components.find(c => c.id === end.pin.compId);
            if (comp) {
                const pin = comp.pins.find(p => p.id === end.pin.pinId);
                if (pin) pin.connectedTo = wire.id;
            }
        }
    }

    clear() {
        this.components = [];
        this.wires = [];
    }

    stop() {
        this.isRunning = false;
        // Stop all Arduino runners
        this.components.forEach(comp => {
            if (comp.type === 'arduino_nano' && comp.runner) {
                comp.runner.stop();
                comp.runner = null;
            }
        });
    }

    step() {
        if (!this.isRunning) {
            this.components.forEach(c => {
                if (c.type === 'led') c.isOn = false;
                if (c.type === 'transistor') c.isActivated = false;
            });
            return;
        }

        // --- PASS 0: Update Arduino Logic ---
        this.components.filter(c => c.type === 'arduino_nano').forEach(comp => {
            if (!comp.runner) {
                comp.runner = new ArduinoInterpreter(comp);
                comp.runner.run();
            }
        });

        // --- PASS 1: Find positive potential to activate transistors AND Arduinos ---
        const initialPositive = this.getReachablePins('battery', 0, null, true);

        // Add Arduino 5V and HIGH Output pins as sources
        this.components.filter(c => c.type === 'arduino_nano').forEach(ard => {
            // 5V Pin is at Right Index 3 (Global Index 18)
            const pin5V = this.getReachablePins(null, null, ard.id + '_18', true);
            pin5V.forEach(p => initialPositive.add(p));

            // Digital Outputs HIGH
            if (ard.runner) {
                Object.entries(ard.pinState).forEach(([pinKey, state]) => {
                    if (state === 1 && ard.runner.pinModes[pinKey] === 'OUTPUT') {
                        // Map standard Arduino pin numbers to component labels
                        let labelToFind = pinKey;
                        const pk = parseInt(pinKey);
                        if (pk >= 0 && pk <= 13) labelToFind = 'D' + pk;
                        else if (pk >= 14 && pk <= 21) labelToFind = 'A' + (pk - 14);

                        const pinIdx = ard.pins.findIndex(p => p.label === labelToFind);
                        if (pinIdx !== -1) {
                            const reached = this.getReachablePins(null, null, ard.id + '_' + pinIdx, true);
                            reached.forEach(p => initialPositive.add(p));
                        }
                    }
                });
            }
        });

        this.components.forEach(comp => {
            if (comp.type === 'transistor') {
                comp.isActivated = initialPositive.has(`${comp.id}_0`);
            }
        });

        // --- PASS 2: Final Connectivity ---
        const positivePotentialPins = new Set(initialPositive); // Copy initial positive
        const groundPotentialPins = this.getReachablePins('battery', 1, null, false);
        const gndComponents = this.components.filter(c => c.type === 'gnd');
        gndComponents.forEach(g => {
            const gndPins = this.getReachablePins('gnd', 0, g.id, false);
            gndPins.forEach(p => groundPotentialPins.add(p));
        });

        // Add Arduino GND and LOW Output pins as grounds
        this.components.filter(c => c.type === 'arduino_nano').forEach(ard => {
            // GND Pins: Left Index 3 (Global 3), Right Index 1 (Global 16)
            [3, 16].forEach(gndIdx => {
                const gnd = this.getReachablePins(null, null, ard.id + '_' + gndIdx, false);
                gnd.forEach(p => groundPotentialPins.add(p));
            });

            if (ard.runner) {
                Object.entries(ard.pinState).forEach(([pinKey, state]) => {
                    if (state === 0 && ard.runner.pinModes[pinKey] === 'OUTPUT') {
                        // Map standard Arduino pin numbers to component labels
                        let labelToFind = pinKey;
                        const pk = parseInt(pinKey);
                        if (pk >= 0 && pk <= 13) labelToFind = 'D' + pk;
                        else if (pk >= 14 && pk <= 21) labelToFind = 'A' + (pk - 14);

                        const pinIdx = ard.pins.findIndex(p => p.label === labelToFind);
                        if (pinIdx !== -1) {
                            const reached = this.getReachablePins(null, null, ard.id + '_' + pinIdx, false);
                            reached.forEach(p => groundPotentialPins.add(p));
                        }
                    }
                });
            }
        });

        this.components.forEach(comp => {
            if (comp.type === 'relay') {
                const coilAPos = positivePotentialPins.has(`${comp.id}_0`);
                const coilAGnd = groundPotentialPins.has(`${comp.id}_0`);
                const coilBPos = positivePotentialPins.has(`${comp.id}_1`);
                const coilBGnd = groundPotentialPins.has(`${comp.id}_1`);
                // Activated if potential difference exists across coil
                comp.isActivated = (coilAPos && coilBGnd) || (coilAGnd && coilBPos);
            }
        });

        // 3. Update component states
        this.components.forEach(comp => {
            if (comp.type === 'led') {
                // LED is on if anode (pin 0) has positive potential and cathode (pin 1) has ground potential
                const anodeId = `${comp.id}_0`;
                const cathodeId = `${comp.id}_1`;
                comp.isOn = positivePotentialPins.has(anodeId) && groundPotentialPins.has(cathodeId);
            }
        });
    }

    getReachablePins(startType, startPinIndex, specificCompId = null, isPositive = true) {
        const reachableNodes = new Set(); // Set of "x,y" strings
        const reachablePins = new Set(); // Set of "compId_pinIdx" strings
        const queue = []; // Queue of "x,y" strings

        const getPinKey = (cId, pIdOrIdx) => {
            // Normalize: always use numeric index for consistent keys
            if (typeof pIdOrIdx === 'number') return `${cId}_${pIdOrIdx}`;
            // If it's a parseable integer string like '0', '1', use as-is
            const parsed = parseInt(pIdOrIdx);
            if (!isNaN(parsed) && String(parsed) === String(pIdOrIdx)) return `${cId}_${parsed}`;
            // String ID like 'L0', 'R3' — find its array index
            const comp = this.components.find(c => c.id === cId);
            if (comp) {
                const idx = comp.pins.findIndex(p => p.id === pIdOrIdx);
                if (idx !== -1) return `${cId}_${idx}`;
            }
            return `${cId}_${pIdOrIdx}`; // Fallback
        };
        const getCoordKey = (x, y) => `${Math.round(x)},${Math.round(y)}`;

        // Helper to get global position of a pin
        const getPinPos = (compId, pinIdOrIdx) => {
            const comp = this.components.find(c => c.id === compId);
            if (!comp) return null;
            // Support both numeric index and string pin ID (e.g. 'L0', 'R3')
            const pin = typeof pinIdOrIdx === 'number'
                ? comp.pins[pinIdOrIdx]
                : comp.pins.find(p => p.id === pinIdOrIdx) || comp.pins[parseInt(pinIdOrIdx)];
            if (!pin) return null;
            const cos = Math.cos(comp.rotation);
            const sin = Math.sin(comp.rotation);
            return {
                x: comp.x + (pin.x * cos - pin.y * sin),
                y: comp.y + (pin.x * sin + pin.y * cos)
            };
        };

        // 1. Initialize starting points
        const starters = specificCompId
            ? specificCompId.lastIndexOf('_') > 0
                ? (() => { // Handle "compId_pinIdx" format
                    const sep = specificCompId.lastIndexOf('_');
                    return this.components.filter(c => c.id === specificCompId.substring(0, sep));
                })()
                : this.components.filter(c => c.id === specificCompId)
            : this.components.filter(c => c.type === startType);

        // If specific pin requested, override start index
        let overridePinIdx = -1;
        if (specificCompId && specificCompId.lastIndexOf('_') > 0) {
            const sep = specificCompId.lastIndexOf('_');
            overridePinIdx = parseInt(specificCompId.substring(sep + 1));
        }

        starters.forEach(comp => {
            const idx = overridePinIdx !== -1 ? overridePinIdx : startPinIndex;
            const pos = getPinPos(comp.id, idx);
            if (pos) {
                const cKey = getCoordKey(pos.x, pos.y);
                const pKey = getPinKey(comp.id, idx);
                if (!reachableNodes.has(cKey)) {
                    reachableNodes.add(cKey);
                    queue.push(cKey);
                }
                reachablePins.add(pKey);
            }
        });

        // 2. BFS Traversal
        while (queue.length > 0) {
            const currentCoordKey = queue.shift();

            // A. Traverse through Wires
            this.wires.forEach(wire => {
                let wireTouches = false;
                wire.points.forEach(p => {
                    let px, py;
                    if (p.pin) {
                        const pos = getPinPos(p.pin.compId, p.pin.pinId);
                        if (pos) { px = pos.x; py = pos.y; }
                    } else {
                        px = p.x; py = p.y;
                    }
                    if (px !== undefined && getCoordKey(px, py) === currentCoordKey) wireTouches = true;
                });

                if (wireTouches) {
                    wire.points.forEach(p => {
                        let px, py;
                        if (p.pin) {
                            const pos = getPinPos(p.pin.compId, p.pin.pinId);
                            if (pos) {
                                px = pos.x; py = pos.y;
                                reachablePins.add(getPinKey(p.pin.compId, p.pin.pinId));
                            }
                        } else {
                            px = p.x; py = p.y;
                        }

                        if (px !== undefined) {
                            const cKey = getCoordKey(px, py);
                            if (!reachableNodes.has(cKey)) {
                                reachableNodes.add(cKey);
                                queue.push(cKey);
                            }
                        }
                    });
                }
            });

            // B. Traverse through Components (Conductivity)
            this.components.forEach(comp => {
                let connectedPinIdx = -1;
                comp.pins.forEach((p, idx) => {
                    const pos = getPinPos(comp.id, idx);
                    if (pos && getCoordKey(pos.x, pos.y) === currentCoordKey) {
                        connectedPinIdx = idx;
                    }
                });

                if (connectedPinIdx !== -1) {
                    let canPass = false;
                    let targetPins = [];

                    if (comp.type === 'relay') {
                        // Relay switch logic: COM (2), NO (3), NC (4)
                        if (comp.isActivated) {
                            if (connectedPinIdx === 2) targetPins = [3];
                            else if (connectedPinIdx === 3) targetPins = [2];
                        } else {
                            if (connectedPinIdx === 2) targetPins = [4];
                            else if (connectedPinIdx === 4) targetPins = [2];
                        }
                        if (targetPins.length > 0) canPass = true;
                    } else if (comp.type === 'resistor') {
                        canPass = true;
                        targetPins = comp.pins.map((_, i) => i);
                    } else if (comp.type === 'switch' && comp.value === 1) {
                        canPass = true;
                        targetPins = comp.pins.map((_, i) => i);
                    } else if (comp.type === 'led') {
                        // Diode Logic: Positive flows 0 -> 1, Negative flows 1 -> 0
                        if (isPositive && connectedPinIdx === 0) {
                            canPass = true;
                            targetPins = [1];
                        } else if (!isPositive && connectedPinIdx === 1) {
                            canPass = true;
                            targetPins = [0];
                        }
                    } else if (comp.type === 'transistor') {
                        // B=0, C=1, E=2
                        // 1. C-E path (only if activated)
                        if (comp.isActivated && (connectedPinIdx === 1 || connectedPinIdx === 2)) {
                            canPass = true;
                            targetPins = [1, 2];
                        }
                        // 2. B-E diode path (Positive flows B->E, Negative flows E->B)
                        if (isPositive && connectedPinIdx === 0) {
                            canPass = true;
                            targetPins = [...targetPins, 2];
                        } else if (!isPositive && connectedPinIdx === 2) {
                            canPass = true;
                            targetPins = [...targetPins, 0];
                        }
                    }

                    if (canPass) {
                        targetPins.forEach(idx => {
                            const pKey = getPinKey(comp.id, idx);
                            if (!reachablePins.has(pKey)) {
                                reachablePins.add(pKey);
                                const pos = getPinPos(comp.id, idx);
                                if (pos) {
                                    const cKey = getCoordKey(pos.x, pos.y);
                                    if (!reachableNodes.has(cKey)) {
                                        reachableNodes.add(cKey);
                                        queue.push(cKey);
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }

        return reachablePins;
    }

    saveState() {
        return JSON.stringify({
            components: this.components.map(c => c.toJSON()),
            wires: this.wires
        });
    }

    loadState(json) {
        const data = JSON.parse(json);
        this.components = data.components.map(c => Component.fromJSON(c));
        this.wires = data.wires;

        // Restore pin connectivity
        this.wires.forEach(wire => {
            const start = wire.points[0];
            const end = wire.points[wire.points.length - 1];

            if (start.pin) {
                const comp = this.components.find(c => c.id === start.pin.compId);
                if (comp) {
                    const pin = comp.pins.find(p => p.id === start.pin.pinId);
                    if (pin) pin.connectedTo = wire.id;
                }
            }

            if (end.pin) {
                const comp = this.components.find(c => c.id === end.pin.compId);
                if (comp) {
                    const pin = comp.pins.find(p => p.id === end.pin.pinId);
                    if (pin) pin.connectedTo = wire.id;
                }
            }
        });
    }
    stop() {
        this.isRunning = false;
        this.components.forEach(c => {
            if (c.runner) c.runner.stop();
            c.runner = null;
        });
    }
}

class ArduinoInterpreter {
    constructor(component) {
        this.comp = component;
        this.pinModes = {}; // 'INPUT', 'OUTPUT'
        this.isRunning = false;
        this.shouldStop = false;
        this.logs = [];
    }

    log(msg) {
        this.comp.serialBuffer.push(msg);
        if (this.comp.serialBuffer.length > 50) this.comp.serialBuffer.shift();
        // Also dispatch event for UI if needed
        const event = new CustomEvent('arduino-serial', { detail: { id: this.comp.id, msg: msg } });
        window.dispatchEvent(event);
    }

    stop() {
        this.shouldStop = true;
        this.isRunning = false;
    }

    async run() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.shouldStop = false;

        // Reset state
        this.comp.pinState = {};
        this.pinModes = {};

        // Transpile Code
        const userCode = this.comp.code;
        const jsCode = this.transpile(userCode);

        // Safe execution context
        const context = {
            pinMode: (pin, mode) => {
                this.pinModes[pin] = mode; // 'OUTPUT' or 'INPUT' defined as string or constant variable
            },
            digitalWrite: (pin, val) => {
                this.comp.pinState[pin] = val === 'HIGH' || val === 1 ? 1 : 0;
            },
            digitalRead: (pin) => {
                // Determine if pin is receiving voltage
                // This is tricky because the engine calculates potentials in 'step()'
                // But this runs async. We need access to the LAST calculated potential states.
                // For simplified simulation, we'll implement a 'read' method on the engine later or assume 0 for now.
                return 0;
            },
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            delayMicroseconds: (us) => new Promise(resolve => setTimeout(resolve, Math.max(1, us / 1000))),
            millis: () => performance.now() | 0,
            micros: () => (performance.now() * 1000) | 0,
            analogWrite: (pin, val) => {
                // PWM: val 0-255, treat >= 128 as HIGH for digital simulation
                this.comp.pinState[pin] = val >= 128 ? 1 : 0;
            },
            analogRead: (pin) => {
                return 0; // Placeholder — no analog voltage simulation yet
            },
            Serial: {
                begin: (rate) => this.log(`Serial started at ${rate}`),
                println: (msg) => this.log(msg + '\n'),
                print: (msg) => this.log(msg)
            },
            OUTPUT: 'OUTPUT',
            INPUT: 'INPUT',
            HIGH: 1,
            LOW: 0,
            A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, A6: 20, A7: 21,
            D0: 0, D1: 1, D2: 2, D3: 3, D4: 4, D5: 5, D6: 6, D7: 7,
            D8: 8, D9: 9, D10: 10, D11: 11, D12: 12, D13: 13
        };

        try {
            // Function constructor to create isolated scope
            const runFunc = new Function('ctx', `
                return (async () => {
                    with(ctx) {
                        ${jsCode}
                        
                        // Internal Runner
                        if(typeof setup === 'function') await setup();
                        while(!ctx.shouldStop()) {
                            if(typeof loop === 'function') await loop();
                            await new Promise(r => setTimeout(r, 10)); // Prevent freeze
                        }
                    }
                })()
            `);

            context.shouldStop = () => this.shouldStop;

            await runFunc(context);
        } catch (e) {
            this.log(`Error: ${e.message}`);
        }
        this.isRunning = false;
    }

    transpile(cppCode) {
        // Very basic C++ to JS regex transpiler
        let code = cppCode;

        // 1. Types — compound types MUST come before simple ones
        code = code.replace(/void\s+setup/g, 'async function setup');
        code = code.replace(/void\s+loop/g, 'async function loop');
        code = code.replace(/unsigned\s+long\s+/g, 'let ');
        code = code.replace(/unsigned\s+int\s+/g, 'let ');
        code = code.replace(/int\s+/g, 'let ');
        code = code.replace(/float\s+/g, 'let ');
        code = code.replace(/double\s+/g, 'let ');
        code = code.replace(/long\s+/g, 'let ');
        code = code.replace(/boolean\s+/g, 'let ');
        code = code.replace(/bool\s+/g, 'let ');
        code = code.replace(/byte\s+/g, 'let ');
        code = code.replace(/char\s+/g, 'let ');
        code = code.replace(/String\s+/g, 'let ');
        code = code.replace(/const\s+/g, 'const ');

        // 2. Asyncify delay — delayMicroseconds MUST come first
        code = code.replace(/delayMicroseconds\s*\(/g, 'await delayMicroseconds(');
        code = code.replace(/(?<!await )delay\s*\(/g, 'await delay(');

        // 3. Serial
        // Handled by context object

        return code;
    }
}
