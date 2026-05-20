/**
 * VoltSim Component System
 * Handles rendering and logic for individual circuit elements
 */

class Component {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.value = this.getDefaultValue(type);
        this.unit = this.getUnit(type);
        this.pins = this.initPins(type);
        this.width = 60;
        this.height = 40;
        this.selected = false;
        this.id = Math.random().toString(36).substr(2, 9);
        this.color = type === 'led' ? '#ef4444' : null;

        // Arduino specific state
        if (type === 'arduino_nano') {
            this.width = 140;
            this.height = 140; // Must cover full PCB drawing (-65 to +65)
            this.code = `void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}`;
            this.pinState = {}; // Stores LOW/HIGH for pins
            this.serialBuffer = [];
            this.lastRunTime = 0;
            this.context = null; // Execution context
        }
    }

    getDefaultValue(type) {
        switch (type) {
            case 'battery': return 9;
            case 'resistor': return 1000;
            case 'led': return 2;
            case 'switch': return 0; // 0 = off, 1 = on
            case 'arduino_nano': return 0;
            case 'relay': return 5; // Activation voltage
            default: return 0;
        }
    }

    getUnit(type) {
        switch (type) {
            case 'battery': return 'V';
            case 'resistor': return 'Ω';
            case 'led': return 'V';
            default: return '';
        }
    }

    initPins(type) {
        // Defines connection points relative to component center
        switch (type) {
            case 'battery':
            case 'resistor':
            case 'led':
            case 'switch':
                return [
                    { id: 0, x: -30, y: 0, connectedTo: null },
                    { id: 1, x: 30, y: 0, connectedTo: null }
                ];
            case 'gnd':
                return [
                    { id: 0, x: 0, y: -20, connectedTo: null }
                ];
            case 'transistor':
                return [
                    { id: 0, x: -30, y: 0, connectedTo: null }, // Base
                    { id: 1, x: 30, y: -20, connectedTo: null }, // Collector
                    { id: 2, x: 30, y: 20, connectedTo: null }   // Emitter
                ];
            case 'arduino_nano':
                // Standard Nano V3 Pinout Simulation
                // Left Side (Top to Bottom): D13, 3V3, REF, A0-A7, 5V, RST, GND, VIN (15 pins)
                // Right Side (Top to Bottom): D12, D11, D10, D9, D8, D7, D6, D5, D4, D3, D2, GND, RST, RX, TX (15 pins)
                // Simplified for simulation utility:
                const pins = [];
                const spacing = 8;
                const startY = -50;

                // Left headers (x: -60)
                const leftLabels = ['TX', 'RX', 'RST', 'GND', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'];
                leftLabels.forEach((label, i) => {
                    pins.push({ id: `L${i}`, label: label, x: -60, y: startY + i * spacing, connectedTo: null, type: 'digital' });
                });

                // Right headers (x: 60)
                const rightLabels = ['VIN', 'GND', 'RST', '5V', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'REF', '3V3', 'D13'];
                rightLabels.forEach((label, i) => {
                    pins.push({ id: `R${i}`, label: label, x: 60, y: startY + i * spacing, connectedTo: null, type: 'analog' });
                });
                return pins;
            case 'relay':
                return [
                    { id: 0, x: -30, y: -20, connectedTo: null, label: 'COILA' },
                    { id: 1, x: -30, y: 20, connectedTo: null, label: 'COILB' },
                    { id: 2, x: 30, y: 0, connectedTo: null, label: 'COM' },
                    { id: 3, x: 30, y: -20, connectedTo: null, label: 'NO' },
                    { id: 4, x: 30, y: 20, connectedTo: null, label: 'NC' }
                ];
            default: return [];
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw selection highlight
        if (this.selected) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(-this.width / 2 - 5, -this.height / 2 - 5, this.width + 10, this.height + 10);
            ctx.setLineDash([]);
        }

        ctx.strokeStyle = '#f1f5f9';
        ctx.fillStyle = '#f1f5f9';
        ctx.lineWidth = 2;

        switch (this.type) {
            case 'battery':
                this.drawBattery(ctx);
                break;
            case 'resistor':
                this.drawResistor(ctx);
                break;
            case 'led':
                this.drawLED(ctx);
                break;
            case 'switch':
                this.drawSwitch(ctx);
                break;
            case 'gnd':
                this.drawGND(ctx);
                break;
            case 'transistor':
                this.drawTransistor(ctx);
                break;
            case 'arduino_nano':
                this.drawArduinoNano(ctx);
                break;
            case 'relay':
                this.drawRelay(ctx);
                break;
        }

        // Draw Pin dots
        this.pins.forEach(pin => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = pin.connectedTo ? '#38bdf8' : '#64748b';
            ctx.fill();
        });

        ctx.restore();
    }

    drawBattery(ctx) {
        ctx.beginPath();
        // Long line (Positive)
        ctx.moveTo(-5, -15); ctx.lineTo(-5, 15);
        // Short line (Negative)
        ctx.moveTo(5, -8); ctx.lineTo(5, 8);
        ctx.stroke();

        ctx.font = '10px Outfit';
        ctx.fillText('+', -15, -10);
        ctx.fillText('-', 10, -10);
        ctx.fillText(`${this.value}V`, -15, 25);
    }

    drawResistor(ctx) {
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-5, 10);
        ctx.lineTo(5, -10);
        ctx.lineTo(15, 10);
        ctx.lineTo(20, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.fillText(`${this.value >= 1000 ? (this.value / 1000).toFixed(1) + 'k' : this.value}Ω`, -15, 25);
    }

    drawLED(ctx) {
        // Draw LED Body
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);

        if (this.isOn) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color.replace(')', ', 0.8)').replace('rgb', 'rgba'); // Fallback logic
            // Safer way to handle it:
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = this.color;
        } else {
            ctx.strokeStyle = '#64748b';
            ctx.stroke();
        }
        ctx.stroke();

        // Draw Diode Symbol (Triangle and Line)
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-8, 8);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fillStyle = this.isOn ? '#ffffff' : '#f1f5f9';
        ctx.fill();

        // Cathode line
        ctx.beginPath();
        ctx.moveTo(8, -8);
        ctx.lineTo(8, 8);
        ctx.strokeStyle = this.isOn ? '#ffffff' : '#f1f5f9';
        ctx.stroke();
    }

    drawSwitch(ctx) {
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-15, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();

        ctx.beginPath();
        if (this.value === 1) { // Closed
            ctx.moveTo(-15, 0); ctx.lineTo(15, 0);
        } else { // Open
            ctx.moveTo(-15, 0); ctx.lineTo(10, -15);
        }
        ctx.stroke();
    }

    drawGND(ctx) {
        ctx.beginPath();
        ctx.moveTo(-15, -5); ctx.lineTo(15, -5);
        ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
        ctx.moveTo(-5, 5); ctx.lineTo(5, 5);
        ctx.stroke();
    }

    drawTransistor(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();

        // Base line
        ctx.beginPath();
        ctx.moveTo(-15, -15);
        ctx.lineTo(-15, 15);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 2;

        // Base connection
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-15, 0);
        ctx.stroke();

        // Collector branch
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(15, -20);
        ctx.lineTo(30, -20);
        ctx.stroke();

        // Emitter branch
        ctx.beginPath();
        ctx.moveTo(-15, 5);
        ctx.lineTo(15, 20);
        ctx.lineTo(30, 20);
        ctx.stroke();

        // Emitter arrow
        ctx.beginPath();
        ctx.moveTo(10, 12);
        ctx.lineTo(15, 20);
        ctx.lineTo(5, 18);
        ctx.stroke();

        ctx.fillText('C', 20, -25);
        ctx.fillText('E', 20, 30);
    }

    drawArduinoNano(ctx) {
        // PCB Body
        ctx.fillStyle = '#1e3a8a'; // Deep Blue PCB
        ctx.strokeStyle = '#172554';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Rounded rectangle for board
        ctx.roundRect(-70, -65, 140, 130, 4);
        ctx.fill();
        ctx.stroke();

        // USB Connector (Top)
        ctx.fillStyle = '#94a3b8'; // Silver/Grey
        ctx.fillRect(-15, -68, 30, 10);

        // Processor (Center, rotated 45deg typical for some MCUs or just square)
        ctx.fillStyle = '#0f172a'; // Black chip
        ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '6px monospace';
        ctx.fillText('MEGA', -10, 0);
        ctx.fillText('328P', -10, 8);

        // ISP Header (Bottom center)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-12, 40, 24, 15, 2);
        ctx.fill();
        // 6 pins of ISP
        ctx.fillStyle = '#fbbf24'; // Gold
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.arc(-8 + i * 16, 43 + j * 5, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Pin Labels
        ctx.font = '6px "JetBrains Mono"';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'right';

        // Left Pins Labels
        this.pins.filter(p => p.id.startsWith('L')).forEach(p => {
            ctx.fillText(p.label, -45, p.y + 2);
        });

        // Right Pins Labels
        ctx.textAlign = 'left';
        this.pins.filter(p => p.id.startsWith('R')).forEach(p => {
            ctx.fillText(p.label, 45, p.y + 2);
        });

        // "NANO" Text
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('NANO', 0, -35);

        // TX/RX LEDs
        ctx.beginPath(); ctx.arc(-20, 20, 2, 0, Math.PI * 2);
        ctx.fillStyle = this.serialBuffer.length > 0 ? '#ef4444' : '#334155'; ctx.fill(); // TX blink
        ctx.beginPath(); ctx.arc(-20, 28, 2, 0, Math.PI * 2); ctx.fillStyle = '#334155'; ctx.fill(); // RX

        // Power LED
        ctx.beginPath(); ctx.arc(-20, 36, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e'; ctx.fill(); // ON

        // Pin D13 LED
        const p13State = this.pinState['13'] === 1; // High?
        ctx.beginPath(); ctx.arc(20, 20, 2, 0, Math.PI * 2);
        ctx.fillStyle = p13State ? '#fbbf24' : '#334155';
        ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.font = '4px sans-serif'; ctx.fillText('L', 25, 22);
    }

    drawRelay(ctx) {
        // Body
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-30, -30, 60, 60, 4);
        ctx.fill();
        ctx.stroke();

        // Coil drawing (left side)
        ctx.beginPath();
        ctx.strokeStyle = '#f59e0b'; // Copper color
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            ctx.arc(-20, -15 + i * 10, 5, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Switch Arm (right side)
        ctx.beginPath();
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 2;
        ctx.moveTo(15, 0); // COM point

        if (this.isActivated) {
            ctx.lineTo(25, -20); // NO connection
            // Glow for active state
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#22c55e';
        } else {
            ctx.lineTo(25, 20); // NC connection
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RELAY', 0, -35);

        // Pin Labels
        ctx.font = '6px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText('A', -25, -18);
        ctx.fillText('B', -25, 22);
        ctx.textAlign = 'right';
        ctx.fillText('COM', 25, 3);
        ctx.fillText('NO', 25, -17);
        ctx.fillText('NC', 25, 23);
    }

    isPointInside(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        // Basic rectangular bounds for interaction
        return Math.abs(dx) < this.width / 2 && Math.abs(dy) < this.height / 2;
    }

    getPinAt(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return this.pins.find(pin => {
            const pdx = dx - pin.x;
            const pdy = dy - pin.y;
            return Math.sqrt(pdx * pdx + pdy * pdy) < 10;
        });
    }

    toJSON() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            value: this.value,
            id: this.id,
            color: this.color,
            code: this.code // Save code
        };
    }

    static fromJSON(data) {
        const comp = new Component(data.type, data.x, data.y);
        comp.rotation = data.rotation;
        comp.value = data.value;
        comp.id = data.id;
        comp.color = data.color;
        if (data.code) comp.code = data.code;
        return comp;
    }
}
