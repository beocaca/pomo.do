import { defineStore } from 'pinia';
import { useChoreStore } from './chore';
import dayjs from 'dayjs';
import { useAuthStore } from './auth';

type TimerType = {
  name: string;
  pomo: number;
  short_break: number;
  long_break: number;
};

// In case the timer object is empty
export const defaultTimer: TimerType = {
  name: 'Local Default',
  pomo: 25,
  short_break: 5,
  long_break: 15,
};

const storageTimer = localStorage.getItem('timer');
const localTimer = storageTimer ? JSON.parse(storageTimer) : defaultTimer;

const minutes = (minutes: number) => {
  return dayjs().set('minutes', minutes).set('seconds', 0);
};

const seconds = (minutes: number) => minutes * 60;

export const useTimerStore = defineStore('timer', {
  state: () => ({
    timerId: 0,
    currentTimer: {
      timer: minutes(localTimer.pomo),
      seconds: seconds(localTimer.pomo),
    },
    pomo: {
      timer: minutes(localTimer.pomo),
      seconds: seconds(localTimer.pomo),
    },
    short_break: {
      timer: minutes(localTimer.short_break),
      seconds: seconds(localTimer.short_break),
    },
    long_break: {
      timer: minutes(localTimer.long_break),
      seconds: seconds(localTimer.short_break),
    },
    currentMode: localTimer.name,
    done: false,
    ongoing: false,
    current: 'pomo',
    sessions: 0,
    auto_start_pomo: useAuthStore().isAuthed
      ? useAuthStore().user?.auto_start_pomos
      : false,
    auto_start_breaks: useAuthStore().isAuthed
      ? useAuthStore().user?.auto_start_breaks
      : false,
  }),
  getters: {
    minutes: (state) => state.currentTimer.timer.minute(),
    seconds: (state) => state.currentTimer.timer.second(),
    formattedTime: (state) => state.currentTimer.timer.format('mm:ss'),
  },
  actions: {
    setTo(data: TimerType) {
      const { pomo, short_break, long_break } = data;
      this.pomo.timer = minutes(pomo);
      this.pomo.seconds = seconds(pomo);

      this.short_break.timer = minutes(short_break);
      this.short_break.seconds = seconds(short_break);

      this.long_break.timer = minutes(long_break);
      this.long_break.seconds = seconds(long_break);

      this.currentMode = data.name;
    },
    setNewTimer(data: TimerType) {
      this.setTo(data);
      this.currentTimer.timer = minutes(data.pomo);
      this.currentTimer.seconds = data.pomo;
      const timer = JSON.stringify(data);
      localStorage.setItem('timer', timer);
    },
    decrementSecond() {
      this.currentTimer.timer = this.currentTimer.timer.subtract(1, 'second');
      document.title = `Pomo.do ${this.formattedTime}`;
    },
    toggleOngoing() {
      this.ongoing = !this.ongoing;
    },
    setNextTimer() {
      // set next timer
      if (this.current === 'short_break' || this.current === 'long_break') {
        this.setTimer('pomo');
      } else if (this.current === 'pomo') {
        useChoreStore().incrementGoneThrough();
        if (this.sessions === 3) {
          this.setTimer('long_break');
          this.sessions = 0;
        } else {
          this.setTimer('short_break');
          this.sessions++;
        }
      }
    },
    setToDefault() {
      this.setTo(defaultTimer);
      this.currentTimer.timer = minutes(defaultTimer.pomo);
      this.currentTimer.seconds = defaultTimer.pomo;
      this.current = 'pomo';
      localStorage.removeItem('timer');
    },
    setTimer(name: string) {
      //  @ts-ignore
      this.currentTimer.timer = this[name].timer;
      //  @ts-ignore
      this.currentTimer.seconds = this[name].seconds;
      this.current = name;
    },
  },
});
