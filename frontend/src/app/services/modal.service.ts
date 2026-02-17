import { Injectable, signal } from '@angular/core';

export interface ModalData {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info' | 'warning';
    showInput?: boolean;
    inputPlaceholder?: string;
    inputValue?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    isOpen = signal(false);
    data = signal<ModalData>({
        title: '',
        message: ''
    });
    inputValue = signal('');

    private resolveRef: ((value: boolean | string | null) => void) | null = null;

    confirm(data: ModalData): Promise<boolean> {
        this.data.set({ ...data, showInput: false });
        this.isOpen.set(true);

        return new Promise<boolean>((resolve) => {
            this.resolveRef = resolve as any;
        });
    }

    prompt(data: ModalData): Promise<string | null> {
        this.data.set({ ...data, showInput: true });
        this.inputValue.set(data.inputValue || '');
        this.isOpen.set(true);

        return new Promise<string | null>((resolve) => {
            this.resolveRef = resolve as any;
        });
    }

    close(result: boolean | string | null) {
        this.isOpen.set(false);
        if (this.resolveRef) {
            this.resolveRef(result);
            this.resolveRef = null;
        }
    }
}
