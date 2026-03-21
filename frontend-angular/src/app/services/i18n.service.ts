import { Injectable, signal, effect, type WritableSignal } from '@angular/core';

export type Language = 'en' | 'zh' | 'ja';

export interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    scramble: 'Scramble',
    start: 'Start',
    newScramble: 'New Scramble',
    settings: 'Settings',
    pressSpace: 'Press',
    pressSpace2: 'to start/stop',
    pressEnter: 'for new scramble',
    sessionStats: 'Session Statistics',
    current: 'Current',
    ao5: 'Ao5',
    ao12: 'Ao12',
    ao100: 'Ao100',
    best: 'Best',
    solves: 'Solves',
    bluetoothCube: 'Bluetooth Cube',
    scanForCubes: 'Scan for Cubes',
    disconnected: 'Disconnected',
    connected: 'Connected',
    cfopAnalysis: 'CFOP Analysis',
    lastSolveDetails: 'Last Solve Details',
    solveHistory: 'Solve History',
    inspectionSec: 'Inspection Time (seconds)',
    timerSound: 'Timer Sound',
    cross: 'Cross',
    f2l: 'F2L',
    oll: 'OLL',
    pll: 'PLL',
    time: 'Time',
    efficiency: 'Efficiency',
    recognitionTime: 'Recognition',
    caseName: 'Case',
    algorithm: 'Algorithm',
    noData: 'No data yet',
    export: 'Export',
    newSession: 'New Session',
    save: 'Save',
    cancel: 'Cancel',
    clearAllData: 'Clear All Data',
    yes: 'Yes',
    no: 'No'
  },
  zh: {
    scramble: '打乱',
    start: '开始',
    newScramble: '新打乱',
    settings: '设置',
    pressSpace: '按',
    pressSpace2: '开始/停止',
    pressEnter: '新打乱',
    sessionStats: '本次统计',
    current: '当前',
    ao5: 'Ao5',
    ao12: 'Ao12',
    ao100: 'Ao100',
    best: '最佳',
    solves: '还原数',
    bluetoothCube: '蓝牙魔方',
    scanForCubes: '扫描魔方',
    disconnected: '未连接',
    connected: '已连接',
    cfopAnalysis: 'CFOP分析',
    lastSolveDetails: '上次还原详情',
    solveHistory: '历史记录',
    inspectionSec: '观察时间（秒）',
    timerSound: '计时器声音',
    cross: '十字',
    f2l: 'F2L',
    oll: 'OLL',
    pll: 'PLL',
    time: '时间',
    efficiency: '效率',
    recognitionTime: '识别时间',
    caseName: '案例',
    algorithm: '公式',
    noData: '暂无数据',
    export: '导出',
    newSession: '新会话',
    save: '保存',
    cancel: '取消',
    clearAllData: '清除所有数据',
    yes: '是',
    no: '否'
  },
  ja: {
    scramble: 'スクランブル',
    start: 'スタート',
    newScramble: '新規スクランブル',
    settings: '設定',
    pressSpace: '押す',
    pressSpace2: 'スタート/停止',
    pressEnter: '新規スクランブル',
    sessionStats: 'セッション統計',
    current: '現在',
    ao5: 'Ao5',
    ao12: 'Ao12',
    ao100: 'Ao100',
    best: 'ベスト',
    solves: '解法数',
    bluetoothCube: 'Bluetoothキューーブ',
    scanForCubes: 'キューーブをスキャン',
    disconnected: '未接続',
    connected: '接続済み',
    cfopAnalysis: 'CFOP分析',
    lastSolveDetails: '最後の解法詳細',
    solveHistory: '解法履歴',
    inspectionSec: 'インスペクション時間（秒）',
    timerSound: 'タイマー音',
    cross: 'クロス',
    f2l: 'F2L',
    oll: 'OLL',
    pll: 'PLL',
    time: '時間',
    efficiency: '効率',
    recognitionTime: '認識',
    caseName: 'ケース',
    algorithm: 'アルゴリズム',
    noData: 'データなし',
    export: 'エクスポート',
    newSession: '新規セッション',
    save: '保存',
    cancel: 'キャンセル',
    clearAllData: '全データ消去',
    yes: 'はい',
    no: 'いいえ'
  }
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly currentLanguage: WritableSignal<Language> = signal<Language>(this.getStoredLanguage());

  constructor() {
    effect(() => {
      const lang = this.currentLanguage();
      this.updatePageTranslations(lang);
      localStorage.setItem('language', lang);
    });
  }

  private getStoredLanguage(): Language {
    const stored = localStorage.getItem('language') as Language;
    if (stored && translations[stored]) {
      return stored;
    }
    const browserLang = navigator.language.split('-')[0] as Language;
    if (translations[browserLang]) {
      return browserLang;
    }
    return 'en';
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
  }

  t(key: string): string {
    const lang = this.currentLanguage();
    return translations[lang][key] || translations['en'][key] || key;
  }

  private updatePageTranslations(lang: Language): void {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && el instanceof HTMLInputElement) {
        el.placeholder = this.t(key);
      }
    });
  }

  getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' }
    ];
  }
}
