import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Html5QrcodeScanner } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.css']
})
export class QrScannerComponent implements OnInit, OnDestroy {
  private qrScanner: Html5QrcodeScanner | null = null;
  qrResultString = '';
  isScanning = true;
  hasPermission = false;
  scannerError = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Delay pentru ca DOM să se încarce complet
    setTimeout(() => {
      this.startScanner();
    }, 500);
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private startScanner(): void {
    // Verifică dacă elementul există
    const element = document.getElementById('qr-reader');
    if (!element) {
      console.error('QR Reader element not found');
      setTimeout(() => this.startScanner(), 1000);
      return;
    }

    const config = {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250
      },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 2,
    };

    this.qrScanner = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false
    );

    this.qrScanner.render(
      (decodedText: string) => this.onScanSuccess(decodedText),
      (error: any) => this.onScanError(error)
    );

    this.hasPermission = true;
    console.log('QR Scanner initialized successfully!');
  }

  private onScanSuccess(decodedText: string): void {
    console.log('QR Code scanned:', decodedText);
    this.qrResultString = decodedText;
    this.isScanning = false;
    
    // Vibrație pentru feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
    
    // Stop scanner după succes
    this.stopScanner();
    
    // Handle QR result
    this.handleQRResult(decodedText);
  }

  private onScanError(error: any): void {
    // Ignore frequent scan errors - normal behavior
    if (error.includes('NotFoundException')) {
      return;
    }
    console.warn('QR Scan error:', error);
  }

  public handleQRResult(result: string): void {
    try {
      if (result.startsWith('http')) {
        const tableId = this.extractTableId(result);
        this.navigateToMenu(tableId);
      } else {
        this.navigateToMenu(result);
      }
    } catch (error) {
      console.error('Error parsing QR result:', error);
      this.navigateToMenu(result);
    }
  }

  private extractTableId(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1] || 'table-1';
  }

  public navigateToMenu(tableId: string): void {
    this.router.navigate(['/menu', tableId]);
  }

  public resetScanner(): void {
    this.qrResultString = '';
    this.isScanning = true;
    this.scannerError = '';
    this.startScanner();
  }

  private stopScanner(): void {
    if (this.qrScanner) {
      this.qrScanner.clear();
      this.qrScanner = null;
    }
  }

  // Test method pentru simulation
public simulateQRScan(qrValue: string): void {
  console.log('Simulating QR scan:', qrValue);
  this.onScanSuccess(qrValue);
}
}