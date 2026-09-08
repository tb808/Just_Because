export interface AssetDefinition { path: string; height: number; animated?: boolean; tint?: string }
export const assets = {
  characters: {
    player: { path: 'assets/characters/nika.glb', height: 1.75, animated: true },
    soldier: { path: 'assets/characters/soldier.glb', height: 1.82, animated: true },
    residentCoast: { path: 'assets/characters/resident-coast.glb', height: 1.78, animated: true },
    residentHarbor: { path: 'assets/characters/resident-harbor.glb', height: 1.72, animated: true },
    residentArtisan: { path: 'assets/characters/resident-artisan.glb', height: 1.68, animated: true },
    residentScholar: { path: 'assets/characters/resident-scholar.glb', height: 1.74, animated: true },
    residentMarket: { path: 'assets/characters/resident-market.glb', height: 1.8, animated: true },
    residentRanger: { path: 'assets/characters/resident-ranger.glb', height: 1.83, animated: true },
    residentCraftsman: { path: 'assets/characters/resident-craftsman.glb', height: 1.76, animated: true },
    guardOfficer: { path: 'assets/characters/guard-officer.glb', height: 1.82, animated: true },
    guardAgent: { path: 'assets/characters/guard-agent.glb', height: 1.84, animated: true },
    guardScout: { path: 'assets/characters/guard-scout.glb', height: 1.79, animated: true },
  },
  vehicles: { car: { path: 'assets/vehicles/car.glb', height: 2.15 } },
  weapons: {
    rifle: { path: 'assets/weapons/rifle.glb', height: 0.32 },
    launcher: { path: 'assets/weapons/launcher.glb', height: 0.48 },
  },
  environment: {
    palm: { path: 'assets/vegetation/palm.glb', height: 10 },
    tree: { path: 'assets/vegetation/tree.glb', height: 8 },
    rock: { path: 'assets/environment/rock.glb', height: 3.4 },
    house: { path: 'assets/buildings/house.glb', height: 11 },
    warehouse: { path: 'assets/buildings/warehouse.glb', height: 16 },
    tank: { path: 'assets/props/tank.glb', height: 6, tint: '#dc5742' },
    container: { path: 'assets/props/container.glb', height: 3 },
  },
} satisfies Record<string, Record<string, AssetDefinition>>;

export const residentCharacterModels = [
  assets.characters.residentCoast,
  assets.characters.residentHarbor,
  assets.characters.residentArtisan,
  assets.characters.residentScholar,
  assets.characters.residentMarket,
  assets.characters.residentRanger,
  assets.characters.residentCraftsman,
] as const;

export const guardCharacterModels = [
  assets.characters.soldier,
  assets.characters.guardOfficer,
  assets.characters.guardAgent,
  assets.characters.guardScout,
] as const;
