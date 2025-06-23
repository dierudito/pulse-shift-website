import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  clockTime,
  getDailySchedule,
  getTodaysEntries,
} from '../features/time-clocking/services/timeEntryService';
import type {
  ClockedTimeEntryData,
  DailySchedule,
  TimeEntry,
} from '../features/time-clocking/types/timeEntryTypes';
import {
  EntryType,
} from '../features/time-clocking/types/timeEntryTypes';
import useCurrentTime from '../hooks/useCurrentTime';
import styles from './TimeClockingPage.module.css';

/**
 * @interface TimeClockingPageProps
 * @description Props for the TimeClockingPage component.
 */
interface TimeClockingPageProps {}

/**
 * @function formatSecondsToHHMMSS
 * @description Formats a duration in seconds to HH:MM:SS string.
 * @param {number} totalSeconds - The duration in seconds.
 * @returns {string} The formatted time string.
 */
const formatSecondsToHHMMSS = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num: number) => String(num).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};


/**
 * @interface ActiveReminderInfo
 * @description Stores information about the event for which notifications are active.
 */
interface ActiveReminderInfo {
  targetTime: Date;         // Horário original agendado do evento (ex: 12:00 para breakStart)
  eventName: string;        // Nome descritivo do evento (ex: "início de pausa (12:00)")
  expectedEntryType: EntryType; // Tipo de registro que satisfaz este lembrete
  lastNotificationTime: Date; // Quando a última notificação (inicial ou recorrente) foi enviada
  isOverdue: boolean;       // Se o targetTime já passou
}

/**
 * @function TimeClockingPage
 * @description Page for users to clock in/out, view today's duration, and daily schedule.
 * @param {TimeClockingPageProps} props - The props for the component.
 * @returns {JSX.Element} The rendered time clocking page.
 */
