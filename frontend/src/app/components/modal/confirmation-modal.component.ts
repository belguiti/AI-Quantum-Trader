import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (modalService.isOpen()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" (click)="cancel()"></div>

        <!-- Modal Panel -->
        <div class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-white/10 p-6 text-left align-middle shadow-xl transition-all animate-scale-in">
          
          <h3 class="text-lg font-medium leading-6 text-white mb-2">
            {{ modalService.data().title }}
          </h3>
          
          <div class="mt-2 text-sm text-gray-300">
             <p>{{ modalService.data().message }}</p>
             
             @if (modalService.data().showInput) {
                <div class="mt-4">
                    <input type="text" 
                           [(ngModel)]="inputValue" 
                           (keyup.enter)="confirm()"
                           [placeholder]="modalService.data().inputPlaceholder || ''"
                           class="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                           autoFocus>
                </div>
             }
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              class="inline-flex justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              (click)="cancel()"
            >
              {{ modalService.data().cancelLabel || 'Cancel' }}
            </button>
            <button
              type="button"
              class="inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-lg hover:shadow-xl transition-all"
              [class.bg-red-600]="modalService.data().type === 'danger'"
              [class.hover:bg-red-700]="modalService.data().type === 'danger'"
              [class.focus-visible:ring-red-500]="modalService.data().type === 'danger'"
              [class.bg-blue-600]="modalService.data().type !== 'danger'"
              [class.hover:bg-blue-700]="modalService.data().type !== 'danger'"
              [class.focus-visible:ring-blue-500]="modalService.data().type !== 'danger'"
              [disabled]="modalService.data().showInput && !inputValue"
              [class.opacity-50]="modalService.data().showInput && !inputValue"
              [class.cursor-not-allowed]="modalService.data().showInput && !inputValue"
              (click)="confirm()"
            >
              {{ modalService.data().confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes scale-in {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out forwards;
    }
  `]
})
export class ConfirmationModalComponent {
  modalService = inject(ModalService);

  get inputValue(): string {
    return this.modalService.inputValue();
  }

  set inputValue(val: string) {
    this.modalService.inputValue.set(val);
  }

  confirm() {
    if (this.modalService.data().showInput) {
      this.modalService.close(this.inputValue);
    } else {
      this.modalService.close(true);
    }
  }

  cancel() {
    this.modalService.close(null); // or false
  }
}
