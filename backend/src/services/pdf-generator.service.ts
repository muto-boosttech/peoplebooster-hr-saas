import puppeteer, { Browser, Page } from 'puppeteer';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * PDF生成オプション
 */
export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
}

/**
 * S3アップロード結果
 */
export interface S3UploadResult {
  key: string;
  bucket: string;
  url: string;
  signedUrl: string;
  expiresAt: Date;
}

/**
 * PDF生成サービス
 * PuppeteerとEJSを使用してHTMLテンプレートからPDFを生成
 */
class PdfGeneratorService {
  private browser: Browser | null = null;
  private s3Client: S3Client;
  private bucketName: string;
  private templateDir: string;

  constructor() {
    // S3クライアントの初期化
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-1',
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          }
        : undefined,
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'peoplebooster-reports';
    this.templateDir = path.join(__dirname, '../templates');
  }

  /**
   * ブラウザインスタンスを取得（シングルトン）
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
      });
    }
    return this.browser;
  }

  /**
   * ブラウザを閉じる
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * EJSテンプレートをレンダリング
   */
  async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
    const templatePath = path.join(this.templateDir, `${templateName}.ejs`);

    // テンプレートファイルが存在しない場合はデフォルトテンプレートを使用
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template ${templateName} not found, using default template`);
      return this.getDefaultTemplate(templateName, data);
    }

    const template = fs.readFileSync(templatePath, 'utf-8');
    return ejs.render(template, {
      ...data,
      formatDate: this.formatDate,
      formatNumber: this.formatNumber,
      getChartScript: this.getChartScript,
    });
  }

  /**
   * デフォルトテンプレートを生成
   */
  private getDefaultTemplate(templateName: string, data: Record<string, unknown>): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateName}</title>
  <style>
    body {
      font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .logo {
      max-height: 60px;
      margin-bottom: 20px;
    }
    h1 {
      color: #1e40af;
      font-size: 24px;
      margin: 0;
    }
    .content {
      margin-top: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      color: #1e40af;
      border-left: 4px solid #2563eb;
      padding-left: 12px;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .disclaimer {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin-top: 30px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PeopleBooster レポート</h1>
    <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
  </div>
  <div class="content">
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} PeopleBooster. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * HTMLからPDFを生成
   */
  async generatePdf(
    html: string,
    options: PdfGenerationOptions = {}
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page: Page = await browser.newPage();

    try {
      // HTMLをページにセット
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Chart.jsのレンダリングを待機
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        });
      });

      // PDFを生成
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: options.printBackground !== false,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * テンプレートからPDFを生成
   */
  async generatePdfFromTemplate(
    templateName: string,
    data: Record<string, unknown>,
    options: PdfGenerationOptions = {}
  ): Promise<Buffer> {
    const html = await this.renderTemplate(templateName, data);
    return this.generatePdf(html, options);
  }

  /**
   * PDFをS3にアップロード
   */
  async uploadToS3(
    pdfBuffer: Buffer,
    fileName: string,
    metadata: Record<string, string> = {}
  ): Promise<S3UploadResult> {
    const key = `reports/${new Date().toISOString().slice(0, 10)}/${fileName}`;

    // S3にアップロード
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: metadata,
      })
    );

    // 署名付きURLを生成（24時間有効）
    const expiresIn = 24 * 60 * 60; // 24時間
    const signedUrl = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
      { expiresIn }
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    return {
      key,
      bucket: this.bucketName,
      url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${key}`,
      signedUrl,
      expiresAt,
    };
  }

  /**
   * テンプレートからPDFを生成してS3にアップロード
   */
  async generateAndUpload(
    templateName: string,
    data: Record<string, unknown>,
    fileName: string,
    options: PdfGenerationOptions = {},
    metadata: Record<string, string> = {}
  ): Promise<S3UploadResult> {
    const pdfBuffer = await this.generatePdfFromTemplate(templateName, data, options);
    return this.uploadToS3(pdfBuffer, fileName, metadata);
  }

  /**
   * 日付フォーマットヘルパー
   */
  private formatDate(date: Date | string, format: string = 'YYYY年MM月DD日'): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  }

  /**
   * 数値フォーマットヘルパー
   */
  private formatNumber(num: number, decimals: number = 0): string {
    return num.toLocaleString('ja-JP', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Chart.jsスクリプト生成ヘルパー
   */
  private getChartScript(): string {
    return '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>';
  }
}

export const pdfGeneratorService = new PdfGeneratorService();