const TimeClockingPage: React.FC<TimeClockingPageProps> = () => {
  const currentTime = useCurrentTime();
  const [lastRegisteredEntry, setLastRegisteredEntry] = useState<ClockedTimeEntryData | null>(null);
  const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null);
  const [todaysEntries, setTodaysEntries] = useState<TimeEntry[]>([]);
  const [totalWorkedSecondsToday, setTotalWorkedSecondsToday] = useState<number>(0);
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
   const [activeReminder, setActiveReminder] = useState<ActiveReminderInfo | null>(null);
 
  // Usaremos um único timer que será reagendado.
  const notificationSchedulerId = useRef<NodeJS.Timeout | null>(null);
  // Ref para manter a última versão das entradas e evitar stale closures em timeouts longos
  const todaysEntriesRef = useRef(todaysEntries);
  useEffect(() => {
    todaysEntriesRef.current = todaysEntries;
  }, [todaysEntries]);

  /**
   * @function formatTimeDisplay
   * @description Formats a Date object into HH:mm:ss string for display.
   * @param {Date} date - The date to format.
   * @returns {string} The formatted time string.
   */
  const formatTimeDisplay = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * @function formatDateForAPISchedule
   * @description Formats a Date object into YYYY-MM-DD string for API calls.
   * @param {Date} date - The date to format.
   * @returns {string} The formatted date string.
   */
  const formatDateForAPISchedule = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  /**
   * @function calculateWorkDuration
   * @description Calculates total worked seconds and current working status from today's entries.
   * @param {TimeEntry[]} entries - Sorted list of today's time entries.
   * @param {Date} currentTickTime - The current time, used if actively working.
   */
  const calculateWorkDuration = useCallback((entries: TimeEntry[], currentTickTime: Date) => {
    let calculatedTotalSeconds = 0;
    let currentlyWorking = false;
    let lastActiveEntryTime: Date | null = null;

    // Ensure entries are sorted by entryDate
    const sortedEntries = [...entries].sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      if (entry.entryType === EntryType.ClockIn || entry.entryType === EntryType.BreakEnd) {
        lastActiveEntryTime = entry.entryDate;
        // If this is the last entry, user is currently working
        if (i === sortedEntries.length - 1) {
          currentlyWorking = true;
        }
      } else if ((entry.entryType === EntryType.ClockOut || entry.entryType === EntryType.BreakStart) && lastActiveEntryTime) {
        // Calculate duration for this completed segment
        const segmentDurationSeconds = (entry.entryDate.getTime() - lastActiveEntryTime.getTime()) / 1000;
        calculatedTotalSeconds += segmentDurationSeconds;
        lastActiveEntryTime = null; // Reset for next segment
        currentlyWorking = false; // No longer actively accumulating in this segment
      }
    }

    setIsCurrentlyWorking(currentlyWorking);

    // If currently working, add time from lastActiveEntryTime to currentTickTime
    if (currentlyWorking && lastActiveEntryTime) {
      const ongoingSegmentSeconds = (currentTickTime.getTime() - lastActiveEntryTime.getTime()) / 1000;
      setTotalWorkedSecondsToday(calculatedTotalSeconds + ongoingSegmentSeconds);
    } else {
      setTotalWorkedSecondsToday(calculatedTotalSeconds);
    }
  }, []);


  /**
   * @function fetchPageData
   * @description Fetches all necessary data for the page.
   */
  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const todayStr = formatDateForAPISchedule(new Date());
      const schedule = await getDailySchedule(todayStr);
      const entries = await getTodaysEntries();
      
      setDailySchedule(schedule);
      setTodaysEntries(entries);
      
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        setLastRegisteredEntry({
            $id: lastEntry.$id,
            id: lastEntry.id,
            entryDate: lastEntry.entryDate,
            entryType: lastEntry.entryType,
        });
      }
      // calculateWorkDuration will be called by the useEffect below
    } catch (err) {
      console.error("Failed to fetch page data:", err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados da página.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { // Solicitar permissão
    if (!('Notification' in window)) {
      setNotificationPermission('denied');
    } else if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(setNotificationPermission);
    } else {
      setNotificationPermission('denied');
    }
  }, []);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  // Effect to recalculate duration when entries change or every second if working
  useEffect(() => {
    if (todaysEntries.length > 0) {
      calculateWorkDuration(todaysEntries, currentTime);
    } else {
      // Reset if no entries
      setTotalWorkedSecondsToday(0);
      setIsCurrentlyWorking(false);
    }
  }, [todaysEntries, currentTime, calculateWorkDuration]);

  /**
   * @async
   * @function handleClockTime
   * @description Handles the clock-in/out action.
   */
  const handleClockTime = async () => {
    setIsRegistering(true);
    setError(null);
    try {
      const newEntry = await clockTime();
      setLastRegisteredEntry(newEntry);
      
      const updatedEntries = await getTodaysEntries();
      setTodaysEntries(updatedEntries);

      const todayStr = formatDateForAPISchedule(new Date());
      const updatedSchedule = await getDailySchedule(todayStr);
      setDailySchedule(updatedSchedule);
      setActiveReminder(null); // Limpa qualquer lembrete ativo, pois um ponto foi batido
      if (notificationSchedulerId.current) {
        clearTimeout(notificationSchedulerId.current); // Limpa timer ao registrar ponto
        notificationSchedulerId.current = null;
      }
    } catch (err) {
      console.error("Failed to clock time:", err);
      setError(err instanceof Error ? err.message : 'Falha ao registrar ponto.');
    } finally {
      setIsRegistering(false);
    }
  };
  
  /**
   * @function formatEntryTypeDisplay
   * @description Translates entry type enum to a readable string for display.
   * @param {EntryType} entryType - The entry type.
   * @returns {string} Readable entry type.
   */
  const formatEntryTypeDisplay = (entryType: EntryType): string => {
    switch (entryType) {
      case EntryType.ClockIn: return 'Entrada';
      case EntryType.ClockOut: return 'Saída';
      case EntryType.BreakStart: return 'Início Pausa';
      case EntryType.BreakEnd: return 'Fim Pausa';
      default: return entryType;
    }
  };


  // Helper para converter "HH:mm" para um objeto Date de hoje
  const parseHHMMToDate = (timeStr: string): Date | null => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0); // Define hora e minuto para hoje
    return date;
  };

  // useEffect para agendar notificações
  useEffect(() => {
    if (notificationSchedulerId.current) {
      clearTimeout(notificationSchedulerId.current);
      notificationSchedulerId.current = null;
    }

    if (notificationPermission !== 'granted' || !dailySchedule) {
      if(activeReminder){ // Se havia um lembrete ativo e as condições mudaram, limpa-o
        setActiveReminder(null);
      }
      return;
    }

    const now = new Date(currentTime.getTime()); // Usar cópia do currentTime para estabilidade na execução do efeito
    const currentEntries = todaysEntriesRef.current; // Usar ref para dados mais recentes nas checagens

    // 1. Se existe um lembrete ativo, verificar se foi satisfeito ou expirou
    if (activeReminder) {
      const pointRegistered = currentEntries.find(
        entry => entry.entryType === activeReminder.expectedEntryType &&
                 entry.entryDate.getTime() >= activeReminder.targetTime.getTime() - 1 * 60 * 1000 // Margem de 1 min antes
      );

      if (pointRegistered) {
        console.log(`Lembrete para ${activeReminder.eventName} satisfeito.`);
        setActiveReminder(null);
        return; // Ponto registrado, não precisa mais de lembretes para este evento
      }

      const oneHourPastTarget = new Date(activeReminder.targetTime.getTime() + 60 * 60 * 1000);
      if (now > oneHourPastTarget) {
        console.log(`Lembrete para ${activeReminder.eventName} expirou (1h).`);
        setActiveReminder(null);
        return; // Lembrete expirado
      }

      // Lógica para notificação recorrente
      if (activeReminder.isOverdue) {
        const twoMinutesMs = 2 * 60 * 1000;
        // Se agora for >= que a última notificação + 2 minutos
        if (now.getTime() >= activeReminder.lastNotificationTime.getTime() + twoMinutesMs) {
          console.log(`Enviando notificação recorrente para ${activeReminder.eventName}`);
          new Notification('Pulse Shift - Ponto Pendente!', {
            body: `Lembrete: Registrar ${activeReminder.eventName}.`,
            icon: '/pulse-shift-icon.png',
            tag: `pulse-shift-recurring-${activeReminder.eventName.replace(/\s+/g, '-')}-${now.getMinutes()}` // Tag para tentar ser única
          });
          const newReminderState = { ...activeReminder, lastNotificationTime: now };
          setActiveReminder(newReminderState);
          // Reagendar a próxima verificação/recorrência (o useEffect será re-executado por causa do currentTime)
          // Não precisa de setTimeout aqui, o useEffect com currentTime como dep cuida do re-check.
        }
        // Se não for hora da recorrente ainda, o useEffect será re-executado no próximo tick do currentTime.
        return; // Mantém o activeReminder, espera o próximo tick
      }
    }

    // 2. Determinar o próximo evento agendado para notificação inicial (se não houver lembrete ativo)
    const sortedEntries = [...currentEntries].sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
    const lastEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null;

    let nextScheduledEventTarget: ActiveReminderInfo | null = null;

    const scheduleBreakStartTime = parseHHMMToDate(dailySchedule.breakStart);
    const scheduleBreakEndTime = parseHHMMToDate(dailySchedule.breakEnd);
    const scheduleClockOutTime = parseHHMMToDate(dailySchedule.clockOut);

    if (!lastEntry) { // Nenhum ponto ainda, o primeiro alvo pode ser o breakStart (após o horário de entrada)
      const scheduleClockInTime = parseHHMMToDate(dailySchedule.clockIn);
      if (scheduleClockInTime && now > scheduleClockInTime && scheduleBreakStartTime && scheduleBreakStartTime > now) {
         nextScheduledEventTarget = { targetTime: scheduleBreakStartTime, eventName: `início de pausa (${dailySchedule.breakStart})`, expectedEntryType: EntryType.BreakStart, lastNotificationTime: now, isOverdue: false };
      }
      // Adicionar lógica para clockOut se for o único ponto relevante do dia restante
      else if (scheduleClockOutTime && scheduleClockOutTime > now) {
        // Considerar se é um dia sem pausa ou se a pausa já deveria ter ocorrido
         nextScheduledEventTarget = { targetTime: scheduleClockOutTime, eventName: `saída (${dailySchedule.clockOut})`, expectedEntryType: EntryType.ClockOut, lastNotificationTime: now, isOverdue: false };
      }

    } else {
      if (lastEntry.entryType === EntryType.ClockIn) {
        if (scheduleBreakStartTime && scheduleBreakStartTime > now) {
          nextScheduledEventTarget = { targetTime: scheduleBreakStartTime, eventName: `início de pausa (${dailySchedule.breakStart})`, expectedEntryType: EntryType.BreakStart, lastNotificationTime: now, isOverdue: false };
        } else if (scheduleBreakEndTime && scheduleBreakEndTime > now) { // Se perdeu o breakStart, pode ir pro breakEnd? Regra é notificar breakEnd
          // Isso só ocorreria se o breakStart fosse opcional ou não registrado, e agora o próximo é breakEnd
           nextScheduledEventTarget = { targetTime: scheduleBreakEndTime, eventName: `fim de pausa (${dailySchedule.breakEnd})`, expectedEntryType: EntryType.BreakEnd, lastNotificationTime: now, isOverdue: false };
        }
        else if (scheduleClockOutTime && scheduleClockOutTime > now) {
          nextScheduledEventTarget = { targetTime: scheduleClockOutTime, eventName: `saída (${dailySchedule.clockOut})`, expectedEntryType: EntryType.ClockOut, lastNotificationTime: now, isOverdue: false };
        }
      } else if (lastEntry.entryType === EntryType.BreakStart) {
        if (scheduleBreakEndTime && scheduleBreakEndTime > now) {
          nextScheduledEventTarget = { targetTime: scheduleBreakEndTime, eventName: `fim de pausa (${dailySchedule.breakEnd})`, expectedEntryType: EntryType.BreakEnd, lastNotificationTime: now, isOverdue: false };
        }
      } else if (lastEntry.entryType === EntryType.BreakEnd) {
        if (scheduleClockOutTime && scheduleClockOutTime > now) {
          nextScheduledEventTarget = { targetTime: scheduleClockOutTime, eventName: `saída (${dailySchedule.clockOut})`, expectedEntryType: EntryType.ClockOut, lastNotificationTime: now, isOverdue: false };
        }
      }
    }
    
    // 3. Agendar notificação inicial para o nextScheduledEventTarget
    if (nextScheduledEventTarget && !activeReminder) { // Apenas se não houver um activeReminder
      const initialNotificationTime = new Date(nextScheduledEventTarget.targetTime.getTime() - 2 * 60 * 1000); // 2 minutos antes

      if (initialNotificationTime > now) {
        const delay = initialNotificationTime.getTime() - now.getTime();
        console.log(`Agendando notificação inicial para ${nextScheduledEventTarget.eventName} às ${initialNotificationTime.toLocaleTimeString('pt-BR')}`);
        notificationSchedulerId.current = setTimeout(() => {
          console.log(`Enviando notificação inicial para ${nextScheduledEventTarget.eventName}`);
          new Notification('Pulse Shift - Lembrete de Ponto', {
            body: `Seu ${nextScheduledEventTarget!.eventName} está chegando!`,
            icon: '/pulse-shift-icon.png',
            tag: `pulse-shift-initial-${nextScheduledEventTarget!.eventName.replace(/\s+/g, '-')}`
          });
          // Prepara para possível recorrência se o ponto não for batido
          setActiveReminder({ ...nextScheduledEventTarget!, lastNotificationTime: new Date() }); // `isOverdue` ainda é false
        }, delay);
      } else if (now >= initialNotificationTime && now < nextScheduledEventTarget.targetTime) {
        // Se o horário do aviso prévio (-2min) já passou, mas o horário do ponto ainda não.
        // E não há lembrete ativo. Isso pode significar que a página carregou entre -2min e o targetTime.
        // Envia a notificação inicial imediatamente e configura o activeReminder.
        console.log(`Enviando notificação inicial (tardia) para ${nextScheduledEventTarget.eventName}`);
        new Notification('Pulse Shift - Lembrete de Ponto', {
          body: `Seu ${nextScheduledEventTarget!.eventName} está chegando!`,
          icon: '/pulse-shift-icon.png',
          tag: `pulse-shift-initial-late-${nextScheduledEventTarget!.eventName.replace(/\s+/g, '-')}`
        });
        setActiveReminder({ ...nextScheduledEventTarget!, lastNotificationTime: new Date() });
      } else if (now >= nextScheduledEventTarget.targetTime) {
         // Se já passou do horário do ponto e não há lembrete ativo (página carregou tarde)
         // Iniciar diretamente o activeReminder como 'isOverdue'
         console.log(`Ponto para ${nextScheduledEventTarget.eventName} já passou. Configurando para recorrência.`);
         setActiveReminder({ ...nextScheduledEventTarget!, lastNotificationTime: new Date(now.getTime() - (2*60*1000) + 100 ), isOverdue: true }); // Subtrai 2 min para forçar 1a recorrente logo
      }
    }
    
    // Se um activeReminder foi definido (seja novo ou atualizado), e agora está overdue, marcar como overdue.
    // Isso é para o caso onde a notificação inicial foi disparada, e agora o currentTime passou o targetTime.
    if (activeReminder && !activeReminder.isOverdue && now >= activeReminder.targetTime) {
        setActiveReminder(prev => prev ? { ...prev, isOverdue: true, lastNotificationTime: now } : null);
    }

  }, [dailySchedule, todaysEntries, notificationPermission, currentTime, activeReminder]); 


  return (
    <div className={styles.timeClockingContainer}>
      <h2>Registro de Ponto</h2>

      <div className={styles.clockDisplay}>
        <p className={styles.currentTimeLabel}>Hora Atual:</p>
        <p className={styles.currentTimeValue}>{formatTimeDisplay(currentTime)}</p>
      </div>

      <button
        onClick={handleClockTime}
        disabled={isLoading || isRegistering}
        className={styles.clockButton}
      >
        {isRegistering ? 'Registrando...' : 'Registrar Ponto'}
      </button>

      {error && <p className={styles.errorMessage}>Erro: {error}</p>}

      {lastRegisteredEntry && (
        <div className={styles.infoSection}>
          <h3>Último Ponto Registrado:</h3>
          <p>
            <strong>Tipo:</strong> {formatEntryTypeDisplay(lastRegisteredEntry.entryType)}
          </p>
          <p>
            <strong>Data/Hora:</strong>{' '}
            {lastRegisteredEntry.entryDate.toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      <div className={styles.infoSection}>
        <h3>Total de Horas Trabalhadas Hoje:</h3>
        <p className={styles.workedDurationValue}>
            {formatSecondsToHHMMSS(totalWorkedSecondsToday)}
            {isCurrentlyWorking && <span className={styles.liveIndicator}> (em progresso)</span>}
        </p>
      </div>

      {dailySchedule && (
        <div className={styles.infoSection}>
          <h3>Previsão de Horários para Hoje:</h3>
          <p>Entrada: {dailySchedule.clockIn}</p>
          <p>Início Pausa: {dailySchedule.breakStart}</p>
          <p>Fim Pausa: {dailySchedule.breakEnd}</p>
          <p>Saída: {dailySchedule.clockOut}</p>
        </div>
      )}

      {isLoading && !error && todaysEntries.length === 0 && !dailySchedule && <p>Carregando dados da página...</p>}
    </div>
  );
};

export default TimeClockingPage;