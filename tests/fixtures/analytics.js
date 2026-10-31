// Legacy fixture adapter. Real workspace code imports analytics-core.js.
import {sources,DEMO_START,DEMO_END,TIME_ZONE,AS_OF} from './demo-data.js';
import {createAnalytics} from '../../dist/data/analytics-core.js';
export const BASE_LIMITATIONS=['All records are synthetic demonstration data.','Missing observations are excluded from calculations; missing values are not zero.'];
const api=createAnalytics({sources,range:{from:DEMO_START,to:DEMO_END},timezone:TIME_ZONE,importedAt:AS_OF,limitations:BASE_LIMITATIONS});
export const {normalizeFilters,selectRecords,summarizeRecords,compareRecords,associateRecords,lowEnergyRecords,pacificDate,datesInRange,dailySeries,calculation}=api;
export {createAnalytics};
