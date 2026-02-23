import { Component, inject, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { LabService, TrainingRequest } from '../../services/lab.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexStroke, ApexYAxis, ApexTooltip, ApexFill, ApexTheme, ApexGrid } from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  fill: ApexFill;
  theme: ApexTheme;
  grid: ApexGrid;
  colors: string[];
};

@Component({
  selector: 'app-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgApexchartsModule, FormsModule],
  templateUrl: './lab.component.html',
  styleUrls: ['./lab.component.css']
})
export class LabComponent implements OnInit, OnDestroy {
  @ViewChild('chart') chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions> | any = null;

  private fb = inject(FormBuilder);
  private labService = inject(LabService);
  private wsService = inject(WebSocketService);

  // Status Signals
  isTraining = signal(false);
  progress = signal(0);
  logs = signal<string[]>([]);
  result = signal<any>(null); // Full result payload
  selectedEngine = signal<string>('OPTUNA');

  get MathAbs() { return Math.abs; }

  popularSymbols = [
    // Crypto
    { value: 'BTC-USD', label: 'Bitcoin' },
    { value: 'ETH-USD', label: 'Ethereum' },
    { value: 'SOL-USD', label: 'Solana' },
    { value: 'BNB-USD', label: 'Binance Coin' },
    { value: 'XRP-USD', label: 'Ripple' },

    // Commodities
    { value: 'GC=F', label: 'Gold' },
    { value: 'CL=F', label: 'Crude Oil' },
    { value: 'SI=F', label: 'Silver' },

    // Forex
    { value: 'EURUSD=X', label: 'EUR/USD' },
    { value: 'GBPUSD=X', label: 'GBP/USD' },
    { value: 'USDJPY=X', label: 'USD/JPY' },
    { value: 'AUDUSD=X', label: 'AUD/USD' },

    // Indices & Stocks
    { value: '^IXIC', label: 'Nasdaq Composite' },
    { value: '^GSPC', label: 'S&P 500' },
    { value: '^RUT', label: 'Russell 2000' },
    { value: 'AAPL', label: 'Apple Inc.' },
    { value: 'NVDA', label: 'NVIDIA Corp' },
    { value: 'TSLA', label: 'Tesla Inc.' }
  ];

  showCustomInput = signal(false);

  onSymbolChange(event: any) {
    if (event.target.value === 'CUSTOM') {
      this.showCustomInput.set(true);
      this.labForm.get('symbol')?.setValue('');
    } else {
      this.showCustomInput.set(false);
    }
  }

  // Form
  labForm = this.fb.group({
    symbol: ['BTC-USD', Validators.required],
    engineType: ['OPTUNA'],
    dateRange: this.fb.group({
      start: ['2023-01-01', Validators.required],
      end: ['2023-12-31', Validators.required]
    }),
    indicators: [['RSI', 'MACD', 'FIBO']], // Mock multi-select
    targetWinRate: [0.70, [Validators.min(0.5), Validators.max(0.99)]],
    trials: [50, [Validators.min(10), Validators.max(500)]],

    // New Parameter Ranges
    ranges: this.fb.group({
      stopLossMin: [0.5, [Validators.min(0.1), Validators.max(5)]],
      stopLossMax: [5.0, [Validators.min(0.5), Validators.max(10)]],
      takeProfitMin: [1.0, [Validators.min(0.5), Validators.max(20)]],
      takeProfitMax: [10.0, [Validators.min(1), Validators.max(50)]],
    })
  });

  onEngineChange(engine: string) {
    this.selectedEngine.set(engine);
    this.labForm.patchValue({ engineType: engine });
  }

  private logSub!: Subscription;

  ngOnDestroy() {
    if (this.logSub) this.logSub.unsubscribe();
  }

  startTraining() {
    if (this.labForm.invalid) return;

    this.isTraining.set(true);
    this.progress.set(0);
    this.logs.set(['Initializing Quantum Lab...', 'Connecting to Python Engine...']);
    this.result.set(null);
    this.chartOptions = null;

    const rangeVal = this.labForm.value.ranges as any;

    const req: TrainingRequest = {
      symbol: this.labForm.value.symbol!,
      startDate: this.labForm.value.dateRange?.start!,
      endDate: this.labForm.value.dateRange?.end!,
      indicators: this.labForm.value.indicators as string[],
      targetWinRate: this.labForm.value.targetWinRate!,
      trials: this.labForm.value.trials!,
      engineType: this.labForm.value.engineType || 'OPTUNA',
      param_ranges: {
        sl_min: rangeVal?.stopLossMin,
        sl_max: rangeVal?.stopLossMax,
        tp_min: rangeVal?.takeProfitMin,
        tp_max: rangeVal?.takeProfitMax
      }
    };

    this.labService.startTraining(req).subscribe({
      next: (res) => {
        this.addLog(`Job Started: ${res.jobId}`);
      },
      error: (err) => {
        this.addLog(`Error: ${err.message}`);
        this.isTraining.set(false);
      }
    });
  }

