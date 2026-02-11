import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private counter = 0;

    show(message: string, title?: string, type: Toast['type'] = 'info', duration = 5000) {
        const id = this.counter++;
        const toast: Toast = { id, message, title, type };

        this.toasts.update(current => [...current, toast]);

        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    remove(id: number) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}
