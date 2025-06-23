// src/features/time-clocking/services/timeEntryService.ts
import type { ApiResponse } from '../../../types/apiTypes';
import type { 
  ClockedTimeEntryData,
  TodaysDuration,
  DailySchedule,
  TodaysEntriesApiResponse,
  TimeEntry, // For the parsed result
  EntryType, } from '../types/timeEntryTypes';

const API_BASE_URL = 'http://localhost:5000/api/v1'; // Adjust if necessary

/**
 * @function parseDisplayDateString
 * @description Parses a "DD/MM/YYYY HH:mm" string into a Date object.
 * @param {string} dateString - The date string to parse.
 * @returns {Date | null} A Date object or null if parsing fails.
 */
const parseDisplayDateString = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[3], 10);
    const hour = parseInt(parts[4], 10);
    const minute = parseInt(parts[5], 10);
    return new Date(year, month, day, hour, minute);
  }
  console.warn(`Could not parse date string: ${dateString}`);
  return null;
};

/**
 * @async
 * @function clockTime
 * @description Registers a new time entry (clock-in/out).
 * @returns {Promise<ClockedTimeEntryData>} The data of the new time entry with parsed dates.
 * @throws Will throw an error if the API call fails.
 */
export const clockTime = async (): Promise<ClockedTimeEntryData> => {
  const response = await fetch(`${API_BASE_URL}/time-entries/clock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  // Assuming the raw response for POST /clock has entryDate as ISO string
  const result: ApiResponse<{ $id: string; id: string; entryDate: string; entryType: EntryType }> = await response.json();
  return {
    ...result.data,
    entryDate: new Date(result.data.entryDate), // Parse ISO string to Date
  };
};

/**
 * @async
 * @function getTodaysEntries
 * @description Fetches all time entries for the current day.
 * @returns {Promise<TimeEntry[]>} A list of time entries with parsed dates.
 * @throws Will throw an error if the API call fails.
 */
export const getTodaysEntries = async (): Promise<TimeEntry[]> => {
    const response = await fetch(`${API_BASE_URL}/time-entries/today`);
    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }
    const result: TodaysEntriesApiResponse = await response.json();
    return result.data.$values.map(rawEntry => {
        const parsedEntryDate = parseDisplayDateString(rawEntry.entryDate);
        const parsedCreatedAt = parseDisplayDateString(rawEntry.createdAt);

        if (!parsedEntryDate || !parsedCreatedAt) {
            // Handle error or filter out invalid entries
            console.error("Failed to parse date for entry:", rawEntry);
            // Depending on strictness, you might throw an error or return a partially parsed object
            // For now, let's assume valid dates or filter them. Here, using Date(0) for invalid.
            return {
                ...rawEntry,
                entryDate: parsedEntryDate || new Date(0),
                createdAt: parsedCreatedAt || new Date(0),
            };
        }
        return {
            ...rawEntry,
            entryDate: parsedEntryDate,
            createdAt: parsedCreatedAt,
        };
    }).sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime()); // Ensure entries are sorted
};


/**
 * @async
 * @function getTodaysDuration
 * @description Fetches the total work duration for the current day (pre-calculated by backend).
 * @returns {Promise<TodaysDuration>} The total duration data.
 * @throws Will throw an error if the API call fails.
 */
export const getTodaysDuration = async (): Promise<TodaysDuration> => {
  const response = await fetch(`${API_BASE_URL}/time-entries/duration/today`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const result: ApiResponse<TodaysDuration> = await response.json();
  return result.data;
};

/**
 * @async
 * @function getDailySchedule
 * @description Fetches the expected clocking schedule for a given date.
 * @param {string} date - The date in YYYY-MM-DD format.
 * @returns {Promise<DailySchedule>} The daily schedule data.
 * @throws Will throw an error if the API call fails.
 */
export const getDailySchedule = async (date: string): Promise<DailySchedule> => {
  const response = await fetch(`${API_BASE_URL}/time-entries/schedule/date?date=${date}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const result: ApiResponse<DailySchedule> = await response.json();
  return result.data;
};