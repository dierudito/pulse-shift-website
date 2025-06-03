import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import {
  startActivity,
  finishActivity,
  restartActivity,
  getActivityWorkDetails,
  getActivitySummaries,
} from '../features/activity-tracking/services/activityService';
import type {
  ActivityData,
  CreateActivityPayload,
  FinishActivityPayload,
  RestartActivityPayload,
  ActivityWorkDetails,
  ActivitySummaryItem,
  SelectOption,
} from '../features/activity-tracking/types/activityTypes';
import styles from './ActivityTrackingPage.module.css';

/**
 * @interface ActivityTrackingPageProps
 * @description Props for the ActivityTrackingPage component.
 */
interface ActivityTrackingPageProps {}

/**
 * @function ActivityTrackingPage
 * @description Page for managing work activities.
 * @param {ActivityTrackingPageProps} props - The props for the component.
 * @returns {JSX.Element} The rendered activity tracking page.
 */
const ActivityTrackingPage: React.FC<ActivityTrackingPageProps> = () => {
  // State for starting a new activity
  const [cardCode, setCardCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [cardLink, setCardLink] = useState<string>('');

  // State for managing an existing activity (finish, restart, details)
  const [managedCardCode, setManagedCardCode] = useState<string>('');
  const [selectedActivityOption, setSelectedActivityOption] = useState<SelectOption | null>(null);
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummaryItem[]>([]);
  const [activityOptions, setActivityOptions] = useState<SelectOption[]>([]);

  const [currentActivity, setCurrentActivity] = useState<ActivityData | ActivityWorkDetails | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSummariesLoading, setIsSummariesLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  /**
   * @function getCurrentISODateTime
   * @description Gets the current date and time in ISO format.
   * @returns {string} ISO date-time string.
   */
  const getCurrentISODateTime = (): string => {
    return new Date().toISOString();
  };

  // Fetch activity summaries on component mount
  useEffect(() => {
    const fetchSummaries = async () => {
      setIsSummariesLoading(true);
      try {
        const summaries = await getActivitySummaries();
        setActivitySummaries(summaries);
        const options = summaries.map(summary => ({
          value: summary.cardCode, // Usar cardCode como valor
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
      // Clear form
      setCardCode('');
      setDescription('');
      setCardLink('');
      // Atualizar o dropdown de gerenciamento se o novo cardCode estiver lá
      const newOption = activityOptions.find(opt => opt.value === newActivity.cardCode);
      if (newOption) {
          setSelectedActivityOption(newOption);
          setManagedCardCode(newActivity.cardCode);
      } else {
        // Se a nova atividade não estiver na lista de sumários (pode acontecer se a lista não for atualizada em tempo real)
        // Adicionar manualmente ou recarregar sumários. Por simplicidade, apenas definimos o cardCode.
        setManagedCardCode(newActivity.cardCode);
        setSelectedActivityOption({value: newActivity.cardCode, label: newActivity.cardCode }); // Opção placeholder
         // TODO: Idealmente, recarregar os summaries ou adicionar o novo item à lista de activityOptions
      }
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
  const handleFinishActivity = async () => {
    if (!managedCardCode.trim()) {
        setError("Nenhum card selecionado para finalizar.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    const payload: FinishActivityPayload = {
      endDate: getCurrentISODateTime(),
    };
    try {
      const updatedActivity = await finishActivity(managedCardCode, payload);
      setCurrentActivity(updatedActivity);
      setActionMessage(`Atividade ${updatedActivity.cardCode} finalizada com sucesso.`);
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
  const handleRestartActivity = async () => {
    if (!managedCardCode.trim()) {
        setError("Nenhum card selecionado para reiniciar.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setActionMessage(null);

    const payload: RestartActivityPayload & { cardCode: string; description?: string; cardLink?: string} = {
      cardCode: managedCardCode,
      startDate: getCurrentISODateTime()
    };
    try {
      const updatedActivity = await restartActivity(managedCardCode, payload);
      setCurrentActivity(updatedActivity);
      setActionMessage(`Atividade ${updatedActivity.cardCode} reiniciada com sucesso.`);
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
  const handleGetWorkDetails = async () => {
    if (!managedCardCode.trim()) {
        setError("Digite um código de card para buscar detalhes.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const details = await getActivityWorkDetails(managedCardCode);
      setCurrentActivity(details);
      setActionMessage(null); // No action message, just displaying data
    } catch (err) {
      console.error("Failed to get activity details:", err);
      setError(err instanceof Error ? err.message : 'Falha ao buscar detalhes da atividade.');
      setCurrentActivity(null);
    } finally {
      setIsLoading(false);
    }
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
            onChange={handleManagedActivityChange}
            isLoading={isSummariesLoading}
            isClearable
            isSearchable
            placeholder="Digite ou selecione um card..."
            noOptionsMessage={() => isSummariesLoading ? "Carregando atividades..." : "Nenhuma atividade encontrada"}
            classNamePrefix="react-select" // Para estilização customizada se necessário
            // Estilos inline para combinar com a aparência dos inputs (opcional)
            styles={{
                control: (baseStyles) => ({
                  ...baseStyles,
                  borderColor: '#ccc',
                  minHeight: 'calc(1.5em + 1.5rem + 2px)', // Para igualar altura do input
                  boxShadow: 'none', // Remover boxShadow padrão do react-select ao focar
                  '&:hover': {
                    borderColor: '#ccc',
                  },
                }),
                input: (baseStyles) => ({
                    ...baseStyles,
                    paddingTop: '0.375rem', // Ajustar padding do input interno
                    paddingBottom: '0.375rem',
                }),
                placeholder: (baseStyles) => ({
                    ...baseStyles,
                    color: '#6c757d', // Cor do placeholder similar ao input
                }),
                 // Para customizar a aparência da lista de opções, dropdown, etc.
                 // consulte a documentação do react-select.
              }}
          />
        </div>
        <div className={styles.actionButtonsGroup}>
            <button onClick={handleGetWorkDetails} disabled={isLoading || !managedCardCode} className={styles.actionButton}>
            {isLoading ? 'Buscando...' : 'Ver Detalhes'}
            </button>
            <button onClick={handleFinishActivity} disabled={isLoading || !managedCardCode || !(currentActivity as ActivityData)?.isCurrentlyActive} className={`${styles.actionButton} ${styles.finishButton}`}>
            {isLoading ? 'Finalizando...' : 'Finalizar Atividade'}
            </button>
            <button onClick={handleRestartActivity} disabled={isLoading || !managedCardCode || (currentActivity as ActivityData)?.isCurrentlyActive} className={`${styles.actionButton} ${styles.restartButton}`}>
            {isLoading ? 'Reiniciando...' : 'Reiniciar Atividade'}
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
    </div>
  );
};

export default ActivityTrackingPage;