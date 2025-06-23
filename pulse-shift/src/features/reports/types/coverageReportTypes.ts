/**
 * @interface ActivityDetail
 * @description Details of an activity performed within a work period.
 */
export interface ActivityDetail {
  $id: string;
  id: string;
  cardCode: string;
  displayName: string;
  workingPeriod: string; // e.g., "08:51 - 09:19" or "11:07"
}

/**
 * @interface WorkPeriod
 * @description A segment of work within a day (e.g., between ClockIn and BreakStart).
 */
export interface WorkPeriod {
  $id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hoursWorked: number;
  hoursCoveredByActivities: number;
  efficiency: number;
  entryType: 'ClockIn' | 'BreakEnd'; // Assuming these are the only types for work periods
  activities: {
    $id: string;
    $values: ActivityDetail[];
  };
}

/**
 * @interface DailyReport
 * @description The consolidated report for a single working day.
 */
export interface DailyReport {
  $id: string;
  workingDay: string; // YYYY-MM-DD
  hoursWorked: number;
  hoursCoveredByActivities: number;
  efficiency: number;
  clockInTime: string; // HH:mm
  clockOutTime: string | null; // HH:mm
  workPeriods: {
    $id: string;
    $values: WorkPeriod[];
  };
}

/**
 * @interface CoverageReport
 * @description The main structure for the coverage report data.
 */
export interface CoverageReport {
  $id: string;
  totalWorkHoursFromEntries: number;
  totalWorkCoveredByActivities: number;
  efficiency: number;
  queryStartDate: string; // YYYY-MM-DD
  queryEndDate: string; // YYYY-MM-DD
  dailyReports: {
    $id: string;
    $values: DailyReport[];
  };
}

/**
 * @interface CoverageReportApiResponse
 * @description The full API response structure for the coverage report.
 */
export interface CoverageReportApiResponse {
  $id:string;
  data: CoverageReport;
}