  handleProgressUpdate(data: any) {
    if (data.message) this.addLog(data.message);
    if (data.progress !== undefined) this.progress.set(data.progress);

    if (data.progress === 100 && data.result) {
      this.isTraining.set(false);
      this.result.set(data.result);
      this.processChartData(data.result.equityCurve);
    } else if (data.progress === -1) {
      this.isTraining.set(false);
      this.addLog("Training Failed.");
    }
  }

  addLog(msg: string) {
    this.logs.update(logs => [...logs, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  getFeatureImportanceArray(): { name: string; value: number; pct: number; rank: number }[] {
    const fi = this.result()?.featureImportance;
    if (!fi) return [];
    const entries = Object.entries(fi)
      .map(([name, value]) => ({ name, value: value as number, pct: 0, rank: 0 }))
      .sort((a, b) => b.value - a.value);
    const maxVal = entries.length > 0 ? entries[0].value : 1;
    return entries.map((e, i) => ({
      ...e,
      pct: (e.value / maxVal) * 100,
      rank: i + 1
    }));
  }

  processChartData(equityCurve: any[]) {
    if (!equityCurve || equityCurve.length === 0) return;

    const isProfit = (this.result()?.totalReturn || 0) >= 0;
    const lineColor = isProfit ? '#00E396' : '#FF4560'; // Neon Green or Neon Red

    // Data in format [timestamp, value]
    const seriesData = equityCurve.map((p: any) => {
      // Ensure we have a valid timestamp (convert from YYYY-MM-DD to ms if needed)
      const timeMs = new Date(p.time).getTime();
      return [timeMs, p.value];
    });

    this.chartOptions = {
      series: [
        {
          name: 'Account Equity',
          data: seriesData
        }
      ],
      chart: {
        type: 'area',
        height: 350,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: true },
        animations: { enabled: true, easing: 'easeinout', speed: 800 }
      },
      colors: [lineColor],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.0,
          stops: [0, 100]
        }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: {
        type: 'datetime',
        labels: {
          style: { colors: '#9ca3af', fontFamily: 'monospace' },
          datetimeUTC: false
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af', fontFamily: 'monospace' },
          formatter: (value: number) => { return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        }
      },
      grid: {
        show: true,
        borderColor: '#1a1a1a',
        strokeDashArray: 4,
        position: 'back',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } }
      },
      theme: { mode: 'dark' },
      tooltip: {
        theme: 'dark',
        x: { format: 'dd MMM yyyy' },
        y: {
          formatter: (value: number) => {
            return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        },
        custom: undefined // Native tooltip is already good, extending via formatter
      }
    };
  }

  availableModels = signal<any[]>([]);
  selectedModelId = signal<number | null>(null);

  // Naming & Saving State
  showNameModal = signal(false);
  strategyName = '';

  ngOnInit() {
    this.loadModels();

    // Subscribe to progress topic
    this.logSub = this.wsService.subscribeToTopic('/topic/lab/progress').subscribe((msg: any) => {
      if (msg.body) {
        const data = JSON.parse(msg.body);
        this.handleProgressUpdate(data);
      }
    });
  }

  loadModels() {
    this.labService.getModels().subscribe(models => {
      this.availableModels.set(models);
    });
  }

  onModelSelect(event: any) {
    const id = +event.target.value;
    if (!id) {
      this.selectedModelId.set(null);
      this.labForm.reset();
      return;
    }

    const model = this.availableModels().find(m => m.id === id);
    if (model) {
      this.selectedModelId.set(model.id);
      this.strategyName = model.name;

      // Parse params if they exist to pre-fill form? 
      // For now just setting ID so next save updates it.
      // Ideally we parse model.parameters JSON and fill labForm.
      if (model.symbol) this.labForm.patchValue({ symbol: model.symbol });

      this.addLog(`Loaded Strategy: ${model.name} (ID: ${model.id})`);
      this.addLog("Ready to Retest or Optimize.");
    }
  }

  saveAndDeploy() {
    if (!this.result()) return;

    // If updating, maybe pre-fill name
    if (this.selectedModelId()) {
      const model = this.availableModels().find(m => m.id === this.selectedModelId());
      if (model) this.strategyName = model.name;
    } else {
      this.strategyName = `${this.result().symbol} Strategy`;
    }

    this.showNameModal.set(true);
  }

  confirmSave() {
    if (!this.strategyName.trim()) return;

    this.showNameModal.set(false);
    this.addLog("Saving strategy to database...");

    // Inject name AND ID (if updating) into result
    const payload: any = { ...this.result(), name: this.strategyName };
    if (this.selectedModelId()) {
      payload.id = this.selectedModelId();
    }

    this.labService.saveModel(payload).subscribe({
      next: (model) => {
        this.addLog(`Strategy '${model.name}' saved and deployed! ID: ${model.id}`);
        this.addLog("Strategy is now active and monitoring the market.");
        this.loadModels(); // Refresh list
      },
      error: (err) => {
        this.addLog(`Error saving strategy: ${err.message}`);
      }
    });
  }

  retest() {
    this.addLog("Retesting with current configuration...");
    this.startTraining();
  }
}
