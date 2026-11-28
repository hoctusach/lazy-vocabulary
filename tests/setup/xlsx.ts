// [FB-84] xlsx is loaded on demand in the app; the synchronous workbook parser needs it preloaded in unit tests.
import { loadXlsx } from '@/lib/xlsxLoader';

await loadXlsx();
