export const EXTRA_BUILDINGS = {
  infirmary: {name: "Infirmary", glyph: "✚", mask: ["111", "111"], wood: 18, stone: 12, time: 10, hp: 110, unlock: "well", desc: "A healer uses 2 food and 1 water to restore 30 health to injured villagers within seven tiles every eight working seconds. Injured villagers seek care."},
  workshop: {name: "Sawmill", glyph: "▤", mask: ["111", "111"], wood: 20, stone: 6, time: 10, hp: 110, unlock: "lumber", desc: "A carpenter turns 4 timber into 2 planks every 10 working seconds. Planks supply the forge and expeditions."},
  forge: {name: "Tool forge", glyph: "⚒", mask: ["111", "111"], wood: 18, stone: 18, time: 12, hp: 140, unlock: "workshop", desc: "A smith turns 2 planks and 2 stone into 2 tools. One tool lasts 10 jobs and makes its worker 25% faster."},
  forester: {name: "Forester lodge", glyph: "♧", mask: ["111", "110"], wood: 18, stone: 8, time: 10, hp: 100, unlock: "lumber", desc: "A forester plants a tree every 16 working seconds on safe open ground. Keeps your timber industry renewable."},
  gate: {name: "Village gate", glyph: "Π", mask: ["1"], wood: 4, stone: 2, time: 4, hp: 160, desc: "Villagers pass through; raiders must break it. Connect walls to a gate to keep routes open."},
};
export const RECIPES = {
  workshop: {input: {wood: 4}, output: "planks", amount: 2, time: 10, target: 24, job: "Sawing planks"},
  forge: {input: {planks: 2, stone: 2}, output: "tools", amount: 2, time: 14, target: 12, job: "Forging tools"},
  kitchen: {input: {food: 4, water: 1}, output: "meals", amount: 3, time: 12, target: 24, job: "Cooking travel meals"},
};
