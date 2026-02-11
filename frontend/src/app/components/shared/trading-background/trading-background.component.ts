import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Candle {
    x: number;
    open: number;
    close: number;
    high: number;
    low: number;
    width: number;
    color: string;
}

@Component({
    selector: 'app-trading-background',
    standalone: true,
    imports: [CommonModule],
    template: `
    <canvas #bgCanvas class="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-30"></canvas>
    <!-- Vignette & Gradient Overlay -->
    <div class="fixed inset-0 pointer-events-none z-0 bg-gradient-radial from-transparent to-background/90"></div>
  `,
    styles: [`
    :host {
      display: block;
      position: absolute; // Changed to absolute to fit container
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -1; // Ensure behind content
    }
    .bg-gradient-radial {
      background: radial-gradient(circle at center, transparent 0%, #0a0a0a 90%);
    }
  `]
})
export class TradingBackgroundComponent implements AfterViewInit, OnDestroy {
    @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    private ctx!: CanvasRenderingContext2D;
    private animationId: number = 0;
    private resizeObserver!: ResizeObserver;

    // Mouse State
    private mouseX = 0;
    private mouseY = 0;
    private targetX = 0;
    private targetY = 0;

    // Chart State
    private series: any[] = [];

    constructor(private ngZone: NgZone) { }

    ngAfterViewInit() {
        this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
        this.resize();
        this.initSeries();
        this.startAnimation();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvasRef.nativeElement);

        // Initial mouse center
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.targetX = this.mouseX;
        this.targetY = this.mouseY;
    }

    ngOnDestroy() {
        cancelAnimationFrame(this.animationId);
        this.resizeObserver?.disconnect();
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        this.targetX = e.clientX;
        this.targetY = e.clientY;
    }

    private resize() {
        const canvas = this.canvasRef.nativeElement;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.initSeries();
    }

    private initSeries() {
        const height = window.innerHeight;
        const width = window.innerWidth;

        this.series = [
            {
                yBase: height * 0.3,
                candles: this.generateCandles(width, height * 0.3, 15, 'rgba(0, 242, 255, '),
                speed: 0.5,
                parallax: 0.02
            },
            {
                yBase: height * 0.6,
                candles: this.generateCandles(width, height * 0.6, 25, 'rgba(0, 255, 157, '),
                speed: 0.8,
                parallax: 0.05
            },
            {
                yBase: height * 0.85,
                candles: this.generateCandles(width, height * 0.85, 40, 'rgba(124, 58, 237, '),
                speed: 1.2,
                parallax: 0.08
            }
        ];
    }

    private generateCandles(width: number, yBase: number, barWidth: number, colorPrefix: string): Candle[] {
        const candles: Candle[] = [];
        let currentX = -100;
        let currentY = 0; // Relative to yBase

        while (currentX < width + 200) {
            const move = (Math.random() - 0.5) * 40;
            const open = currentY;
            const close = currentY + move;
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;

            const isUp = close < open; // Screen coords: up is negative Y
            // Color adjustment: Green for up, Red/Purple for down? 
            // User wants "Cyberpunk" so maybe cyan/purple
            const color = isUp ? `${colorPrefix}0.6)` : `${colorPrefix}0.2)`;

            candles.push({
                x: currentX,
                open,
                close,
                high,
                low,
                width: barWidth,
                color
            });

            currentY = close;
            // Pull back to center if too far
            currentY *= 0.95;

            currentX += barWidth + 10; // Spacing
        }
        return candles;
    }

    private startAnimation() {
        this.ngZone.runOutsideAngular(() => {
            const render = () => {
                this.update();
                this.draw();
                this.animationId = requestAnimationFrame(render);
            };
            render();
        });
    }

    private update() {
        // Smooth mouse follow
        this.mouseX += (this.targetX - this.mouseX) * 0.05;
        this.mouseY += (this.targetY - this.mouseY) * 0.05;

        // Scroll candles
        this.series.forEach(layer => {
            layer.candles.forEach((c: Candle) => {
                c.x -= layer.speed;
            });

            // Recycle candles
            const first = layer.candles[0];
            if (first.x < -100) {
                layer.candles.shift();

                const last = layer.candles[layer.candles.length - 1];
                const move = (Math.random() - 0.5) * 40;
                const open = last.close;
                const close = last.close + move;
                const high = Math.max(open, close) + Math.random() * 10;
                const low = Math.min(open, close) - Math.random() * 10;
                const isUp = close < open;
                const colorPrefix = layer.candles[0].color.substring(0, layer.candles[0].color.lastIndexOf(',') + 2);
                const color = isUp ? `${colorPrefix}0.6)` : `${colorPrefix}0.2)`;

                layer.candles.push({
                    x: last.x + last.width + 10,
                    open, close, high, low,
                    width: last.width,
                    color
                });
            }
        });
    }

    private draw() {
        const canvas = this.canvasRef.nativeElement;
        const w = canvas.width;
        const h = canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        // Grid reacting to mouse
        this.drawGrid(w, h);

        // Draw Series
        this.series.forEach(layer => {
            // Parallax Offset
            const offsetX = (this.mouseX - w / 2) * layer.parallax;
            const offsetY = (this.mouseY - h / 2) * layer.parallax;

            layer.candles.forEach((c: Candle) => {
                const x = c.x + offsetX;
                const yBase = layer.yBase + offsetY;

                this.ctx.fillStyle = c.color;
                this.ctx.strokeStyle = c.color;
                this.ctx.lineWidth = 1;

                // Draw Wick
                this.ctx.beginPath();
                this.ctx.moveTo(x + c.width / 2, yBase + c.high);
                this.ctx.lineTo(x + c.width / 2, yBase + c.low);
                this.ctx.stroke();

                // Draw Body
                const bodyTop = Math.min(c.open, c.close);
                const bodyHeight = Math.abs(c.close - c.open);
                // Ensure min height for visibility
                const renderHeight = Math.max(bodyHeight, 1);

                this.ctx.fillRect(x, yBase + bodyTop, c.width, renderHeight);
            });
        });
    }

    private drawGrid(w: number, h: number) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        const parallax = 0.01;
        const offsetX = (this.mouseX - w / 2) * parallax;
        const offsetY = (this.mouseY - h / 2) * parallax;

        this.ctx.beginPath();
        // Vertical lines
        for (let x = offsetX % 100; x < w; x += 100) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
        }
        // Horizontal lines
        for (let y = offsetY % 100; y < h; y += 100) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
        }
        this.ctx.stroke();
    }
}
