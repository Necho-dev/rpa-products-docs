import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string, size = 160): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}
