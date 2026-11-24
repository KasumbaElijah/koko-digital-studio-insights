import crypto from 'crypto';
import axios from 'axios';
import { TrackerCalculationResult } from './trackerStore';

export interface GoogleSheetsConfig {
  serviceAccountEmail?: string;
  privateKey?: string;
  spreadsheetId?: string;
}

export interface SheetUpdateResult {
  success: boolean;
  message: string;
  sheetId?: string;
  month?: string;
  updatedRows?: number;
  matchedAccounts?: Array<{ account: string; row: number; column: string; value: number }>;
  unmatchedAccounts?: string[];
  error?: string;
  simulated?: boolean;
}

/**
 * Normalizes private key from environment variable (handles escaped newlines \n)
 */
function formatPrivateKey(rawKey: string): string {
  let key = rawKey.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }
  return key.replace(/\\n/g, '\n');
}

/**
 * Generates Google OAuth2 Access Token using RS256 Service Account JWT
 */
export async function getGoogleServiceAccountToken(
  clientEmail: string,
  rawPrivateKey: string
): Promise<string> {
  const privateKey = formatPrivateKey(rawPrivateKey);
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (obj: any) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64Url(header);
  const encodedClaim = base64Url(claim);
  const signInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer
    .sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signInput}.${signature}`;

  const tokenRes = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    }
  );

  return tokenRes.data.access_token;
}

/**
 * Converts 0-indexed column number to Excel column letters (0 -> A, 1 -> B, 2 -> C, etc.)
 */
function columnIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Pushes calculated Actual Average Views to Google Sheet
 */
export async function pushTrackerResultsToSheet(
  month: string,
  results: TrackerCalculationResult[],
  customSheetId?: string
): Promise<SheetUpdateResult> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const sheetId = customSheetId || process.env.PERFORMANCE_TRACKER_SHEET_ID || '';

  // Check if credentials exist
  if (!email || !privateKey || !sheetId) {
    const missing: string[] = [];
    if (!email) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
    if (!sheetId) missing.push('PERFORMANCE_TRACKER_SHEET_ID');

    return {
      success: false,
      error: 'MISSING_CREDENTIALS',
      message: `Google Sheets credentials missing in .env (${missing.join(', ')}). A test simulation was performed instead.`,
      simulated: true,
      month,
      sheetId: sheetId || 'Not Configured',
      updatedRows: results.length,
      matchedAccounts: results.map((r, i) => ({
        account: r.name,
        row: i + 3,
        column: 'E',
        value: r.actualAvgViews,
      })),
      unmatchedAccounts: [],
    };
  }

  try {
    // 1. Authenticate with Google Sheets API
    const accessToken = await getGoogleServiceAccountToken(email, privateKey);

    // 2. Fetch Spreadsheet Metadata to get first sheet name
    const metaRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }
    );
    const firstSheetTitle = metaRes.data?.sheets?.[0]?.properties?.title || 'Sheet1';

    // 3. Read spreadsheet data (Rows 1 to 100, Columns A to Z)
    const readRange = `${firstSheetTitle}!A1:Z100`;
    const dataRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(readRange)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }
    );

    const rows: string[][] = dataRes.data?.values || [];
    if (rows.length === 0) {
      throw new Error(`Spreadsheet "${sheetId}" appears to be empty.`);
    }

    // 4. Find the column corresponding to the requested month
    // Normalize target month (e.g. "October" or "October 2026")
    const cleanMonth = month.toLowerCase().replace(/[^a-z]/g, '');
    let targetColIndex = -1;

    // Scan headers in rows 1 and 2
    const headerRows = rows.slice(0, 3);
    for (let rIdx = 0; rIdx < headerRows.length; rIdx++) {
      const headerRow = headerRows[rIdx] || [];
      for (let cIdx = 0; cIdx < headerRow.length; cIdx++) {
        const cellVal = String(headerRow[cIdx] || '').toLowerCase().replace(/[^a-z]/g, '');
        if (cellVal && (cellVal.includes(cleanMonth) || cleanMonth.includes(cellVal))) {
          targetColIndex = cIdx;
          break;
        }
      }
      if (targetColIndex !== -1) break;
    }

    // Fallback column if header not found: Month order (October -> Column E [index 4], November -> F [index 5], December -> G [index 6])
    if (targetColIndex === -1) {
      const monthMap: Record<string, number> = {
        january: 3,
        february: 4,
        march: 5,
        april: 6,
        may: 7,
        june: 8,
        july: 9,
        august: 10,
        september: 11,
        october: 12,
        november: 13,
        december: 14,
      };
      for (const [mName, cNum] of Object.entries(monthMap)) {
        if (cleanMonth.includes(mName)) {
          targetColIndex = cNum;
          break;
        }
      }
      if (targetColIndex === -1) {
        targetColIndex = 4; // Default to Column E
      }
    }

    const targetColLetter = columnIndexToLetter(targetColIndex);

    // 5. Match Account Name in Column C (Index 2)
    // Build a map of lowercase account name -> 1-based row number
    const accountRowMap = new Map<string, number>();
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      // Column C is index 2, but also check column B or A if C is empty
      const colCVal = String(row[2] || '').trim();
      const colBVal = String(row[1] || '').trim();
      const colAVal = String(row[0] || '').trim();

      const candidate = colCVal || colBVal || colAVal;
      if (candidate) {
        accountRowMap.set(candidate.toLowerCase(), rIdx + 1);
        // Also map simplified alphanumeric
        accountRowMap.set(candidate.toLowerCase().replace(/[^a-z0-9]/g, ''), rIdx + 1);
      }
    }

    const valueUpdates: Array<{ range: string; values: any[][] }> = [];
    const matchedAccounts: SheetUpdateResult['matchedAccounts'] = [];
    const unmatchedAccounts: string[] = [];

    results.forEach((item) => {
      const rawName = item.name.trim();
      const keyExact = rawName.toLowerCase();
      const keyAlpha = keyExact.replace(/[^a-z0-9]/g, '');

      let matchedRow = accountRowMap.get(keyExact) || accountRowMap.get(keyAlpha);

      // Partial fuzzy search if exact not found
      if (!matchedRow) {
        for (const [existingName, rowNum] of accountRowMap.entries()) {
          if (existingName.includes(keyExact) || keyExact.includes(existingName)) {
            matchedRow = rowNum;
            break;
          }
        }
      }

      if (matchedRow) {
        const cellRange = `${firstSheetTitle}!${targetColLetter}${matchedRow}`;
        valueUpdates.push({
          range: cellRange,
          values: [[item.actualAvgViews]],
        });
        matchedAccounts.push({
          account: item.name,
          row: matchedRow,
          column: targetColLetter,
          value: item.actualAvgViews,
        });
      } else {
        unmatchedAccounts.push(item.name);
      }
    });

    if (valueUpdates.length === 0) {
      return {
        success: false,
        error: 'NO_ACCOUNTS_MATCHED',
        message: `Could not match any of the ${results.length} account names in Column C of spreadsheet "${firstSheetTitle}".`,
        sheetId,
        month,
        updatedRows: 0,
        unmatchedAccounts,
      };
    }

    // 6. Execute Google Sheets batchUpdate
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
      {
        valueInputOption: 'USER_ENTERED',
        data: valueUpdates,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return {
      success: true,
      message: `Successfully pushed ${valueUpdates.length} account metrics to Google Sheet (Column ${targetColLetter}, ${month})!`,
      sheetId,
      month,
      updatedRows: valueUpdates.length,
      matchedAccounts,
      unmatchedAccounts,
    };
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error?.message ||
      err.response?.data?.error_description ||
      err.message ||
      'Unknown Google Sheets API error';
    console.error('Google Sheets API push error:', errorMsg);
    return {
      success: false,
      error: 'API_ERROR',
      message: `Failed to push metrics to Google Sheets: ${errorMsg}`,
      sheetId,
      month,
    };
  }
}

export interface BonusSheetVideoPayload {
  id?: string;
  platform: string;
  accountHandle: string;
  accountDisplayName?: string;
  title?: string;
  viewsCount: number;
  likesCount?: number;
  commentsCount?: number;
  bonusTier?: string;
  publishedAt?: string;
  permalink?: string | null;
}

export interface BonusSheetSyncResult {
  success: boolean;
  message: string;
  sheetId?: string;
  tabName?: string;
  month?: string;
  syncedVideosCount?: number;
  syncedItems?: Array<{
    accountHandle: string;
    platform: string;
    title: string;
    viewsCount: number;
    bonusTier: string;
    publishedDate: string;
  }>;
  error?: string;
  simulated?: boolean;
}

/**
 * Extracts raw Google Spreadsheet ID if a full docs.google.com/spreadsheets/d/<ID>/... URL was passed
 */
export function extractSpreadsheetId(input?: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return raw;
}

/**
 * Pushes 50K+ qualifying Bonus Tracker videos for a target month/period to a Google Sheet tab
 */
export async function pushBonusVideosToSheet(
  month: string,
  videos: BonusSheetVideoPayload[],
  customSheetId?: string,
  customTabName?: string
): Promise<BonusSheetSyncResult> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const rawSheetInput =
    customSheetId ||
    process.env.BONUS_TRACKER_SHEET_ID ||
    process.env.PERFORMANCE_TRACKER_SHEET_ID ||
    '';
  const sheetId = extractSpreadsheetId(rawSheetInput);
  const desiredTabName = (customTabName || 'Bonus Tracker').trim();

  // Filter strictly for >= 50,000 views
  const qualifyingVideos = (videos || []).filter((v) => (Number(v.viewsCount) || 0) >= 50000);

  const syncedItems = qualifyingVideos.map((v) => {
    const views = Number(v.viewsCount) || 0;
    const tier =
      v.bonusTier ||
      (views >= 1_000_000
        ? '1M+ Mega Viral Bonus'
        : views >= 500_000
        ? '500K+ Super Bonus'
        : views >= 100_000
        ? '100K+ High Performer'
        : '50K+ Bonus Qualified');
    const pubDate = v.publishedAt && !isNaN(new Date(v.publishedAt).getTime())
      ? new Date(v.publishedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return {
      accountHandle: v.accountHandle || '',
      platform: String(v.platform || '').toUpperCase(),
      title: v.title || '50K+ Bonus Video',
      viewsCount: views,
      bonusTier: tier,
      publishedDate: pubDate,
    };
  });

  if (!email || !privateKey || !sheetId) {
    const missing: string[] = [];
    if (!email) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
    if (!sheetId) missing.push('BONUS_TRACKER_SHEET_ID / Spreadsheet ID');

    return {
      success: false,
      error: 'MISSING_CREDENTIALS',
      message: `Google Sheets service account credentials missing in .env (${missing.join(
        ', '
      )}). Prepared ${qualifyingVideos.length} qualifying 50K+ bonus video rows for "${month}" — you can copy the rows directly into Google Sheets below or configure the Service Account.`,
      simulated: true,
      month,
      sheetId: sheetId || 'Not Configured',
      tabName: desiredTabName,
      syncedVideosCount: qualifyingVideos.length,
      syncedItems,
    };
  }

  try {
    // 1. Authenticate with Google Sheets API
    const accessToken = await getGoogleServiceAccountToken(email, privateKey);

    // 2. Fetch Spreadsheet Metadata to find or create the Bonus Tracker tab
    const metaRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }
    );

    const existingSheets: Array<{ properties?: { title?: string } }> =
      metaRes.data?.sheets || [];
    let targetTabTitle =
      existingSheets.find(
        (s) =>
          String(s.properties?.title || '').toLowerCase() === desiredTabName.toLowerCase()
      )?.properties?.title || '';

    if (!targetTabTitle) {
      // Try creating the Bonus Tracker tab automatically
      try {
        await axios.post(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
          {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: desiredTabName,
                  },
                },
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );
        targetTabTitle = desiredTabName;
      } catch {
        // Fallback to first sheet if addSheet isn't permitted
        targetTabTitle = existingSheets[0]?.properties?.title || 'Sheet1';
      }
    }

    // 3. Check if header row exists in A1:L1
    const headerRange = `${targetTabTitle}!A1:L1`;
    const headerRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
        headerRange
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }
    );

    const existingHeader = headerRes.data?.values?.[0] || [];
    const headerColumns = [
      'Bonus Period / Month',
      'Published Date',
      'Platform',
      'Account Handle',
      'Account Name',
      'Video Title',
      'Views (50K+ Qualified)',
      'Likes',
      'Comments',
      'Bonus Tier',
      'Video Link',
      'Synced Timestamp',
    ];

    if (existingHeader.length === 0) {
      await axios.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
          headerRange
        )}?valueInputOption=USER_ENTERED`,
        {
          range: headerRange,
          majorDimension: 'ROWS',
          values: [headerColumns],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
    }

    // 4. Build rows for all 50K+ qualifying videos
    const syncedAtStr = new Date().toISOString();
    const rowsToAppend = qualifyingVideos.map((v, i) => {
      const item = syncedItems[i];
      return [
        month,
        item.publishedDate,
        item.platform,
        item.accountHandle,
        v.accountDisplayName || item.accountHandle,
        item.title,
        item.viewsCount,
        Number(v.likesCount) || 0,
        Number(v.commentsCount) || 0,
        item.bonusTier,
        v.permalink || '',
        syncedAtStr,
      ];
    });

    // 5. Append rows to the target sheet tab
    const appendRange = `${targetTabTitle}!A:L`;
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
        appendRange
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        majorDimension: 'ROWS',
        values: rowsToAppend,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return {
      success: true,
      message: `Successfully synced ${rowsToAppend.length} qualifying 50K+ bonus videos (${month}) to Google Sheet tab "${targetTabTitle}"!`,
      sheetId,
      tabName: targetTabTitle,
      month,
      syncedVideosCount: rowsToAppend.length,
      syncedItems,
    };
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error?.message ||
      err.response?.data?.error_description ||
      err.message ||
      'Unknown Google Sheets API error';
    console.error('Google Sheets Bonus Tracker push error:', errorMsg);
    return {
      success: false,
      error: 'API_ERROR',
      message: `Failed to sync 50K+ bonus videos to Google Sheets: ${errorMsg}`,
      sheetId,
      tabName: desiredTabName,
      month,
      syncedVideosCount: 0,
      syncedItems,
    };
  }
}
