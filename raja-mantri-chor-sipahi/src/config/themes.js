export const THEMES = {
  dawn: {
    name: 'Golden Dawn Courtyard', isNight: false,
    background: '#cda77c', ground: '#a39671', table: '#a77b51', tableTop: '#8e694e',
    trim: '#e9c879', lantern: '#ffb65c', dust: '#ffe6ad', fog: '#cda77c',
    ambient: 1.55, directional: 3.2, lanternIntensity: 0,
    colors: ['#e8b85b', '#d78162', '#739b88', '#8b81bc', '#d5a566'],
  },
  himalayan: {
    name: 'Sunlit Himalayan Valley', isNight: false,
    background: '#a9cad2', ground: '#8e9b7a', table: '#a99473', tableTop: '#6f7565',
    trim: '#e4c681', lantern: '#ffb65c', dust: '#f5e8bd', fog: '#a9cad2',
    ambient: 1.55, directional: 3.1, lanternIntensity: 0,
    colors: ['#e8b85b', '#d78162', '#739b88', '#8b81bc', '#d5a566'],
  },
  emerald: {
    name: 'Monsoon Emerald Village', isNight: false,
    background: '#9aafa0', ground: '#526f54', table: '#8b704b', tableTop: '#49644c',
    trim: '#c4aa61', lantern: '#d2e797', dust: '#e1ebc2', fog: '#9aafa0',
    ambient: 1.7, directional: 2.8, lanternIntensity: 0,
    colors: ['#ddb96b', '#c57b5c', '#75ad80', '#9694c0', '#d1a26d'],
  },
  sandstone: {
    name: 'Royal Sandstone Twilight',
    isNight: true,
    background: '#111b19',
    ground: '#28332a',
    table: '#b89258',
    tableTop: '#3a2f26',
    trim: '#d5b16b',
    lantern: '#f6c978',
    dust: '#f0d59a',
    fog: '#111b19',
    ambient: 1.4,
    directional: 3,
    lanternIntensity: 21,
    colors: ['#e8b85b', '#d78162', '#739b88', '#8b81bc', '#d5a566'],
  },
  sapphire: {
    name: 'Moonlit Mountain Citadel',
    isNight: true,
    background: '#101526',
    ground: '#202c43',
    table: '#91a5bd',
    tableTop: '#1d2940',
    trim: '#a8d7e8',
    lantern: '#78c9e8',
    dust: '#b4e8f4',
    fog: '#101526',
    ambient: 1.1,
    directional: 2.1,
    lanternIntensity: 24,
    colors: ['#e5c779', '#91bfe0', '#8bb6a5', '#b0a1d8', '#d49bb1'],
  },
}

export const TABLE_STYLES = {
  teak: { name: 'Carved Teak & Brass Chauki', base: '#62432f', top: '#8a6040', trim: '#d5ad61', ink: '#e7c980' },
  marble: { name: 'Agra Pietra Dura White Marble', base: '#c7c1ac', top: '#eee9d9', trim: '#b59a59', ink: '#7d6541' },
  sandalwood: { name: 'Royal Sandalwood & Ivory Takht', base: '#9c7048', top: '#cba376', trim: '#eee0bd', ink: '#755337' },
  bronze: { name: 'Hammered Temple Bronze & Stone', base: '#40443c', top: '#635641', trim: '#bc9350', ink: '#d9b879' },
}

export const CRESTS = ['Crown', 'Peacock', 'Lotus', 'Sun']
