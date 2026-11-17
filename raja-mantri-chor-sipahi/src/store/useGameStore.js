import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { INVESTIGATOR_ROLE, SUSPECT_ROLES } from '../game.js'

const initialSettings = {
  nickname: 'You',
  avatarColor: '#e8b85b',
  crest: 'Crown',
  difficulty: 'clever',
  language: 'en',
  theme: 'sandstone',
  fontScale: 1,
  fontStyle: 'royal',
  volume: 0.55,
  ambientMusic: false,
  haptics: false,
  graphics: 'high',
  rounds: 5,
  timer: 0,
  mode: 'solo',
  playerCount: 4,
  localNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'],
  investigatorRole: INVESTIGATOR_ROLE,
  suspectRoles: [...SUSPECT_ROLES],
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
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        investigatorRole: INVESTIGATOR_ROLE,
        suspectRoles: [...SUSPECT_ROLES],
      }),
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key, value]) => (
          typeof value !== 'function' && !['investigatorRole', 'suspectRoles'].includes(key)
        )),
      ),
    },
  ),
)
