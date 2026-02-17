import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { LabService, TrainingRequest } from '../../services/lab.service';
import { WebSocketService } from '../../services/websocket.service';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxChartsModule, FormsModule],
  templateUrl: './lab.component.html',
  styleUrls: ['./lab.component.css']
})
export class LabComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private labService = inject(LabService);
  private wsService = inject(WebSocketService);

  // Status Signals
  isTraining = signal(false);
  progress = signal(0);
  logs = signal<string[]>([]);
  result = signal<any>(null); // Full result payload
  equityData = signal<any[]>([]);

  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#00E5FF', '#A10A28', '#C7B42C', '#AAAAAA']
  };

  popularSymbols = [
    // Crypto
    'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD',

    // Commodities
    'GC=F', // Gold

    // Forex
    'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X',

    // Indices
    '^IXIC',  // Nasdaq Composite
    '^GSPC',  // S&P 500
    '^RUT'    // Russell 2000 (RTY)
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
    this.equityData.set([]);

    const rangeVal = this.labForm.value.ranges as any;

    const req: TrainingRequest = {
      symbol: this.labForm.value.symbol!,
      startDate: this.labForm.value.dateRange?.start!,
      endDate: this.labForm.value.dateRange?.end!,
      indicators: this.labForm.value.indicators as string[],
      targetWinRate: this.labForm.value.targetWinRate!,
      trials: this.labForm.value.trials!,
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
    // Scroll to bottom logic if needed (via template ref)
  }

  processChartData(equityCurve: any[]) {
    if (!equityCurve) return;
    // Convert to ngx-charts format
    const series = equityCurve.map((p: any) => ({
      name: p.time,
      value: p.value
    }));

    this.equityData.set([{
      name: "Portfolio Equity",
      series: series
    }]);
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
