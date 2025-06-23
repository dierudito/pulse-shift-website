import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DateRangePicker } from 'react-date-range';
import type { RangeKeyDict, Range } from 'react-date-range';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, setDate } from 'date-fns';
import * as locales from 'date-fns/locale';
import { FaChevronDown, FaChevronUp, FaCheckCircle, FaSyncAlt } from 'react-icons/fa';

import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

import { getCoverageReport } from '../features/reports/services/reportService';
import type { CoverageReport, DailyReport, WorkPeriod } from '../features/reports/types/coverageReportTypes';
import styles from './CoverageReportPage.module.css';

// --- Funções Auxiliares ---
const formatDateForAPI = (date: Date): string => date.toISOString().split('T')[0];
const formatBRLongDate = (dateStr: string): string => new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...options });
const getEfficiencyColor = (efficiency: number): string => `hsl(${efficiency * 1.2}, 70%, 50%)`;

const getCurrentFortnightRange = (currentDate: Date): Range => {
  const day = currentDate.getDate();
  let startDate: Date;
  let endDate: Date;
  if (day <= 15) {
    startDate = startOfMonth(currentDate);
    endDate = setDate(startOfMonth(currentDate), 15);
  } else {
    startDate = setDate(startOfMonth(currentDate), 16);
    endDate = endOfMonth(currentDate);
  }
  return { startDate, endDate, key: 'selection' };
};

