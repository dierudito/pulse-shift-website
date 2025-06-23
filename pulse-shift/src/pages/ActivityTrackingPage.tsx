import React, { useState, useEffect, useCallback, useRef } from 'react';
import Select from 'react-select';
import { DateRangePicker, type RangeKeyDict, type Range } from 'react-date-range'; 
import InfiniteScroll from 'react-infinite-scroll-component';
import { FaPlay, FaStop, FaEye } from 'react-icons/fa';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, setDate } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import * as locales from 'date-fns/locale'; 
import {
  startActivity,
  finishActivity,
  restartActivity,
  getActivityWorkDetails,
  getActivitySummaries,
  getPaginatedActivities,
  type GetPaginatedActivitiesParams, 
} from '../features/activity-tracking/services/activityService';
import type {
  ActivityData,
  CreateActivityPayload,
  FinishActivityPayload,
  RestartActivityPayload,
  ActivityWorkDetails,
  ActivitySummaryItem,
  SelectOption,
  PaginatedActivityItem,
  PaginatedActivitiesResponseData,
} from '../features/activity-tracking/types/activityTypes';
import styles from './ActivityTrackingPage.module.css';
import { getISOStringInSaoPauloTZ } from '../utils/dateFormatter';

/**
 * @interface ActivityTrackingPageProps
 * @description Props for the ActivityTrackingPage component.
 */
interface ActivityTrackingPageProps {}

/**
 * @function getCurrentISODateTime
 * @description Gets the current date and time in ISO format.
 * @returns {string} ISO date-time string.
 */
const getCurrentISODateTime = (): string => {
  return new Date().toISOString();
};

/**
 * @function formatDateForAPI
 * @description Formats a Date object into YYYY-MM-DD string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

  /**
 * @function getCurrentFortnightRange
 * @description Calculates the start and end dates for the current fortnight.
 * @param {Date} currentDate - The current date.
 * @returns {Range} An object with startDate and endDate for the current fortnight.
 */
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

/**
 * @function ActivityTrackingPage
 * @description Page for managing work activities.
 * @param {ActivityTrackingPageProps} props - The props for the component.
 * @returns {JSX.Element} The rendered activity tracking page.
 */
