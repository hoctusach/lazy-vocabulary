// Palettes for the 5 real-style themes (light + dark). Run `node scripts/themes/gen-tokens.mjs` to
// regenerate src/styles/theme-tokens.css (it also prints a WCAG contrast report and exits 1 on failures).
export const THEMES = {
  notes: {
    light: { bg: '#F6F0E2', card: '#FFFDF6', cardHi: '#FBF4DC', ink: '#1F2440', sub: '#575A72', accent: '#2848B8', btn: '#C23A22', btnInk: '#FFF8EA',
      ok: '#C23A22', okInk: '#FFF8EA', hl: '#FFE15A', deco: '#E7A3A0', line: '#B9B2A0', meaning: '#1F2440', example: '#575A72', translation: '#BB321B',
      error: '#B3261E', warning: '#8A5300', field: '#7B7D90', overlay: 'rgba(31,36,64,.45)', tones: ['#FFFDF6', '#FFFDF6', '#FFFDF6', '#FFFDF6', '#FFFDF6'] },
    dark: { bg: '#1A1D26', card: '#232835', cardHi: '#2A3040', ink: '#EFE7D4', sub: '#A9ACBE', accent: '#8FB0FF', btn: '#FF8060', btnInk: '#1A1D26',
      ok: '#FF8060', okInk: '#1A1D26', hl: '#E2C93E', deco: '#5B3438', line: '#454C61', meaning: '#EFE7D4', example: '#A9ACBE', translation: '#FF9378',
      error: '#FF8A80', warning: '#E2C93E', field: '#8087A0', overlay: 'rgba(8,9,14,.65)', tones: ['#232835', '#232835', '#232835', '#232835', '#232835'] },
  },
  sloth: {
    light: { bg: '#F4F6FB', card: '#FFFFFF', cardHi: '#EAF4F7', ink: '#151A3D', sub: '#555C7C', accent: '#0B6F80', btn: '#F29A2E', btnInk: '#2A1A05',
      ok: '#F29A2E', okInk: '#2A1A05', hl: '#0E8FA3', deco: '#2E3A8C', line: '#D5DBEE', meaning: '#0B6F80', example: '#3B3F9A', translation: '#7A4A12',
      error: '#B3261E', warning: '#8A5300', field: '#7C84A6', overlay: 'rgba(21,26,61,.45)', tones: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'] },
    dark: { bg: '#0E1230', card: '#171C45', cardHi: '#1F2656', ink: '#EEF0FF', sub: '#A9AFD6', accent: '#2CC3D4', btn: '#FFB54D', btnInk: '#2A1A05',
      ok: '#FFB54D', okInk: '#2A1A05', hl: '#2CC3D4', deco: '#8C9BFF', line: '#2D3566', meaning: '#7FE3EE', example: '#C3C9FF', translation: '#FFC56F',
      error: '#FF8A80', warning: '#FFB54D', field: '#7F88B8', overlay: 'rgba(5,7,24,.7)', tones: ['#171C45', '#171C45', '#171C45', '#171C45', '#171C45'] },
  },
  blocks: {
    light: { bg: '#F3EFE4', card: '#FFFFFF', cardHi: '#FFF1B8', ink: '#111111', sub: '#4A4A4A', accent: '#B8280F', btn: '#FF5A36', btnInk: '#111111',
      ok: '#3DDC97', okInk: '#111111', hl: '#FFD23F', deco: '#8EC9FF', line: '#111111', meaning: '#111111', example: '#4A4A4A', translation: '#B8280F',
      error: '#B3261E', warning: '#7A4B00', field: '#111111', overlay: 'rgba(17,17,17,.55)', tones: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'] },
    dark: { bg: '#141414', card: '#222222', cardHi: '#33301A', ink: '#F3EFE4', sub: '#BDB8AC', accent: '#FF7A5C', btn: '#FF5A36', btnInk: '#111111',
      ok: '#3DDC97', okInk: '#111111', hl: '#FFD23F', deco: '#8EC9FF', line: '#F3EFE4', meaning: '#F3EFE4', example: '#BDB8AC', translation: '#FF8F75',
      error: '#FF8A80', warning: '#FFD23F', field: '#F3EFE4', overlay: 'rgba(0,0,0,.7)', tones: ['#222222', '#222222', '#222222', '#222222', '#222222'] },
  },
  pixel: {
    light: { bg: '#EDE6D3', card: '#FFFAEC', cardHi: '#F4EBCB', ink: '#2B2340', sub: '#625A7B', accent: '#2A5FBF', btn: '#3FAE4A', btnInk: '#111111',
      ok: '#3FAE4A', okInk: '#111111', hl: '#F7B500', deco: '#E84855', line: '#2B2340', meaning: '#2B2340', example: '#625A7B', translation: '#B52A39',
      error: '#B3261E', warning: '#7A4B00', field: '#2B2340', overlay: 'rgba(43,35,64,.55)', tones: ['#FFFAEC', '#FFFAEC', '#FFFAEC', '#FFFAEC', '#FFFAEC'] },
    dark: { bg: '#121022', card: '#1E1A36', cardHi: '#2A2450', ink: '#E9F6D2', sub: '#A39DC6', accent: '#6FA8FF', btn: '#6EE86A', btnInk: '#0B1A0B',
      ok: '#6EE86A', okInk: '#0B1A0B', hl: '#FFC83D', deco: '#FF5D73', line: '#E9F6D2', meaning: '#E9F6D2', example: '#A39DC6', translation: '#FF7D90',
      error: '#FF8A80', warning: '#FFC83D', field: '#A39DC6', overlay: 'rgba(5,4,14,.75)', tones: ['#1E1A36', '#1E1A36', '#1E1A36', '#1E1A36', '#1E1A36'] },
  },
  riso: {
    light: { bg: '#F2ECDF', card: '#F8F3E8', cardHi: '#EDE5D2', ink: '#1E2A66', sub: '#4F588C', accent: '#2747A8', btn: '#2747A8', btnInk: '#F2ECDF',
      ok: '#2747A8', okInk: '#F2ECDF', hl: '#FF48B0', deco: '#FF48B0', line: '#1E2A66', meaning: '#1E2A66', example: '#4F588C', translation: '#B0126F',
      error: '#B3261E', warning: '#7A4B00', field: '#1E2A66', overlay: 'rgba(30,42,102,.5)', tones: ['#F8F3E8', '#F8F3E8', '#F8F3E8', '#F8F3E8', '#F8F3E8'] },
    dark: { bg: '#18171C', card: '#211F27', cardHi: '#2B2833', ink: '#F2ECDF', sub: '#B3AEC0', accent: '#FFE800', btn: '#FFE800', btnInk: '#18171C',
      ok: '#FFE800', okInk: '#18171C', hl: '#FF48B0', deco: '#FF48B0', line: '#F2ECDF', meaning: '#F2ECDF', example: '#B3AEC0', translation: '#FF7CC8',
      error: '#FF8A80', warning: '#FFE800', field: '#B3AEC0', overlay: 'rgba(0,0,0,.7)', tones: ['#211F27', '#211F27', '#211F27', '#211F27', '#211F27'] },
  },
};