// --- Componente Principal ---
const CoverageReportPage: React.FC = () => {
  const [reportData, setReportData] = useState<CoverageReport | null>(null);
  const [dateRange, setDateRange] = useState<Range[]>([getCurrentFortnightRange(new Date())]);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const datePickerRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setExpandedRows({}); // Resetar linhas expandidas
    try {
      const startDate = formatDateForAPI(dateRange[0].startDate || new Date());
      const endDate = formatDateForAPI(dateRange[0].endDate || new Date());
      const data = await getCoverageReport(startDate, endDate);
      setReportData(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar o relatório.');
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const refreshCurrentDayData = useCallback(async () => {
    // Não interromper o usuário se ele já estiver vendo um erro de carga principal
    if (error) return;

    setIsRefreshing(true);
    try {
        const startDate = formatDateForAPI(dateRange[0].startDate!);
        const endDate = formatDateForAPI(dateRange[0].endDate!);
        const newData = await getCoverageReport(startDate, endDate);

        const todayStr = formatDateForAPI(new Date());

        setReportData(currentData => {
            if (!currentData) return newData; // Se não houver dados, define os novos

            const newDailyReportForToday = newData.dailyReports.$values.find(d => d.workingDay === todayStr);

            // Se o dia de hoje não estiver nos novos dados, não faz nada
            if (!newDailyReportForToday) return currentData;

            const updatedDailyValues = currentData.dailyReports.$values.map(oldDaily => 
                oldDaily.workingDay === todayStr ? newDailyReportForToday : oldDaily
            );

            // Se o dia de hoje não existia antes mas agora existe, adiciona-o
            if (!currentData.dailyReports.$values.some(d => d.workingDay === todayStr)) {
                updatedDailyValues.push(newDailyReportForToday);
                // Reordena para manter a data mais recente no topo
                updatedDailyValues.sort((a, b) => new Date(b.workingDay).getTime() - new Date(a.workingDay).getTime());
            }

            return {
                ...newData, // Atualiza os totais do resumo com os novos dados
                dailyReports: {
                    ...newData.dailyReports,
                    $values: updatedDailyValues, // Usa a lista de dias cirurgicamente atualizada
                }
            };
        });

    } catch (err) {
        console.error("Falha ao atualizar dados em background:", err);
        // Opcional: mostrar um erro não-intrusivo, como um toast
        setError(err instanceof Error ? err.message : 'Falha ao atualizar dados.');
    } finally {
        setIsRefreshing(false);
    }
  }, [dateRange, error]); 

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // useEffect para o refresh periódico de 1 minuto
  useEffect(() => {
    const today = new Date();
    const rangeStartDate = dateRange[0].startDate;
    const rangeEndDate = dateRange[0].endDate;

    const isTodayInRange = rangeStartDate && rangeEndDate && 
                           today.getTime() >= rangeStartDate.setHours(0,0,0,0) && 
                           today.getTime() <= rangeEndDate.setHours(23,59,59,999);
    
    // Só ativa o intervalo se hoje estiver dentro do período selecionado
    if (isTodayInRange) {
        const intervalId = setInterval(() => {
            console.log("Refreshing report data for today...");
            refreshCurrentDayData();
        }, 60000); // 60,000 ms = 1 minuto

        return () => {
            clearInterval(intervalId); // Limpa o intervalo ao desmontar o componente ou mudar o período
        };
    }
  }, [dateRange, refreshCurrentDayData]);
  
  // Lógica para fechar o date picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateRangeChange = (ranges: RangeKeyDict) => {
    if (ranges.selection) {
      setDateRange([ranges.selection as Range]);
    }
    setShowDatePicker(false);
  };

  const toggleRowExpansion = (dayId: string) => {
    setExpandedRows(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const predefinedRanges = [
    { label: '1ª Quinzena (Este Mês)', range: () => ({ startDate: startOfMonth(new Date()), endDate: setDate(startOfMonth(new Date()), 15) })},
    { label: '2ª Quinzena (Este Mês)', range: () => ({ startDate: setDate(startOfMonth(new Date()), 16), endDate: endOfMonth(new Date()) })},
    { label: 'Hoje', range: () => ({ startDate: new Date(), endDate: new Date() }) },
    { label: 'Últimos 7 dias', range: () => ({ startDate: addDays(new Date(), -6), endDate: new Date() }) },
    { label: 'Últimos 30 dias', range: () => ({ startDate: addDays(new Date(), -29), endDate: new Date() }) },
    { label: 'Este Mês', range: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
    { label: 'Último Mês', range: () => ({ startDate: startOfMonth(subMonths(new Date(), 1)), endDate: endOfMonth(subMonths(new Date(), 1)) }) },
  ];

  const renderSummaryCards = () => (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Horas da Jornada</span>
        <span className={styles.summaryValue}>{formatNumber(reportData!.totalWorkHoursFromEntries)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Horas Cobertas</span>
        <span className={styles.summaryValue}>{formatNumber(reportData!.totalWorkCoveredByActivities)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Eficiência Geral</span>
        <div 
            className={styles.efficiencyBar} 
            style={{
                '--efficiency-color': getEfficiencyColor(reportData!.efficiency),
                '--efficiency-percent': `${reportData!.efficiency}%`
            } as React.CSSProperties}>
          <span className={styles.summaryValue}>{formatNumber(reportData!.efficiency)}%</span>
        </div>
      </div>
    </div>
  );

  const renderDailyReportRow = (day: DailyReport) => (
    <React.Fragment key={day.$id}>
      <tr className={styles.mainRow}>
        <td>{formatBRLongDate(day.workingDay)}</td>
        <td>{day.clockInTime || '-'}</td>
        <td>{day.clockOutTime || '-'}</td>
        <td>{formatNumber(day.hoursWorked)}</td>
        <td>{formatNumber(day.hoursCoveredByActivities)}</td>
        <td style={{ color: getEfficiencyColor(day.efficiency), fontWeight: 'bold' }}>
          {formatNumber(day.efficiency)}%
        </td>
        <td>
          <button onClick={() => toggleRowExpansion(day.$id)} className={styles.expandButton}>
            {expandedRows[day.$id] ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </td>
      </tr>
      {expandedRows[day.$id] && (
        <tr className={styles.detailsRow}>
          <td colSpan={7}>
            <div className={styles.detailsContent}>
              {day.workPeriods.$values.map(period => (
                <div key={period.$id} className={styles.workPeriodSection}>
                  <h4 className={styles.workPeriodTitle}>
                    Período de Trabalho ({period.entryType === 'ClockIn' ? 'Pós-Entrada' : 'Pós-Pausa'}) - {period.startTime} às {period.endTime}
                  </h4>
                  <ul className={styles.activityList}>
                    {period.activities.$values.map(activity => (
                      <li key={activity.$id} className={styles.activityItem}>
                        <span className={styles.activityName}>{activity.displayName}</span>
                        <span className={styles.activityPeriod}>{activity.workingPeriod}</span>
                        {activity.workingPeriod.includes('-') && <FaCheckCircle className={styles.checkIcon} title="Período completo" />}
                      </li>
                    ))}
                    {period.activities.$values.length === 0 && <li>Nenhuma atividade registrada neste período.</li>}
                  </ul>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  return (
    <div className={styles.pageContainer}>
      <h2>Relatório de Cobertura de Horas</h2>

      <div className={styles.dateFilterContainer} ref={datePickerRef}>
        <label className={styles.dateRangeLabel}>Período:</label>
        <input
          type="text"
          readOnly
          value={`${formatBRLongDate(formatDateForAPI(dateRange[0].startDate!))} - ${formatBRLongDate(formatDateForAPI(dateRange[0].endDate!))}`}
          onClick={() => setShowDatePicker(prev => !prev)}
          className={styles.dateRangeInputDisplay}
        />
        {showDatePicker && (
          <div className={styles.datePickerPopup}>
            <DateRangePicker
              onChange={handleDateRangeChange}
              moveRangeOnFirstSelection={false}
              months={2}
              ranges={dateRange}
              direction="horizontal"
              locale={locales.ptBR}
              staticRanges={predefinedRanges.map(r => ({ label: r.label, range: r.range, isSelected: () => false }))}
              inputRanges={[]}
            />
          </div>
        )}
      </div>
      
      <div className={`${styles.contentWrapper} ${isLoading || !reportData ? styles.loading : styles.loaded}`}>
        {isLoading && <p>Carregando relatório...</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}
        
        {reportData && (
          <>
            {renderSummaryCards()}
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Início</th>
                  <th>Término</th>
                  <th>Trabalhadas (h)</th>
                  <th>Cobertas (h)</th>
                  <th>Eficiência</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {reportData.dailyReports.$values.map(renderDailyReportRow)}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default CoverageReportPage;