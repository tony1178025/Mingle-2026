declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    value: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export default QRCode;
}
