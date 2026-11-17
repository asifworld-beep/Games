import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const initialSettings = {
  nickname: 'You',
  avatarColor: '#e8b85b',
  crest: 'Crown',
  difficulty: 'clever',
  language: 'en',
  theme: 'sandstone',
  volume: 0.55,
  ambientMusic: false,
  haptics: false,
  graphics: 'high',
  rounds: 5,
  timer: 0,
  mode: 'solo',
  localNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
}

export const useGameStore = create(
  persist(
    (set) => ({
      ...initialSettings,
      updateSetting: (key, value) => set({ [key]: value }),
      updateLocalName: (index, value) => set((state) => ({
        localNames: state.localNames.map((name, current) => current === index ? value : name),
      })),
      resetSettings: () => set(initialSettings),
    }),
    {
      name: 'raja-mantri-settings',
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([, value]) => typeof value !== 'function'),
      ),
    },
  ),
)