const ActivityTrackingPage: React.FC<ActivityTrackingPageProps> = () => {
  const [cardCode, setCardCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [cardLink, setCardLink] = useState<string>('');

  const [managedCardCode, setManagedCardCode] = useState<string>(''); // Continuará guardando o cardCode string
  const [selectedActivityOption, setSelectedActivityOption] = useState<SelectOption | null>(null);
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummaryItem[]>([]);
  const [activityOptions, setActivityOptions] = useState<SelectOption[]>([]);

  const [currentActivity, setCurrentActivity] = useState<ActivityData | ActivityWorkDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSummariesLoading, setIsSummariesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<Range[]>([
    getCurrentFortnightRange(new Date()),
  ]);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [activitiesHistory, setActivitiesHistory] = useState<PaginatedActivityItem[]>([]);
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyHasMore, setHistoryHasMore] = useState<boolean>(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const PAGE_SIZE = 10; 

  /**
   * @function getCurrentISODateTime
   * @description Gets the current date and time in ISO format.
   * @returns {string} ISO date-time string.
   */
  const getCurrentISODateTime = (): string => {
    const formattedDate = getISOStringInSaoPauloTZ();
    console.log("Current ISO DateTime in São Paulo TZ:", formattedDate);
    return formattedDate;
  };

  // Fetch activity summaries on component mount
  useEffect(() => {
    const fetchSummaries = async () => {
      setIsSummariesLoading(true);
      try {
        const summaries = await getActivitySummaries();
        setActivitySummaries(summaries);
        const options = summaries.map(summary => ({
          value: summary.cardCode,
          label: summary.displayName,
          originalData: summary,
        }));
        setActivityOptions(options);
      } catch (err) {
        console.error("Failed to fetch activity summaries:", err);
        setError(err instanceof Error ? err.message : 'Falha ao carregar lista de atividades.');
      } finally {
        setIsSummariesLoading(false);
      }
    };
    fetchSummaries();
  }, []);

  const fetchActivitiesHistory = useCallback(async (page: number, replaceData = false) => {
    if (isHistoryLoading) return;
    setIsHistoryLoading(true);
    setHistoryError(null);
    
    const params: GetPaginatedActivitiesParams = {
      filterStartDate: formatDateForAPI(dateRange[0].startDate || new Date()),
      filterEndDate: formatDateForAPI(dateRange[0].endDate || new Date()),
      pageNumber: page,
      pageSize: PAGE_SIZE,
    };

    try {
      const response = await getPaginatedActivities(params);
      setActivitiesHistory(prev => replaceData ? response.data.$values : [...prev, ...response.data.$values]);
      setHistoryCurrentPage(response.pageNumber);
      setHistoryTotalPages(response.totalPages);
      setHistoryHasMore(response.pageNumber < response.totalPages);
    } catch (err) {
      console.error("Failed to fetch activities history:", err);
      setHistoryError(err instanceof Error ? err.message : 'Falha ao carregar histórico de atividades.');
      setHistoryHasMore(false);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [dateRange]);

//  useEffect(() => {
//    setActivitiesHistory([]);
//    setHistoryCurrentPage(1);
//    setHistoryHasMore(true);
//    fetchActivitiesHistory(1, true);
//  }, [dateRange]);
  
  const refreshTableData = useCallback(() => {
    setActivitiesHistory([]);
    setHistoryCurrentPage(1);
    setHistoryHasMore(true);
    fetchActivitiesHistory(1, true);
  }, [fetchActivitiesHistory]);

  useEffect(() => {
    refreshTableData();
  }, [dateRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [datePickerRef]);



  /**
   * @async
   * @function handleStartActivity
   * @description Handles starting a new activity.
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
   */
  const handleStartActivity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cardCode.trim()) {
      setError("O código do card é obrigatório para iniciar uma atividade.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    const payload: CreateActivityPayload = {
      cardCode,
      description: description || undefined,
      cardLink: cardLink || undefined,
      startDate: getCurrentISODateTime(),
    };
    try {
      const newActivity = await startActivity(payload);
      setCurrentActivity(newActivity);
      setActionMessage(`Atividade ${newActivity.cardCode} iniciada com sucesso.`);
      setCardCode('');
      setDescription('');
      setCardLink('');
      const newOption = activityOptions.find(opt => opt.value === newActivity.cardCode);
      if (newOption) {
          setSelectedActivityOption(newOption);
          setManagedCardCode(newActivity.cardCode);
      } else {
        setManagedCardCode(newActivity.cardCode);
        setSelectedActivityOption({value: newActivity.cardCode, label: newActivity.cardCode }); 
      }
      refreshTableData();
    } catch (err) {
      console.error("Failed to start activity:", err);
      setError(err instanceof Error ? err.message : 'Falha ao iniciar atividade.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @function handleManagedActivityChange
   * @description Handles selection change in the activity dropdown.
   * @param {SelectOption | null} selectedOption - The selected option from react-select.
   */
  const handleManagedActivityChange = (selectedOption: SelectOption | null) => {
    setSelectedActivityOption(selectedOption);
    setManagedCardCode(selectedOption ? selectedOption.value : '');
    setCurrentActivity(null);
    setError(null);
    setActionMessage(null);
  };

  /**
   * @async
   * @function handleFinishActivity
   * @description Handles finishing the current period of an activity.
   */
  const handleFinishActivity = async (targetCardCode?: string) => {
    const codeToFinish = targetCardCode || managedCardCode;
    if (!codeToFinish.trim()) {
        setError("Nenhuma atividade selecionada para finalizar.");
        return;
    }
    // ... (resto da função igual)
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    const payload: FinishActivityPayload = {
      endDate: getCurrentISODateTime(),
    };
    try {
      const updatedActivity = await finishActivity(codeToFinish, payload);
      if (codeToFinish === managedCardCode) {
          setCurrentActivity(updatedActivity);
      }
      setActionMessage(`Atividade ${updatedActivity.cardCode} finalizada com sucesso.`);
      refreshTableData();
    } catch (err) {
      console.error("Failed to finish activity:", err);
      setError(err instanceof Error ? err.message : 'Falha ao finalizar atividade.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @async
   * @function handleRestartActivity
   * @description Handles restarting an activity (starting a new period).
   */
  const handleRestartActivity = async (targetCardCode?: string, targetDescription?: string | null, targetCardLink?: string | null) => {
    const codeToRestart = targetCardCode || managedCardCode;
    if (!codeToRestart.trim()) {
        setError("Nenhuma atividade selecionada para reiniciar.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setActionMessage(null);

    const desc = targetDescription !== undefined ? targetDescription : (selectedActivityOption?.originalData?.description || (currentActivity as ActivityData)?.description || '');
    const link = targetCardLink !== undefined ? targetCardLink : ((currentActivity as ActivityData)?.cardLink || '');

    const payload: RestartActivityPayload & { cardCode: string; description?: string; cardLink?: string} = {
      cardCode: codeToRestart,
      startDate: getCurrentISODateTime(),
      description: desc || undefined,
      cardLink: link || undefined,
    };
    try {
      const updatedActivity = await restartActivity(codeToRestart, payload); // Passando codeToRestart como primeiro argumento (embora não seja usado no URL do POST)
      if (codeToRestart === managedCardCode) {
          setCurrentActivity(updatedActivity);
      }
      setActionMessage(`Atividade ${updatedActivity.cardCode} reiniciada com sucesso.`);
      refreshTableData();
    } catch (err) {
      console.error("Failed to restart activity:", err);
      setError(err instanceof Error ? err.message : 'Falha ao reiniciar atividade.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @async
   * @function handleGetWorkDetails
   * @description Fetches and displays work details for an activity.
   */
  const handleGetWorkDetails = async (targetCardCode?: string) => {
    const codeToView = targetCardCode || managedCardCode;
    if (!codeToView.trim()) {
        setError("Nenhuma atividade selecionada para buscar detalhes.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const details = await getActivityWorkDetails(codeToView);
      setCurrentActivity(details);
      setManagedCardCode(codeToView);
      const option = activityOptions.find(opt => opt.value === codeToView);
      setSelectedActivityOption(option || null);

      setActionMessage(null);
    } catch (err) {
      console.error("Failed to get activity details:", err);
      setError(err instanceof Error ? err.message : 'Falha ao buscar detalhes da atividade.');
      setCurrentActivity(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Ações da tabela
  const handleTablePlay = (item: PaginatedActivityItem) => {
    handleRestartActivity(item.cardCode, item.description, null);
  };

  const handleTableStop = (item: PaginatedActivityItem) => {
    handleFinishActivity(item.cardCode);
  };

  const handleTableShowDetails = (item: PaginatedActivityItem) => {
    handleGetWorkDetails(item.cardCode);
    const detailSection = document.getElementById("manageActivitySection");
    detailSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const predefinedRanges: { label: string; range: () => Range }[] = [
    { label: 'Hoje', range: () => ({ startDate: new Date(), endDate: new Date() }) },
    { label: 'Ontem', range: () => ({ startDate: addDays(new Date(), -1), endDate: addDays(new Date(), -1) }) },
    { label: 'Esta Semana', range: () => ({ startDate: startOfWeek(new Date(), {locale: locales.ptBR}), endDate: endOfWeek(new Date(), {locale: locales.ptBR}) }) },
    { label: 'Semana Passada', range: () => ({ startDate: startOfWeek(addDays(new Date(), -7), {locale: locales.ptBR}), endDate: endOfWeek(addDays(new Date(), -7), {locale: locales.ptBR}) }) },
    { 
      label: '1ª Quinzena (Este Mês)', 
      range: () => {
        const today = new Date();
        return { 
          startDate: startOfMonth(today), 
          endDate: setDate(startOfMonth(today), 15) 
        };
      } 
    },
    { 
      label: '2ª Quinzena (Este Mês)', 
      range: () => {
        const today = new Date();
        return { 
          startDate: setDate(startOfMonth(today), 16), 
          endDate: endOfMonth(today) 
        };
      } 
    },
    { label: 'Este Mês', range: () => ({ startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) }) },
    { label: 'Mês Passado', range: () => ({ startDate: startOfMonth(subMonths(new Date(), 1)), endDate: endOfMonth(subMonths(new Date(), 1)) }) },
  ];

  const handleDateRangeChange = (ranges: RangeKeyDict) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  return (
    <div className={styles.activityContainer}>
      <h2>Registro de Atividades</h2>

      {error && <p className={styles.errorMessage}>Erro: {error}</p>}
      {actionMessage && <p className={styles.successMessage}>{actionMessage}</p>}

      <form onSubmit={handleStartActivity} className={styles.activityForm}>
        <h3>Iniciar Nova Atividade</h3>
        <div className={styles.formGroup}>
          <label htmlFor="cardCode">Código do Card (obrigatório):</label>
          <input
            type="text"
            id="cardCode"
            value={cardCode}
            onChange={(e) => setCardCode(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="description">Descrição:</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="cardLink">Link do Card:</label>
          <input
            type="url"
            id="cardLink"
            value={cardLink}
            onChange={(e) => setCardLink(e.target.value)}
            className={styles.input}
          />
        </div>
        <button type="submit" disabled={isLoading} className={styles.actionButton}>
          {isLoading ? 'Iniciando...' : 'Iniciar Atividade'}
        </button>
      </form>

      <div className={styles.manageActivitySection}>
        <h3>Gerenciar Atividade Existente / Ver Detalhes</h3>
        <div className={styles.formGroup}>
          <label htmlFor="managedActivitySelect">Selecionar Atividade (Card):</label>
          <Select
            inputId="managedActivitySelect"
            options={activityOptions}
            value={selectedActivityOption}
            onChange={(opt) => {
                setSelectedActivityOption(opt as SelectOption | null);
                setManagedCardCode(opt ? (opt as SelectOption).value : '');
                setCurrentActivity(null); setError(null); setActionMessage(null);
            }}
            isLoading={isSummariesLoading}
            isClearable
            isSearchable
            placeholder="Digite ou selecione um card..."
            noOptionsMessage={() => isSummariesLoading ? "Carregando atividades..." : "Nenhuma atividade encontrada"}
            classNamePrefix="react-select"
            styles={{
                control: (baseStyles) => ({
                  ...baseStyles,
                  borderColor: '#ccc',
                  minHeight: 'calc(1.5em + 1.5rem + 2px)',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#ccc',
                  },
                }),
                input: (baseStyles) => ({
                    ...baseStyles,
                    paddingTop: '0.375rem',
                    paddingBottom: '0.375rem',
                }),
                placeholder: (baseStyles) => ({
                    ...baseStyles,
                    color: '#6c757d',
                }),
              }}
          />
        </div>
        <div className={styles.actionButtonsGroup}>
            <button 
              onClick={() => handleGetWorkDetails()} 
              disabled={isLoading || !managedCardCode} 
              className={styles.actionButton}>
                {isLoading && 
                managedCardCode && 
                currentActivity === null ? 'Buscando...' : 'Ver Detalhes'}
            </button>
            <button 
              onClick={() => handleFinishActivity()} 
              disabled={isLoading || !managedCardCode || !(currentActivity as ActivityData)?.isCurrentlyActive} 
              className={`${styles.actionButton} ${styles.finishButton}`}>
                {isLoading && 
                managedCardCode && 
                (currentActivity as ActivityData)?.isCurrentlyActive ? 'Finalizando...' : 'Finalizar Atividade'}
            </button>
            <button 
              onClick={() => handleRestartActivity()} 
              disabled={isLoading || !managedCardCode || (currentActivity as ActivityData)?.isCurrentlyActive} 
              className={`${styles.actionButton} ${styles.restartButton}`}>
                {isLoading && 
                managedCardCode && 
                !(currentActivity as ActivityData)?.isCurrentlyActive ? 'Reiniciando...' : 'Reiniciar Atividade'}
            </button>
        </div>
      </div>
      {currentActivity && (
        <div className={styles.activityDetails}>
          <h4>Detalhes da Atividade: {currentActivity.cardCode}</h4>
          <p><strong>Status:</strong> {currentActivity.isCurrentlyActive ? 'Ativa' : 'Inativa'}</p>
          <p><strong>Descrição:</strong> {currentActivity.description || 'N/A'}</p>
          <p><strong>Link:</strong> {currentActivity.cardLink ? <a href={currentActivity.cardLink} target="_blank" rel="noopener noreferrer">{currentActivity.cardLink}</a> : 'N/A'}</p>
          <p><strong>Criada em:</strong> {new Date(currentActivity.createdAt).toLocaleString('pt-BR')}</p>
          <p><strong>Atualizada em:</strong> {new Date(currentActivity.updatedAt).toLocaleString('pt-BR')}</p>

          {'totalWorkedHours' in currentActivity && (
            <>
              <p><strong>Total de Horas Trabalhadas:</strong> {(currentActivity as ActivityWorkDetails).totalWorkedHours}</p>
              <p><strong>Início Geral:</strong> {(currentActivity as ActivityWorkDetails).firstOverallStartDate || 'N/A'}</p>
              <p><strong>Fim Geral:</strong> {(currentActivity as ActivityWorkDetails).lastOverallEndDate || 'N/A'}</p>
            </>
          )}

          <h5>Períodos de Trabalho:</h5>
          {currentActivity.periods && currentActivity.periods.$values.length > 0 ? (
            <ul className={styles.periodsList}>
              {currentActivity.periods.$values.map(period => (
                <li key={period.id} className={styles.periodItem}>
                  Início: {new Date(period.startDate).toLocaleString('pt-BR')}
                  {period.endDate ? ` - Fim: ${new Date(period.endDate).toLocaleString('pt-BR')}` : ' (Em progresso)'}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum período de trabalho registrado.</p>
          )}
        </div>
      )}

      <div className={styles.historySection}>
        <h3>Histórico de Atividades</h3>
        <div className={styles.dateFilterContainer} ref={datePickerRef}>
          <label htmlFor="dateRangeInput" className={styles.dateRangeLabel}>Filtrar por Período:</label>
          <input
            type="text"
            id="dateRangeInput"
            readOnly
            value={`${formatDateForAPI(dateRange[0].startDate || new Date())} até ${formatDateForAPI(dateRange[0].endDate || new Date())}`}
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
                staticRanges={predefinedRanges.map(r => ({
                    label: r.label,
                    range: r.range,
                    isSelected: () => {
                        const definedRange = r.range();
                        return (
                            formatDateForAPI(definedRange.startDate || new Date()) === formatDateForAPI(dateRange[0].startDate || new Date()) &&
                            formatDateForAPI(definedRange.endDate || new Date()) === formatDateForAPI(dateRange[0].endDate || new Date())
                        );
                    }
                }))}
                inputRanges={[]}
              />
            </div>
          )}
        </div>

        {historyError && <p className={styles.errorMessage}>Erro ao carregar histórico: {historyError}</p>}
        
        <div id="scrollableDiv" className={styles.tableContainer}>
          <InfiniteScroll
            dataLength={activitiesHistory.length}
            next={() => fetchActivitiesHistory(historyCurrentPage + 1)}
            hasMore={historyHasMore}
            loader={<p className={styles.loader}>Carregando mais atividades...</p>}
            endMessage={<p className={styles.endMessage}>Fim do histórico.</p>}
            scrollableTarget="scrollableDiv"
          >
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Descrição</th>
                  <th>Tempo Total</th>
                  <th>Última Atualização</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {activitiesHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.cardCode}</td>
                    <td>{item.description || '-'}</td>
                    <td>{item.totalWorkedHours}</td>
                    <td>{item.formattedLastOverallEndDate || '-'}</td>
                    <td>
                      <span className={item.isCurrentlyActive ? styles.statusActive : styles.statusInactive}>
                        {item.isCurrentlyActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      {item.isCurrentlyActive ? (
                        <button onClick={() => handleTableStop(item)} className={styles.actionIcon} title="Parar Atividade">
                          <FaStop color="red" />
                        </button>
                      ) : (
                        <button onClick={() => handleTablePlay(item)} className={styles.actionIcon} title="Iniciar/Continuar Atividade">
                          <FaPlay color="green" />
                        </button>
                      )}
                      <button onClick={() => handleTableShowDetails(item)} className={styles.actionIcon} title="Ver Detalhes">
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </InfiniteScroll>
        </div>
        {isHistoryLoading && activitiesHistory.length === 0 && !historyError && <p className={styles.loader}>Carregando histórico...</p>}

      </div>
    </div>
  );
};

export default ActivityTrackingPage;