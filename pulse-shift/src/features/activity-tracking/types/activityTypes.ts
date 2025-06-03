// src/features/activity-tracking/types/activityTypes.ts

/**
 * @interface ActivityPeriod
 * @description Represents a period of work within an activity.
 */
export interface ActivityPeriod {
  $id: string;
  id: string;
  startDate: string; // ISO date string
  endDate?: string | null; // ISO date string, can be null if period is active
  startAssociatedTimeEntryId?: string | null;
  endAssociatedTimeEntryId?: string | null;
  createdAt: string; // ISO date string
}

/**
 * @interface Activity
 * @description Represents a work activity.
 */
export interface Activity {
  $id: string; // Assuming $id is part of the nested data object as well
  id: string;
  description: string | null;
  cardCode: string;
  cardLink: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  periods: {
    $id: string;
    $values: ActivityPeriod[];
  };
  isCurrentlyActive: boolean;
}

/**
 * @interface ActivityData
 * @description Data structure for activity-related endpoint responses.
 */
export interface ActivityData extends Activity {}

/**
 * @interface CreateActivityPayload
 * @description Payload for creating/starting an activity.
 */
export interface CreateActivityPayload {
  description?: string;
  cardCode: string;
  cardLink?: string;
  startDate: string; // ISO date string
}

/**
 * @interface FinishActivityPayload
 * @description Payload for finishing an activity period.
 */
export interface FinishActivityPayload {
  endDate: string; // ISO date string
}

/**
 * @interface RestartActivityPayload
 * @description Payload for restarting (starting a new period for) an activity.
 * This will re-use the structure of CreateActivityPayload for the new period.
 */
export interface RestartActivityPayload {
    startDate: string; // ISO date string
    // Include other fields if the API expects them for restarting with existing cardCode
    description?: string;
    cardLink?: string;
}


/**
 * @interface ActivityWorkDetails
 * @description Detailed information about work done on an activity.
 */
export interface ActivityWorkDetails extends Activity {
  totalWorkedHours: string; // e.g., "2,92"
  firstOverallStartDate: string; // e.g., "20/05/2025 14:10"
  lastOverallEndDate: string | null; // e.g., "21/05/2025 17:24"
}

/**
 * @interface ActivitySummaryItem
 * @description Represents a summary of an activity for dropdowns.
 */
export interface ActivitySummaryItem {
  $id: string;
  id: string; // UUID of the activity
  cardCode: string;
  description: string | null;
  displayName: string;
}

/**
 * @interface ActivitiesSummaryApiResponseData
 * @description Represents the 'data' part of the activities summary API response.
 */
interface ActivitiesSummaryApiResponseData {
  $id: string;
  $values: ActivitySummaryItem[];
}

/**
 * @interface ActivitiesSummaryApiResponse
 * @description Represents the full API response for activity summaries.
 */
export interface ActivitiesSummaryApiResponse {
  $id: string;
  data: ActivitiesSummaryApiResponseData;
  message?: string;
}

/**
 * @interface SelectOption
 * @description Structure for options used by react-select component.
 * 'value' will typically be the activity's cardCode or id.
 * 'label' will be the activity's displayName.
 */
export interface SelectOption {
  value: string; // cardCode or id
  label: string; // displayName
  // You can add the full ActivitySummaryItem here if needed for direct access
  originalData?: ActivitySummaryItem;
}