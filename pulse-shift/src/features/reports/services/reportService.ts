import type { CoverageReport, CoverageReportApiResponse } from "../types/coverageReportTypes";

// O endpoint do relatório usa a porta 5000, diferente dos outros.
// Vamos usar a URL completa aqui ou configurar um novo proxy se necessário.
// Para simplificar, vou usar a URL completa, assumindo que o CORS está configurado no backend para aceitar requisições do seu frontend.
// Se ocorrer erro de CORS, a melhor abordagem seria criar um novo proxy no vite.config.ts para /api-reports/
const API_BASE_URL_REPORTS = 'http://localhost:5000/api/v1';

/**
 * @async
 * @function getCoverageReport
 * @description Fetches the work hours vs covered hours report for a given period.
 * @param {string} startDate - The start date in YYYY-MM-DD format.
 * @param {string} endDate - The end date in YYYY-MM-DD format.
 * @returns {Promise<CoverageReport>} The report data.
 * @throws Will throw an error if the API call fails.
 */
export const getCoverageReport = async (startDate: string, endDate: string): Promise<CoverageReport> => {
    const queryParams = new URLSearchParams({
        startDate,
        endDate,
    });

    const response = await fetch(`${API_BASE_URL_REPORTS}/reports?${queryParams.toString()}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error("Get Coverage Report API Error:", errorData);
        throw new Error(`API error: ${response.status} - ${errorData.message || 'Failed to fetch report'}`);
    }

    const result: CoverageReportApiResponse = await response.json();
    return result.data;
};