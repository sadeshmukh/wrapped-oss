export const CLANS = [
  { 
    id: 1, 
    name: 'Great Leosians', 
  },
  { 
    id: 2, 
    name: 'Zach Clubbers', 
  },
  { 
    id: 3, 
    name: 'Pixel Cultists', 
  },
  { 
    id: 4, 
    name: 'Apple Collectors', 
  },
  { 
    id: 5, 
    name: 'Waffle Makers', 
  },
] as const;

export type Clan = typeof CLANS[number];

export function getUserClan(identifier: string): Clan {
  const sum = identifier.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const index = sum % CLANS.length;

  return CLANS[index];
}
