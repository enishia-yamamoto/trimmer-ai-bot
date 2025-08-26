import { google } from 'googleapis';
import { User } from '../types';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const SHEET_NAME = 'users';

export async function getUser(lineUserId: string): Promise<User | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return null;

    const headers = rows[0];
    const userRow = rows.find((row, index) => index > 0 && row[0] === lineUserId);
    
    if (!userRow) return null;

    return {
      lineUserId: userRow[0],
      displayName: userRow[1] || '',
      difyConversationId: userRow[2] || undefined,
      plan: userRow[3] === 'premium' ? 'premium' : 'free',
      monthlyUsageCount: parseInt(userRow[4] || '0'),
      lastUsedDate: userRow[5] || new Date().toISOString(),
      subscriptionStartDate: userRow[6] || undefined,
      stripeCustomerId: userRow[7] || undefined,
    };
  } catch (error) {
    console.error('Error getting user from Google Sheets:', error);
    return null;
  }
}

export async function createUser(user: Partial<User>): Promise<void> {
  try {
    const values = [[
      user.lineUserId,
      user.displayName || '',
      user.difyConversationId || '',
      user.plan || 'free',
      user.monthlyUsageCount || 0,
      user.lastUsedDate || new Date().toISOString(),
      user.subscriptionStartDate || '',
      user.stripeCustomerId || '',
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Error creating user in Google Sheets:', error);
    throw error;
  }
}

export async function updateUser(lineUserId: string, updates: Partial<User>): Promise<void> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return;

    const userRowIndex = rows.findIndex((row, index) => index > 0 && row[0] === lineUserId);
    if (userRowIndex === -1) return;

    const currentUser = await getUser(lineUserId);
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...updates };
    const values = [[
      updatedUser.lineUserId,
      updatedUser.displayName,
      updatedUser.difyConversationId || '',
      updatedUser.plan,
      updatedUser.monthlyUsageCount,
      updatedUser.subscriptionStartDate || '',
      updatedUser.lastUsedDate,
      updatedUser.stripeCustomerId || '',
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${userRowIndex + 1}:H${userRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Error updating user in Google Sheets:', error);
    throw error;
  }
}

export async function incrementUsageCount(lineUserId: string): Promise<void> {
  const user = await getUser(lineUserId);
  if (user) {
    await updateUser(lineUserId, {
      monthlyUsageCount: user.monthlyUsageCount + 1,
      lastUsedDate: new Date().toISOString(),
    });
  }
}

export async function resetAllUsageCounts(): Promise<void> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return;

    const updates = rows.slice(1).map((row, index) => {
      if (row[3] !== 'premium') {
        row[4] = '0'; // Reset usage count for free users
      }
      return row;
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:H${updates.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: updates },
    });
  } catch (error) {
    console.error('Error resetting usage counts:', error);
    throw error;
  }
}

export async function getUserByStripeCustomerId(customerId: string): Promise<User | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return null;

    const userRow = rows.find((row, index) => index > 0 && row[7] === customerId);
    
    if (!userRow) return null;

    return {
      lineUserId: userRow[0],
      displayName: userRow[1] || '',
      difyConversationId: userRow[2] || undefined,
      plan: userRow[3] === 'premium' ? 'premium' : 'free',
      monthlyUsageCount: parseInt(userRow[4] || '0'),
      lastUsedDate: userRow[5] || new Date().toISOString(),
      subscriptionStartDate: userRow[6] || undefined,
      stripeCustomerId: userRow[7] || undefined,
    };
  } catch (error) {
    console.error('Error getting user by Stripe customer ID:', error);
    return null;
  }
}