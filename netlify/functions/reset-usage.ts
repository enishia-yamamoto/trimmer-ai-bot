import { Handler, schedule } from '@netlify/functions';
import { resetAllUsageCounts } from '../../src/lib/googleSheets';

// This function runs on the 1st of every month at 00:00 UTC
const resetUsageHandler: Handler = async (event) => {
  try {
    console.log('Starting monthly usage reset...');
    await resetAllUsageCounts();
    console.log('Monthly usage reset completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usage counts reset successfully' }),
    };
  } catch (error) {
    console.error('Error resetting usage counts:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to reset usage counts' }),
    };
  }
};

// Schedule to run at midnight on the 1st of every month
export const handler = schedule('0 0 1 * *', resetUsageHandler);