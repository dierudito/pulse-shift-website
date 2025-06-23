// src/features/activity-tracking/services/activityService.ts
import type { ApiResponse } from '../../../types/apiTypes';
import type {
  ActivityData,
  CreateActivityPayload,
  StartActivityPayload,
  FinishActivityPayload,
  RestartActivityPayload,
  ActivityWorkDetails,
  ActivitySummaryItem,
  ActivitiesSummaryApiResponse,
  PaginatedActivitiesResponseData,
  PaginatedActivitiesApiResponse,
} from '../types/activityTypes';

const API_BASE_URL = 'http://localhost:5000/api/v1';  // Adjust if necessary

/**
 * @async
 * @function getActivitySummaries
 * @description Fetches a summary list of activities.
 * @returns {Promise<ActivitySummaryItem[]>} A list of activity summaries.
 * @throws Will throw an error if the API call fails.
 */
export const getActivitySummaries = async (): Promise<ActivitySummaryItem[]> => {
  const response = await fetch(`${API_BASE_URL}/activities/summary`);
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Get Activity Summaries API Error:", errorData);
    throw new Error(`API error: ${response.statusText} - ${errorData.message || 'Failed to fetch activity summaries'}`);
  }
  const result: ActivitiesSummaryApiResponse = await response.json();
  return result.data.$values;
};

/**
 * @async
 * @function startActivity
 * @description Starts a new activity or a new period for an existing one.
 * @param {CreateActivityPayload} payload - The data for the new activity/period.
 * @returns {Promise<ActivityData>} The data of the created/updated activity.
 * @throws Will throw an error if the API call fails.
 */
export const startActivity = async (payload: CreateActivityPayload): Promise<ActivityData> => {
  const response = await fetch(`${API_BASE_URL}/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Start Activity API Error:", errorData);
    throw new Error(`API error: ${response.statusText} - ${errorData.message || ''}`);
  }
  const result: ApiResponse<ActivityData> = await response.json();
  return result.data;
};

/**
 * @async
 * @function finishActivity
 * @description Finishes the current period of an activity.
 * @param {string} cardCode - The card code of the activity.
 * @param {FinishActivityPayload} payload - The data for finishing the activity period.
 * @returns {Promise<ActivityData>} The updated activity data.
 * @throws Will throw an error if the API call fails.
 */
export const finishActivity = async (cardCode: string, payload: FinishActivityPayload): Promise<ActivityData> => {
  const response = await fetch(`${API_BASE_URL}/activities/${cardCode}/finish`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Finish Activity API Error:", errorData);
    throw new Error(`API error: ${response.statusText} - ${errorData.message || ''}`);
  }
  const result: ApiResponse<ActivityData> = await response.json();
  return result.data;
};

/**
 * @async
 * @function restartActivity
 * @description Restarts an activity by creating a new work period.
 * @param {string} cardCodeParam - The card code of the activity to restart (passed in URL path, but not used if POST /activities)
 * @param {RestartActivityPayload & { cardCode: string; description?: string; cardLink?: string}} payload - The data for the new period.
 * @returns {Promise<ActivityData>} The activity data with the new active period.
 * @throws Will throw an error if the API call fails.
 */
export const restartActivity = async (
    cardCodeParam: string,
    payload: RestartActivityPayload & { cardCode: string; description?: string; cardLink?: string} // Explicitly pass cardCode in body
): Promise<ActivityData> => {
    const { cardCode, startDate, description, cardLink } = payload; 
    const postPayload: CreateActivityPayload = {
        cardCode,
        startDate,
        description,
        cardLink,
    };
    const response = await fetch(`${API_BASE_URL}/activities/${cardCodeParam}/start`, { // Using POST /activities
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Restart Activity (via POST /activities) API Error:", errorData);
        throw new Error(`API error: ${response.statusText} - ${errorData.message || ''}`);
    }
    const result: ApiResponse<ActivityData> = await response.json();
    return result.data;
};


/**
 * @async
 * @function getActivityWorkDetails
 * @description Fetches work details for a specific activity.
 * @param {string} cardCode - The card code of the activity.
 * @returns {Promise<ActivityWorkDetails>} The work details of the activity.
 * @throws Will throw an error if the API call fails.
 */
export const getActivityWorkDetails = async (cardCode: string): Promise<ActivityWorkDetails> => {
  const response = await fetch(`${API_BASE_URL}/activities/${cardCode}/work-details`);
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Get Activity Work Details API Error:", errorData);
    throw new Error(`API error: ${response.statusText} - ${errorData.message || ''}`);
  }
  const result: ApiResponse<ActivityWorkDetails> = await response.json();
  return result.data;
};

/**
 * @interface GetPaginatedActivitiesParams
 * @description Parameters for fetching paginated activities.
 */
export interface GetPaginatedActivitiesParams {
  filterStartDate: string; // YYYY-MM-DD
  filterEndDate: string; // YYYY-MM-DD
  pageNumber: number;
  pageSize: number;
}

/**
 * @async
 * @function getPaginatedActivities
 * @description Fetches a paginated list of activities based on filters.
 * @param {GetPaginatedActivitiesParams} params - Filtering and pagination parameters.
 * @returns {Promise<PaginatedActivitiesResponseData>} The paginated activities data.
 * @throws Will throw an error if the API call fails.
 */
export const getPaginatedActivities = async (params: GetPaginatedActivitiesParams): Promise<PaginatedActivitiesResponseData> => {
  const queryParams = new URLSearchParams({
    filterStartDate: params.filterStartDate,
    filterEndDate: params.filterEndDate,
    pageNumber: String(params.pageNumber),
    pageSize: String(params.pageSize),
  });

  const response = await fetch(`${API_BASE_URL}/activities/paginated?${queryParams.toString()}`);
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON (e.g. HTML error page)
      errorData = { message: response.statusText };
    }
    console.error("Get Paginated Activities API Error:", errorData);
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.message || 'Failed to fetch paginated activities'}`);
  }
  
  const result: PaginatedActivitiesApiResponse = await response.json();
  return result.data;
};