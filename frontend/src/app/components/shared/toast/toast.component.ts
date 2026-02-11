import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';
// Remove animations if not installed or use simple CSS transitions
// import { animate, style, transition, trigger } from '@angular/animations'; 

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
           class="pointer-events-auto min-w-[300px] max-w-md bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-4 flex items-start gap-3 relative overflow-hidden transition-all duration-300 animate-slide-in"
           [class.border-l-4]="true"
           [class.border-l-blue-500]="toast.type === 'info'"
           [class.border-l-green-500]="toast.type === 'success'"
           [class.border-l-yellow-500]="toast.type === 'warning'"
           [class.border-l-red-500]="toast.type === 'error'">
           
           <!-- Icon -->
           <div>
             @if(toast.type === 'warning' || toast.type === 'error') {
               <span class="text-xl">⚠️</span>
             } @else if(toast.type === 'success') {
               <span class="text-xl">✅</span>
             } @else {
               <span class="text-xl">ℹ️</span>
             }
           </div>

           <div class="flex-1">
             @if (toast.title) {
               <h4 class="font-bold text-white text-sm mb-1">{{ toast.title }}</h4>
             }
             <p class="text-gray-300 text-sm leading-snug">{{ toast.message }}</p>
           </div>

           <button (click)="toastService.remove(toast.id)" class="text-gray-500 hover:text-white transition-colors">
              ✕
           </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out forwards;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
