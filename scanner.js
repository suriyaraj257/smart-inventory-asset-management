// Barcode & QR Code Generator and Camera Scanner Handler
const LabScanner = {
  html5QrCode: null,
  activeCameraId: null,

  generateTag(asset, containerQrId, containerBarcodeId) {
    // 1. QR Code
    const qrContainer = document.getElementById(containerQrId);
    if (qrContainer) {
      qrContainer.innerHTML = '';
      const payload = JSON.stringify({
        id: asset.id,
        name: asset.name,
        sn: asset.serialNumber,
        loc: asset.location,
        maintDue: asset.nextMaintenanceDate
      });

      new QRCode(qrContainer, {
        text: payload,
        width: 120,
        height: 120,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    // 2. Code128 Barcode
    const barcodeCanvas = document.getElementById(containerBarcodeId);
    if (barcodeCanvas && window.JsBarcode) {
      try {
        JsBarcode(barcodeCanvas, asset.id, {
          format: "CODE128",
          lineColor: "#0f172a",
          width: 2,
          height: 48,
          displayValue: true,
          fontSize: 14,
          font: "monospace"
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  },

  printAssetTag() {
    window.print();
  },

  // QR Scanner Modal methods
  startCameraScanner(onSuccessCallback) {
    const readerElement = document.getElementById("qr-reader");
    if (!readerElement) return;

    if (!window.Html5Qrcode) {
      alert("Scanner library is initializing. Please try again in a moment.");
      return;
    }

    this.html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    this.html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        console.log("QR Decoded:", decodedText);
        this.stopCameraScanner();
        if (onSuccessCallback) onSuccessCallback(decodedText);
      },
      (errorMessage) => {
        // scan parse error, ignore while searching frames
      }
    ).catch(err => {
      console.warn("Unable to start camera, falling back to simulated scan:", err);
      document.getElementById("camera-notice").innerText = "Camera not detected or permission denied. Use simulated scanner below:";
      document.getElementById("camera-notice").classList.remove("hidden");
    });
  },

  stopCameraScanner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode.clear();
      }).catch(err => console.error("Error stopping scanner:", err));
    }
  }
};
