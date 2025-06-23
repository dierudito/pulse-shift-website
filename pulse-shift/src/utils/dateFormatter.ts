import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, format } from 'date-fns'; // Import parseISO and format

/**
 * @function getISOStringInSaoPauloTZ
 * @description Retrieves the current date and time, converts it to the 'America/Sao_Paulo'
 * timezone, and formats it as a complete ISO 8601 string, including the
 * timezone offset.
 * @returns {string} The current date and time in São Paulo as an ISO 8601 compliant string.
 */
export const getISOStringInSaoPauloTZ = (): string => {
  const now = new Date();
  const timeZone = 'America/Sao_Paulo';

  // The format "yyyy-MM-dd'T'HH:mm:ss.SSSXXX" is used to create an ISO 8601 string
  // with the correct timezone offset (e.g., "-03:00").
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
};

/**
 * @function getFormattedCurrentDate
 * @description Retrieves the current date and time and formats it as YYYY-MM-DD HH:mm:ss.
 * @returns {string} The current date and time formatted as a string.
 */
export const getFormattedCurrentDate = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  // getMonth() is zero-based, so we add 1.
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};


/**
 * @function formatBackendDateString
 * @description Parses an ISO-like date string, typically from a backend,
 * and formats it into 'dd/MM/yyyy HH:mm:ss'.
 * @param {string | null | undefined} isoString The date string to format.
 * @returns {string} The formatted date string, or a placeholder if the input is invalid.
 */
export const formatBackendDateString = (isoString: string | null | undefined): string => {
  if (!isoString) {
    return 'N/A'; // Return a placeholder for null, undefined, or empty string input
  }

  try {
    // parseISO is robust and correctly handles the provided format
    const dateObject = parseISO(isoString);
    return format(dateObject, 'dd/MM/yyyy HH:mm:ss');
  } catch (error) {
    console.error('Failed to format date string:', isoString, error);
    return '-'; // Return an error message if parsing fails
  }
};