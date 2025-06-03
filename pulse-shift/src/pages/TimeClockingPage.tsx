// src/pages/TimeClockingPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  clockTime,
  getDailySchedule,
  getTodaysEntries, // New service
  // getTodaysDuration, // We might not need this if calculating client-side
} from '../features/time-clocking/services/timeEntryService';
import type {
  ClockedTimeEntryData,
  DailySchedule,
  TimeEntry, // Using the parsed TimeEntry
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
      const [schedule, entries] = await Promise.all([
        getDailySchedule(todayStr),
        getTodaysEntries(),
      ]);
      
      setDailySchedule(schedule);
      setTodaysEntries(entries);
      // Initial calculation, will be updated by useEffect if working
      if (entries.length > 0) {
        setLastRegisteredEntry({ // Synthesize a ClockedTimeEntryData-like object for display
            $id: entries[entries.length -1].$id,
            id: entries[entries.length -1].id,
            entryDate: entries[entries.length -1].entryDate,
            entryType: entries[entries.length -1].entryType,
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
      const newEntry = await clockTime(); // clockTime service now returns ClockedTimeEntryData
      setLastRegisteredEntry(newEntry);
      // Re-fetch all entries to update the list and trigger duration recalculation
      const updatedEntries = await getTodaysEntries();
      setTodaysEntries(updatedEntries);
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

      {isLoading && !error && todaysEntries.length === 0 && <p>Carregando dados...</p>}
    </div>
  );
};

export default TimeClockingPage;