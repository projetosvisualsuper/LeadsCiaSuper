/**
 * Utility functions for checking and calculating business hours (Horário Comercial).
 * Standard business hours: Monday to Friday, 07:30 to 17:30 (America/Sao_Paulo).
 */

export function isBusinessHours(date = new Date()): boolean {
  try {
    const spFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'long'
    });

    const parts = spFormatter.formatToParts(date);
    const getValue = (type: string) => parts.find(p => p.type === type)?.value;
    
    const hour = parseInt(getValue('hour') || '0', 10);
    const minute = parseInt(getValue('minute') || '0', 10);
    const weekdayStr = getValue('weekday') || '';
    
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (!workingDays.includes(weekdayStr)) {
      return false;
    }
    
    const timeVal = hour * 60 + minute;
    const startVal = 7 * 60 + 30; // 07:30
    const endVal = 17 * 60 + 30;  // 17:30
    
    return timeVal >= startVal && timeVal <= endVal;
  } catch (err) {
    console.error('Erro ao verificar horário comercial:', err);
    return false;
  }
}

/**
 * Retorna o próximo início de horário comercial (Segunda a Sexta às 07:30 BRT).
 */
export function getNextBusinessHoursStart(from = new Date()): Date {
  const spFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = spFormatter.formatToParts(from);
  const getValue = (type: string) => parts.find(p => p.type === type)?.value;

  const year = parseInt(getValue('year') || '2026', 10);
  const month = parseInt(getValue('month') || '1', 10) - 1;
  const day = parseInt(getValue('day') || '1', 10);
  const hour = parseInt(getValue('hour') || '0', 10);
  const minute = parseInt(getValue('minute') || '0', 10);

  const isWeekday = (d: Date) => {
    const dayOfWeek = d.getUTCDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  const minutesToday = hour * 60 + minute;
  const startMinutes = 7 * 60 + 30; // 07:30

  // 07:30 BRT = 10:30 UTC
  let target = new Date(Date.UTC(year, month, day, 10, 30, 0, 0));

  if (isWeekday(target) && minutesToday < startMinutes) {
    return target;
  }

  target.setUTCDate(target.getUTCDate() + 1);

  while (!isWeekday(target)) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target;
}
