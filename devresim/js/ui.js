/**
 * VoltSim UI and Interaction
 * Handles canvas events and user input
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('circuit-canvas');
    const ctx = canvas.getContext('2d');
    const engine = new SimulationEngine();
    const propPanel = document.getElementById('properties-panel');
    const propInput = document.getElementById('prop-value');
    const propColor = document.getElementById('prop-color');

    // Arduino UI Elements
    const codeModal = document.getElementById('code-modal');
    const codeEditor = document.getElementById('arduino-code-editor');
    const btnUpload = document.getElementById('btn-upload-code');
    const btnCloseCode = document.getElementById('btn-close-code');
    const uploadStatus = document.getElementById('upload-status');

    const serialMonitor = document.getElementById('serial-monitor');
    const serialOutput = document.getElementById('serial-output');
    const btnClearSerial = document.getElementById('btn-clear-serial');
    const btnCloseSerial = document.getElementById('btn-close-serial');

    let selectedComponent = null;
    let isDragging = false;
    let dragTarget = null;
    let dragOffset = { x: 0, y: 0 };
    let currentWirePoints = null; // Array of points [{x, y, pin?}]
    let currentMousePos = { x: 0, y: 0 }; // Screen coordinates

    // View state
    let zoom = 1.0;
    let viewOffsetX = 0;
    let viewOffsetY = 0;

    // Resize canvas
    function resize() {
        if (!canvas.parentElement) return;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Coordinate Transformation: Screen to Canvas World
    function toWorld(screenX, screenY) {
        return {
            x: (screenX - viewOffsetX) / zoom,
            y: (screenY - viewOffsetY) / zoom
        };
    }

    function getGridPos(x, y) {
        return {
            x: Math.round(x / 20) * 20,
            y: Math.round(y / 20) * 20
        };
    }

    function getGlobalPinPos(comp, pin) {
        const cos = Math.cos(comp.rotation);
        const sin = Math.sin(comp.rotation);
        return {
            x: comp.x + (pin.x * cos - pin.y * sin),
            y: comp.y + (pin.x * sin + pin.y * cos)
        };
    }

    // Drawing Loop
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(viewOffsetX, viewOffsetY);
        ctx.scale(zoom, zoom);

        // Draw Grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
        ctx.lineWidth = 1 / zoom;
        const spacing = 20;

        // Calculate visible grid range
        const topLeft = toWorld(0, 0);
        const bottomRight = toWorld(canvas.width, canvas.height);

        const startX = Math.floor(topLeft.x / spacing) * spacing;
        const endX = Math.ceil(bottomRight.x / spacing) * spacing;
        const startY = Math.floor(topLeft.y / spacing) * spacing;
        const endY = Math.ceil(bottomRight.y / spacing) * spacing;

        for (let x = startX; x <= endX; x += spacing) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += spacing) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }

        // Draw Wires
        engine.wires.forEach(w => {
            ctx.beginPath();
            w.points.forEach((p, i) => {
                let pos = p;
                if (p.pin) {
                    const comp = engine.components.find(c => c.id === p.pin.compId);
                    if (comp) {
                        const pin = comp.pins.find(pn => pn.id === p.pin.pinId);
                        pos = getGlobalPinPos(comp, pin);
                    }
                }
                if (i === 0) ctx.moveTo(pos.x, pos.y);
                else ctx.lineTo(pos.x, pos.y);
            });
            ctx.strokeStyle = engine.isRunning ? '#38bdf8' : '#64748b';
            ctx.lineWidth = 3 / zoom;
            ctx.stroke();

            if (engine.isRunning) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        });

        // Draw Dragging Wire
        if (currentWirePoints) {
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([5 / zoom, 5 / zoom]);

            currentWirePoints.forEach((p, i) => {
                let pos = p;
                if (p.pin) {
                    const comp = engine.components.find(c => c.id === p.pin.compId);
                    const pin = comp.pins.find(pn => pn.id === p.pin.pinId);
                    pos = getGlobalPinPos(comp, pin);
                }
                if (i === 0) ctx.moveTo(pos.x, pos.y);
                else ctx.lineTo(pos.x, pos.y);
            });

            // Preview segment to mouse
            const lastPoint = currentWirePoints[currentWirePoints.length - 1];
            let lastPos = lastPoint;
            if (lastPoint.pin) {
                const comp = engine.components.find(c => c.id === lastPoint.pin.compId);
                const pin = comp.pins.find(pn => pn.id === lastPoint.pin.pinId);
                lastPos = getGlobalPinPos(comp, pin);
            }

            ctx.moveTo(lastPos.x, lastPos.y);
            // Snap mouse to grid for preview
            const mouseWorld = toWorld(currentMousePos.x, currentMousePos.y);
            const snapMouse = getGridPos(mouseWorld.x, mouseWorld.y);
            ctx.lineTo(snapMouse.x, snapMouse.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Components
        engine.components.forEach(comp => comp.draw(ctx));

        ctx.restore();

        engine.step();
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // Zoom handling
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;

        // Point under mouse before zoom
        const worldBefore = toWorld(mouseX, mouseY);

        const zoomSpeed = 0.1;
        if (e.deltaY < 0) zoom *= (1 + zoomSpeed);
        else zoom *= (1 - zoomSpeed);

        // Clamp zoom
        zoom = Math.max(0.2, Math.min(5, zoom));

        // Adjust offset so worldBefore is still under mouse after zoom
        viewOffsetX = mouseX - worldBefore.x * zoom;
        viewOffsetY = mouseY - worldBefore.y * zoom;
    });

    // Mouse Events
    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = toWorld(mouseX, mouseY);
        const gridPos = getGridPos(worldPos.x, worldPos.y);

        if (e.button === 2) { // Right click to finish wire
            if (engine.isRunning) return; // Prevent editing
            if (currentWirePoints && currentWirePoints.length >= 2) {
                pushHistory();
                engine.addWire(currentWirePoints);
            }
            currentWirePoints = null;
            return;
        }

        // 1. Check for pins
        let foundPin = null;
        for (const comp of engine.components) {
            const pin = comp.getPinAt(worldPos.x, worldPos.y);
            if (pin) {
                if (engine.isRunning) return; // Prevent wiring during simulation
                foundPin = { compId: comp.id, pinId: pin.id };
                const pinPos = getGlobalPinPos(comp, pin);
                if (!currentWirePoints) {
                    currentWirePoints = [{ ...pinPos, pin: foundPin }];
                } else {
                    pushHistory();
                    currentWirePoints.push({ ...pinPos, pin: foundPin });
                    engine.addWire(currentWirePoints);
                    currentWirePoints = null;
                }
                return;
            }
        }

        // 2. If already wiring, allow grid points (structural edit)
        if (currentWirePoints) {
            if (engine.isRunning) return;
            currentWirePoints.push(gridPos);
            return;
        }

        // 3. Component selection/dragging
        for (let i = engine.components.length - 1; i >= 0; i--) {
            const comp = engine.components[i];
            if (comp.isPointInside(worldPos.x, worldPos.y)) {
                // Allow selection even when running to view properties, but only drag if stopped
                engine.components.forEach(c => c.selected = false);
                comp.selected = true;
                selectedComponent = comp;
                showProperties(comp);

                if (!engine.isRunning) {
                    pushHistory();
                    dragTarget = comp;
                    dragOffset.x = worldPos.x - comp.x;
                    dragOffset.y = worldPos.y - comp.y;
                    isDragging = true;
                }
                return;
            }
        }

        // Clicking empty space cancels selection
        engine.components.forEach(c => c.selected = false);
        selectedComponent = null;
        propPanel.classList.add('hidden');
    });

    // Prevent context menu to allow right-click finish
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        currentMousePos.x = e.clientX - rect.left;
        currentMousePos.y = e.clientY - rect.top;

        const worldPos = toWorld(currentMousePos.x, currentMousePos.y);

        if (isDragging && dragTarget && !engine.isRunning) {
            dragTarget.x = worldPos.x - dragOffset.x;
            dragTarget.y = worldPos.y - dragOffset.y;

            const snapped = getGridPos(dragTarget.x, dragTarget.y);
            dragTarget.x = snapped.x;
            dragTarget.y = snapped.y;
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        dragTarget = null;
    });

    canvas.addEventListener('dblclick', e => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = toWorld(mouseX, mouseY);

        for (const comp of engine.components) {
            if (comp.isPointInside(worldPos.x, worldPos.y)) {
                if (comp.type === 'switch') {
                    // Interaction: Allow toggling switch even during simulation
                    pushHistory();
                    comp.value = comp.value === 0 ? 1 : 0;
                } else if (comp.type === 'arduino_nano') {
                    if (engine.isRunning) return;
                    openCodeEditor(comp);
                } else {
                    // Organization: Prevent rotation during simulation
                    if (engine.isRunning) return;
                    pushHistory();
                    comp.rotation += Math.PI / 2;
                }
                return;
            }
        }
    });

    // Drag and Drop from Toolbox
    const tools = document.querySelectorAll('.tool-item');
    tools.forEach(tool => {
        tool.addEventListener('dragstart', e => {
            if (engine.isRunning) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('type', tool.dataset.type);
        });
    });

    canvas.addEventListener('dragover', e => e.preventDefault());
    canvas.addEventListener('drop', e => {
        if (engine.isRunning) return;
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = toWorld(mouseX, mouseY);

        pushHistory();
        const comp = new Component(type, Math.round(worldPos.x / 20) * 20, Math.round(worldPos.y / 20) * 20);
        engine.addComponent(comp);
    });

    // History for Undo
    const historyStack = [];
    function pushHistory() {
        historyStack.push(engine.saveState());
    }

    function undo() {
        if (engine.isRunning) return; // Prevent structural undo during simulation
        if (historyStack.length > 0) {
            const prevState = historyStack.pop();
            engine.loadState(prevState);
            selectedComponent = null;
            propPanel.classList.add('hidden');
        }
    }

    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
    });

    // UI Controls
    document.getElementById('btn-run').onclick = () => {
        engine.isRunning = true;
        document.getElementById('btn-run').classList.add('success');
        propPanel.querySelector('#btn-delete-comp').disabled = true;
        propPanel.classList.add('readonly');
        if (engine.components.some(c => c.type === 'arduino_nano')) {
            serialMonitor.classList.remove('hidden');
        }
    };

    document.getElementById('btn-stop').onclick = () => {
        engine.stop();
        document.getElementById('btn-run').classList.remove('success');
        propPanel.querySelector('#btn-delete-comp').disabled = false;
        propPanel.classList.remove('readonly');
    };

    document.getElementById('btn-clear').onclick = () => {
        if (engine.isRunning) return;
        pushHistory();
        engine.stop();
        engine.clear();
        propPanel.classList.add('hidden');
        serialMonitor.classList.add('hidden');
    };

    function showProperties(comp) {
        // 1. Hide entire panel for specific component types
        if (comp.type === 'switch' || comp.type === 'gnd' || comp.type === 'arduino_nano') {
            propPanel.classList.add('hidden');
            return;
        }

        propPanel.classList.remove('hidden');
        const valRow = document.getElementById('prop-row-value');
        const colorRow = document.getElementById('prop-row-color');

        // 2. Control Value Row Visibility (Hide for Transistor)
        if (comp.type === 'transistor') {
            valRow.classList.add('hidden');
        } else {
            valRow.classList.remove('hidden');
            propInput.value = comp.value;
            document.getElementById('prop-unit').textContent = comp.unit;
            propInput.disabled = engine.isRunning;
        }

        // 3. Control Color Row Visibility (Show ONLY for LED)
        if (comp.type === 'led') {
            colorRow.classList.remove('hidden');
            propColor.value = comp.color;
            propColor.disabled = engine.isRunning;
        } else {
            colorRow.classList.add('hidden');
        }
    }

    propInput.addEventListener('change', () => {
        if (selectedComponent && !engine.isRunning) {
            pushHistory();
            selectedComponent.value = parseFloat(propInput.value);
        }
    });

    propColor.addEventListener('change', () => {
        if (selectedComponent && selectedComponent.type === 'led' && !engine.isRunning) {
            pushHistory();
            selectedComponent.color = propColor.value;
        }
    });

    document.getElementById('btn-delete-comp').onclick = () => {
        if (selectedComponent && !engine.isRunning) {
            pushHistory();
            engine.components = engine.components.filter(c => c.id !== selectedComponent.id);
            engine.wires = engine.wires.filter(w => {
                const startsAt = w.points[0];
                const endsAt = w.points[w.points.length - 1];
                const isStart = startsAt.pin && startsAt.pin.compId === selectedComponent.id;
                const isEnd = endsAt.pin && endsAt.pin.compId === selectedComponent.id;
                return !isStart && !isEnd;
            });
            selectedComponent = null;
            propPanel.classList.add('hidden');
        }
    };

    // Arduino Modal Logic
    let currentEditingComp = null;

    function openCodeEditor(comp) {
        currentEditingComp = comp;
        codeEditor.value = comp.code || '';
        codeModal.classList.remove('hidden');
        uploadStatus.textContent = '';
    }

    function closeCodeEditor() {
        codeModal.classList.add('hidden');
        currentEditingComp = null;
    }

    btnCloseCode.onclick = closeCodeEditor;

    btnUpload.onclick = () => {
        if (currentEditingComp) {
            pushHistory();
            currentEditingComp.code = codeEditor.value;
            uploadStatus.textContent = 'Kod yüklendi!';
            setTimeout(closeCodeEditor, 500);
        }
    };

    // Serial Monitor Logic
    window.addEventListener('arduino-serial', (e) => {
        const { id, msg } = e.detail;
        const line = document.createElement('div');
        line.className = 'serial-line';
        line.textContent = msg; // Text content for safety
        serialOutput.appendChild(line);
        serialOutput.scrollTop = serialOutput.scrollHeight;

        // Ensure serial monitor is visible if data comes in
        if (serialMonitor.classList.contains('hidden')) {
            serialMonitor.classList.remove('hidden');
        }
    });

    btnClearSerial.onclick = () => {
        serialOutput.innerHTML = '<div class="serial-line system">Temizlendi.</div>';
    };

    btnCloseSerial.onclick = () => {
        serialMonitor.classList.add('hidden');
    };

});
