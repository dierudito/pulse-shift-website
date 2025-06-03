// src/features/time-clocking/types/timeEntryTypes.ts

/**
 * @enum EntryType
 * @description Type of time entry.
 */
export enum EntryType {
  ClockIn = "ClockIn",
  ClockOut = "ClockOut",
  BreakStart = "BreakStart",
  BreakEnd = "BreakEnd",
}

/**
 * @interface TimeEntry
 * @description Represents a single time entry record, with dates as Date objects.
 */
export interface TimeEntry {
  $id: string;
  id: string;
  entryDate: Date; // Changed to Date object
  entryType: EntryType;
  createdAt?: Date; // Changed to Date object, optional
}

/**
 * @interface TimeEntryData
 * @description Data structure for the time entry endpoint response.
 */
export interface TimeEntryData extends TimeEntry {}


/**
 * @interface TodaysDuration
 * @description Represents the total work duration for today.
 */
export interface TodaysDuration {
  $id: string;
  hour: number;
  minute: number;
  second: number;
  formattedTime: string;
}

/**
 * @interface DailySchedule
 * @description Represents the expected clocking schedule for a day.
 */
export interface DailySchedule {
  $id: string;
  clockIn: string; // HH:mm format
  breakStart: string; // HH:mm format
  breakEnd: string; // HH:mm format
  clockOut: string; // HH:mm format
}/**
 * @interface ClockedTimeEntryData
 * @description Data structure for the POST /clock endpoint response, with dates as Date objects.
 * This was previously TimeEntryData.
 */
export interface ClockedTimeEntryData {
  $id: string;
  id: string;
  entryDate: Date; // Changed to Date object
  entryType: EntryType;
}

/**
 * @interface RawDailyTimeEntry
 * @description Raw structure for items in GET /time-entries/today response, with dates as strings.
 * This is an intermediate type before parsing.
 */
interface RawDailyTimeEntry {
    $id: string;
    id: string;
    entryDate: string; // Format "DD/MM/YYYY HH:mm"
    entryType: EntryType;
    createdAt: string; // Format "DD/MM/YYYY HH:mm"
}

/**
 * @interface TodaysEntriesApiResponse
 * @description Raw structure for GET /time-entries/today response.
 */
export interface TodaysEntriesApiResponse {
    $id: string;
    data: {
        $id: string;
        $values: RawDailyTimeEntry[];
    }
}
