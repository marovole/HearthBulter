# Medical Report Integration - Technical Design

## OCR Service Integration

**选项1: Tesseract.js** (开源)
```typescript
import Tesseract from 'tesseract.js';

async function extractText(imageBuffer: Buffer) {
  const { data: { text } } = await Tesseract.recognize(imageBuffer, 'chi_sim+eng');
  return text;
}
```

**选项2: Azure OCR** (付费，精度更高)
```typescript
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';

async function extractWithAzure(imageUrl: string) {
  const result = await client.read InStream(imageBuffer);
  return result.analyzeResult.readResults;
}
```

## Data Extraction Patterns

```typescript
const patterns = {
  bloodSugar: /血糖[：:]\s*(\d+\.?\d*)\s*mmol\/L/,
  cholesterol: /总胆固醇[：:]\s*(\d+\.?\d*)\s*mmol\/L/,
  ALT: /ALT[：:]\s*(\d+)\s*U\/L/
};

function parseReport(text: string): MedicalData {
  return {
    bloodSugar: parseFloat(text.match(patterns.bloodSugar)?.[1]),
    cholesterol: parseFloat(text.match(patterns.cholesterol)?.[1]),
    // ...
  };
}
```

**最后更新**: 2025-10-29
